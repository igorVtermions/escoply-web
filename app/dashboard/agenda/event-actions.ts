"use server";
import { scheduleGoogleSync } from "@/lib/google/schedule";
import { revalidatePath } from "next/cache";
import { checked, googleContext } from "@/lib/google/server";
import { validDate } from "@/lib/google/model";
function refresh() {
  scheduleGoogleSync(); revalidatePath("/dashboard/agenda"); revalidatePath("/dashboard/configuracoes"); }
export async function saveCalendarEventAction(form: FormData) {
    try {
        const ctx = await googleContext();
        const text = (name: string) => String(form.get(name) ?? "").trim();
        const id = text("id");
        const title = text("title");
        const description = text("description");
        const allDay = form.get("all_day") === "on";
        const start = text("start");
        const end = text("end");
        if (title.length < 2 || title.length > 180 || description.length > 8000)
            throw new Error("Informe título entre 2 e 180 caracteres e descrição de até 8.000 caracteres.");
        if (id && !/^[a-f0-9-]{36}$/i.test(id))
            throw new Error("Compromisso inválido.");
        if (allDay ? !validDate(start) || !validDate(end) : !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(end) || !validDate(start.slice(0, 10)) || !validDate(end.slice(0, 10)))
            throw new Error("Informe datas válidas.");
        const startsAt = allDay ? `${start}T00:00:00-03:00` : `${start}:00-03:00`;
        const endsAt = allDay ? `${end}T00:00:00-03:00` : `${end}:00-03:00`;
        if (!Number.isFinite(Date.parse(startsAt)) || !Number.isFinite(Date.parse(endsAt)) || Date.parse(endsAt) <= Date.parse(startsAt))
            throw new Error("O término precisa ser posterior ao início.");
        const minutes = text("reminder");
        if (!["keep", "default", "none", "0", "5", "10", "15", "30", "60", "1440"].includes(minutes))
            throw new Error("Lembrete inválido.");
        const reminders = minutes === "default" ? { useDefault: true } : { useDefault: false, overrides: minutes === "none" ? [] : [{ method: "popup", minutes: Number(minutes) }] };
        const values = { title, description, starts_at: startsAt, ends_at: endsAt, all_day: allDay, start_date: allDay ? start : null, end_date: allDay ? end : null, ...(minutes !== "keep" ? { reminders } : {}) };
        if (id) {
            const rows = checked(await ctx.db.from("calendar_events").update(values).eq("owner_id", ctx.owner).eq("id", id).eq("updated_at", text("version")).select("id"));
            if (!rows?.length)
                throw new Error("O compromisso mudou ou foi excluído. Atualize a agenda antes de editar.");
        }
        else
            checked(await ctx.db.from("calendar_events").insert({ ...values, owner_id: ctx.owner }));
        refresh();
        return { success: true, message: "Compromisso salvo. Com o Google conectado, o envio será automático." };
    }
    catch (e) {
        return { success: false, message: e instanceof Error ? e.message : "Não foi possível salvar." };
    }
}
export async function deleteCalendarEventAction(id: string, version: string) {
    try {
        const ctx = await googleContext();
        const rows = checked(await ctx.db.from("calendar_events").delete().eq("owner_id", ctx.owner).eq("id", id).eq("updated_at", version).select("id"));
        if (!rows?.length)
            throw new Error("O compromisso mudou. Atualize a agenda.");
        refresh();
        return { success: true, message: "Compromisso excluído no Escoply. A exclusão no Google será revisada na sincronização." };
    }
    catch (e) {
        return { success: false, message: e instanceof Error ? e.message : "Não foi possível excluir." };
    }
}
