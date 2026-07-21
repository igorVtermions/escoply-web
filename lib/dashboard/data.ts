import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DashboardReminder = {
  id: string;
  title: string;
  kind: string;
  scheduledAt: string;
  projectName: string | null;
  clientName: string | null;
};

export type DashboardNotification = DashboardReminder & {
  source: "task";
  readAt: string | null;
};

export type DashboardDeadline = {
  id: string;
  name: string;
  clientId: string | null;
  clientName: string;
  clientCompanyName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  clientWhatsapp: string | null;
  clientWebsite: string | null;
  clientNotes: string | null;
  clientLogoUrl: string | null;
  progress: number;
  deadline: string;
};

export type DashboardBudget = {
  id: string;
  projectId: string | null;
  clientName: string;
  clientCompanyName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  clientWhatsapp: string | null;
  clientLogoUrl: string | null;
  projectName: string;
  projectDeadline: string | null;
  projectProgress: number | null;
  amount: number;
  status: string;
  validUntil: string | null;
  paymentCondition: string | null;
};

export type DashboardObligation = {
  id: string;
  title: string;
  type: string;
  dueDate: string;
  status: string;
};

export type DashboardData = {
  metrics: {
    activeClients: number;
    projectsInProgress: number;
    upcomingDeadlines: number;
    receivableAmount: number;
  };
  reminders: DashboardReminder[];
  notifications: DashboardNotification[];
  deadlines: DashboardDeadline[];
  budgets: DashboardBudget[];
  obligations: DashboardObligation[];
};

type ReminderRow = {
  id: string;
  title: string;
  kind: string;
  scheduled_at: string;
  projects: { name: string; clients: { name: string } | null } | null;
};

type NotificationRow = ReminderRow & {
  notification_read_at: string | null;
};

type DeadlineRow = {
  id: string;
  name: string;
  progress: number;
  deadline: string;
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
  projects: {
    id: string;
    name: string;
    deadline: string | null;
    progress: number;
    clients: {
      name: string;
      company_name: string | null;
      email: string | null;
      phone: string | null;
      whatsapp: string | null;
      logo_path: string | null;
    } | null;
  } | null;
};

type PaymentRow = { amount: number };
type ObligationRow = { id: string; title: string; type: string; due_date: string; status: string };

export function getTodayInSaoPaulo() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getDateBoundaries(selectedDate: string) {
  const [year, month] = selectedDate.split("-").map(Number);
  const today = selectedDate;
  const baseDate = new Date(`${today}T12:00:00Z`);
  const tomorrowDate = new Date(baseDate);
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const nextThirtyDaysDate = new Date(baseDate);
  nextThirtyDaysDate.setUTCDate(nextThirtyDaysDate.getUTCDate() + 30);
  const nextMonthDate = new Date(Date.UTC(year, month, 1));

  return {
    today,
    tomorrow: tomorrowDate.toISOString().slice(0, 10),
    nextThirtyDays: nextThirtyDaysDate.toISOString().slice(0, 10),
    monthStart: `${selectedDate.slice(0, 7)}-01`,
    nextMonthStart: nextMonthDate.toISOString().slice(0, 10),
  };
}

