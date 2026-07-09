import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProjectStatus = "in_progress" | "review" | "completed" | "delayed" | "archived";
export type ProjectSort = "recent" | "deadline" | "value_desc" | "progress_desc" | "name";
export type ProjectWorkType = "design" | "tech" | "marketing" | "content" | "consulting" | "branding" | "automation" | "other";

export type ProjectClientOption = {
  id: string;
  name: string;
  companyName: string | null;
};

export type ProjectListItem = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  deadline: string | null;
  estimatedValue: number;
  progress: number;
  workType: ProjectWorkType;
  tags: string[];
  client: {
    id: string;
    name: string;
    companyName: string | null;
    logoUrl: string | null;
  };
  scopeTotal: number;
  scopeCompleted: number;
};

export type ProjectDeadlineItem = {
  id: string;
  name: string;
  clientName: string;
  deadline: string;
  daysLeft: number;
  logoUrl: string | null;
};

export type ProjectBudgetItem = {
  id: string;
  clientName: string;
  projectName: string;
  amount: number;
  status: "draft" | "sent";
  logoUrl: string | null;
};

export type ProjectsData = {
  counts: {
    inProgress: number;
    review: number;
    completed: number;
    delayed: number;
  };
  projects: ProjectListItem[];
  deadlines: ProjectDeadlineItem[];
  budgets: ProjectBudgetItem[];
  clients: ProjectClientOption[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pages: number;
  };
};

type ClientRelation = {
  id: string;
  name: string;
  company_name: string | null;
  logo_path: string | null;
} | null;

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  deadline: string | null;
  estimated_value: number | string;
  progress: number;
  work_type: ProjectWorkType;
  tags: string[] | null;
  clients: ClientRelation;
};

type ClientOptionRow = {
  id: string;
  name: string;
  company_name: string | null;
};

type BudgetRow = {
  id: string;
  amount: number | string;
  status: "draft" | "sent";
  projects: {
    name: string;
    clients: ClientRelation;
  } | null;
};

const activeProjectStatuses: ProjectStatus[] = ["in_progress", "review", "delayed"];

function toNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

function getTodayIso() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

function getDaysLeft(deadline: string) {
  const today = new Date(`${getTodayIso()}T12:00:00Z`);
  const target = new Date(`${deadline}T12:00:00Z`);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function getScopeNumbers(progress: number) {
  const total = 20;
  return {
    scopeTotal: total,
    scopeCompleted: Math.round((progress / 100) * total),
  };
}

async function createLogoUrlMap(paths: string[]) {
  const supabase = await createSupabaseServerClient();
  const uniquePaths = Array.from(new Set(paths.filter(Boolean)));
  if (uniquePaths.length === 0) return new Map<string, string>();
  const { data } = await supabase.storage.from("client-logos").createSignedUrls(uniquePaths, 60 * 60);
  return new Map((data ?? []).flatMap((item) => item.path && item.signedUrl ? [[item.path, item.signedUrl] as const] : []));
}

function mapProject(project: ProjectRow, logoUrls: Map<string, string>): ProjectListItem {
  const client = project.clients;
  const scope = getScopeNumbers(project.progress);

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
    client: {
      id: client?.id ?? "",
      name: client?.name ?? "Sem cliente",
      companyName: client?.company_name ?? null,
      logoUrl: client?.logo_path ? logoUrls.get(client.logo_path) ?? null : null,
    },
    ...scope,
  };
}

