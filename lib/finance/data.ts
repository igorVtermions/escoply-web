import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FinanceClientOption, FinanceProjectOption, Payment, PaymentStatus, PaymentType } from "@/components/finance/types";

export type FinanceData = {
  payments: Payment[];
  clients: FinanceClientOption[];
  projects: FinanceProjectOption[];
  approvedBudgets: {
    count: number;
    amount: number;
  };
};

type PaymentRow = {
  id: string;
  project_id: string;
  description: string;
  payment_type: string | null;
  amount: number | string;
  due_date: string;
  status: string;
  paid_at: string | null;
  projects: {
    id: string;
    name: string;
    client_id: string;
    clients: {
      id: string;
      name: string;
      company_name: string | null;
      logo_path: string | null;
      phone: string | null;
      whatsapp: string | null;
    } | null;
  } | null;
};

type ClientRow = {
  id: string;
  name: string;
  company_name: string | null;
  logo_path: string | null;
  phone: string | null;
  whatsapp: string | null;
};

type ProjectRow = {
  id: string;
  name: string;
  client_id: string;
  clients: {
    name: string;
    company_name: string | null;
  } | null;
};

type BudgetRow = {
  amount: number | string;
};

function toPaymentStatus(value: string, dueDate: string): PaymentStatus {
  if (value === "paid") return "paid";
  if (value === "cancelled" || value === "canceled") return "canceled";
  if (value === "overdue") return "overdue";
  if (value === "pending" && dueDate < getTodayInSaoPaulo()) return "overdue";
  return "pending";
}

function inferPaymentType(description: string): PaymentType {
  const normalized = description.toLowerCase();
  if (normalized.includes("sinal") || normalized.includes("entrada")) return "deposit";
  if (normalized.includes("saldo") || normalized.includes("final")) return "final_payment";
  if (normalized.includes("parcela")) return "installment";
  return "extra";
}

function toPaymentType(value: string | null, description: string): PaymentType {
  if (value === "deposit" || value === "final_payment" || value === "installment" || value === "extra") return value;
  return inferPaymentType(description);
}

function displayClientName(client: { name: string; company_name: string | null } | null | undefined) {
  if (!client) return "Sem cliente";
  return client.name || client.company_name || "Sem cliente";
}

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

export async function getFinanceData({ ownerId }: { ownerId: string }): Promise<FinanceData> {
  const supabase = await createSupabaseServerClient();

  const [paymentsResult, clientsResult, projectsResult, budgetsResult] = await Promise.all([
    supabase
      .from("payments")
      .select("id, project_id, description, payment_type, amount, due_date, status, paid_at, projects(id, name, client_id, clients(id, name, company_name, logo_path, phone, whatsapp))")
      .eq("owner_id", ownerId)
      .order("due_date", { ascending: true })
      .limit(300)
      .overrideTypes<PaymentRow[]>(),
    supabase
      .from("clients")
      .select("id, name, company_name, logo_path, phone, whatsapp")
      .eq("owner_id", ownerId)
      .order("name")
      .overrideTypes<ClientRow[]>(),
    supabase
      .from("projects")
      .select("id, name, client_id, clients(name, company_name)")
      .eq("owner_id", ownerId)
      .neq("status", "archived")
      .order("name")
      .overrideTypes<ProjectRow[]>(),
    supabase
      .from("budgets")
      .select("amount")
      .eq("owner_id", ownerId)
      .eq("status", "approved")
      .overrideTypes<BudgetRow[]>(),
  ]);

  if (paymentsResult.error) throw paymentsResult.error;
  if (clientsResult.error) throw clientsResult.error;
  if (projectsResult.error) throw projectsResult.error;
  if (budgetsResult.error) throw budgetsResult.error;

  const logoPaths = Array.from(new Set([
    ...(paymentsResult.data ?? []).flatMap((payment) => payment.projects?.clients?.logo_path ? [payment.projects.clients.logo_path] : []),
    ...(clientsResult.data ?? []).flatMap((client) => client.logo_path ? [client.logo_path] : []),
  ]));
  const signedLogos = logoPaths.length > 0 ? await supabase.storage.from("client-logos").createSignedUrls(logoPaths, 60 * 60) : { data: [] };
  const logoUrls = new Map((signedLogos.data ?? []).flatMap((file) => file.path && file.signedUrl ? [[file.path, file.signedUrl] as const] : []));

  return {
    payments: (paymentsResult.data ?? []).map((payment) => {
      const client = payment.projects?.clients ?? null;

      return {
        id: payment.id,
        clientId: client?.id ?? payment.projects?.client_id ?? "",
        projectId: payment.project_id,
        clientName: displayClientName(client),
        clientLogoUrl: client?.logo_path ? logoUrls.get(client.logo_path) ?? null : null,
        clientPhone: client?.phone ?? null,
        clientWhatsapp: client?.whatsapp ?? null,
        projectName: payment.projects?.name ?? "Sem projeto",
        description: payment.description,
        type: toPaymentType(payment.payment_type, payment.description),
        status: toPaymentStatus(payment.status, payment.due_date),
        dueDate: payment.due_date,
        paidAt: payment.paid_at ?? undefined,
        amount: Number(payment.amount),
      };
    }),
    clients: (clientsResult.data ?? []).map((client) => ({
      id: client.id,
      name: displayClientName(client),
      phone: client.phone,
      whatsapp: client.whatsapp,
    })),
    projects: (projectsResult.data ?? []).map((project) => ({
      id: project.id,
      name: project.name,
      clientId: project.client_id,
      clientName: displayClientName(project.clients),
    })),
    approvedBudgets: {
      count: budgetsResult.data?.length ?? 0,
      amount: (budgetsResult.data ?? []).reduce((total, budget) => total + Number(budget.amount), 0),
    },
  };
}