export async function getDashboardData(ownerId: string, selectedDate: string): Promise<DashboardData> {
  const supabase = await createSupabaseServerClient();
  const dates = getDateBoundaries(selectedDate);

  const [
    clientsResult,
    projectsResult,
    deadlineCountResult,
    paymentsResult,
    remindersResult,
    notificationsResult,
    deadlinesResult,
    budgetsResult,
    obligationsResult,
  ] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("status", "active"),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).in("status", ["in_progress", "review"]),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).not("deadline", "is", null).gte("deadline", dates.today).lt("deadline", dates.nextThirtyDays).neq("status", "completed").neq("status", "archived"),
    supabase.from("payments").select("amount").eq("owner_id", ownerId).in("status", ["pending", "overdue"]).overrideTypes<PaymentRow[]>(),
    supabase.from("reminders").select("id, title, kind, scheduled_at, projects(name, clients(name))").eq("owner_id", ownerId).is("completed_at", null).gte("scheduled_at", `${dates.today}T00:00:00-03:00`).lt("scheduled_at", `${dates.tomorrow}T00:00:00-03:00`).order("scheduled_at").limit(5).overrideTypes<ReminderRow[]>(),
    supabase.from("reminders").select("id, title, kind, scheduled_at, notification_read_at, projects(name, clients(name))").eq("owner_id", ownerId).is("completed_at", null).is("notification_dismissed_at", null).lt("scheduled_at", `${dates.tomorrow}T00:00:00-03:00`).order("notification_read_at", { ascending: true, nullsFirst: true }).order("scheduled_at").limit(12).overrideTypes<NotificationRow[]>(),
    supabase.from("projects").select("id, name, progress, deadline, clients(id, name, company_name, email, phone, whatsapp, website, notes, logo_path)").eq("owner_id", ownerId).not("deadline", "is", null).gte("deadline", dates.today).neq("status", "completed").neq("status", "archived").order("deadline").limit(5).overrideTypes<DeadlineRow[]>(),
    supabase.from("budgets").select("id, amount, status, valid_until, payment_condition, projects(id, name, deadline, progress, clients(name, company_name, email, phone, whatsapp, logo_path))").eq("owner_id", ownerId).in("status", ["draft", "sent"]).order("created_at", { ascending: false }).limit(5).overrideTypes<BudgetRow[]>(),
    supabase.from("obligations").select("id, title, type, due_date, status").eq("owner_id", ownerId).gte("due_date", dates.monthStart).lt("due_date", dates.nextMonthStart).order("due_date").limit(6).overrideTypes<ObligationRow[]>(),
  ]);

  const results = [clientsResult, projectsResult, deadlineCountResult, paymentsResult, remindersResult, notificationsResult, deadlinesResult, budgetsResult, obligationsResult];
  const failedResult = results.find((result) => result.error);
  if (failedResult?.error) throw failedResult.error;

  const logoPaths = [
    ...(deadlinesResult.data ?? []).flatMap((project) => project.clients?.logo_path ? [project.clients.logo_path] : []),
    ...(budgetsResult.data ?? []).flatMap((budget) => budget.projects?.clients?.logo_path ? [budget.projects.clients.logo_path] : []),
  ];
  const logoUrls = logoPaths.length > 0
    ? await supabase.storage.from("client-logos").createSignedUrls(Array.from(new Set(logoPaths)), 60 * 60)
    : { data: [] };
  const logoUrlMap = new Map((logoUrls.data ?? []).flatMap((logo) => logo.path && logo.signedUrl ? [[logo.path, logo.signedUrl] as const] : []));

  return {
    metrics: {
      activeClients: clientsResult.count ?? 0,
      projectsInProgress: projectsResult.count ?? 0,
      upcomingDeadlines: deadlineCountResult.count ?? 0,
      receivableAmount: (paymentsResult.data ?? []).reduce((total, payment) => total + Number(payment.amount), 0),
    },
    reminders: (remindersResult.data ?? []).map((reminder) => ({
      id: reminder.id,
      title: reminder.title,
      kind: reminder.kind,
      scheduledAt: reminder.scheduled_at,
      projectName: reminder.projects?.name ?? null,
      clientName: reminder.projects?.clients?.name ?? null,
    })),
    notifications: (notificationsResult.data ?? []).map((notification) => ({
      id: notification.id,
      title: notification.title,
      kind: notification.kind,
      scheduledAt: notification.scheduled_at,
      projectName: notification.projects?.name ?? null,
      clientName: notification.projects?.clients?.name ?? null,
      source: "task",
      readAt: notification.notification_read_at,
    })),
    deadlines: (deadlinesResult.data ?? []).map((project) => ({
      id: project.id,
      name: project.name,
      clientId: project.clients?.id ?? null,
      clientName: project.clients?.name ?? "Sem cliente",
      clientCompanyName: project.clients?.company_name ?? null,
      clientEmail: project.clients?.email ?? null,
      clientPhone: project.clients?.phone ?? null,
      clientWhatsapp: project.clients?.whatsapp ?? null,
      clientWebsite: project.clients?.website ?? null,
      clientNotes: project.clients?.notes ?? null,
      clientLogoUrl: project.clients?.logo_path ? logoUrlMap.get(project.clients.logo_path) ?? null : null,
      progress: project.progress,
      deadline: project.deadline,
    })),
    budgets: (budgetsResult.data ?? []).map((budget) => ({
      id: budget.id,
      projectId: budget.projects?.id ?? null,
      clientName: budget.projects?.clients?.name ?? "Sem cliente",
      clientCompanyName: budget.projects?.clients?.company_name ?? null,
      clientEmail: budget.projects?.clients?.email ?? null,
      clientPhone: budget.projects?.clients?.phone ?? null,
      clientWhatsapp: budget.projects?.clients?.whatsapp ?? null,
      clientLogoUrl: budget.projects?.clients?.logo_path ? logoUrlMap.get(budget.projects.clients.logo_path) ?? null : null,
      projectName: budget.projects?.name ?? "Sem projeto",
      projectDeadline: budget.projects?.deadline ?? null,
      projectProgress: budget.projects?.progress ?? null,
      amount: Number(budget.amount),
      status: budget.status,
      validUntil: budget.valid_until,
      paymentCondition: budget.payment_condition,
    })),
    obligations: (obligationsResult.data ?? []).map((obligation) => ({
      id: obligation.id,
      title: obligation.title,
      type: obligation.type,
      dueDate: obligation.due_date,
      status: obligation.status,
    })),
  };
}
