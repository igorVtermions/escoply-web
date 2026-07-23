import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AgendaItemKind = "task" | "obligation" | "project_deadline" | "budget_validity" | "payment";
export type AgendaItemStatus = "pending" | "in_progress" | "completed" | "overdue" | "cancelled" | "info";

export type AgendaItem = {
  id: string;
  title: string;
  date: string;
  kind: AgendaItemKind;
  status: AgendaItemStatus;
  rawStatus: string | null;
  amount: number | null;
  projectId: string | null;
  projectName: string | null;
  projectDeadline: string | null;
  projectProgress: number | null;
  clientName: string | null;
  clientCompanyName: string | null;
  description: string | null;
  paymentCondition: string | null;
  paidAt: string | null;
  receiptFileName: string | null;
  receiptUrl: string | null;
};

export type AgendaData = {
  metrics: {
    today: number;
    overdue: number;
    week: number;
    completed: number;
  };
  items: AgendaItem[];
};

export type AgendaRange = {
  startDate: string;
  endDate: string;
};

type ReminderRow = {
  id: string;
  title: string;
  kind: string;
  scheduled_at: string;
  completed_at: string | null;
  task_status: string | null;
  projects: {
    id: string;
    name: string;
    deadline: string | null;
    progress: number;
    clients: { name: string; company_name: string | null } | null;
  } | null;
};

type ObligationRow = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  due_date: string;
  status: string;
  amount: number | string | null;
};

type ProjectDeadlineRow = {
  id: string;
  name: string;
  deadline: string;
  status: string;
  estimated_value: number | string;
  progress: number;
  clients: { name: string; company_name: string | null } | null;
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
    clients: { name: string; company_name: string | null } | null;
  } | null;
};

type PaymentRow = {
  id: string;
  description: string;
  amount: number | string;
  due_date: string;
  status: string;
  paid_at: string | null;
  receipt_path: string | null;
  receipt_file_name: string | null;
  projects: {
    id: string;
    name: string;
    deadline: string | null;
    progress: number;
    clients: { name: string; company_name: string | null } | null;
  } | null;
};

