export type SyncKind = "event" | "task";
export type ReminderSettings = {
    useDefault: boolean;
    overrides?: {
        method: "popup" | "email";
        minutes: number;
    }[];
};
export type SyncValue = {
    title: string;
    description: string;
    start: string;
    end: string;
    allDay: boolean;
    completed: boolean;
    reminders: ReminderSettings;
};
export type CalendarEventRow = {
    id: string;
    title: string;
    description: string;
    starts_at: string;
    ends_at: string;
    all_day: boolean;
    start_date: string | null;
    end_date: string | null;
    reminders: ReminderSettings;
    updated_at: string;
};
export type TaskRow = {
    id: string;
    title: string;
    scheduled_at: string;
    completed_at: string | null;
    task_status: string;
    google_notes: string;
    google_undated: boolean;
    updated_at: string;
};
export type GoogleStatus = {
    automation?: { kinds: ("project" | "budget" | "payment" | "obligation")[]; minutes: number | null; pending: number; failed: number };
    ready: boolean;
    connected: boolean;
    email?: string;
    message?: string;
    lastSync?: string;
    issues: {
        id: string;
        title: string;
        message: string;
        local: SyncValue | null;
        remote: SyncValue | null;
    }[];
};
export function saoDate(value: string) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value))
        return value;
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
export function saoTime(value: string) {
    return new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
}
export function validDate(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function canonical(value: SyncValue | null): string {
    if (!value)
        return "null";
    const reminders = value.reminders.useDefault ? { useDefault: true } : { useDefault: false, overrides: [...(value.reminders.overrides ?? [])].sort((a, b) => a.minutes - b.minutes || a.method.localeCompare(b.method)) };
    return JSON.stringify([value.title, value.description, value.start, value.end, value.allDay, value.completed, reminders]);
}
export function decideSync(local: SyncValue | null, remote: SyncValue | null, baseline: SyncValue | null) {
    if (!local && !remote)
        return "gone";
    if (!local || !remote)
        return "deletion";
    if (canonical(local) === canonical(remote))
        return "equal";
    if (!baseline)
        return "conflict";
    const changedLocal = canonical(local) !== canonical(baseline);
    const changedRemote = canonical(remote) !== canonical(baseline);
    return changedLocal && changedRemote ? "conflict" : changedRemote ? "pull" : "push";
}
export function eventValue(row: CalendarEventRow): SyncValue {
    return { title: row.title, description: row.description, start: row.all_day ? row.start_date! : new Date(row.starts_at).toISOString(), end: row.all_day ? row.end_date! : new Date(row.ends_at).toISOString(), allDay: row.all_day, completed: false, reminders: row.reminders };
}
export function taskValue(row: TaskRow): SyncValue {
    return { title: row.title, description: row.google_notes, start: row.google_undated ? "" : saoDate(row.scheduled_at), end: "", allDay: true, completed: !!row.completed_at, reminders: { useDefault: false, overrides: [] } };
}
