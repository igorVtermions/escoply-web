"use client";

import { AlertTriangle, Banknote, CalendarDays, FileCheck2, TrendingUp } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createFinancePaymentAction } from "@/app/dashboard/financeiro/actions";
import { showToast } from "@/components/ui/toast-provider";
import type { FinanceData } from "@/lib/finance/data";
import { FinanceFilters } from "./finance-filters";
import { FinanceMonthSummary } from "./finance-month-summary";
import { FinancePageHeader } from "./finance-page-header";
import { FinanceSummaryCard } from "./finance-summary-card";
import { addDays, currencyFormatter, formatDate, getInitials, isCurrentMonth, shortCurrencyFormatter, sumPayments } from "./finance-utils";
import { NewPaymentDialog } from "./new-payment-dialog";
import { PaymentsTable } from "./payments-table";
import { PaymentStatusBadge } from "./payment-status-badge";
import { UpcomingPaymentsPanel } from "./upcoming-payments-panel";
import { paymentTypeLabels, type FinanceFiltersState, type FinanceSummary, type Payment } from "./types";

const defaultFilters: FinanceFiltersState = {
  search: "",
  status: "all",
  period: "all",
  client: "all",
  type: "all",
};

function matchesPeriod(payment: Payment, period: FinanceFiltersState["period"], today: string) {
  if (period === "all") return true;
  if (period === "this_month") return isCurrentMonth(payment.dueDate, today);
  if (period === "overdue") return payment.status === "overdue";
  return payment.dueDate >= today && payment.dueDate <= addDays(today, 30);
}

function createSummaries(payments: Payment[], today: string, approvedBudgets: FinanceData["approvedBudgets"]): FinanceSummary[] {
  const paidThisMonth = payments.filter((payment) => payment.status === "paid" && isCurrentMonth(payment.paidAt ?? payment.dueDate, today));
  const receivable = payments.filter((payment) => payment.status === "pending" || payment.status === "overdue");
  const overdue = payments.filter((payment) => payment.status === "overdue");
  const averageTicket = approvedBudgets.count > 0 ? approvedBudgets.amount / approvedBudgets.count : 0;

  return [
    {
      id: "received",
      label: "Recebido este mês",
      value: currencyFormatter.format(sumPayments(paidThisMonth)),
      helper: "Entradas confirmadas",
      tone: "success",
      icon: Banknote,
    },
    {
      id: "receivable",
      label: "A receber",
      value: currencyFormatter.format(sumPayments(receivable)),
      helper: `${receivable.length} pagamentos pendentes`,
      tone: "warning",
      icon: CalendarDays,
    },
    {
      id: "overdue",
      label: "Atrasados",
      value: currencyFormatter.format(sumPayments(overdue)),
      helper: `${overdue.length} cobranças atrasadas`,
      tone: "danger",
      icon: AlertTriangle,
    },
    {
      id: "approved",
      label: "Orçamentos aprovados",
      value: String(approvedBudgets.count),
      helper: `${currencyFormatter.format(approvedBudgets.amount)} em propostas`,
      tone: "info",
      icon: FileCheck2,
    },
    {
      id: "ticket",
      label: "Ticket médio",
      value: currencyFormatter.format(averageTicket),
      helper: "por projeto aprovado",
      tone: "secondary",
      icon: TrendingUp,
    },
  ];
}

function PaymentCard({ payment }: { payment: Payment }) {
  return (
    <article className="finance-payment-card">
      <header>
        <span className="finance-client-avatar">{getInitials(payment.clientName)}</span>
        <div>
          <h3>{payment.clientName}</h3>
          <p>{payment.projectName}</p>
        </div>
        <PaymentStatusBadge status={payment.status} />
      </header>
      <div className="finance-payment-card-grid">
        <span>Descrição<strong>{payment.description}</strong></span>
        <span>Tipo<strong>{paymentTypeLabels[payment.type]}</strong></span>
        <span>Vencimento<strong>{formatDate(payment.dueDate)}</strong></span>
        <span>Valor<strong>{shortCurrencyFormatter.format(payment.amount)}</strong></span>
      </div>
    </article>
  );
}

export function FinancePageContent({ data, today }: { data: FinanceData; today: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState<FinanceFiltersState>(defaultFilters);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const payments = data.payments;

  const filteredPayments = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase();

    return payments.filter((payment) => {
      const searchable = [payment.clientName, payment.projectName, payment.description].join(" ").toLowerCase();
      return (
        (!normalizedSearch || searchable.includes(normalizedSearch))
        && (filters.status === "all" || payment.status === filters.status)
        && (filters.client === "all" || payment.clientId === filters.client)
        && (filters.type === "all" || payment.type === filters.type)
        && matchesPeriod(payment, filters.period, today)
      );
    });
  }, [filters, payments, today]);

  const summaries = useMemo(() => createSummaries(payments, today, data.approvedBudgets), [data.approvedBudgets, payments, today]);
  const monthPayments = useMemo(() => payments.filter((payment) => isCurrentMonth(payment.dueDate, today)), [payments, today]);

  const handleCreatePayment = (formData: FormData) => {
    startTransition(() => {
      void createFinancePaymentAction(formData).then((result) => {
        showToast({
          type: result.success ? "success" : "error",
          title: result.success ? "Recebimento criado" : "Ação não concluída",
          description: result.message,
        });

        if (result.success) {
          setIsCreateOpen(false);
          router.refresh();
        }
      });
    });
  };

  return (
    <div className="finance-page">
      <FinancePageHeader onCreate={() => setIsCreateOpen(true)} />

      <section className="finance-summary-grid" aria-label="Resumo financeiro">
        {summaries.map((summary) => <FinanceSummaryCard key={summary.id} summary={summary} />)}
      </section>

      <FinanceFilters filters={filters} clients={data.clients} onChange={setFilters} onClear={() => setFilters(defaultFilters)} />

      <div className="finance-main-grid">
        <div>
          <PaymentsTable payments={filteredPayments} />
          <section className="finance-payment-card-list" aria-label="Recebimentos em cards">
            {filteredPayments.map((payment) => <PaymentCard key={payment.id} payment={payment} />)}
            {filteredPayments.length === 0 && <p className="finance-empty-card">Nenhum recebimento encontrado.</p>}
          </section>
        </div>
        <aside className="finance-side-column">
          <UpcomingPaymentsPanel payments={payments} />
          <FinanceMonthSummary payments={monthPayments} />
          <section className="finance-side-card">
            <header><h2>Ações rápidas</h2></header>
            <div className="finance-quick-actions">
              <button type="button">Gerar lembrete de cobrança</button>
              <button type="button">Criar mensagem para WhatsApp</button>
              <button type="button" disabled>Exportar relatório em breve</button>
            </div>
          </section>
        </aside>
      </div>

      {isCreateOpen && (
        <NewPaymentDialog
          clients={data.clients}
          projects={data.projects}
          isPending={isPending}
          onClose={() => setIsCreateOpen(false)}
          onCreate={handleCreatePayment}
        />
      )}
    </div>
  );
}
