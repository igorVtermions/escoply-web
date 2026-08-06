import "server-only";

import type { AdminUser, UserPlan, UserRole, UserStatus } from "@/types/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ProfileRow = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  profession: string | null;
  role: string | null;
  status: string | null;
  plan: string | null;
  created_at: string | null;
};

export type AdminPlanDistributionItem = {
  plan: UserPlan;
  name: string;
  users: number;
  percentage: number;
  color: string;
};

export type AdminRecentActivityItem = {
  title: string;
  detail: string;
  time: string;
  tone: "info" | "purple" | "danger" | "slate" | "green" | "orange";
};

export type AdminPlatformService = {
  name: string;
  status: "Online" | "Atenção";
};

export type AdminDashboardData = {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  proUsers: number;
  pendingSupportTickets: number;
  recentUsers: AdminUser[];
  planDistribution: AdminPlanDistributionItem[];
  recentActivities: AdminRecentActivityItem[];
  platformServices: AdminPlatformService[];
  growth: Array<{ label: string; users: number }>;
  growthRanges: {
    days7: Array<{ label: string; users: number }>;
    days30: Array<{ label: string; users: number }>;
    days90: Array<{ label: string; users: number }>;
    year: Array<{ label: string; users: number }>;
  };
};

const planLabels: Record<UserPlan, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  ai: "AI",
};

const planColors: Record<UserPlan, string> = {
  free: "#94A3B8",
  starter: "#3B82F6",
  pro: "#8B5CF6",
  ai: "#F59E0B",
};

function isUserRole(value: string | null | undefined): value is UserRole {
  return value === "user" || value === "admin";
}

function isUserStatus(value: string | null | undefined): value is UserStatus {
  return value === "active" || value === "blocked" || value === "pending";
}

function isUserPlan(value: string | null | undefined): value is UserPlan {
  return value === "free" || value === "starter" || value === "pro" || value === "ai";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatRelativeTime(value: string | null | undefined) {
  if (!value) return "—";

  const now = Date.now();
  const diffMs = now - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) return "Agora";
  if (diffMinutes < 60) return `${diffMinutes} min atrás`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? "hora" : "horas"} atrás`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays} dias atrás`;

  return formatDate(value);
}

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function buildGrowth(users: Array<{ created_at?: string }>, daysCount: number) {
  const today = new Date();
  const days = Array.from({ length: daysCount }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (daysCount - 1 - index));
    return date;
  });

  return days.map((date) => {
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return {
      label: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(date),
      users: users.filter((user) => user.created_at && new Date(user.created_at) <= endOfDay).length,
    };
  });
}

function buildYearGrowth(users: Array<{ created_at?: string }>) {
  const today = new Date();
  const months = Array.from({ length: 12 }, (_, index) => new Date(today.getFullYear(), today.getMonth() - (11 - index), 1));

  return months.map((date) => {
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

    return {
      label: new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "America/Sao_Paulo" }).format(date).replace(".", ""),
      users: users.filter((user) => user.created_at && new Date(user.created_at) <= endOfMonth).length,
    };
  });
}

function mapUser(authUser: { id: string; email?: string; created_at?: string; last_sign_in_at?: string | null; user_metadata?: Record<string, unknown> }, profile?: ProfileRow): AdminUser {
  const metadataName = typeof authUser.user_metadata?.full_name === "string" ? authUser.user_metadata.full_name : null;
  const emailName = authUser.email?.split("@")[0] ?? "Usuário";
  const name = profile?.full_name || metadataName || emailName;

  return {
    id: authUser.id,
    name,
    email: authUser.email ?? "—",
    role: isUserRole(profile?.role) ? profile.role : "user",
    status: isUserStatus(profile?.status) ? profile.status : "pending",
    plan: isUserPlan(profile?.plan) ? profile.plan : "free",
    companyName: profile?.company_name ?? undefined,
    phone: profile?.phone ?? undefined,
    profession: profile?.profession ?? undefined,
    createdAt: formatDate(authUser.created_at ?? profile?.created_at),
    lastLoginAt: formatRelativeTime(authUser.last_sign_in_at),
  };
}

