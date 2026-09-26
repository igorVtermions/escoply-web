"use server";
import { scheduleGoogleSync } from "@/lib/google/schedule";
import { revalidatePath } from "next/cache";
import { checked, googleContext } from "@/lib/google/server";
import { validDate } from "@/lib/google/model";
export async function editTaskAction(form: FormData) {
    try {
        const ctx = await googleContext();
        const title = String(form.get("title") ?? "").trim();
        const date = String(form.get("date") ?? "");
        const time = String(form.get("time") ?? "09:00");
        const notes = String(form.get("notes") ?? "");
        if (title.length < 2 || title.length > 180 || notes.length > 7000)
            throw new Error("Título deve ter entre 2 e 180 caracteres; notas até 7.000.");
        if (date && (!validDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)))
            throw new Error("Data ou horário inválido.");
        const rows = checked(await ctx.db.from("reminders").update({ title, google_notes: notes, google_undated: !date, scheduled_at: date ? `${date}T${time}:00-03:00` : "9999-01-01T12:00:00Z" }).eq("id", String(form.get("id"))).eq("owner_id", ctx.owner).eq("updated_at", String(form.get("version"))).select("id"));
        if (!rows?.length)
            throw new Error("A tarefa mudou. Feche e abra novamente antes de editar.");
        scheduleGoogleSync();
        revalidatePath("/dashboard", "layout");
        revalidatePath("/dashboard/agenda");
        revalidatePath("/dashboard/projetos", "layout");
        return { success: true, message: "Tarefa atualizada. Sincronize para enviar ao Google." };
    }
    catch (e) {
        return { success: false, message: e instanceof Error ? e.message : "Não foi possível editar." };
    }
}
