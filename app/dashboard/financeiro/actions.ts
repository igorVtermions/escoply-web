"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type FinanceActionState = {
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

function parseAmount(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : Number.NaN;
}

function getStatus(value: string) {
  if (value === "paid") return "paid";
  if (value === "overdue") return "overdue";
  if (value === "canceled") return "cancelled";
  return "pending";
}

function revalidateFinanceViews() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard/financeiro");
  revalidatePath("/dashboard/projetos");
}

export async function createFinancePaymentAction(formData: FormData): Promise<FinanceActionState> {
  const user = await requireUser();
  const projectId = getValue(formData, "projectId");
  const description = getValue(formData, "description");
  const dueDate = getValue(formData, "dueDate");
  const amount = parseAmount(getValue(formData, "amount"));
  const status = getStatus(getValue(formData, "status"));
  const paidAt = getValue(formData, "paidAt");

  if (!isValidUuid(projectId)) return { success: false, message: "Selecione um projeto válido." };
  if (description.length < 2) return { success: false, message: "Informe uma descrição com pelo menos 2 caracteres." };
  if (!dueDate || Number.isNaN(new Date(`${dueDate}T12:00:00Z`).getTime())) return { success: false, message: "Informe uma data de vencimento válida." };
  if (Number.isNaN(amount) || amount <= 0) return { success: false, message: "Informe um valor maior que zero." };

  const supabase = await createSupabaseServerClient();
  const { data: project, error: projectError } = await supabase.from("projects").select("id").eq("owner_id", user.id).eq("id", projectId).maybeSingle<{ id: string }>();

  if (projectError || !project) return { success: false, message: "Projeto não encontrado na sua conta." };

  const { error } = await supabase.from("payments").insert({
    owner_id: user.id,
    project_id: projectId,
    description,
    amount,
    due_date: dueDate,
    status,
    paid_at: status === "paid" ? paidAt || new Date().toISOString() : null,
  });

  if (error) return { success: false, message: "Não foi possível criar o recebimento agora." };

  revalidateFinanceViews();
  return { success: true, message: "Recebimento criado com sucesso." };
}
