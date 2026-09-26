import "server-only";
import { randomUUID } from "node:crypto";
import { checked, googleContext, accessToken, googleFetch, GoogleApiError, type Connection } from "./server";
import { canonical, decideSync, eventValue, taskValue, saoTime, type CalendarEventRow, type TaskRow, type SyncKind, type SyncValue } from "./model";
import { listAll, payload, remoteValue, resourcePath, unsupported, type RemoteItem } from "./provider";
import { selectionReason, validateSelection, type SyncSelection } from "./selection";
type Context = Awaited<ReturnType<typeof googleContext>>;
type Link = {
    id: string;
    owner_id: string;
    kind: SyncKind;
    local_id: string;
    remote_id: string | null;
    baseline: SyncValue | null;
    remote_snapshot: SyncValue | null;
    issue: string | null;
    resolution: "local" | "remote" | "delete" | null;
    resolution_local: SyncValue | null;
    resolution_remote: SyncValue | null;
    insertion_pending: boolean;
};
const table = (kind: SyncKind) => kind === "event" ? "calendar_events" : "reminders";
async function localRow(ctx: Context, kind: SyncKind, id: string) {
    return checked(await ctx.db.from(table(kind)).select("*").eq("owner_id", ctx.owner).eq("id", id).maybeSingle()) as CalendarEventRow | TaskRow | null;
}
function localValue(kind: SyncKind, row: CalendarEventRow | TaskRow | null) { return !row ? null : kind === "event" ? eventValue(row as CalendarEventRow) : taskValue(row as TaskRow); }
async function patchLink(ctx: Context, id: string, values: Partial<Link>) { checked(await ctx.db.from("google_sync_links").update(values).eq("owner_id", ctx.owner).eq("id", id)); }
async function saveLocal(ctx: Context, link: Link, value: SyncValue | null, previous: CalendarEventRow | TaskRow | null) {
    if (!value) {
        let query = ctx.db.from(table(link.kind)).delete().eq("owner_id", ctx.owner).eq("id", link.local_id);
        if (previous)
            query = query.eq("updated_at", previous.updated_at);
        const deleted = checked(await query.select("id"));
        if (previous && !deleted?.length)
            throw new Error("O registro local mudou durante a sincronização. Tente novamente.");
        return;
    }
    if (value.title.length < 2 || value.title.length > 180 || value.description.length > 8000)
        throw new Error("O item Google tem título ou descrição fora dos limites do Escoply. Ajuste no Google.");
    const values = link.kind === "event" ? {
        title: value.title, description: value.description, all_day: value.allDay,
        starts_at: value.allDay ? `${value.start}T00:00:00-03:00` : value.start,
        ends_at: value.allDay ? `${value.end}T00:00:00-03:00` : value.end,
        start_date: value.allDay ? value.start : null, end_date: value.allDay ? value.end : null, reminders: value.reminders,
    } : {
        title: value.title, google_notes: value.description, google_undated: !value.start,
        scheduled_at: value.start ? `${value.start}T${previous && !(previous as TaskRow).google_undated ? saoTime((previous as TaskRow).scheduled_at) : "09:00"}:00-03:00` : "9999-01-01T12:00:00Z",
        completed_at: value.completed ? (previous as TaskRow | null)?.completed_at ?? new Date().toISOString() : null,
        task_status: value.completed ? "completed" : previous && (previous as TaskRow).task_status !== "completed" ? (previous as TaskRow).task_status : "todo",
        ...(!previous ? { kind: "action" } : {}),
    };
    if (previous) {
        const updated = checked(await ctx.db.from(table(link.kind)).update(values).eq("owner_id", ctx.owner).eq("id", link.local_id).eq("updated_at", previous.updated_at).select("id"));
        if (!updated?.length)
            throw new Error("O registro local mudou durante a sincronização. Tente novamente.");
    }
    else
        checked(await ctx.db.from(table(link.kind)).insert({ id: link.local_id, owner_id: ctx.owner, ...values }));
}
export async function containers(ctx: Context, token: string, c: Connection, check: () => void) {
    const marker = `Escoply · ${ctx.owner}`;
    if (!c.calendar_id) {
        const calendars = await listAll<{
            id: string;
            description?: string;
        }>(token, "/calendar/v3/users/me/calendarList?maxResults=250", check);
        let calendar = calendars.find(item => item.description === marker);
        if (!calendar) {
            check();
            calendar = await googleFetch<{
                id: string;
            }>(token, "/calendar/v3/calendars", "POST", { summary: "Escoply", description: marker, timeZone: "America/Sao_Paulo" });
        }
        c.calendar_id = calendar.id;
        checked(await ctx.db.from("google_connections").update({ calendar_id: calendar.id }).eq("owner_id", ctx.owner));
    }
    if (!c.tasklist_id) {
        const title = `Escoply · ${ctx.owner.slice(0, 8)}`;
        const lists = await listAll<{
            id: string;
            title: string;
        }>(token, "/tasks/v1/users/@me/lists?maxResults=100", check);
        let list = lists.find(item => item.title === title);
        if (!list) {
            check();
            list = await googleFetch<{
                id: string;
                title: string;
            }>(token, "/tasks/v1/users/@me/lists", "POST", { title });
        }
        c.tasklist_id = list.id;
        checked(await ctx.db.from("google_connections").update({ tasklist_id: list.id }).eq("owner_id", ctx.owner));
    }
}
export async function resolveGoogleIssue(id: string, choice: "local" | "remote" | "delete") {
    if (!/^[a-f0-9-]{36}$/i.test(id) || !["local", "remote", "delete"].includes(choice))
        throw new Error("Escolha inválida.");
    const ctx = await googleContext();
    const lease = randomUUID();
    if (!checked(await ctx.db.rpc("acquire_google_lock", { p_owner: ctx.owner, p_lock: lease })))
        throw new Error("Aguarde alguns segundos antes de continuar.");
    try {
        const link = checked(await ctx.db.from("google_sync_links").select("*").eq("owner_id", ctx.owner).eq("id", id).single()) as Link;
        if (!link.issue || link.issue.startsWith("Não suportado"))
            throw new Error("Este item deve ser ajustado no Google antes de sincronizar.");
        const current = localValue(link.kind, await localRow(ctx, link.kind, link.local_id));
        if (choice === "local" && !current || choice === "remote" && !link.remote_snapshot)
            throw new Error("A versão escolhida não existe. Use confirmar exclusão ou mantenha a outra versão.");
        await patchLink(ctx, id, { resolution: choice, resolution_local: current, resolution_remote: link.remote_snapshot, issue: "Escolha pendente de sincronização" });
    }
    finally {
        await ctx.db.from("google_connections").update({ lock_id: null, lock_until: null }).eq("owner_id", ctx.owner).eq("lock_id", lease);
    }
}
export async function syncGoogle(selection?: SyncSelection, target?: { kind: SyncKind; ids: string[] }) {
    if (selection) validateSelection(selection);
    const ctx = await googleContext();
    const lease = randomUUID();
    if (!checked(await ctx.db.rpc("acquire_google_lock", { p_owner: ctx.owner, p_lock: lease })))
        throw new Error("Sincronização em andamento ou recém-executada. Aguarde alguns segundos.");
    const started = Date.now();
    let requests = 0;
    let changes = 0;
    let issues = 0;
    const check = () => { if (++requests > 60 || Date.now() - started > 40000)
        throw new Error("Lote pausado para respeitar os limites. Alterações já confirmadas foram preservadas; clique em Sincronizar novamente."); };
    try {
        if (!checked(await ctx.db.rpc("reserve_google_requests", { p_count: 65 })))
            throw new Error("Limite diário de testes atingido. Tente novamente amanhã (UTC).");
        const c = checked(await ctx.db.from("google_connections").select("*").eq("owner_id", ctx.owner).single()) as Connection;
        const token = await accessToken(ctx, c);
        await containers(ctx, token, c, check);
        for (const kind of ["event", "task"] as const) {
            if (target && target.kind !== kind) continue;
            if (selection && !(kind === "event" ? selection.events : selection.tasks)) continue;
            const path = resourcePath(kind, kind === "event" ? c.calendar_id! : c.tasklist_id!);
            // Never infer deletions until the entire remote collection has been read successfully.
            const remote = await listAll<RemoteItem>(token, path + (kind === "event" ? "?maxResults=250&showDeleted=true&singleEvents=false" : "?maxResults=100&showDeleted=true&showCompleted=true&showHidden=true"), check);
            const projectedIds = new Set<string>();
            if (kind === "event") for (let offset = 0;; offset += 500) {
                check();
                const rows = checked(await ctx.db.from("google_business_links").select("remote_id").eq("owner_id", ctx.owner).order("id").range(offset, offset + 499)) as { remote_id: string }[];
                rows.forEach(row => projectedIds.add(row.remote_id));
                if (rows.length < 500) break;
            }
            const remotes = new Map(remote.map(r => [r.id, r]));
            const links: Link[] = [];
            for (let offset = 0;; offset += 500) {
                check();
                const batch = checked(await ctx.db.from("google_sync_links").select("*").eq("owner_id", ctx.owner).eq("kind", kind).order("id").range(offset, offset + 499)) as Link[];
                links.push(...batch);
                if (batch.length < 500)
                    break;
            }
            // Recover interrupted inserts before discovering remote-only records.
            for (const link of links.filter(l => !l.remote_id)) {
                const found = kind === "event" ? remotes.get(link.id.replaceAll("-", "")) : remote.find(r => r.notes?.includes(`[escoply:${link.id}]`));
                if (found) {
                    link.remote_id = found.id;
                    await patchLink(ctx, link.id, { remote_id: found.id, insertion_pending: false });
                }
            }
            const knownRemote = new Set(links.map(l => l.remote_id));
            for (const r of remote) {
                if (target) continue;
                if (projectedIds.has(r.id) || r.extendedProperties?.private?.escoplyProjection) continue;
                if (knownRemote.has(r.id) || r.deleted || r.status === "cancelled")
                    continue;
                if (selection) {
                    const value = remoteValue(kind, r);
                    if (value && selectionReason(value, selection)) continue;
                }
                check();
                const id = randomUUID();
                const link = checked(await ctx.db.from("google_sync_links").insert({ id, owner_id: ctx.owner, kind, local_id: randomUUID(), remote_id: r.id }).select().single()) as Link;
                links.push(link);
            }
            const knownLocal = new Set(links.map(l => l.local_id));
            for (let offset = 0;; offset += 500) {
                check();
                const batch = checked(await ctx.db.from(table(kind)).select("*").eq("owner_id", ctx.owner).order("id").range(offset, offset + 499)) as (CalendarEventRow | TaskRow)[];
                for (const row of batch)
                    if (!knownLocal.has(row.id)) {
                        if (target && !target.ids.includes(row.id)) continue;
                        const value = localValue(kind, row);
                        if (selection && value && selectionReason(value, selection)) continue;
                        check();
                        const link = checked(await ctx.db.from("google_sync_links").insert({ owner_id: ctx.owner, kind, local_id: row.id }).select().single()) as Link;
                        links.push(link);
                    }
                if (batch.length < 500)
                    break;
            }
            const cursor = c[kind === "event" ? "cursor_event" : "cursor_task"];
            links.sort((a, b) => a.id.localeCompare(b.id));
            const ordered = cursor ? [...links.filter(l => l.id > cursor), ...links.filter(l => l.id <= cursor)] : links;
            for (const link of ordered) {
                if (target && !target.ids.includes(link.local_id)) continue;
                if (Date.now() - started > 40000 || changes >= 25)
                    throw new Error("Lote concluído parcialmente. Clique em Sincronizar novamente para continuar.");
                checked(await ctx.db.from("google_connections").update({ [kind === "event" ? "cursor_event" : "cursor_task"]: link.id }).eq("owner_id", ctx.owner));
                const previous = await localRow(ctx, kind, link.local_id);
                const local = localValue(kind, previous);
                let r = link.remote_id ? remotes.get(link.remote_id) : undefined;
                const bad = r ? unsupported(kind, r) : null;
                if (bad) {
                    await patchLink(ctx, link.id, { issue: `Não suportado: ${bad}` });
                    issues++;
                    continue;
                }
                let remoteState: SyncValue | null = null;
                const issue = async (message: string) => { await patchLink(ctx, link.id, { issue: message, remote_snapshot: remoteState, resolution: null, resolution_local: null, resolution_remote: null }); issues++; };
                try {
                    remoteState = remoteValue(kind, r);
                    if (!local && !remoteState) {
                        checked(await ctx.db.from("google_sync_links").delete().eq("owner_id", ctx.owner).eq("id", link.id));
                        continue;
                    }
                    // First import: a durable mapping was committed before inserting the local record.
                    if (!previous && !link.baseline && remoteState && !link.resolution) {
                        await saveLocal(ctx, link, remoteState, null);
                        await patchLink(ctx, link.id, { baseline: remoteState, remote_snapshot: remoteState });
                        changes++;
                        continue;
                    }
                    let decision = decideSync(local, remoteState, link.baseline);
                    if (!link.remote_id && local && !link.baseline && !link.insertion_pending)
                        decision = "push";
                    if (link.resolution) {
                        if (canonical(local) !== canonical(link.resolution_local) || canonical(remoteState) !== canonical(link.resolution_remote)) {
                            await issue("O registro mudou após sua escolha. Revise novamente.");
                            continue;
                        }
                        decision = link.resolution === "delete" ? "gone" : link.resolution === "local" ? "push" : "pull";
                    }
                    else if (link.insertion_pending && !link.remote_id) {
                        await issue("Criação no Google sem confirmação. Confira no Google antes de escolher Manter Escoply para tentar novamente.");
                        continue;
                    }
                    if (decision === "conflict" || decision === "deletion") {
                        await issue(decision === "conflict" ? "Alterado nos dois lados. Escolha a versão a manter." : "Exclusão detectada. Confirme excluir ou escolha a versão que deseja restaurar.");
                        continue;
                    }
                    if (decision === "gone") {
                        if (r && remoteState) {
                            check();
                            await googleFetch(token, `${path}/${encodeURIComponent(r.id)}`, "DELETE", undefined, r.etag);
                        }
                        await saveLocal(ctx, link, null, previous);
                        checked(await ctx.db.from("google_sync_links").delete().eq("owner_id", ctx.owner).eq("id", link.id));
                        changes++;
                        continue;
                    }
                    if (decision === "pull" && remoteState) {
                        await saveLocal(ctx, link, remoteState, previous);
                        changes++;
                    }
                    if (decision === "push" && local) {
                        check();
                        const body = payload(kind, local, link.id, !remoteState);
                        if (!remoteState) {
                            const eventId = link.remote_id ? randomUUID().replaceAll("-", "") : link.id.replaceAll("-", "");
                            if (kind === "event")
                                await patchLink(ctx, link.id, { insertion_pending: true, remote_id: eventId });
                            else
                                await patchLink(ctx, link.id, { insertion_pending: true, remote_id: null });
                            // Calendar supports client IDs. Tasks uses a persistent marker and an uncertainty fence.
                            r = await googleFetch<RemoteItem>(token, path, "POST", kind === "event" ? { ...body, id: eventId } : body);
                        }
                        else
                            r = await googleFetch<RemoteItem>(token, `${path}/${encodeURIComponent(r!.id)}`, "PATCH", body, r!.etag);
                        remoteState = remoteValue(kind, r);
                        changes++;
                        await patchLink(ctx, link.id, { remote_id: r.id, insertion_pending: false });
                    }
                    await patchLink(ctx, link.id, { baseline: remoteState, remote_snapshot: remoteState, issue: null, resolution: null, resolution_local: null, resolution_remote: null });
                    // Only remove recovery metadata after the remote ID and baseline are durable.
                    if (kind === "task" && r?.notes?.includes(`[escoply:${link.id}]`) && remoteState) {
                        check();
                        await googleFetch(token, `${path}/${encodeURIComponent(r.id)}`, "PATCH", { notes: remoteState.description }, r.etag);
                        changes++;
                    }
                }
                catch (e) {
                    if (e instanceof GoogleApiError && (e.status === 401 || e.status === 403 || e.status === 429))
                        throw e;
                    await issue(e instanceof Error ? e.message : "Não foi possível atualizar este registro.");
                }
            }
        }
        const message = `${changes} alteração(ões) sincronizada(s) nas categorias selecionadas. ${issues ? `${issues} item(ns) precisam de revisão.` : "Nenhuma pendência encontrada."}`;
        checked(await ctx.db.from("google_connections").update({ last_sync_at: new Date().toISOString(), last_message: message }).eq("owner_id", ctx.owner));
        return message;
    }
    catch (e) {
        await ctx.db.from("google_connections").update({ last_message: e instanceof Error ? e.message : "Falha ao sincronizar." }).eq("owner_id", ctx.owner);
        throw e;
    }
    finally {
        await ctx.db.from("google_connections").update({ lock_id: null, lock_until: null }).eq("owner_id", ctx.owner).eq("lock_id", lease);
    }
}
