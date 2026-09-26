import { validDate, type SyncValue } from "./model";
export const businessLabels = { project: "Prazos de projetos", budget: "Validades de orçamentos", payment: "Recebimentos", obligation: "Obrigações" };
export type BusinessKind = keyof typeof businessLabels;
export type BusinessSelection = { kinds: BusinessKind[]; from: string; minutes: number | null };
export type BusinessItem = { id: string; kind: BusinessKind; title: string; date: string; active: boolean };
export function validateBusinessSelection(input: BusinessSelection) {
    if (!input || !Array.isArray(input.kinds) || input.kinds.length > 4 || input.kinds.some(k => !Object.hasOwn(businessLabels, k)) || new Set(input.kinds).size !== input.kinds.length || typeof input.from !== "string" || (input.from !== "" && !validDate(input.from)) || (input.minutes !== null && (!Number.isInteger(input.minutes) || input.minutes < 0 || input.minutes > 40320))) throw new Error("Preferências de prazos inválidas.");
    return input;
}
export function businessValue(item: BusinessItem, minutes: number | null): SyncValue | null {
    if (!item.active || !validDate(item.date)) return null;
    const end = new Date(`${item.date}T12:00:00Z`); end.setUTCDate(end.getUTCDate() + 1);
    return { title: item.title, description: "Prazo gerenciado pelo Escoply. Edite o registro de origem no aplicativo. Este evento não confirma pagamento, entrega ou aprovação.", start: item.date, end: end.toISOString().slice(0, 10), allDay: true, completed: false, reminders: { useDefault: false, overrides: minutes === null ? [] : [{ method: "popup", minutes }] } };
}
