import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type TaskKind = "meeting" | "action" | "review" | "delivery" | "follow_up" | "charge" | "other";
export type TaskStatusFilter = "all" | "overdue" | "today" | "upcoming" | "completed";
export type TaskPeriodFilter = "all" | "week" | "month";

export type TaskItem = {
  id: string;
  title: string;
  kind: TaskKind;
  scheduledAt: string;
  completedAt: string | null;
  projectId: string | null;
  projectName: string | null;
  clientName: string | null;
  bucket: Exclude<TaskStatusFilter, "all">;
};

export type TaskProjectOption = {
  id: string;
  name: string;
  clientName: string | null;
};

export type TasksData = {
  metrics: {
    today: number;
    overdue: number;
    week: number;
    completed: number;
  };
  columns: {
    overdue: TaskItem[];
    today: TaskItem[];
    upcoming: TaskItem[];
    completed: TaskItem[];
  };
  projects: TaskProjectOption[];
};

type ReminderRow = {
  id: string;
  title: string;
  kind: TaskKind;
  scheduled_at: string;
  completed_at: string | null;
  project_id: string | null;
  projects: { id: string; name: string; clients: { name: string } | null } | null;
};

type ProjectOptionRow = {
  id: string;
  name: string;
  clients: { name: string } | null;
};

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

function addDays(date: string, days: number) {
  const baseDate = new Date(`${date}T12:00:00Z`);
  baseDate.setUTCDate(baseDate.getUTCDate() + days);
  return baseDate.toISOString().slice(0, 10);
}

function getTaskDateKey(scheduledAt: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(scheduledAt)).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getBucket(row: ReminderRow, today: string): TaskItem["bucket"] {
  if (row.completed_at) return "completed";
  const taskDate = getTaskDateKey(row.scheduled_at);
  if (taskDate < today) return "overdue";
  if (taskDate === today) return "today";
  return "upcoming";
}

function isInPeriod(taskDate: string, today: string, period: TaskPeriodFilter) {
  if (period === "all") return true;
  const limit = period === "week" ? addDays(today, 7) : addDays(today, 31);
  return taskDate >= today && taskDate < limit;
}

export async function getTasksData({
  ownerId,
  search,
  kind,
  status,
  period,
}: {
  ownerId: string;
  search: string;
  kind: TaskKind | "all";
  status: TaskStatusFilter;
  period: TaskPeriodFilter;
}): Promise<TasksData> {
  const supabase = await createSupabaseServerClient();
  const today = getTodayInSaoPaulo();
  const nextWeek = addDays(today, 7);

  const [remindersResult, projectsResult] = await Promise.all([
    supabase
      .from("reminders")
      .select("id, title, kind, scheduled_at, completed_at, project_id, projects(id, name, clients(name))")
      .eq("owner_id", ownerId)
      .order("scheduled_at", { ascending: true })
      .limit(300)
      .overrideTypes<ReminderRow[]>(),
    supabase
      .from("projects")
      .select("id, name, clients(name)")
      .eq("owner_id", ownerId)
      .neq("status", "archived")
      .order("name")
      .overrideTypes<ProjectOptionRow[]>(),
  ]);

  if (remindersResult.error) throw remindersResult.error;
  if (projectsResult.error) throw projectsResult.error;

  const allTasks = (remindersResult.data ?? []).map((row): TaskItem => ({
    id: row.id,
    title: row.title,
    kind: row.kind,
    scheduledAt: row.scheduled_at,
    completedAt: row.completed_at,
    projectId: row.project_id,
    projectName: row.projects?.name ?? null,
    clientName: row.projects?.clients?.name ?? null,
    bucket: getBucket(row, today),
  }));

  const normalizedSearch = search.trim().toLowerCase();
  const filteredTasks = allTasks.filter((task) => {
    const taskDate = getTaskDateKey(task.scheduledAt);
    const matchesSearch = !normalizedSearch || [task.title, task.projectName, task.clientName].filter(Boolean).some((value) => value?.toLowerCase().includes(normalizedSearch));
    const matchesKind = kind === "all" || task.kind === kind;
    const matchesStatus = status === "all" || task.bucket === status;
    const matchesPeriod = task.bucket === "overdue" || task.bucket === "completed" || isInPeriod(taskDate, today, period);
    return matchesSearch && matchesKind && matchesStatus && matchesPeriod;
  });

  return {
    metrics: {
      today: allTasks.filter((task) => task.bucket === "today").length,
      overdue: allTasks.filter((task) => task.bucket === "overdue").length,
      week: allTasks.filter((task) => !task.completedAt && getTaskDateKey(task.scheduledAt) >= today && getTaskDateKey(task.scheduledAt) < nextWeek).length,
      completed: allTasks.filter((task) => task.bucket === "completed").length,
    },
    columns: {
      overdue: filteredTasks.filter((task) => task.bucket === "overdue"),
      today: filteredTasks.filter((task) => task.bucket === "today"),
      upcoming: filteredTasks.filter((task) => task.bucket === "upcoming"),
      completed: filteredTasks.filter((task) => task.bucket === "completed"),
    },
    projects: (projectsResult.data ?? []).map((project) => ({
      id: project.id,
      name: project.name,
      clientName: project.clients?.name ?? null,
    })),
  };
}
