import "server-only";
import { checked, googleContext } from "./server";
import { syncGoogle } from "./sync";
import { syncBusiness } from "./business";
import type { BusinessKind } from "./business-model";
type QueueItem = { kind: "task" | "event" | BusinessKind; local_id: string; version: string; attempts: number };
export async function flushGoogleQueue() {
    const ctx = await googleContext();
    const connection = checked(await ctx.db.from("google_connections").select("status,auto_business,auto_reminder_minutes,last_attempt_at,lock_until").eq("owner_id", ctx.owner).maybeSingle());
    if (!connection || connection.status !== "connected") return { enabled: false, message: "", processed: 0 };
    if ((connection.lock_until && Date.parse(connection.lock_until) > Date.now()) || (connection.last_attempt_at && Date.parse(connection.last_attempt_at) > Date.now() - 12000)) return { enabled: true, message: "Envio automático aguardando a operação atual.", processed: 0 };
    const rows = checked(await ctx.db.from("google_outbox").select("kind,local_id,version,attempts").eq("owner_id", ctx.owner).lt("attempts", 8).lte("retry_at", new Date().toISOString()).order("queued_at").limit(10)) as QueueItem[];
    if (!rows.length) return { enabled: true, message: "", processed: 0 };
    const group = rows.filter(r => r.kind === rows[0].kind); const kind = group[0].kind;
    try {
        let message = "Categoria pausada; registros preservados.";
        if (kind === "task" || kind === "event") message = await syncGoogle(undefined, { kind, ids: group.map(r => r.local_id) });
        else if ((connection.auto_business as string[]).includes(kind)) message = await syncBusiness({ kinds: [kind], from: "", minutes: connection.auto_reminder_minutes }, group.map(r => r.local_id));
        const taskKind = kind === "task" || kind === "event";
        const links = checked(await ctx.db.from(taskKind ? "google_sync_links" : "google_business_links").select("issue").eq("owner_id", ctx.owner).eq(taskKind ? "kind" : "source_type", kind).in(taskKind ? "local_id" : "source_id", group.map(r => r.local_id))) as { issue: string | null }[];
        if (links.some(link => link.issue)) throw new Error("Envio com pendências. Revise os itens no painel Google; alterações locais foram preservadas.");
        // A new edit replaces version; never acknowledge a newer pending change.
        for (const row of group) checked(await ctx.db.from("google_outbox").delete().eq("owner_id", ctx.owner).eq("kind", kind).eq("local_id", row.local_id).eq("version", row.version));
        return { enabled: true, message, processed: group.length };
    } catch (e) {
        const message = e instanceof Error ? e.message : "Envio Google pendente. Tente novamente no painel da integração.";
        for (const row of group) checked(await ctx.db.from("google_outbox").update({ attempts: row.attempts + 1, retry_at: new Date(Date.now() + Math.min(3600000, 30000 * 2 ** row.attempts)).toISOString(), last_error: message }).eq("owner_id", ctx.owner).eq("kind", row.kind).eq("local_id", row.local_id).eq("version", row.version));
        return { enabled: true, message, processed: 0 };
    }
}
