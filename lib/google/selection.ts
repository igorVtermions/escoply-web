import { saoDate, validDate, type SyncValue } from "./model";

export type SyncSelection = { tasks: boolean; events: boolean; from: string; includeCompleted: boolean; includeUndated: boolean };
export function defaultSelection(): SyncSelection {
    return { tasks: true, events: true, from: saoDate(new Date().toISOString()), includeCompleted: false, includeUndated: false };
}
export function validateSelection(value: SyncSelection): SyncSelection {
    if (!value || typeof value.tasks !== "boolean" || typeof value.events !== "boolean" || typeof value.includeCompleted !== "boolean" || typeof value.includeUndated !== "boolean" || typeof value.from !== "string" || (value.from !== "" && !validDate(value.from))) throw new Error("Seleção de sincronização inválida.");
    return value;
}
export function selectionReason(value: SyncValue, selection: SyncSelection): string | null {
    if (value.completed && !selection.includeCompleted) return "Concluída";
    if (!value.start) return selection.includeUndated ? null : "Sem data";
    if (selection.from && saoDate(value.start) < selection.from) return "Anterior ao período escolhido";
    return null;
}