export async function getProjectsData({
  ownerId,
  search,
  status,
  clientId,
  sort,
  page,
  pageSize,
}: {
  ownerId: string;
  search: string;
  status: ProjectStatus | "all";
  clientId: string | "all";
  sort: ProjectSort;
  page: number;
  pageSize: number;
}): Promise<ProjectsData> {
  const supabase = await createSupabaseServerClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const today = getTodayIso();

  let projectsQuery = supabase
    .from("projects")
    .select("id, name, description, status, deadline, estimated_value, progress, work_type, tags, clients(id, name, company_name, logo_path)", { count: "exact" })
    .eq("owner_id", ownerId);

  if (sort === "deadline") projectsQuery = projectsQuery.order("deadline", { ascending: true, nullsFirst: false });
  else if (sort === "value_desc") projectsQuery = projectsQuery.order("estimated_value", { ascending: false });
  else if (sort === "progress_desc") projectsQuery = projectsQuery.order("progress", { ascending: false });
  else if (sort === "name") projectsQuery = projectsQuery.order("name", { ascending: true });
  else projectsQuery = projectsQuery.order("updated_at", { ascending: false });

  projectsQuery = projectsQuery.range(from, to);

  if (status !== "all") projectsQuery = projectsQuery.eq("status", status);
  if (clientId !== "all") projectsQuery = projectsQuery.eq("client_id", clientId);

  const safeSearch = search.trim().replace(/[,()%'"]/g, " ");
  if (safeSearch) projectsQuery = projectsQuery.or(`name.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`);

  const [
    projectsResult,
    inProgressResult,
    reviewResult,
    completedResult,
    delayedResult,
    clientsResult,
    deadlinesResult,
    budgetsResult,
  ] = await Promise.all([
    projectsQuery.overrideTypes<ProjectRow[]>(),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("status", "in_progress"),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("status", "review"),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("status", "completed"),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("status", "delayed"),
    supabase.from("clients").select("id, name, company_name").eq("owner_id", ownerId).order("name").overrideTypes<ClientOptionRow[]>(),
    supabase
      .from("projects")
      .select("id, name, deadline, clients(id, name, company_name, logo_path)")
      .eq("owner_id", ownerId)
      .not("deadline", "is", null)
      .gte("deadline", today)
      .in("status", activeProjectStatuses)
      .order("deadline")
      .limit(5)
      .overrideTypes<Array<Pick<ProjectRow, "id" | "name" | "deadline" | "clients">>>(),
    supabase
      .from("budgets")
      .select("id, amount, status, projects(name, clients(id, name, company_name, logo_path))")
      .eq("owner_id", ownerId)
      .in("status", ["draft", "sent"])
      .order("created_at", { ascending: false })
      .limit(5)
      .overrideTypes<BudgetRow[]>(),
  ]);

  const failed = [projectsResult, inProgressResult, reviewResult, completedResult, delayedResult, clientsResult, deadlinesResult, budgetsResult].find((result) => result.error);
  if (failed?.error) throw failed.error;

  const projectRows = projectsResult.data ?? [];
  const deadlineRows = deadlinesResult.data ?? [];
  const budgetRows = budgetsResult.data ?? [];
  const logoPaths = [
    ...projectRows.flatMap((project) => project.clients?.logo_path ? [project.clients.logo_path] : []),
    ...deadlineRows.flatMap((project) => project.clients?.logo_path ? [project.clients.logo_path] : []),
    ...budgetRows.flatMap((budget) => budget.projects?.clients?.logo_path ? [budget.projects.clients.logo_path] : []),
  ];
  const logoUrls = await createLogoUrlMap(logoPaths);

  return {
    counts: {
      inProgress: inProgressResult.count ?? 0,
      review: reviewResult.count ?? 0,
      completed: completedResult.count ?? 0,
      delayed: delayedResult.count ?? 0,
    },
    projects: projectRows.map((project) => mapProject(project, logoUrls)),
    deadlines: deadlineRows.flatMap((project) => project.deadline ? [{
      id: project.id,
      name: project.name,
      clientName: project.clients?.name ?? "Sem cliente",
      deadline: project.deadline,
      daysLeft: getDaysLeft(project.deadline),
      logoUrl: project.clients?.logo_path ? logoUrls.get(project.clients.logo_path) ?? null : null,
    }] : []),
    budgets: budgetRows.map((budget) => ({
      id: budget.id,
      clientName: budget.projects?.clients?.name ?? "Sem cliente",
      projectName: budget.projects?.name ?? "Sem projeto",
      amount: toNumber(budget.amount),
      status: budget.status,
      logoUrl: budget.projects?.clients?.logo_path ? logoUrls.get(budget.projects.clients.logo_path) ?? null : null,
    })),
    clients: (clientsResult.data ?? []).map((client) => ({
      id: client.id,
      name: client.name,
      companyName: client.company_name,
    })),
    pagination: {
      page,
      pageSize,
      total: projectsResult.count ?? 0,
      pages: Math.max(1, Math.ceil((projectsResult.count ?? 0) / pageSize)),
    },
  };
}
