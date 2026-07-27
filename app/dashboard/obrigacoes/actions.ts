"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ObligationRecurrence, ObligationType } from "@/components/obligations/types";

export type ObligationActionState = {
  success: boolean;
  message: string;
};

const initialActionState: ObligationActionState = {
  success: false,
  message: "",
};

export async function getInitialObligationActionState(): Promise<ObligationActionState> {
  return initialActionState;
}

function getValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getType(value: string): ObligationType {
  return ["tax", "subscription", "client", "administrative", "financial", "other"].includes(value) ? value as ObligationType : "administrative";
}

function getRecurrence(value: string): ObligationRecurrence {
  return ["weekly", "monthly", "quarterly", "yearly", "custom"].includes(value) ? value as ObligationRecurrence : "monthly";
}

function getStatus(value: string) {
  return ["pending", "paid", "overdue", "upcoming", "inactive"].includes(value) ? value : "pending";
}

function parseAmount(value: string) {
  if (!value) return null;
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : Number.NaN;
}

function revalidateObligations() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard/obrigacoes");
}

export async function createObligationAction(_state: ObligationActionState, formData: FormData): Promise<ObligationActionState> {
  const user = await requireUser();
  const title = getValue(formData, "title");
  const description = getValue(formData, "description");
  const dueDate = getValue(formData, "dueDate");
  const amount = parseAmount(getValue(formData, "amount"));
  const clientId = getValue(formData, "clientId");
  const projectId = getValue(formData, "projectId");
  const isActive = getValue(formData, "activityStatus") !== "inactive";

  if (title.length < 2) return { success: false, message: "Informe um título com pelo menos 2 caracteres." };
  if (!dueDate || Number.isNaN(new Date(`${dueDate}T12:00:00Z`).getTime())) return { success: false, message: "Informe uma data válida." };
  if (Number.isNaN(amount)) return { success: false, message: "Informe um valor válido ou deixe em branco." };
  if (clientId && !isValidUuid(clientId)) return { success: false, message: "Cliente inválido." };
  if (projectId && !isValidUuid(projectId)) return { success: false, message: "Projeto inválido." };

  const supabase = await createSupabaseServerClient();

  if (clientId) {
    const { data, error } = await supabase.from("clients").select("id").eq("owner_id", user.id).eq("id", clientId).maybeSingle<{ id: string }>();
    if (error || !data) return { success: false, message: "Cliente não encontrado na sua conta." };
  }

  if (projectId) {
    const { data, error } = await supabase.from("projects").select("id, client_id").eq("owner_id", user.id).eq("id", projectId).maybeSingle<{ id: string; client_id: string }>();
    if (error || !data) return { success: false, message: "Projeto não encontrado na sua conta." };
  }

  const { error } = await supabase.from("obligations").insert({
    owner_id: user.id,
    title,
    description: description || null,
    type: getType(getValue(formData, "type")),
    recurrence: getRecurrence(getValue(formData, "recurrence")),
    due_date: dueDate,
    amount,
    client_id: clientId || null,
    project_id: projectId || null,
    is_active: isActive,
    status: isActive ? "pending" : "inactive",
  });

  if (error) return { success: false, message: "Não foi possível criar a obrigação agora." };

  revalidateObligations();
  return { success: true, message: "Obrigação criada com sucesso." };
}

export async function updateObligationAction(_state: ObligationActionState, formData: FormData): Promise<ObligationActionState> {
  const user = await requireUser();
  const obligationId = getValue(formData, "obligationId");
  const title = getValue(formData, "title");
  const description = getValue(formData, "description");
  const dueDate = getValue(formData, "dueDate");
  const amount = parseAmount(getValue(formData, "amount"));
  const clientId = getValue(formData, "clientId");
  const projectId = getValue(formData, "projectId");
  const isActive = getValue(formData, "activityStatus") !== "inactive";
  const status = getValue(formData, "status");

  if (!isValidUuid(obligationId)) return { success: false, message: "Obrigação inválida." };
  if (title.length < 2) return { success: false, message: "Informe um título com pelo menos 2 caracteres." };
  if (!dueDate || Number.isNaN(new Date(`${dueDate}T12:00:00Z`).getTime())) return { success: false, message: "Informe uma data válida." };
  if (Number.isNaN(amount)) return { success: false, message: "Informe um valor válido ou deixe em branco." };
  if (clientId && !isValidUuid(clientId)) return { success: false, message: "Cliente inválido." };
  if (projectId && !isValidUuid(projectId)) return { success: false, message: "Projeto inválido." };

  const supabase = await createSupabaseServerClient();

  if (clientId) {
    const { data, error } = await supabase.from("clients").select("id").eq("owner_id", user.id).eq("id", clientId).maybeSingle<{ id: string }>();
    if (error || !data) return { success: false, message: "Cliente não encontrado na sua conta." };
  }

  if (projectId) {
    const { data, error } = await supabase.from("projects").select("id").eq("owner_id", user.id).eq("id", projectId).maybeSingle<{ id: string }>();
    if (error || !data) return { success: false, message: "Projeto não encontrado na sua conta." };
  }

  const { error } = await supabase
    .from("obligations")
    .update({
      title,
      description: description || null,
      type: getType(getValue(formData, "type")),
      recurrence: getRecurrence(getValue(formData, "recurrence")),
      due_date: dueDate,
      amount,
      client_id: clientId || null,
      project_id: projectId || null,
      is_active: isActive,
      status: isActive ? getStatus(status) : "inactive",
    })
    .eq("owner_id", user.id)
    .eq("id", obligationId);

  if (error) return { success: false, message: "Não foi possível atualizar a obrigação." };
  revalidateObligations();
  return { success: true, message: "Obrigação atualizada com sucesso." };
}

export async function markObligationAsPaidAction(obligationId: string): Promise<ObligationActionState> {
  const user = await requireUser();
  if (!isValidUuid(obligationId)) return { success: false, message: "Obrigação inválida." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("obligations")
    .update({ status: "paid", is_active: true, notification_read_at: new Date().toISOString() })
    .eq("owner_id", user.id)
    .eq("id", obligationId);

  if (error) return { success: false, message: "Não foi possível marcar a obrigação como paga." };
  revalidateObligations();
  return { success: true, message: "Obrigação marcada como paga." };
}

export async function deactivateObligationAction(obligationId: string): Promise<ObligationActionState> {
  const user = await requireUser();
  if (!isValidUuid(obligationId)) return { success: false, message: "Obrigação inválida." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("obligations")
    .update({ status: "inactive", is_active: false, notification_dismissed_at: new Date().toISOString() })
    .eq("owner_id", user.id)
    .eq("id", obligationId);

  if (error) return { success: false, message: "Não foi possível desativar a obrigação." };
  revalidateObligations();
  return { success: true, message: "Obrigação desativada." };
}

export async function deleteObligationAction(obligationId: string): Promise<ObligationActionState> {
  const user = await requireUser();
  if (!isValidUuid(obligationId)) return { success: false, message: "Obrigação inválida." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("obligations").delete().eq("owner_id", user.id).eq("id", obligationId);

  if (error) return { success: false, message: "Não foi possível excluir a obrigação." };
  revalidateObligations();
  return { success: true, message: "Obrigação excluída." };
}
