import type { LucideIcon } from "lucide-react";

export type PaymentStatus = "pending" | "paid" | "overdue" | "canceled";

export type PaymentType = "deposit" | "final_payment" | "installment" | "extra";

export type Payment = {
  id: string;
  clientId: string;
  projectId: string;
  clientName: string;
  projectName: string;
  description: string;
  type: PaymentType;
  status: PaymentStatus;
  dueDate: string;
  paidAt?: string;
  amount: number;
};

export type FinanceClientOption = {
  id: string;
  name: string;
};

export type FinanceProjectOption = {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
};

export type FinancePeriodFilter = "all" | "this_month" | "next_30_days" | "overdue";

export type FinanceFiltersState = {
  search: string;
  status: PaymentStatus | "all";
  period: FinancePeriodFilter;
  client: string;
  type: PaymentType | "all";
};

export type FinanceSummaryTone = "success" | "warning" | "danger" | "info" | "secondary";

export type FinanceSummary = {
  id: string;
  label: string;
  value: string;
  helper: string;
  tone: FinanceSummaryTone;
  icon: LucideIcon;
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  paid: "Pago",
  pending: "Pendente",
  overdue: "Atrasado",
  canceled: "Cancelado",
};

export const paymentTypeLabels: Record<PaymentType, string> = {
  deposit: "Sinal",
  final_payment: "Saldo final",
  installment: "Parcela",
  extra: "Extra",
};
