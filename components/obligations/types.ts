import type { LucideIcon } from "lucide-react";

export type ObligationType =
  | "tax"
  | "subscription"
  | "client"
  | "administrative"
  | "financial"
  | "other";

export type ObligationStatus =
  | "pending"
  | "paid"
  | "overdue"
  | "upcoming"
  | "inactive";

export type ObligationRecurrence =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "custom";

export type Obligation = {
  id: string;
  title: string;
  description?: string;
  type: ObligationType;
  recurrence: ObligationRecurrence;
  status: ObligationStatus;
  dueDate: string;
  amount?: number;
  clientId?: string;
  clientName?: string;
  projectId?: string;
  projectName?: string;
  isActive: boolean;
};

export type ObligationPeriodFilter = "all" | "this_month" | "next_7_days" | "overdue";

export type ObligationFiltersState = {
  search: string;
  type: ObligationType | "all";
  status: ObligationStatus | "all";
  recurrence: ObligationRecurrence | "all";
  period: ObligationPeriodFilter;
};

export type ObligationSummaryTone = "info" | "warning" | "danger" | "success" | "secondary";

export type ObligationSummary = {
  id: string;
  label: string;
  value: string;
  helper: string;
  tone: ObligationSummaryTone;
  icon: LucideIcon;
};

export const obligationTypeLabels: Record<ObligationType, string> = {
  tax: "Imposto",
  subscription: "Assinatura",
  client: "Cliente",
  administrative: "Administrativa",
  financial: "Financeira",
  other: "Outros",
};

export const obligationStatusLabels: Record<ObligationStatus, string> = {
  pending: "Pendente",
  paid: "Paga",
  overdue: "Atrasada",
  upcoming: "Próxima",
  inactive: "Inativa",
};

export const obligationRecurrenceLabels: Record<ObligationRecurrence, string> = {
  weekly: "Semanal",
  monthly: "Mensal",
  quarterly: "Trimestral",
  yearly: "Anual",
  custom: "Personalizada",
};