async function listAllAuthUsers(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const users: Array<{ id: string; email?: string; created_at?: string; last_sign_in_at?: string | null; user_metadata?: Record<string, unknown> }> = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    users.push(...data.users);
    if (data.users.length < perPage) break;
    page += 1;
  }

  return users;
}

async function getTableCount(supabase: ReturnType<typeof createSupabaseAdminClient>, table: string) {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  return { count: count ?? 0, ok: !error };
}

async function getLatestTableRows(supabase: ReturnType<typeof createSupabaseAdminClient>, table: string, titleField: string) {
  const selectQuery = titleField === "description" ? "id, description, created_at" : titleField === "title" ? "id, title, created_at" : "id, name, created_at";
  const { data, error } = await supabase.from(table).select(selectQuery).order("created_at", { ascending: false }).limit(2);

  if (error || !data) return [];
  return data.map((row) => ({
    title: table === "projects" ? "Projeto criado" : table === "clients" ? "Cliente cadastrado" : table === "payments" ? "Recebimento criado" : "Obrigação criada",
    detail: String(row[titleField as keyof typeof row] ?? "Registro sem título"),
    time: formatRelativeTime(String(row.created_at)),
    tone: table === "payments" ? "green" : table === "obligations" ? "orange" : "info",
  })) satisfies AdminRecentActivityItem[];
}

function incrementByOwner(map: Map<string, number>, ownerId: string | null | undefined, amount = 1) {
  if (!ownerId) return;
  map.set(ownerId, (map.get(ownerId) ?? 0) + amount);
}

async function getUserUsageMetrics(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const [clientsResult, projectsResult, paymentsResult, obligationsResult] = await Promise.all([
    supabase.from("clients").select("owner_id"),
    supabase.from("projects").select("owner_id, status"),
    supabase.from("payments").select("owner_id, status, amount"),
    supabase.from("obligations").select("owner_id"),
  ]);

  const clientsCount = new Map<string, number>();
  const projectsCount = new Map<string, number>();
  const activeProjectsCount = new Map<string, number>();
  const paymentsCount = new Map<string, number>();
  const paidPaymentsTotal = new Map<string, number>();
  const pendingPaymentsTotal = new Map<string, number>();
  const obligationsCount = new Map<string, number>();

  clientsResult.data?.forEach((client) => incrementByOwner(clientsCount, client.owner_id));

  projectsResult.data?.forEach((project) => {
    incrementByOwner(projectsCount, project.owner_id);
    if (project.status === "in_progress" || project.status === "review" || project.status === "delayed") {
      incrementByOwner(activeProjectsCount, project.owner_id);
    }
  });

  paymentsResult.data?.forEach((payment) => {
    const amount = Number(payment.amount ?? 0);
    incrementByOwner(paymentsCount, payment.owner_id);
    if (payment.status === "paid") incrementByOwner(paidPaymentsTotal, payment.owner_id, amount);
    if (payment.status === "pending" || payment.status === "overdue") incrementByOwner(pendingPaymentsTotal, payment.owner_id, amount);
  });

  obligationsResult.data?.forEach((obligation) => incrementByOwner(obligationsCount, obligation.owner_id));

  return {
    clientsCount,
    projectsCount,
    activeProjectsCount,
    paymentsCount,
    paidPaymentsTotal,
    pendingPaymentsTotal,
    obligationsCount,
  };
}

