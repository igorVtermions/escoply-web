import { AgendaSection } from "@/components/dashboard/agenda-section";
import { requireUser } from "@/lib/auth/session";
import { getAgendaData } from "@/lib/agenda/data";
import { getTasksData, type TaskKind, type TaskPeriodFilter, type TaskStatusFilter } from "@/lib/tasks/data";
import "../tarefas/tasks.css";
import "./agenda.css";

type CalendarMode = "day" | "week" | "month";

function getString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function getTodayKey() {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function isValidDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00Z`).getTime());
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateKey(date);
}

function getWeekStart(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return formatDateKey(date);
}

function getCalendarRange(dateKey: string, mode: CalendarMode) {
  if (mode === "day") return { startDate: dateKey, endDate: dateKey };
  if (mode === "week") {
    const startDate = getWeekStart(dateKey);
    return { startDate, endDate: addDays(startDate, 6) };
  }

  const [year, month] = dateKey.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, month - 1, 1, 12));
  const lastDay = new Date(Date.UTC(year, month, 0, 12));
  const startDate = addDays(formatDateKey(firstDay), -firstDay.getUTCDay());
  const endDate = addDays(formatDateKey(lastDay), 6 - lastDay.getUTCDay());
  return { startDate, endDate };
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const user = await requireUser();
  const search = getString(query.busca).slice(0, 100);
  const rawKind = getString(query.tipo);
  const kind: TaskKind | "all" = ["meeting", "action", "review", "delivery", "follow_up", "charge", "other"].includes(rawKind) ? rawKind as TaskKind : "all";
  const rawStatus = getString(query.status);
  const status: TaskStatusFilter = ["overdue", "todo", "in_progress", "paused", "completed"].includes(rawStatus) ? rawStatus as TaskStatusFilter : "all";
  const rawPeriod = getString(query.periodo);
  const period: TaskPeriodFilter = ["all", "week", "month"].includes(rawPeriod) ? rawPeriod as TaskPeriodFilter : "all";
  const rawView = getString(query.visualizacao);
  const view = rawView === "kanban" ? "kanban" : "agenda";
  const rawMode = getString(query.modo);
  const calendarMode: CalendarMode = ["day", "week", "month"].includes(rawMode) ? rawMode as CalendarMode : "month";
  const rawDate = getString(query.data);
  const selectedDate = isValidDateKey(rawDate) ? rawDate : getTodayKey();
  const agendaRange = getCalendarRange(selectedDate, calendarMode);

  const [agendaData, tasksData] = await Promise.all([
    getAgendaData(user.id, agendaRange),
    getTasksData({ ownerId: user.id, search, kind, status, period }),
  ]);

  return <AgendaSection agendaData={agendaData} tasksData={tasksData} initialView={view} initialCalendarMode={calendarMode} selectedDate={selectedDate} filters={{ search, kind, status, period }} />;
}
