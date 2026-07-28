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

function getPaymentTypeLabel(value: string) {
  if (value === "deposit") return "Sinal";
  if (value === "final_payment") return "Saldo final";
  if (value === "installment") return "Parcela";
  if (value === "extra") return "Extra";
  return "Recebimento";
}

function getPaymentType(value: string) {
  if (value === "deposit") return "deposit";
  if (value === "final_payment") return "final_payment";
  if (value === "extra") return "extra";
  return "installment";
}

function revalidateFinanceViews() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard/financeiro");
  revalidatePath("/dashboard/projetos");
}

export async function createFinanceChargeReminderAction(formData: FormData): Promise<FinanceActionState> {
  const user = await requireUser();
  const projectId = getValue(formData, "projectId");
  const paymentId = getValue(formData, "paymentId");
  const title = getValue(formData, "title");
  const scheduledAt = getValue(formData, "scheduledAt");

  if (!isValidUuid(projectId)) return { success: false, message: "Selecione um projeto válido." };
  if (title.length < 2) return { success: false, message: "Informe um título para o lembrete." };
  if (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) return { success: false, message: "Informe uma data e horário válidos." };

  const supabase = await createSupabaseServerClient();
  const { data: project, error: projectError } = await supabase.from("projects").select("id").eq("owner_id", user.id).eq("id", projectId).maybeSingle<{ id: string }>();
  if (projectError || !project) return { success: false, message: "Projeto não encontrado na sua conta." };

  if (paymentId && isValidUuid(paymentId)) {
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id, project_id")
      .eq("owner_id", user.id)
      .eq("id", paymentId)
      .eq("project_id", projectId)
      .maybeSingle<{ id: string; project_id: string }>();

    if (paymentError || !payment) return { success: false, message: "Recebimento não encontrado na sua conta." };
  }

  const { error } = await supabase.from("reminders").insert({
    owner_id: user.id,
    project_id: projectId,
    title,
    kind: "charge",
    scheduled_at: scheduledAt,
  });

  if (error) return { success: false, message: "Não foi possível criar o lembrete de cobrança." };

  revalidateFinanceViews();
  revalidatePath(`/dashboard/projetos/${projectId}`);
  return { success: true, message: "Lembrete de cobrança criado." };
}

export async function createFinancePaymentAction(formData: FormData): Promise<FinanceActionState> {
  const user = await requireUser();
  const projectId = getValue(formData, "projectId");
  const paymentType = getValue(formData, "type");
  const normalizedPaymentType = getPaymentType(paymentType);
  const description = getValue(formData, "description") || getPaymentTypeLabel(paymentType);
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
    payment_type: normalizedPaymentType,
    amount,
    due_date: dueDate,
    status,
    paid_at: status === "paid" ? paidAt || new Date().toISOString() : null,
  });

  if (error) return { success: false, message: "Não foi possível criar o recebimento agora." };

  revalidateFinanceViews();
  return { success: true, message: "Recebimento criado com sucesso." };
}

export async function markFinancePaymentPaidAction(paymentId: string): Promise<FinanceActionState> {
  const user = await requireUser();
  if (!isValidUuid(paymentId)) return { success: false, message: "Recebimento inválido." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("owner_id", user.id)
    .eq("id", paymentId);

  if (error) return { success: false, message: "Não foi possível marcar o recebimento como pago." };

  revalidateFinanceViews();
  return { success: true, message: "Recebimento marcado como pago." };
}

export async function deleteFinancePaymentAction(paymentId: string): Promise<FinanceActionState> {
  const user = await requireUser();
  if (!isValidUuid(paymentId)) return { success: false, message: "Recebimento inválido." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("owner_id", user.id)
    .eq("id", paymentId);

  if (error) return { success: false, message: "Não foi possível excluir o recebimento." };

  revalidateFinanceViews();
  return { success: true, message: "Recebimento excluído." };
}