function getTodayInSaoPaulo() {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getDateKey(value: string) {
  return value.slice(0, 10);
}

function resolveStatus(dateKey: string, today: string, status: string | null, completedAt?: string | null): AgendaItemStatus {
  if (completedAt || status === "completed" || status === "paid") return "completed";
  if (status === "cancelled" || status === "archived" || status === "rejected") return "cancelled";
  if (status === "in_progress" || status === "review") return "in_progress";
  if (dateKey < today) return "overdue";
  return "pending";
}

export async function getAgendaData(ownerId: string, range: AgendaRange): Promise<AgendaData> {
  const supabase = await createSupabaseServerClient();
  const today = getTodayInSaoPaulo();
  const nextWeek = addDays(today, 7);

  const [remindersResult, obligationsResult, projectsResult, budgetsResult, paymentsResult] = await Promise.all([
    supabase
      .from("reminders")
      .select("id, title, kind, scheduled_at, completed_at, task_status, projects(id, name, deadline, progress, clients(name, company_name))")
      .eq("owner_id", ownerId)
      .gte("scheduled_at", `${range.startDate}T00:00:00-03:00`)
      .lte("scheduled_at", `${range.endDate}T23:59:59-03:00`)
      .order("scheduled_at")
      .limit(180)
      .overrideTypes<ReminderRow[]>(),
    supabase
      .from("obligations")
      .select("id, title, description, type, due_date, status, amount")
      .eq("owner_id", ownerId)
      .gte("due_date", range.startDate)
      .lte("due_date", range.endDate)
      .order("due_date")
      .limit(180)
      .overrideTypes<ObligationRow[]>(),
    supabase
      .from("projects")
      .select("id, name, deadline, status, estimated_value, progress, clients(name, company_name)")
      .eq("owner_id", ownerId)
      .not("deadline", "is", null)
      .gte("deadline", range.startDate)
      .lte("deadline", range.endDate)
      .neq("status", "archived")
      .order("deadline")
      .limit(180)
      .overrideTypes<ProjectDeadlineRow[]>(),
    supabase
      .from("budgets")
      .select("id, amount, status, valid_until, payment_condition, projects(id, name, deadline, progress, clients(name, company_name))")
      .eq("owner_id", ownerId)
      .not("valid_until", "is", null)
      .gte("valid_until", range.startDate)
      .lte("valid_until", range.endDate)
      .order("valid_until")
      .limit(180)
      .overrideTypes<BudgetRow[]>(),
    supabase
      .from("payments")
      .select("id, description, amount, due_date, status, paid_at, receipt_path, receipt_file_name, projects(id, name, deadline, progress, clients(name, company_name))")
      .eq("owner_id", ownerId)
      .gte("due_date", range.startDate)
      .lte("due_date", range.endDate)
      .order("due_date")
      .limit(180)
      .overrideTypes<PaymentRow[]>(),
  ]);

  const failedResult = [remindersResult, obligationsResult, projectsResult, budgetsResult, paymentsResult].find((result) => result.error);
  if (failedResult?.error) throw failedResult.error;

  const receiptFilePaths = (paymentsResult.data ?? []).flatMap((payment) => payment.receipt_path ? [payment.receipt_path] : []);
  const receiptSignedUrls = receiptFilePaths.length > 0 ? await supabase.storage.from("payment-receipts").createSignedUrls(receiptFilePaths, 60 * 60) : { data: [] };
  const receiptUrlMap = new Map((receiptSignedUrls.data ?? []).flatMap((file) => file.path && file.signedUrl ? [[file.path, file.signedUrl] as const] : []));

  const reminderItems: AgendaItem[] = (remindersResult.data ?? []).map((item) => {
    const dateKey = getDateKey(item.scheduled_at);
    return {
      id: item.id,
      title: item.title,
      date: item.scheduled_at,
      kind: "task",
      status: resolveStatus(dateKey, today, item.task_status, item.completed_at),
      rawStatus: item.task_status,
      amount: null,
      projectId: item.projects?.id ?? null,
      projectName: item.projects?.name ?? null,
      projectDeadline: item.projects?.deadline ?? null,
      projectProgress: item.projects?.progress ?? null,
      clientName: item.projects?.clients?.name ?? null,
      clientCompanyName: item.projects?.clients?.company_name ?? null,
      description: item.kind,
      paymentCondition: null,
      paidAt: null,
      receiptFileName: null,
      receiptUrl: null,
    };
  });

  const obligationItems: AgendaItem[] = (obligationsResult.data ?? []).map((item) => {
    const dateKey = item.due_date;
    return {
      id: item.id,
      title: item.title,
      date: `${item.due_date}T12:00:00-03:00`,
      kind: "obligation",
      status: resolveStatus(dateKey, today, item.status),
      rawStatus: item.status,
      amount: item.amount === null ? null : Number(item.amount),
      projectId: null,
      projectName: null,
      projectDeadline: null,
      projectProgress: null,
      clientName: null,
      clientCompanyName: null,
      description: item.description ?? item.type,
      paymentCondition: null,
      paidAt: null,
      receiptFileName: null,
      receiptUrl: null,
    };
  });

  const projectItems: AgendaItem[] = (projectsResult.data ?? []).map((item) => {
    const dateKey = item.deadline;
    return {
      id: item.id,
      title: `Prazo final: ${item.name}`,
      date: `${item.deadline}T12:00:00-03:00`,
      kind: "project_deadline",
      status: resolveStatus(dateKey, today, item.status),
      rawStatus: item.status,
      amount: Number(item.estimated_value),
      projectId: item.id,
      projectName: item.name,
      projectDeadline: item.deadline,
      projectProgress: item.progress,
      clientName: item.clients?.name ?? null,
      clientCompanyName: item.clients?.company_name ?? null,
      description: "Prazo de projeto",
      paymentCondition: null,
      paidAt: null,
      receiptFileName: null,
      receiptUrl: null,
    };
  });

  const budgetItems: AgendaItem[] = (budgetsResult.data ?? []).flatMap((item) => {
    if (!item.valid_until) return [];
    return [{
      id: item.id,
      title: `Validade do orçamento: ${item.projects?.name ?? "Projeto"}`,
      date: `${item.valid_until}T12:00:00-03:00`,
      kind: "budget_validity",
      status: resolveStatus(item.valid_until, today, item.status),
      rawStatus: item.status,
      amount: Number(item.amount),
      projectId: item.projects?.id ?? null,
      projectName: item.projects?.name ?? null,
      projectDeadline: item.projects?.deadline ?? null,
      projectProgress: item.projects?.progress ?? null,
      clientName: item.projects?.clients?.name ?? null,
      clientCompanyName: item.projects?.clients?.company_name ?? null,
      description: "Orçamento",
      paymentCondition: item.payment_condition,
      paidAt: null,
      receiptFileName: null,
      receiptUrl: null,
    }];
  });

  const paymentItems: AgendaItem[] = (paymentsResult.data ?? []).map((item) => ({
    id: item.id,
    title: item.description,
    date: `${item.due_date}T12:00:00-03:00`,
    kind: "payment",
    status: resolveStatus(item.due_date, today, item.status),
    rawStatus: item.status,
    amount: Number(item.amount),
    projectId: item.projects?.id ?? null,
    projectName: item.projects?.name ?? null,
    projectDeadline: item.projects?.deadline ?? null,
    projectProgress: item.projects?.progress ?? null,
    clientName: item.projects?.clients?.name ?? null,
    clientCompanyName: item.projects?.clients?.company_name ?? null,
    description: "Recebimento",
    paymentCondition: null,
    paidAt: item.paid_at,
    receiptFileName: item.receipt_file_name,
    receiptUrl: item.receipt_path ? receiptUrlMap.get(item.receipt_path) ?? null : null,
  }));

  const items = [...reminderItems, ...obligationItems, ...projectItems, ...budgetItems, ...paymentItems].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    metrics: {
      today: items.filter((item) => getDateKey(item.date) === today && item.status !== "completed" && item.status !== "cancelled").length,
      overdue: items.filter((item) => item.status === "overdue").length,
      week: items.filter((item) => {
        const dateKey = getDateKey(item.date);
        return dateKey >= today && dateKey < nextWeek && item.status !== "completed" && item.status !== "cancelled";
      }).length,
      completed: items.filter((item) => item.status === "completed").length,
    },
    items,
  };
}
