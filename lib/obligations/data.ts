import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Obligation, ObligationRecurrence, ObligationStatus, ObligationType } from "@/components/obligations/types";

export type ObligationClientOption = {
  id: string;
  name: string;
  companyName: string | null;
};

export type ObligationProjectOption = {
  id: string;
  name: string;
  clientId: string;
  clientName: string | null;
};

export type ObligationsData = {
  obligations: Obligation[];
  clients: ObligationClientOption[];
  projects: ObligationProjectOption[];
};

type ObligationRow = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  recurrence: string | null;
  status: string;
  due_date: string;
  amount: number | string | null;
  client_id: string | null;
  project_id: string | null;
  is_active: boolean | null;
  clients: { name: string; company_name: string | null } | null;
  projects: { name: string; clients: { name: string } | null } | null;
};

type ClientOptionRow = {
  id: string;
  name: string;
  company_name: string | null;
};

type ProjectOptionRow = {
  id: string;
  name: string;
  client_id: string;
  clients: { name: string } | null;
};

function toObligationType(value: string): ObligationType {
  if (value === "contribution") return "tax";
  return ["tax", "subscription", "client", "administrative", "financial", "other"].includes(value) ? value as ObligationType : "other";
}

function toObligationStatus(value: string, dueDate: string): ObligationStatus {
  if (value === "paid" || value === "completed") return "paid";
  if (value === "inactive") return "inactive";
  if (value === "overdue") return "overdue";
  if (value === "upcoming") return "upcoming";
  if (value === "pending" || value === "in_progress" || value === "not_started") {
    const today = getTodayInSaoPaulo();
    return dueDate < today ? "overdue" : "pending";
  }
  return "pending";
}

function toObligationRecurrence(value: string | null): ObligationRecurrence {
  return ["weekly", "monthly", "quarterly", "yearly", "custom"].includes(value ?? "") ? value as ObligationRecurrence : "monthly";
}

export function getTodayInSaoPaulo() {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getMonthRange(dateKey = getTodayInSaoPaulo()) {
  const [year, month] = dateKey.split("-").map(Number);
  const start = `${dateKey.slice(0, 7)}-01`;
  const nextMonth = new Date(Date.UTC(year, month, 1, 12));
  return { start, end: nextMonth.toISOString().slice(0, 10) };
}

export async function getObligationsData({
  ownerId,
}: {
  ownerId: string;
}): Promise<ObligationsData> {
  const supabase = await createSupabaseServerClient();

  const [obligationsResult, clientsResult, projectsResult] = await Promise.all([
    supabase
      .from("obligations")
      .select("id, title, description, type, recurrence, status, due_date, amount, client_id, project_id, is_active, clients(name, company_name), projects(name, clients(name))")
      .eq("owner_id", ownerId)
      .order("due_date", { ascending: true })
      .limit(300)
      .overrideTypes<ObligationRow[]>(),
    supabase.from("clients").select("id, name, company_name").eq("owner_id", ownerId).order("name").overrideTypes<ClientOptionRow[]>(),
    supabase.from("projects").select("id, name, client_id, clients(name)").eq("owner_id", ownerId).neq("status", "archived").order("name").overrideTypes<ProjectOptionRow[]>(),
  ]);

  if (obligationsResult.error) throw obligationsResult.error;
  if (clientsResult.error) throw clientsResult.error;
  if (projectsResult.error) throw projectsResult.error;

  return {
    obligations: (obligationsResult.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      type: toObligationType(row.type),
      recurrence: toObligationRecurrence(row.recurrence),
      status: toObligationStatus(row.status, row.due_date),
      dueDate: row.due_date,
      amount: row.amount === null ? undefined : Number(row.amount),
      clientId: row.client_id ?? undefined,
      clientName: row.clients?.name ?? undefined,
      projectId: row.project_id ?? undefined,
      projectName: row.projects?.name ?? undefined,
      isActive: row.is_active ?? row.status !== "inactive",
    })),
    clients: (clientsResult.data ?? []).map((client) => ({ id: client.id, name: client.name, companyName: client.company_name })),
    projects: (projectsResult.data ?? []).map((project) => ({ id: project.id, name: project.name, clientId: project.client_id, clientName: project.clients?.name ?? null })),
  };
}
