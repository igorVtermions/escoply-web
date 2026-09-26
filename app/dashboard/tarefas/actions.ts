"use server";
import { scheduleGoogleSync } from "@/lib/google/schedule";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TaskKind } from "@/lib/tasks/data";

export type TaskActionState = {
  success: boolean;
  message: string;
};

function getValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getKind(value: string): TaskKind {
  return ["meeting", "action", "review", "delivery", "follow_up", "charge", "other"].includes(value) ? value as TaskKind : "action";
}

function revalidateTasks() {
  scheduleGoogleSync();
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tarefas");
  revalidatePath("/dashboard/agenda");
}

export async function createTaskAction(_state: TaskActionState, formData: FormData): Promise<TaskActionState> {
  const user = await requireUser();
  const title = getValue(formData, "title");
  const projectId = getValue(formData, "project_id");
  const scheduledDate = getValue(formData, "scheduled_date");
  const scheduledTime = getValue(formData, "scheduled_time") || "09:00";
  const kind = getKind(getValue(formData, "kind"));

  if (title.length < 2) return { success: false, message: "Informe um título com pelo menos 2 caracteres." };
  if (!scheduledDate || Number.isNaN(new Date(`${scheduledDate}T12:00:00Z`).getTime())) return { success: false, message: "Informe uma data válida." };
  if (projectId && !isValidUuid(projectId)) return { success: false, message: "Projeto inválido." };

  const supabase = await createSupabaseServerClient();
  if (projectId) {
    const { data, error } = await supabase.from("projects").select("id").eq("owner_id", user.id).eq("id", projectId).maybeSingle<{ id: string }>();
    if (error || !data) return { success: false, message: "Projeto não encontrado na sua conta." };
  }

  const { error } = await supabase.from("reminders").insert({
    owner_id: user.id,
    project_id: projectId || null,
    title,
    kind,
    task_status: "todo",
    scheduled_at: `${scheduledDate}T${scheduledTime}:00-03:00`,
  });

  if (error) return { success: false, message: "Não foi possível criar a tarefa agora." };
  revalidateTasks();
  return { success: true, message: "Tarefa criada com sucesso." };
}

export async function toggleTaskCompletedAction(taskId: string): Promise<TaskActionState> {
  const user = await requireUser();
  if (!isValidUuid(taskId)) return { success: false, message: "Tarefa inválida." };

  const supabase = await createSupabaseServerClient();
  const { data, error: readError } = await supabase.from("reminders").select("completed_at").eq("owner_id", user.id).eq("id", taskId).maybeSingle<{ completed_at: string | null }>();
  if (readError || !data) return { success: false, message: "Tarefa não encontrada." };

  const { error } = await supabase.from("reminders").update(data.completed_at ? { completed_at: null, task_status: "todo" } : { completed_at: new Date().toISOString(), task_status: "completed" }).eq("owner_id", user.id).eq("id", taskId);
  if (error) return { success: false, message: "Não foi possível atualizar a tarefa." };

  revalidateTasks();
  return { success: true, message: data.completed_at ? "Tarefa reaberta." : "Tarefa concluída." };
}

export async function deleteTaskAction(taskId: string): Promise<TaskActionState> {
  const user = await requireUser();
  if (!isValidUuid(taskId)) return { success: false, message: "Tarefa inválida." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("reminders").delete().eq("owner_id", user.id).eq("id", taskId);
  if (error) return { success: false, message: "Não foi possível excluir a tarefa." };

  revalidateTasks();
  return { success: true, message: "Tarefa excluída." };
}

export async function moveTaskToColumnAction(taskId: string, column: "overdue" | "todo" | "in_progress" | "paused" | "completed"): Promise<TaskActionState> {
  const user = await requireUser();
  if (!isValidUuid(taskId)) return { success: false, message: "Tarefa inválida." };

  const supabase = await createSupabaseServerClient();
  const { data, error: readError } = await supabase
    .from("reminders")
    .select("scheduled_at")
    .eq("owner_id", user.id)
    .eq("id", taskId)
    .maybeSingle<{ scheduled_at: string }>();

  if (readError || !data) return { success: false, message: "Tarefa não encontrada." };

  if (!["overdue", "todo", "in_progress", "paused", "completed"].includes(column)) return {success:false,message:"Coluna inválida."};
  if (column === "overdue") return {success:false,message:"Atraso é calculado pela data. Edite o prazo da tarefa para reagendar."};
  const payload = {task_status:column,completed_at:column === "completed" ? new Date().toISOString():null};

  const { error } = await supabase.from("reminders").update(payload).eq("owner_id", user.id).eq("id", taskId);
  if (error) return { success: false, message: "Não foi possível mover a tarefa." };

  revalidateTasks();
  return { success: true, message: "Tarefa movida." };
}
