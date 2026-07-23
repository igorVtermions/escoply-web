import { AlertTriangle, BriefcaseBusiness, CalendarDays, CheckCircle2, Clock3, Cloud, DatabaseBackup, FileText, Globe2, ReceiptText, WalletCards, type LucideIcon } from "lucide-react";
import type { Obligation, ObligationStatus, ObligationType } from "./types";

export const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

export function formatCurrency(value?: number) {
  return typeof value === "number" ? moneyFormatter.format(value) : "—";
}

export function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T12:00:00Z`));
}

export function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "OB";
}

export function getTypeIcon(type: ObligationType): LucideIcon {
  const icons: Record<ObligationType, LucideIcon> = {
    tax: ReceiptText,
    subscription: Cloud,
    client: BriefcaseBusiness,
    administrative: DatabaseBackup,
    financial: WalletCards,
    other: FileText,
  };
  return icons[type];
}

export function getTitleIcon(title: string, fallbackType: ObligationType): LucideIcon {
  const normalized = title.toLowerCase();
  if (normalized.includes("domínio") || normalized.includes("dominio")) return Globe2;
  if (normalized.includes("figma")) return FileText;
  if (normalized.includes("backup")) return DatabaseBackup;
  return getTypeIcon(fallbackType);
}

export function getStatusIcon(status: ObligationStatus): LucideIcon {
  const icons: Record<ObligationStatus, LucideIcon> = {
    pending: Clock3,
    paid: CheckCircle2,
    overdue: AlertTriangle,
    upcoming: CalendarDays,
    inactive: Clock3,
  };
  return icons[status];
}

export function isDueInReferenceMonth(obligation: Obligation, referenceMonth: string) {
  return obligation.isActive && obligation.dueDate.startsWith(referenceMonth);
}

export function sortByDueDate(obligations: Obligation[]) {
  return [...obligations].sort((first, second) => first.dueDate.localeCompare(second.dueDate));
}

export function sumAmounts(obligations: Obligation[]) {
  return obligations.reduce((total, obligation) => total + (obligation.amount ?? 0), 0);
}