export async function getAdminUsersData(): Promise<AdminUser[]> {
  const supabase = createSupabaseAdminClient();
  const authUsers = await listAllAuthUsers(supabase);

  const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id, full_name, company_name, phone, profession, role, status, plan, created_at");
  if (profilesError) throw profilesError;

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile as ProfileRow]));
  const usageMetrics = await getUserUsageMetrics(supabase);
  const users = authUsers.map((user) => {
    const mappedUser = mapUser(user, profileMap.get(user.id));

    return {
      ...mappedUser,
      clientsCount: usageMetrics.clientsCount.get(user.id) ?? 0,
      projectsCount: usageMetrics.projectsCount.get(user.id) ?? 0,
      activeProjectsCount: usageMetrics.activeProjectsCount.get(user.id) ?? 0,
      paymentsCount: usageMetrics.paymentsCount.get(user.id) ?? 0,
      paidPaymentsTotal: usageMetrics.paidPaymentsTotal.get(user.id) ?? 0,
      pendingPaymentsTotal: usageMetrics.pendingPaymentsTotal.get(user.id) ?? 0,
      obligationsCount: usageMetrics.obligationsCount.get(user.id) ?? 0,
    };
  });
  const sortedUsers = users.sort((a, b) => {
    const rawA = authUsers.find((user) => user.id === a.id)?.created_at ?? "";
    const rawB = authUsers.find((user) => user.id === b.id)?.created_at ?? "";
    return new Date(rawB).getTime() - new Date(rawA).getTime();
  });

  return sortedUsers.filter((user) => user.role !== "admin");
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const supabase = createSupabaseAdminClient();
  const authUsers = await listAllAuthUsers(supabase);
  const sortedUsers = await getAdminUsersData();
  const users = sortedUsers;
  const userIds = new Set(users.map((user) => user.id));
  const nonAdminAuthUsers = authUsers.filter((user) => userIds.has(user.id));

  const { error: profilesError } = await supabase.from("profiles").select("id", { count: "exact", head: true });

  const monthStart = getMonthStart();
  const newUsersThisMonth = nonAdminAuthUsers.filter((user) => user.created_at && new Date(user.created_at) >= monthStart).length;
  const activeUsers = users.filter((user) => user.status === "active").length;
  const proUsers = users.filter((user) => user.plan === "pro").length;

  const planCounts = users.reduce<Record<UserPlan, number>>(
    (accumulator, user) => {
      accumulator[user.plan] += 1;
      return accumulator;
    },
    { free: 0, starter: 0, pro: 0, ai: 0 },
  );

  const planDistribution = (Object.keys(planCounts) as UserPlan[]).map((plan) => ({
    plan,
    name: planLabels[plan],
    users: planCounts[plan],
    percentage: users.length ? Math.round((planCounts[plan] / users.length) * 1000) / 10 : 0,
    color: planColors[plan],
  }));

  const [clientsCount, projectsCount, paymentsCount, obligationsCount, remindersCount] = await Promise.all([
    getTableCount(supabase, "clients"),
    getTableCount(supabase, "projects"),
    getTableCount(supabase, "payments"),
    getTableCount(supabase, "obligations"),
    getTableCount(supabase, "reminders"),
  ]);

  const recentPlatformRows = await Promise.all([
    getLatestTableRows(supabase, "clients", "name"),
    getLatestTableRows(supabase, "projects", "name"),
    getLatestTableRows(supabase, "payments", "description"),
    getLatestTableRows(supabase, "obligations", "title"),
  ]);

  const recentUserActivities: AdminRecentActivityItem[] = sortedUsers.slice(0, 3).map((user) => ({
    title: "Usuário cadastrado",
    detail: `${user.name} (${user.email})`,
    time: user.createdAt,
    tone: user.role === "admin" ? "purple" : "info",
  }));

  return {
    totalUsers: users.length,
    activeUsers,
    newUsersThisMonth,
    proUsers,
    pendingSupportTickets: 0,
    recentUsers: sortedUsers.filter((user) => user.role !== "admin").slice(0, 6),
    planDistribution,
    recentActivities: [...recentUserActivities, ...recentPlatformRows.flat()].slice(0, 6),
    platformServices: [
      { name: "Autenticação", status: "Online" },
      { name: `Banco de dados (${projectsCount.count + clientsCount.count} registros centrais)`, status: profilesError ? "Atenção" : "Online" },
      { name: `Clientes`, status: clientsCount.ok ? "Online" : "Atenção" },
      { name: `Projetos`, status: projectsCount.ok ? "Online" : "Atenção" },
      { name: `Financeiro`, status: paymentsCount.ok ? "Online" : "Atenção" },
      { name: `Agenda e obrigações (${remindersCount.count + obligationsCount.count})`, status: remindersCount.ok && obligationsCount.ok ? "Online" : "Atenção" },
    ],
    growth: buildGrowth(nonAdminAuthUsers, 30),
    growthRanges: {
      days7: buildGrowth(nonAdminAuthUsers, 7),
      days30: buildGrowth(nonAdminAuthUsers, 30),
      days90: buildGrowth(nonAdminAuthUsers, 90),
      year: buildYearGrowth(nonAdminAuthUsers),
    },
  };
}
