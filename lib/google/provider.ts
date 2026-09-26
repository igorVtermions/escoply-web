import "server-only";
import { googleFetch } from "./server";
import type { SyncKind, SyncValue, ReminderSettings } from "./model";
export type RemoteItem = {
    extendedProperties?: { private?: Record<string, string> };
    id: string;
    etag?: string;
    status?: string;
    deleted?: boolean;
    summary?: string;
    title?: string;
    description?: string;
    notes?: string;
    due?: string;
    start?: {
        date?: string;
        dateTime?: string;
    };
    end?: {
        date?: string;
        dateTime?: string;
    };
    reminders?: ReminderSettings;
    recurrence?: string[];
    recurringEventId?: string;
    parent?: string;
    eventType?: string;
};
export async function listAll<T>(token: string, path: string, check: () => void): Promise<T[]> {
    const result: T[] = [];
    let pageToken: string | undefined;
    do {
        check();
        const url = new URL(path, "https://example.invalid");
        if (pageToken)
            url.searchParams.set("pageToken", pageToken);
        const page = await googleFetch<{
            items?: T[];
            nextPageToken?: string;
        }>(token, url.pathname + url.search);
        result.push(...(page.items ?? []));
        pageToken = page.nextPageToken;
        if (result.length > 2000)
            throw new Error("Esta versão de testes suporta até 2.000 registros por coleção. Nenhum item ausente será tratado como excluído.");
    } while (pageToken);
    return result;
}
export function resourcePath(kind: SyncKind, container: string) {
    return kind === "event" ? `/calendar/v3/calendars/${encodeURIComponent(container)}/events` : `/tasks/v1/lists/${encodeURIComponent(container)}/tasks`;
}
export function unsupported(kind: SyncKind, r: RemoteItem) {
    if (kind === "event" && (r.recurrence?.length || r.recurringEventId || (r.eventType && r.eventType !== "default")))
        return "Evento recorrente ou especial não suportado nesta versão. Edite no Google.";
    if (kind === "task" && r.parent)
        return "Subtarefas não são sincronizadas nesta versão. Edite no Google.";
    return null;
}
export function remoteValue(kind: SyncKind, r: RemoteItem | undefined): SyncValue | null {
    if (!r || r.deleted || r.status === "cancelled")
        return null;
    const task = kind === "task";
    const allDay = task || !!r.start?.date;
    const start = task ? r.due?.slice(0, 10) ?? "" : r.start?.date ?? (r.start?.dateTime ? new Date(r.start.dateTime).toISOString() : "");
    const end = task ? "" : r.end?.date ?? (r.end?.dateTime ? new Date(r.end.dateTime).toISOString() : "");
    if (!task && (!start || !end))
        throw new Error("Evento Google sem início ou fim válido.");
    return { title: task ? r.title ?? "" : r.summary ?? "", description: task ? (r.notes ?? "").replace(/\n?\[escoply:[a-f0-9-]+\]/g, "") : r.description ?? "", start, end, allDay, completed: task && r.status === "completed", reminders: task ? { useDefault: false, overrides: [] } : r.reminders ?? { useDefault: true } };
}
export function payload(kind: SyncKind, value: SyncValue, linkId: string, includeMarker = true) {
    if (kind === "task")
        return { title: value.title, notes: includeMarker ? `${value.description}\n[escoply:${linkId}]` : value.description, due: value.start ? `${value.start}T00:00:00.000Z` : null, status: value.completed ? "completed" : "needsAction", ...(!value.completed ? { completed: null } : {}) };
    return { summary: value.title, description: value.description, start: value.allDay ? { date: value.start } : { dateTime: value.start, timeZone: "America/Sao_Paulo" }, end: value.allDay ? { date: value.end } : { dateTime: value.end, timeZone: "America/Sao_Paulo" }, reminders: value.reminders };
}
