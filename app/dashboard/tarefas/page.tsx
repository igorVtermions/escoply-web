import { TasksSection } from "@/components/dashboard/tasks-section";
import { requireUser } from "@/lib/auth/session";
import { getTasksData, type TaskKind, type TaskPeriodFilter, type TaskStatusFilter } from "@/lib/tasks/data";
import "./tasks.css";

function getString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const user = await requireUser();
  const search = getString(query.busca).slice(0, 100);
  const rawKind = getString(query.tipo);
  const kind: TaskKind | "all" = ["meeting", "action", "review", "delivery", "follow_up", "charge", "other"].includes(rawKind) ? rawKind as TaskKind : "all";
  const rawStatus = getString(query.status);
  const status: TaskStatusFilter = ["overdue", "todo", "in_progress", "paused", "completed"].includes(rawStatus) ? rawStatus as TaskStatusFilter : "all";
  const rawPeriod = getString(query.periodo);
  const period: TaskPeriodFilter = ["all", "week", "month"].includes(rawPeriod) ? rawPeriod as TaskPeriodFilter : "all";

  const tasksData = await getTasksData({ ownerId: user.id, search, kind, status, period });
  return <TasksSection data={tasksData} filters={{ search, kind, status, period }} />;
}
