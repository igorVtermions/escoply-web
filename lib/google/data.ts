import "server-only";
import { checked, googleConfig, googleContext, type Connection } from "./server";
import { eventValue, taskValue, type CalendarEventRow, type TaskRow, type GoogleStatus, type SyncValue, type SyncKind } from "./model";
export async function getGoogleStatus(): Promise<GoogleStatus> {
    try {
        googleConfig();
    }
    catch {
        return { ready: false, connected: false, message: "Integração aguardando configuração das variáveis Google no servidor.", issues: [] };
    }
    try {
        const ctx = await googleContext();
        const connection = checked(await ctx.db.from("google_connections").select("email,status,last_sync_at,last_message,auto_business,auto_reminder_minutes").eq("owner_id", ctx.owner).maybeSingle()) as (Connection & { auto_business: ("project" | "budget" | "payment" | "obligation")[]; auto_reminder_minutes: number | null }) | null;
        const pending = await ctx.db.from("google_outbox").select("local_id", { count: "exact", head: true }).eq("owner_id", ctx.owner);
        const failed = await ctx.db.from("google_outbox").select("local_id", { count: "exact", head: true }).eq("owner_id", ctx.owner).gte("attempts", 8);
        checked(pending); checked(failed);
        const links = checked(await ctx.db.from("google_sync_links").select("id,kind,local_id,issue,baseline,remote_snapshot").eq("owner_id", ctx.owner).not("issue", "is", null).order("id").limit(100)) as {
            id: string;
            kind: SyncKind;
            local_id: string;
            issue: string;
            baseline: SyncValue | null;
            remote_snapshot: SyncValue | null;
        }[];
        const events = checked(await ctx.db.from("calendar_events").select("*").eq("owner_id", ctx.owner).in("id", links.filter(l => l.kind === "event").map(l => l.local_id))) as CalendarEventRow[];
        const tasks = checked(await ctx.db.from("reminders").select("*").eq("owner_id", ctx.owner).in("id", links.filter(l => l.kind === "task").map(l => l.local_id))) as TaskRow[];
        return { automation: { kinds: connection?.auto_business ?? [], minutes: connection?.auto_reminder_minutes ?? null, pending: pending.count ?? 0, failed: failed.count ?? 0 }, ready: true, connected: connection?.status === "connected", email: connection?.email, lastSync: connection?.last_sync_at ?? undefined, message: connection?.last_message ?? undefined, issues: links.map(l => {
                const event = events.find(e => e.id === l.local_id);
                const task = tasks.find(t => t.id === l.local_id);
                return { id: l.id, title: l.remote_snapshot?.title ?? l.baseline?.title ?? "Registro excluído", message: l.issue, local: l.kind === "event" ? (event ? eventValue(event) : null) : (task ? taskValue(task) : null), remote: l.remote_snapshot };
            }) };
    }
    catch {
        return { ready: false, connected: false, message: "Integração indisponível. Confira a migration Google e a configuração do servidor.", issues: [] };
    }
}
