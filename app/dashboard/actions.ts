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

function getValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function revalidateDashboardSurfaces() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard/obrigacoes");
}

export async function markNotificationSeenAction(source: "task" | "obligation", notificationId: string): Promise<ReminderActionResult> {
  const user = await requireUser();

  if (!isValidUuid(notificationId)) {
    return { success: false, message: "Notificação inválida." };
  }

  const supabase = await createSupabaseServerClient();
  const table = source === "task" ? "reminders" : "obligations";
  const { error } = await supabase
    .from(table)
    .update({ notification_read_at: new Date().toISOString() })
    .eq("owner_id", user.id)
    .eq("id", notificationId);

  if (error) {
    return { success: false, message: "Não foi possível marcar a notificação como lida." };
  }

  revalidateDashboardSurfaces();
  return { success: true, message: "Notificação marcada como lida." };
}

export async function markReminderSeenAction(reminderId: string): Promise<ReminderActionResult> {
  return markNotificationSeenAction("task", reminderId);
}

export async function clearNotificationsAction(): Promise<ReminderActionResult> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const remindersResult = await supabase
    .from("reminders")
    .update({ notification_dismissed_at: now.toISOString() })
    .eq("owner_id", user.id)
    .is("completed_at", null)
    .is("notification_dismissed_at", null)
    .lt("scheduled_at", tomorrow.toISOString());

  const obligationsResult = await supabase
    .from("obligations")
    .update({ notification_dismissed_at: now.toISOString() })
    .eq("owner_id", user.id)
    .neq("status", "paid")
    .neq("status", "completed")
    .neq("status", "inactive")
    .is("notification_dismissed_at", null)
    .lt("due_date", tomorrow.toISOString().slice(0, 10));

  if (remindersResult.error || obligationsResult.error) {
    return { success: false, message: "Não foi possível limpar as notificações." };
  }

  revalidateDashboardSurfaces();
  return { success: true, message: "Notificações limpas." };
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

  revalidateDashboardSurfaces();
  return { success: true, message: "Obrigação criada com sucesso." };
}
