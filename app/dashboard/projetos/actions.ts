"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProjectStatus, ProjectWorkType } from "@/lib/projects/data";

export type ProjectActionState = {
  success: boolean;
  message: string;
  projectId?: string;
};

function getValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function getStatus(value: string): ProjectStatus {
  return ["in_progress", "review", "completed", "delayed", "archived"].includes(value) ? value as ProjectStatus : "in_progress";
}

function getWorkType(value: string): ProjectWorkType {
  return ["design", "tech", "marketing", "content", "consulting", "branding", "automation", "other"].includes(value) ? value as ProjectWorkType : "design";
}

function getTags(formData: FormData) {
  const tags = formData.getAll("tags")
    .flatMap((value) => typeof value === "string" ? value.split(",") : [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => tag.slice(0, 40));
  return Array.from(new Set(tags)).slice(0, 12);
}

function getCurrencyValue(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function getProgressValue(value: string) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function clientBelongsToUser(clientId: string, ownerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("clients").select("id").eq("owner_id", ownerId).eq("id", clientId).maybeSingle<{ id: string }>();
  return !error && Boolean(data);
}

export async function createProjectAction(_state: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  const user = await requireUser();
  const clientId = getValue(formData, "client_id");
  const name = getValue(formData, "name");
  const description = getValue(formData, "description");
  const deadline = getValue(formData, "deadline");
  const estimatedValue = getCurrencyValue(getValue(formData, "estimated_value"));
  const progress = getProgressValue(getValue(formData, "progress"));
  const status = getStatus(getValue(formData, "status"));
  const workType = getWorkType(getValue(formData, "work_type"));
  const tags = getTags(formData);

  if (!isValidUuid(clientId)) return { success: false, message: "Selecione um cliente válido." };
  if (name.length < 2) return { success: false, message: "Informe um nome com pelo menos 2 caracteres." };
  if (deadline && Number.isNaN(new Date(`${deadline}T12:00:00Z`).getTime())) return { success: false, message: "Informe uma data de prazo válida." };
  if (!(await clientBelongsToUser(clientId, user.id))) return { success: false, message: "Cliente não encontrado na sua conta." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      client_id: clientId,
      name,
      description: description || null,
      status,
      deadline: deadline || null,
      estimated_value: estimatedValue,
      progress,
      work_type: workType,
      tags,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) return { success: false, message: "Não foi possível cadastrar o projeto agora." };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projetos");
  revalidatePath("/dashboard/clientes");
  return { success: true, message: "Projeto cadastrado com sucesso.", projectId: data.id };
}

export async function updateProjectAction(formData: FormData): Promise<ProjectActionState> {
  const user = await requireUser();
  const projectId = getValue(formData, "project_id");
  const clientId = getValue(formData, "client_id");
  const name = getValue(formData, "name");
  const description = getValue(formData, "description");
  const deadline = getValue(formData, "deadline");
  const estimatedValue = getCurrencyValue(getValue(formData, "estimated_value"));
  const progress = getProgressValue(getValue(formData, "progress"));
  const status = getStatus(getValue(formData, "status"));
  const workType = getWorkType(getValue(formData, "work_type"));
  const tags = getTags(formData);

  if (!isValidUuid(projectId)) return { success: false, message: "Projeto inválido." };
  if (!isValidUuid(clientId)) return { success: false, message: "Selecione um cliente válido." };
  if (name.length < 2) return { success: false, message: "Informe um nome com pelo menos 2 caracteres." };
  if (deadline && Number.isNaN(new Date(`${deadline}T12:00:00Z`).getTime())) return { success: false, message: "Informe uma data de prazo válida." };
  if (!(await clientBelongsToUser(clientId, user.id))) return { success: false, message: "Cliente não encontrado na sua conta." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .update({
      client_id: clientId,
      name,
      description: description || null,
      status,
      deadline: deadline || null,
      estimated_value: estimatedValue,
      progress,
      work_type: workType,
      tags,
    })
    .eq("owner_id", user.id)
    .eq("id", projectId)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !data) return { success: false, message: "Não foi possível atualizar o projeto agora." };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projetos");
  revalidatePath("/dashboard/clientes");
  revalidatePath(`/dashboard/projetos/${projectId}`);
  return { success: true, message: "Projeto atualizado com sucesso.", projectId };
}

export async function deleteProjectAction(projectId: string): Promise<ProjectActionState> {
  const user = await requireUser();
  if (!isValidUuid(projectId)) return { success: false, message: "Projeto inválido." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("projects").delete().eq("owner_id", user.id).eq("id", projectId).select("id").maybeSingle<{ id: string }>();
  if (error || !data) return { success: false, message: "Não foi possível excluir o projeto agora." };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projetos");
  revalidatePath("/dashboard/clientes");
  return { success: true, message: "Projeto excluído com sucesso." };
}
