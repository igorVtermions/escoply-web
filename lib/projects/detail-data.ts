import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProjectStatus, ProjectWorkType } from "@/lib/projects/data";

export type ProjectDetailData = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  deadline: string | null;
  estimatedValue: number;
  progress: number;
  workType: ProjectWorkType;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  owner: {
    displayName: string;
    companyName: string | null;
    avatarUrl: string | null;
  };
  client: {
    id: string;
    name: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    website: string | null;
    notes: string | null;
    logoUrl: string | null;
  };
  budget: {
    id: string;
    amount: number;
    status: string;
    validUntil: string | null;
    paymentCondition: string | null;
  } | null;
  reminders: Array<{
    id: string;
    title: string;
    kind: string;
    scheduledAt: string;
  }>;
  payments: Array<{
    id: string;
    description: string;
    dueDate: string;
    amount: number;
    status: string;
    paidAt: string | null;
  }>;
  scopeItems: Array<{
    id: string;
    title: string;
    position: number;
    completedAt: string | null;
  }>;
  approvals: Array<{
    id: string;
    title: string;
    note: string | null;
    status: string;
    approvedAt: string | null;
    createdAt: string;
  }>;
  materials: Array<{
    id: string;
    kind: string;
    title: string;
    url: string | null;
    fileUrl: string | null;
    filePath: string | null;
    fileSize: number | null;
    mimeType: string | null;
    note: string | null;
    createdAt: string;
  }>;
};

type ProjectDetailRow = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  deadline: string | null;
  estimated_value: number | string;
  progress: number;
  work_type: ProjectWorkType;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  clients: {
    id: string;
    name: string;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    website: string | null;
    notes: string | null;
    logo_path: string | null;
  } | null;
};

type BudgetRow = {
  id: string;
  amount: number | string;
  status: string;
  valid_until: string | null;
  payment_condition: string | null;
};

type ReminderRow = {
  id: string;
  title: string;
  kind: string;
  scheduled_at: string;
};

type PaymentRow = {
  id: string;
  description: string;
  due_date: string;
  amount: number | string;
  status: string;
  paid_at: string | null;
};

type ScopeItemRow = {
  id: string;
  title: string;
  position: number;
  completed_at: string | null;
};

type ApprovalRow = {
  id: string;
  title: string;
  note: string | null;
  status: string;
  approved_at: string | null;
  created_at: string;
};

type MaterialRow = {
  id: string;
  kind: string;
  title: string;
  url: string | null;
  file_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  note: string | null;
  created_at: string;
};

type ProfileRow = {
  full_name: string;
  company_name: string | null;
  avatar_path: string | null;
};

function toNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

