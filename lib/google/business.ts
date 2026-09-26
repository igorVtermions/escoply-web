import "server-only";
import { randomUUID } from "node:crypto";
import { checked, googleContext, accessToken, googleFetch, GoogleApiError, type Connection } from "./server";
import { containers } from "./sync";
import { canonical, type SyncValue } from "./model";
import { listAll, payload, remoteValue, resourcePath, unsupported, type RemoteItem } from "./provider";
import { businessValue, validateBusinessSelection, type BusinessSelection, type BusinessItem, type BusinessKind } from "./business-model";
type Context = Awaited<ReturnType<typeof googleContext>>;
type Link = { id: string; source_type: BusinessKind; source_id: string; remote_id: string; baseline: SyncValue | null; remote_snapshot: SyncValue | null; issue: string | null; paused: boolean; resolution: boolean; resolution_local: SyncValue | null; resolution_remote: SyncValue | null };
const sources = {
    project: { table: "projects", fields: "id,name,deadline,status", date: "deadline", title: "name", prefix: "Prazo final: " },
    budget: { table: "budgets", fields: "id,valid_until,status,projects(name)", date: "valid_until", title: "", prefix: "Validade do orçamento: " },
    payment: { table: "payments", fields: "id,description,due_date,status", date: "due_date", title: "description", prefix: "Recebimento: " },
    obligation: { table: "obligations", fields: "id,title,due_date,status", date: "due_date", title: "title", prefix: "Obrigação: " },
};
// Full owner-filtered pagination; never infer removal from a dashboard's limited list.
export async function businessItems(ctx: Context, kinds: BusinessKind[]): Promise<BusinessItem[]> {
    const items: BusinessItem[] = [];
    for (const kind of kinds) {
        const source = sources[kind];
        for (let offset = 0;; offset += 500) {
            const rows = checked(await ctx.db.from(source.table).select(source.fields).eq("owner_id", ctx.owner).order("id").range(offset, offset + 499)) as unknown as Record<string, unknown>[];
            for (const row of rows) {
                const project = row.projects as { name?: string } | null;
                const status = String(row.status);
                const inactive = ["completed", "archived", "paid", "cancelled", "canceled", "inactive", "rejected", "approved", "expired"].includes(status);
                items.push({ id: String(row.id), kind, title: (source.prefix + (source.title ? String(row[source.title] ?? "") : project?.name ?? "Orçamento")).slice(0, 180), date: String(row[source.date] ?? ""), active: !inactive });
            }
            if (rows.length < 500) break;
            if (offset >= 9500) throw new Error("Mais de 10.000 registros na categoria. Operação interrompida sem inferir exclusões.");
        }
    }
    return items;
}
async function linksFor(ctx: Context): Promise<Link[]> {
    const links: Link[] = [];
    for (let offset = 0;; offset += 500) {
        const rows = checked(await ctx.db.from("google_business_links").select("*").eq("owner_id", ctx.owner).order("id").range(offset, offset + 499)) as Link[];
        links.push(...rows);
        if (rows.length < 500) return links;
        if (offset >= 9500) throw new Error("Limite de vínculos de prazos atingido.");
    }
}
export async function businessPreview(selection: BusinessSelection) {
    validateBusinessSelection(selection);
    const ctx = await googleContext();
    const [items, links] = await Promise.all([businessItems(ctx, selection.kinds), linksFor(ctx)]);
    const rows = items.map(item => {
        const link = links.find(l => l.source_type === item.kind && l.source_id === item.id);
        return { id: `${item.kind}:${item.id}`, title: item.title, date: item.date, reason: link?.paused ? "Pausado" : link ? "Vínculo existente: revisar/atualizar" : !businessValue(item, selection.minutes) ? "Sem data válida ou encerrado" : selection.from && item.date < selection.from ? "Anterior ao período escolhido" : "Novo evento de dia inteiro" };
    });
    return { rows: rows.slice(0, 200), total: rows.length, issues: links.filter(l => l.issue).map(l => ({ id: l.id, title: l.baseline?.title ?? "Prazo", message: l.issue!, local: items.find(i => i.kind === l.source_type && i.id === l.source_id) ? businessValue(items.find(i => i.kind === l.source_type && i.id === l.source_id)!, selection.minutes) : null, remote: l.remote_snapshot, paused: l.paused })) };
}
export async function resolveBusinessIssue(id: string, restore: boolean, selection: BusinessSelection) {
    validateBusinessSelection(selection);
    if (!/^[a-f0-9-]{36}$/i.test(id) || typeof restore !== "boolean") throw new Error("Escolha inválida.");
    const ctx = await googleContext(); const lease = randomUUID();
    if (!checked(await ctx.db.rpc("acquire_google_lock", { p_owner: ctx.owner, p_lock: lease }))) throw new Error("Aguarde alguns segundos e tente novamente.");
    try {
        const link = checked(await ctx.db.from("google_business_links").select("*").eq("owner_id", ctx.owner).eq("id", id).single()) as Link;
        if (!link.issue || !selection.kinds.includes(link.source_type)) throw new Error("Atualize a prévia e selecione a categoria do prazo.");
        const item = (await businessItems(ctx, [link.source_type])).find(i => i.id === link.source_id);
        checked(await ctx.db.from("google_business_links").update({ paused: !restore, resolution: restore, resolution_local: item ? businessValue(item, selection.minutes) : null, resolution_remote: link.remote_snapshot }).eq("owner_id", ctx.owner).eq("id", id));
    } finally { await ctx.db.from("google_connections").update({ lock_id: null, lock_until: null }).eq("owner_id", ctx.owner).eq("lock_id", lease); }
}
export async function syncBusiness(selection: BusinessSelection, targetIds?: string[]) {
    validateBusinessSelection(selection);
    if (!selection.kinds.length) throw new Error("Selecione pelo menos uma categoria de prazo.");
    const ctx = await googleContext(); const lease = randomUUID();
    if (!checked(await ctx.db.rpc("acquire_google_lock", { p_owner: ctx.owner, p_lock: lease }))) throw new Error("Aguarde alguns segundos e tente novamente.");
    let operations = 0, changed = 0, issues = 0; const started = Date.now();
    const check = () => { if (++operations > 60 || Date.now() - started > 40000) throw new Error("Prazos parcialmente processados. Continue a sincronização; vínculos confirmados foram preservados."); };
    try {
        if (!checked(await ctx.db.rpc("reserve_google_requests", { p_count: 65 }))) throw new Error("Limite diário de testes atingido.");
        const connection = checked(await ctx.db.from("google_connections").select("*").eq("owner_id", ctx.owner).single()) as Connection;
        const token = await accessToken(ctx, connection);
        await containers(ctx, token, connection, check);
        const path = resourcePath("event", connection.calendar_id!);
        const remote = await listAll<RemoteItem>(token, path + "?maxResults=250&showDeleted=true&singleEvents=false", check);
        const items = await businessItems(ctx, selection.kinds);
        const links = await linksFor(ctx);
        const save = async (id: string, values: Partial<Link>) => { checked(await ctx.db.from("google_business_links").update(values).eq("owner_id", ctx.owner).eq("id", id)); };
        for (const item of items) {
            if (targetIds && !targetIds.includes(item.id)) continue;
            if (links.some(l => l.source_type === item.kind && l.source_id === item.id) || !businessValue(item, selection.minutes) || (selection.from && item.date < selection.from)) continue;
            check();
            const id = randomUUID();
            links.push(checked(await ctx.db.from("google_business_links").insert({ id, owner_id: ctx.owner, source_type: item.kind, source_id: item.id, remote_id: id.replaceAll("-", "") }).select().single()) as Link);
        }
        for (const link of links) {
            if (targetIds && !targetIds.includes(link.source_id)) continue;
            if (!selection.kinds.includes(link.source_type) || link.paused) continue;
            if (changed >= 25) throw new Error("Prazos parcialmente processados. Continue para enviar os próximos itens.");
            const item = items.find(i => i.kind === link.source_type && i.id === link.source_id);
            const local = item ? businessValue(item, selection.minutes) : null;
            let r = remote.find(r => r.id === link.remote_id);
            const value = remoteValue("event", r);
            const bad = r && unsupported("event", r);
            if (bad) { await save(link.id, { issue: bad, remote_snapshot: value }); issues++; continue; }
            if (canonical(local) === canonical(value)) {
                if (link.issue || link.resolution || canonical(link.baseline) !== canonical(value)) await save(link.id, { baseline: value, remote_snapshot: value, issue: null, resolution: false });
                continue;
            }
            const stale = link.resolution && (canonical(local) !== canonical(link.resolution_local) || canonical(value) !== canonical(link.resolution_remote));
            if (stale || (!link.resolution && canonical(value) !== canonical(link.baseline))) {
                await save(link.id, { issue: "O prazo foi alterado no Google. Revise as versões antes de substituir. O registro de negócio foi preservado.", remote_snapshot: value, resolution: false }); issues++; continue;
            }
            // A cancelled ID cannot be reused. Persist its replacement before the request.
            if (local && !value && r) { link.remote_id = randomUUID().replaceAll("-", ""); await save(link.id, { remote_id: link.remote_id }); r = undefined; }
            try {
                check();
                if (!local) {
                    if (value && r) await googleFetch(token, `${path}/${encodeURIComponent(r.id)}`, "DELETE", undefined, r.etag);
                    await save(link.id, { baseline: null, remote_snapshot: null, issue: null, resolution: false });
                } else {
                    const body = { ...payload("event", local, link.id), extendedProperties: { private: { escoplyProjection: link.id } } };
                    const result = await googleFetch<RemoteItem>(token, value && r ? `${path}/${encodeURIComponent(r.id)}` : path, value && r ? "PATCH" : "POST", value && r ? body : { ...body, id: link.remote_id }, r?.etag);
                    const confirmed = remoteValue("event", result);
                    await save(link.id, { baseline: confirmed, remote_snapshot: confirmed, issue: null, resolution: false });
                }
                changed++;
            } catch (e) {
                if (e instanceof GoogleApiError && [401, 403, 429].includes(e.status)) throw e;
                await save(link.id, { issue: e instanceof Error ? e.message : "Falha no envio do prazo.", remote_snapshot: value }); issues++;
            }
        }
        return `${changed} prazo(s) atualizado(s); ${issues} item(ns) para revisar. Categorias desmarcadas foram preservadas.`;
    } finally { await ctx.db.from("google_connections").update({ lock_id: null, lock_until: null }).eq("owner_id", ctx.owner).eq("lock_id", lease); }
}
