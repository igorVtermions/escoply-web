"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ReminderActionResult = {
  success: boolean;
  message: string;
};

export type ObligationActionState = {
  success: boolean;
  message: string;
};

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function markReminderSeenAction(reminderId: string): Promise<ReminderActionResult> {
  const user = await requireUser();

  if (!isValidUuid(reminderId)) {
    return { success: false, message: "Notificação inválida." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("reminders")
    .update({ notification_read_at: new Date().toISOString() })
    .eq("owner_id", user.id)
    .eq("id", reminderId);

  if (error) {
    return { success: false, message: "Não foi possível marcar a notificação como lida." };
  }

  revalidatePath("/dashboard");
  return { success: true, message: "Notificação marcada como lida." };
}

function getValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function createObligationAction(_state: ObligationActionState, formData: FormData): Promise<ObligationActionState> {
  const user = await requireUser();
  const title = getValue(formData, "title");
  const dueDate = getValue(formData, "due_date");
  const rawType = getValue(formData, "type");
  const rawStatus = getValue(formData, "status");
  const type = ["tax", "contribution", "administrative", "financial", "other"].includes(rawType) ? rawType : "administrative";
  const status = ["not_started", "in_progress", "pending", "paid", "completed"].includes(rawStatus) ? rawStatus : "not_started";

  if (title.length < 2) return { success: false, message: "Informe um título com pelo menos 2 caracteres." };
  if (!dueDate || Number.isNaN(new Date(`${dueDate}T12:00:00Z`).getTime())) return { success: false, message: "Informe uma data válida." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("obligations").insert({
    owner_id: user.id,
    title,
    type,
    due_date: dueDate,
    status,
  });

  if (error) return { success: false, message: "Não foi possível criar a obrigação agora." };

  revalidatePath("/dashboard");
  return { success: true, message: "Obrigação criada com sucesso." };
}
