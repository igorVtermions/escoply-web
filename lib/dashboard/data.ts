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

export type DashboardDeadline = {
  id: string;
  name: string;
  clientName: string;
  progress: number;
  deadline: string;
};

export type DashboardBudget = {
  id: string;
  clientName: string;
  projectName: string;
  amount: number;
  status: string;
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

type DeadlineRow = {
  id: string;
  name: string;
  progress: number;
  deadline: string;
  clients: { name: string } | null;
};

type BudgetRow = {
  id: string;
  amount: number;
  status: string;
  projects: { name: string; clients: { name: string } | null } | null;
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
    deadlinesResult,
    budgetsResult,
    obligationsResult,
  ] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("status", "active"),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).in("status", ["in_progress", "review"]),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).not("deadline", "is", null).gte("deadline", dates.today).lt("deadline", dates.nextThirtyDays).neq("status", "completed").neq("status", "archived"),
    supabase.from("payments").select("amount").eq("owner_id", ownerId).in("status", ["pending", "overdue"]).overrideTypes<PaymentRow[]>(),
    supabase.from("reminders").select("id, title, kind, scheduled_at, projects(name, clients(name))").eq("owner_id", ownerId).is("completed_at", null).gte("scheduled_at", `${dates.today}T00:00:00-03:00`).lt("scheduled_at", `${dates.tomorrow}T00:00:00-03:00`).order("scheduled_at").limit(5).overrideTypes<ReminderRow[]>(),
    supabase.from("projects").select("id, name, progress, deadline, clients(name)").eq("owner_id", ownerId).not("deadline", "is", null).gte("deadline", dates.today).neq("status", "completed").neq("status", "archived").order("deadline").limit(5).overrideTypes<DeadlineRow[]>(),
    supabase.from("budgets").select("id, amount, status, projects(name, clients(name))").eq("owner_id", ownerId).in("status", ["draft", "sent"]).order("created_at", { ascending: false }).limit(5).overrideTypes<BudgetRow[]>(),
    supabase.from("obligations").select("id, title, type, due_date, status").eq("owner_id", ownerId).gte("due_date", dates.monthStart).lt("due_date", dates.nextMonthStart).order("due_date").limit(6).overrideTypes<ObligationRow[]>(),
  ]);

  const results = [clientsResult, projectsResult, deadlineCountResult, paymentsResult, remindersResult, deadlinesResult, budgetsResult, obligationsResult];
  const failedResult = results.find((result) => result.error);
  if (failedResult?.error) throw failedResult.error;

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
    deadlines: (deadlinesResult.data ?? []).map((project) => ({
      id: project.id,
      name: project.name,
      clientName: project.clients?.name ?? "Sem cliente",
      progress: project.progress,
      deadline: project.deadline,
    })),
    budgets: (budgetsResult.data ?? []).map((budget) => ({
      id: budget.id,
      clientName: budget.projects?.clients?.name ?? "Sem cliente",
      projectName: budget.projects?.name ?? "Sem projeto",
      amount: Number(budget.amount),
      status: budget.status,
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
