import "server-only";
import { checked, googleContext } from "./server";
import { eventValue, taskValue, type CalendarEventRow, type TaskRow } from "./model";
import { selectionReason, validateSelection, type SyncSelection } from "./selection";
export type SyncPreviewRow = { id: string; title: string; date: string; destination: string; reason: string; lastGoogleDate?: string };
export async function previewGoogle(selection: SyncSelection) {
    validateSelection(selection);
    const ctx = await googleContext(); const rows: SyncPreviewRow[] = [];
    const counts = { newItems: 0, linked: 0, skipped: 0 };
    for (const kind of ["event", "task"] as const) {
        if (!(kind === "event" ? selection.events : selection.tasks)) continue;
        const links: { local_id: string; baseline: { start?: string } | null }[] = [];
        for (let offset = 0;; offset += 500) {
            const batch = checked(await ctx.db.from("google_sync_links").select("local_id,baseline").eq("owner_id", ctx.owner).eq("kind", kind).order("id").range(offset, offset + 499)) ?? [];
            links.push(...batch); if (batch.length < 500) break;
        }
        for (let offset = 0;; offset += 500) {
            const batch = checked(await ctx.db.from(kind === "event" ? "calendar_events" : "reminders").select("*").eq("owner_id", ctx.owner).order("id").range(offset, offset + 499)) as (CalendarEventRow | TaskRow)[];
            for (const row of batch) {
                const value = kind === "event" ? eventValue(row as CalendarEventRow) : taskValue(row as TaskRow);
                const link = links.find(l => l.local_id === row.id);
                const reason = selectionReason(value, selection);
                if (link) counts.linked++; else if (reason) counts.skipped++; else counts.newItems++;
                if (rows.length < 200) rows.push({ id: `${kind}:${row.id}`, title: value.title, date: value.start, destination: kind === "event" ? "Google Agenda" : "Google Tasks (somente dia)", reason: link ? "Vínculo existente: sincronizar nos dois sentidos" : reason ?? "Novo envio", lastGoogleDate: link?.baseline?.start });
            }
            if (batch.length < 500) break;
            if (offset >= 9500) throw new Error("Prévia limitada a 10.000 registros por categoria. Refine a base antes de continuar.");
        }
    }
    return { rows, counts };
}