export async function getProjectDetailData({ ownerId, projectId }: { ownerId: string; projectId: string }): Promise<ProjectDetailData | null> {
  const supabase = await createSupabaseServerClient();
  const projectResult = await supabase
    .from("projects")
    .select("id, name, description, status, deadline, estimated_value, progress, work_type, tags, created_at, updated_at, clients(id, name, company_name, email, phone, whatsapp, website, notes, logo_path)")
    .eq("owner_id", ownerId)
    .eq("id", projectId)
    .maybeSingle<ProjectDetailRow>();

  if (projectResult.error) throw projectResult.error;
  if (!projectResult.data) return null;
  const project = projectResult.data;

  const [budgetResult, remindersResult, paymentsResult, scopeResult, approvalsResult, materialsResult, profileResult] = await Promise.all([
    supabase.from("budgets").select("id, amount, status, valid_until, payment_condition").eq("owner_id", ownerId).eq("project_id", projectId).order("created_at", { ascending: false }).limit(1).maybeSingle<BudgetRow>(),
    supabase.from("reminders").select("id, title, kind, scheduled_at").eq("owner_id", ownerId).eq("project_id", projectId).is("completed_at", null).order("scheduled_at").limit(6).overrideTypes<ReminderRow[]>(),
    supabase.from("payments").select("id, description, due_date, amount, status, paid_at").eq("owner_id", ownerId).eq("project_id", projectId).order("due_date").overrideTypes<PaymentRow[]>(),
    supabase.from("project_scope_items").select("id, title, position, completed_at").eq("owner_id", ownerId).eq("project_id", projectId).order("position").overrideTypes<ScopeItemRow[]>(),
    supabase.from("project_approvals").select("id, title, note, status, approved_at, created_at").eq("owner_id", ownerId).eq("project_id", projectId).order("created_at").overrideTypes<ApprovalRow[]>(),
    supabase.from("project_materials").select("id, kind, title, url, file_path, file_size, mime_type, note, created_at").eq("owner_id", ownerId).eq("project_id", projectId).order("created_at", { ascending: false }).overrideTypes<MaterialRow[]>(),
    supabase.from("profiles").select("full_name, company_name, avatar_path").eq("id", ownerId).maybeSingle<ProfileRow>(),
  ]);

  const failed = [budgetResult, remindersResult, paymentsResult, scopeResult, approvalsResult, materialsResult, profileResult].find((result) => result.error);
  if (failed?.error) throw failed.error;

  const client = project.clients;
  const logoUrl = client?.logo_path
    ? (await supabase.storage.from("client-logos").createSignedUrl(client.logo_path, 60 * 60)).data?.signedUrl ?? null
    : null;
  const materialFilePaths = (materialsResult.data ?? []).flatMap((material) => material.file_path ? [material.file_path] : []);
  const materialSignedUrls = materialFilePaths.length > 0 ? await supabase.storage.from("project-materials").createSignedUrls(materialFilePaths, 60 * 60) : { data: [] };
  const materialUrlMap = new Map((materialSignedUrls.data ?? []).flatMap((file) => file.path && file.signedUrl ? [[file.path, file.signedUrl] as const] : []));
  const avatarUrl = profileResult.data?.avatar_path
    ? (await supabase.storage.from("avatars").createSignedUrl(profileResult.data.avatar_path, 60 * 60)).data?.signedUrl ?? null
    : null;
  const fallbackScope = [
    "Briefing e alinhamento inicial",
    "Pesquisa e referências",
    "Wireframe da estrutura",
    `Design de ${project.name}`,
    "Revisões e ajustes",
    "Handoff e entrega de arquivos",
  ].map((title, index) => ({
    id: `fallback-${index}`,
    title,
    position: index,
    completedAt: project.progress >= [15, 30, 45, 65, 85, 100][index] ? project.updated_at : null,
  }));

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    deadline: project.deadline,
    estimatedValue: toNumber(project.estimated_value),
    progress: project.progress,
    workType: project.work_type,
    tags: project.tags ?? [],
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    owner: {
      displayName: profileResult.data?.full_name ?? "Freelancer",
      companyName: profileResult.data?.company_name ?? null,
      avatarUrl,
    },
    client: {
      id: client?.id ?? "",
      name: client?.name ?? "Sem cliente",
      companyName: client?.company_name ?? null,
      email: client?.email ?? null,
      phone: client?.phone ?? null,
      whatsapp: client?.whatsapp ?? null,
      website: client?.website ?? null,
      notes: client?.notes ?? null,
      logoUrl,
    },
    budget: budgetResult.data ? {
      id: budgetResult.data.id,
      amount: toNumber(budgetResult.data.amount),
      status: budgetResult.data.status,
      validUntil: budgetResult.data.valid_until,
      paymentCondition: budgetResult.data.payment_condition,
    } : null,
    reminders: (remindersResult.data ?? []).map((reminder) => ({
      id: reminder.id,
      title: reminder.title,
      kind: reminder.kind,
      scheduledAt: reminder.scheduled_at,
    })),
    payments: (paymentsResult.data ?? []).map((payment) => ({
      id: payment.id,
      description: payment.description,
      dueDate: payment.due_date,
      amount: toNumber(payment.amount),
      status: payment.status,
      paidAt: payment.paid_at,
    })),
    scopeItems: (scopeResult.data ?? []).length > 0 ? (scopeResult.data ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      position: item.position,
      completedAt: item.completed_at,
    })) : fallbackScope,
    approvals: (approvalsResult.data ?? []).map((approval) => ({
      id: approval.id,
      title: approval.title,
      note: approval.note,
      status: approval.status,
      approvedAt: approval.approved_at,
      createdAt: approval.created_at,
    })),
    materials: (materialsResult.data ?? []).map((material) => ({
      id: material.id,
      kind: material.kind,
      title: material.title,
      url: material.url,
      fileUrl: material.file_path ? materialUrlMap.get(material.file_path) ?? null : null,
      filePath: material.file_path,
      fileSize: material.file_size,
      mimeType: material.mime_type,
      note: material.note,
      createdAt: material.created_at,
    })),
  };
}
