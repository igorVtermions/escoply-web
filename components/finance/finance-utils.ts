import type { Payment } from "./types";

export const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const shortCurrencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatSummaryCurrency(value: number) {
  if (Math.abs(value) >= 100000) return compactCurrencyFormatter.format(value);
  if (Math.abs(value) >= 10000) return shortCurrencyFormatter.format(value);
  return currencyFormatter.format(value);
}

export const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(dateKey?: string) {
  if (!dateKey) return "—";
  const normalizedDate = dateKey.includes("T") ? new Date(dateKey) : new Date(`${dateKey}T12:00:00Z`);
  return dateFormatter.format(normalizedDate);
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "CL";
}

export function sumPayments(payments: Payment[]) {
  return payments.reduce((total, payment) => total + payment.amount, 0);
}

export function sortByDueDate(payments: Payment[]) {
  return [...payments].sort((first, second) => first.dueDate.localeCompare(second.dueDate));
}

export function isCurrentMonth(dateKey: string, referenceDate: string) {
  return dateKey.startsWith(referenceDate.slice(0, 7));
}

export function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
