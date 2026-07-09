"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DetailActionState = {
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

function getCurrencyValue(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

async function projectBelongsToUser(projectId: string, ownerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("projects").select("id").eq("owner_id", ownerId).eq("id", projectId).maybeSingle<{ id: string }>();
  return !error && Boolean(data);
}

function revalidateProject(projectId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projetos");
  revalidatePath(`/dashboard/projetos/${projectId}`);
}

export async function createReminderAction(_state: DetailActionState, formData: FormData): Promise<DetailActionState> {
  const user = await requireUser();
  const projectId = getValue(formData, "project_id");
  const title = getValue(formData, "title");
  const scheduledAt = getValue(formData, "scheduled_at");
  const rawKind = getValue(formData, "kind");
  const kind = ["meeting", "action", "review", "delivery", "follow_up", "charge", "other"].includes(rawKind) ? rawKind : "action";

  if (!isValidUuid(projectId)) return { success: false, message: "Projeto inválido." };
  if (title.length < 2) return { success: false, message: "Informe um título para o lembrete." };
  if (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) return { success: false, message: "Informe uma data e horário válidos." };
  if (!(await projectBelongsToUser(projectId, user.id))) return { success: false, message: "Projeto não encontrado." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("reminders").insert({ owner_id: user.id, project_id: projectId, title, kind, scheduled_at: scheduledAt });
  if (error) return { success: false, message: "Não foi possível criar o lembrete." };
  revalidateProject(projectId);
  return { success: true, message: "Lembrete criado." };
}

export async function saveBudgetAction(_state: DetailActionState, formData: FormData): Promise<DetailActionState> {
  const user = await requireUser();
  const projectId = getValue(formData, "project_id");
  const budgetId = getValue(formData, "budget_id");
  const amount = getCurrencyValue(getValue(formData, "amount"));
  const rawStatus = getValue(formData, "status");
  const status = ["draft", "sent", "approved", "rejected", "expired"].includes(rawStatus) ? rawStatus : "draft";
  const validUntil = getValue(formData, "valid_until");
  const paymentCondition = getValue(formData, "payment_condition");

  if (!isValidUuid(projectId)) return { success: false, message: "Projeto inválido." };
  if (amount < 0) return { success: false, message: "Informe um valor válido." };
  if (!(await projectBelongsToUser(projectId, user.id))) return { success: false, message: "Projeto não encontrado." };

  const supabase = await createSupabaseServerClient();
  const payload = { owner_id: user.id, project_id: projectId, amount, status, valid_until: validUntil || null, payment_condition: paymentCondition || null };
  const result = isValidUuid(budgetId)
    ? await supabase.from("budgets").update(payload).eq("owner_id", user.id).eq("id", budgetId)
    : await supabase.from("budgets").insert(payload);

  if (result.error) return { success: false, message: "Não foi possível salvar o orçamento." };
  await supabase.from("projects").update({ estimated_value: amount }).eq("owner_id", user.id).eq("id", projectId);
  revalidateProject(projectId);
  return { success: true, message: "Orçamento salvo." };
}

export async function toggleScopeItemAction(scopeItemId: string, projectId: string): Promise<DetailActionState> {
  const user = await requireUser();
  if (!isValidUuid(scopeItemId) || !isValidUuid(projectId)) return { success: false, message: "Item inválido." };
  const supabase = await createSupabaseServerClient();
  const { data: item, error: readError } = await supabase.from("project_scope_items").select("completed_at").eq("owner_id", user.id).eq("id", scopeItemId).eq("project_id", projectId).maybeSingle<{ completed_at: string | null }>();
  if (readError || !item) return { success: false, message: "Item de escopo não encontrado." };
  const { error } = await supabase.from("project_scope_items").update({ completed_at: item.completed_at ? null : new Date().toISOString() }).eq("owner_id", user.id).eq("id", scopeItemId);
  if (error) return { success: false, message: "Não foi possível atualizar o escopo." };
  revalidateProject(projectId);
  return { success: true, message: "Escopo atualizado." };
}

export async function createScopeItemAction(_state: DetailActionState, formData: FormData): Promise<DetailActionState> {
  const user = await requireUser();
  const projectId = getValue(formData, "project_id");
  const title = getValue(formData, "title");
  if (!isValidUuid(projectId)) return { success: false, message: "Projeto inválido." };
  if (title.length < 2) return { success: false, message: "Informe uma etapa do escopo." };
  if (!(await projectBelongsToUser(projectId, user.id))) return { success: false, message: "Projeto não encontrado." };
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase.from("project_scope_items").select("id", { count: "exact", head: true }).eq("owner_id", user.id).eq("project_id", projectId);
  const { error } = await supabase.from("project_scope_items").insert({ owner_id: user.id, project_id: projectId, title, position: count ?? 0 });
  if (error) return { success: false, message: "Não foi possível adicionar a etapa." };
  revalidateProject(projectId);
  return { success: true, message: "Etapa adicionada." };
}

export async function updateScopeItemAction(_state: DetailActionState, formData: FormData): Promise<DetailActionState> {
  const user = await requireUser();
  const projectId = getValue(formData, "project_id");
  const scopeItemId = getValue(formData, "scope_item_id");
  const title = getValue(formData, "title");
  if (!isValidUuid(projectId) || !isValidUuid(scopeItemId)) return { success: false, message: "Etapa inválida." };
  if (title.length < 2) return { success: false, message: "Informe uma etapa válida." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("project_scope_items").update({ title }).eq("owner_id", user.id).eq("project_id", projectId).eq("id", scopeItemId);
  if (error) return { success: false, message: "Não foi possível editar a etapa." };
  revalidateProject(projectId);
  return { success: true, message: "Etapa atualizada." };
}

export async function deleteScopeItemAction(scopeItemId: string, projectId: string): Promise<DetailActionState> {
  const user = await requireUser();
  if (!isValidUuid(scopeItemId) || !isValidUuid(projectId)) return { success: false, message: "Etapa inválida." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("project_scope_items").delete().eq("owner_id", user.id).eq("project_id", projectId).eq("id", scopeItemId);
  if (error) return { success: false, message: "Não foi possível excluir a etapa." };
  revalidateProject(projectId);
  return { success: true, message: "Etapa excluída." };
}

export async function seedScopeItemsAction(projectId: string, titles: string[]): Promise<DetailActionState> {
  const user = await requireUser();
  if (!isValidUuid(projectId)) return { success: false, message: "Projeto inválido." };
  if (!(await projectBelongsToUser(projectId, user.id))) return { success: false, message: "Projeto não encontrado." };
  const cleanTitles = titles.map((title) => title.trim()).filter((title) => title.length >= 2).slice(0, 12);
  if (cleanTitles.length === 0) return { success: false, message: "Nenhuma etapa válida para salvar." };

  const supabase = await createSupabaseServerClient();
  const { count } = await supabase.from("project_scope_items").select("id", { count: "exact", head: true }).eq("owner_id", user.id).eq("project_id", projectId);
  if ((count ?? 0) > 0) return { success: false, message: "Este projeto já possui etapas cadastradas." };

  const { error } = await supabase.from("project_scope_items").insert(cleanTitles.map((title, index) => ({
    owner_id: user.id,
    project_id: projectId,
    title,
    position: index,
  })));
  if (error) return { success: false, message: "Não foi possível salvar as etapas sugeridas." };
  revalidateProject(projectId);
  return { success: true, message: "Etapas sugeridas salvas no escopo." };
}

export async function createApprovalAction(_state: DetailActionState, formData: FormData): Promise<DetailActionState> {
  const user = await requireUser();
  const projectId = getValue(formData, "project_id");
  const title = getValue(formData, "title");
  const note = getValue(formData, "note");
  if (!isValidUuid(projectId)) return { success: false, message: "Projeto inválido." };
  if (title.length < 2) return { success: false, message: "Informe o título da aprovação." };
  if (!(await projectBelongsToUser(projectId, user.id))) return { success: false, message: "Projeto não encontrado." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("project_approvals").insert({ owner_id: user.id, project_id: projectId, title, note: note || null });
  if (error) return { success: false, message: "Não foi possível criar a aprovação." };
  revalidateProject(projectId);
  return { success: true, message: "Aprovação criada." };
}

export async function updateApprovalStatusAction(approvalId: string, projectId: string, status: "pending" | "approved" | "rejected" | "review"): Promise<DetailActionState> {
  const user = await requireUser();
  if (!isValidUuid(approvalId) || !isValidUuid(projectId)) return { success: false, message: "Aprovação inválida." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("project_approvals").update({ status, approved_at: status === "approved" ? new Date().toISOString() : null }).eq("owner_id", user.id).eq("project_id", projectId).eq("id", approvalId);
  if (error) return { success: false, message: "Não foi possível atualizar a aprovação." };
  revalidateProject(projectId);
  return { success: true, message: "Aprovação atualizada." };
}

export async function createMaterialAction(_state: DetailActionState, formData: FormData): Promise<DetailActionState> {
  const user = await requireUser();
  const projectId = getValue(formData, "project_id");
  const title = getValue(formData, "title");
  const url = getValue(formData, "url");
  const note = getValue(formData, "note");
  const rawKind = getValue(formData, "kind");
  const kind = ["file", "link", "note"].includes(rawKind) ? rawKind : "link";
  const file = formData.get("file");

  if (!isValidUuid(projectId)) return { success: false, message: "Projeto inválido." };
  if (title.length < 2) return { success: false, message: "Informe um título para o material." };
  if (kind === "link" && !url) return { success: false, message: "Informe o link do material." };
  if (kind === "note" && !note) return { success: false, message: "Escreva a anotação do material." };
  if (!(await projectBelongsToUser(projectId, user.id))) return { success: false, message: "Projeto não encontrado." };

  const supabase = await createSupabaseServerClient();
  let filePath: string | null = null;
  let fileSize: number | null = null;
  let mimeType: string | null = null;

  if (kind === "file" && file instanceof File && file.size > 0) {
    const allowed = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
      "text/plain",
      "text/csv",
      "application/zip",
      "application/x-zip-compressed",
      "application/x-rar-compressed",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];
    if (!allowed.includes(file.type)) return { success: false, message: "Arquivo precisa ser PDF, imagem, TXT, ZIP ou documento Office." };
    if (file.size > 10 * 1024 * 1024) return { success: false, message: "Arquivo pode ter no máximo 10 MB." };
    const extension = file.name.split(".").pop()?.toLowerCase() || "file";
    filePath = `${user.id}/${projectId}/${crypto.randomUUID()}.${extension}`;
    fileSize = file.size;
    mimeType = file.type;
    const upload = await supabase.storage.from("project-materials").upload(filePath, file, { contentType: file.type, upsert: false });
    if (upload.error) return { success: false, message: "Não foi possível enviar o arquivo." };
  }
  if (kind === "file" && (!(file instanceof File) || file.size <= 0)) return { success: false, message: "Selecione um arquivo para enviar." };

  const { error } = await supabase.from("project_materials").insert({ owner_id: user.id, project_id: projectId, kind, title, url: url || null, note: note || null, file_path: filePath, file_size: fileSize, mime_type: mimeType });
  if (error) {
    if (filePath) await supabase.storage.from("project-materials").remove([filePath]);
    return { success: false, message: "Não foi possível salvar o material." };
  }
  revalidateProject(projectId);
  return { success: true, message: "Material salvo." };
}

export async function deleteMaterialAction(materialId: string, projectId: string): Promise<DetailActionState> {
  const user = await requireUser();
  if (!isValidUuid(materialId) || !isValidUuid(projectId)) return { success: false, message: "Material inválido." };
  const supabase = await createSupabaseServerClient();
  const { data: material } = await supabase.from("project_materials").select("file_path").eq("owner_id", user.id).eq("project_id", projectId).eq("id", materialId).maybeSingle<{ file_path: string | null }>();
  const { error } = await supabase.from("project_materials").delete().eq("owner_id", user.id).eq("project_id", projectId).eq("id", materialId);
  if (error) return { success: false, message: "Não foi possível excluir o material." };
  if (material?.file_path) await supabase.storage.from("project-materials").remove([material.file_path]);
  revalidateProject(projectId);
  return { success: true, message: "Material excluído." };
}

export async function createPaymentAction(_state: DetailActionState, formData: FormData): Promise<DetailActionState> {
  const user = await requireUser();
  const projectId = getValue(formData, "project_id");
  const budgetId = getValue(formData, "budget_id");
  const description = getValue(formData, "description");
  const amount = getCurrencyValue(getValue(formData, "amount"));
  const dueDate = getValue(formData, "due_date");
  const receipt = formData.get("receipt");
  if (!isValidUuid(projectId)) return { success: false, message: "Projeto inválido." };
  if (description.length < 2) return { success: false, message: "Informe uma descrição." };
  if (amount <= 0) return { success: false, message: "Informe um valor maior que zero." };
  if (!dueDate) return { success: false, message: "Informe o vencimento." };
  if (!(await projectBelongsToUser(projectId, user.id))) return { success: false, message: "Projeto não encontrado." };
  const supabase = await createSupabaseServerClient();
  let receiptPath: string | null = null;
  let receiptFileName: string | null = null;
  let receiptMimeType: string | null = null;
  let receiptFileSize: number | null = null;

  if (receipt instanceof File && receipt.size > 0) {
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp", "text/plain", "text/csv"];
    if (!allowed.includes(receipt.type)) return { success: false, message: "Comprovante precisa ser PDF, imagem, TXT ou CSV." };
    if (receipt.size > 10 * 1024 * 1024) return { success: false, message: "Comprovante pode ter no máximo 10 MB." };
    const extension = receipt.name.split(".").pop()?.toLowerCase() || "file";
    receiptPath = `${user.id}/${projectId}/${crypto.randomUUID()}.${extension}`;
    receiptFileName = receipt.name;
    receiptMimeType = receipt.type;
    receiptFileSize = receipt.size;
    const upload = await supabase.storage.from("payment-receipts").upload(receiptPath, receipt, { contentType: receipt.type, upsert: false });
    if (upload.error) return { success: false, message: "Não foi possível enviar o comprovante." };
  }

  const { error } = await supabase.from("payments").insert({
    owner_id: user.id,
    project_id: projectId,
    budget_id: isValidUuid(budgetId) ? budgetId : null,
    description,
    amount,
    due_date: dueDate,
    status: "pending",
    receipt_path: receiptPath,
    receipt_file_name: receiptFileName,
    receipt_mime_type: receiptMimeType,
    receipt_file_size: receiptFileSize,
  });
  if (error) {
    if (receiptPath) await supabase.storage.from("payment-receipts").remove([receiptPath]);
    return { success: false, message: "Não foi possível criar o recebimento." };
  }
  revalidateProject(projectId);
  return { success: true, message: "Recebimento criado." };
}

export async function markPaymentPaidAction(paymentId: string, projectId: string): Promise<DetailActionState> {
  const user = await requireUser();
  if (!isValidUuid(paymentId) || !isValidUuid(projectId)) return { success: false, message: "Pagamento inválido." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("payments").update({ status: "paid", paid_at: new Date().toISOString() }).eq("owner_id", user.id).eq("project_id", projectId).eq("id", paymentId);
  if (error) return { success: false, message: "Não foi possível marcar como pago." };
  revalidateProject(projectId);
  return { success: true, message: "Recebimento marcado como pago." };
}

export async function archiveProjectAction(projectId: string): Promise<DetailActionState> {
  const user = await requireUser();
  if (!isValidUuid(projectId)) return { success: false, message: "Projeto inválido." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("projects").update({ status: "archived" }).eq("owner_id", user.id).eq("id", projectId);
  if (error) return { success: false, message: "Não foi possível arquivar o projeto." };
  revalidateProject(projectId);
  return { success: true, message: "Projeto arquivado." };
}

export async function deleteProjectAndRedirectAction(projectId: string): Promise<void> {
  const user = await requireUser();
  if (!isValidUuid(projectId)) redirect("/dashboard/projetos");
  const supabase = await createSupabaseServerClient();
  await supabase.from("projects").delete().eq("owner_id", user.id).eq("id", projectId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projetos");
  redirect("/dashboard/projetos");
}
