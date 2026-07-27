"use client";

import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, DollarSign } from "lucide-react";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deactivateObligationAction, deleteObligationAction, markObligationAsPaidAction } from "@/app/dashboard/obrigacoes/actions";
import { showToast } from "@/components/ui/toast-provider";
import type { ObligationsData } from "@/lib/obligations/data";
import { EditObligationDialog } from "./edit-obligation-dialog";
import { NewObligationDialog } from "./new-obligation-dialog";
import { ObligationCard } from "./obligation-card";
import { ObligationDetailsDialog } from "./obligation-details-dialog";
import { ObligationsFilters } from "./obligations-filters";
import { ObligationsPageHeader } from "./obligations-page-header";
import { ObligationsSummaryCard } from "./obligations-summary-card";
import { ObligationsTable } from "./obligations-table";
import { formatCurrency, isDueInReferenceMonth, sumAmounts } from "./obligations-utils";
import { UpcomingObligationsPanel } from "./upcoming-obligations-panel";
import type { Obligation, ObligationFiltersState, ObligationSummary } from "./types";

const defaultFilters: ObligationFiltersState = {
  search: "",
  type: "all",
  status: "all",
  recurrence: "all",
  period: "this_month",
};

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function matchesPeriod(obligation: Obligation, period: ObligationFiltersState["period"], today: string, referenceMonth: string) {
  if (period === "all") return true;
  if (period === "this_month") return isDueInReferenceMonth(obligation, referenceMonth);
  if (period === "overdue") return obligation.status === "overdue";

  return obligation.dueDate >= today && obligation.dueDate < addDays(today, 7);
}

function createSummaries(obligations: Obligation[], referenceMonth: string): ObligationSummary[] {
  const monthObligations = obligations.filter((obligation) => isDueInReferenceMonth(obligation, referenceMonth));
  const pending = obligations.filter((obligation) => obligation.status === "pending" || obligation.status === "upcoming");
  const overdue = obligations.filter((obligation) => obligation.status === "overdue");
  const paid = obligations.filter((obligation) => obligation.status === "paid");
  const monthlyCost = sumAmounts(monthObligations);

  return [
    {
      id: "month",
      label: "Vencem este mês",
      value: String(monthObligations.length),
      helper: formatCurrency(monthlyCost),
      tone: "info",
      icon: CalendarDays,
    },
    {
      id: "pending",
      label: "Pendentes",
      value: String(pending.length),
      helper: formatCurrency(sumAmounts(pending)),
      tone: "warning",
      icon: Clock3,
    },
    {
      id: "overdue",
      label: "Atrasadas",
      value: String(overdue.length),
      helper: formatCurrency(sumAmounts(overdue)),
      tone: "danger",
      icon: AlertTriangle,
    },
    {
      id: "paid",
      label: "Pagas",
      value: String(paid.length),
      helper: formatCurrency(sumAmounts(paid)),
      tone: "success",
      icon: CheckCircle2,
    },
    {
      id: "cost",
      label: "Custo mensal",
      value: formatCurrency(monthlyCost),
      helper: "Média dos compromissos ativos",
      tone: "secondary",
      icon: DollarSign,
    },
  ];
}

export function ObligationsPageContent({ data, today, referenceMonth }: { data: ObligationsData; today: string; referenceMonth: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [obligations, updateOptimisticObligations] = useOptimistic(
    data.obligations,
    (current: Obligation[], action: { type: "paid" | "deactivate" | "delete"; id: string }) => {
      if (action.type === "paid") return current.map((obligation) => obligation.id === action.id ? { ...obligation, status: "paid" as const } : obligation);
      if (action.type === "deactivate") return current.map((obligation) => obligation.id === action.id ? { ...obligation, isActive: false, status: "inactive" as const } : obligation);
      return current.filter((obligation) => obligation.id !== action.id);
    },
  );
  const [filters, setFilters] = useState<ObligationFiltersState>(defaultFilters);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedObligation, setSelectedObligation] = useState<Obligation | null>(null);
  const [editingObligation, setEditingObligation] = useState<Obligation | null>(null);

  const filteredObligations = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase();
    return obligations.filter((obligation) => {
      const searchable = [obligation.title, obligation.description, obligation.clientName, obligation.projectName].filter(Boolean).join(" ").toLowerCase();
      const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
      const matchesType = filters.type === "all" || obligation.type === filters.type;
      const matchesStatus = filters.status === "all" || obligation.status === filters.status;
      const matchesRecurrence = filters.recurrence === "all" || obligation.recurrence === filters.recurrence;
      return matchesSearch && matchesType && matchesStatus && matchesRecurrence && matchesPeriod(obligation, filters.period, today, referenceMonth);
    });
  }, [filters, obligations, referenceMonth, today]);

  const summaries = useMemo(() => createSummaries(obligations, referenceMonth), [obligations, referenceMonth]);

  const handleMarkAsPaid = (id: string) => {
    startTransition(() => {
      updateOptimisticObligations({ type: "paid", id });
      void markObligationAsPaidAction(id).then((result) => {
        showToast({ type: result.success ? "success" : "error", title: result.success ? "Obrigação paga" : "Ação não concluída", description: result.message });
        router.refresh();
      });
    });
  };

  const handleDeactivate = (id: string) => {
    startTransition(() => {
      updateOptimisticObligations({ type: "deactivate", id });
      void deactivateObligationAction(id).then((result) => {
        showToast({ type: result.success ? "success" : "error", title: result.success ? "Obrigação desativada" : "Ação não concluída", description: result.message });
        router.refresh();
      });
    });
  };

  const handleDelete = (id: string) => {
    startTransition(() => {
      updateOptimisticObligations({ type: "delete", id });
      void deleteObligationAction(id).then((result) => {
        showToast({ type: result.success ? "success" : "error", title: result.success ? "Obrigação excluída" : "Ação não concluída", description: result.message });
        router.refresh();
      });
    });
  };

  const handleEditFromDetails = () => {
    if (!selectedObligation) return;
    setEditingObligation(selectedObligation);
    setSelectedObligation(null);
  };

  const handleShowUpcoming = () => {
    setFilters((current) => ({ ...current, status: "all", period: "next_7_days" }));
  };

  return (
    <div className="obligations-page">
      <ObligationsPageHeader onCreate={() => setIsCreateOpen(true)} />

      <section className="obligations-summary-grid" aria-label="Resumo de obrigações">
        {summaries.map((summary) => (
          <ObligationsSummaryCard key={summary.id} summary={summary} />
        ))}
      </section>

      <ObligationsFilters filters={filters} onChange={setFilters} onClear={() => setFilters(defaultFilters)} />

      <div className="obligations-main-grid">
        <div>
          <ObligationsTable obligations={filteredObligations} onViewDetails={setSelectedObligation} onEdit={setEditingObligation} onMarkAsPaid={handleMarkAsPaid} onDeactivate={handleDeactivate} onDelete={handleDelete} isPending={isPending} />
          <section className="obligations-card-list" aria-label="Obrigações em cards">
            {filteredObligations.map((obligation) => (
              <ObligationCard key={obligation.id} obligation={obligation} onViewDetails={setSelectedObligation} onEdit={setEditingObligation} onMarkAsPaid={handleMarkAsPaid} onDeactivate={handleDeactivate} onDelete={handleDelete} isPending={isPending} />
            ))}
          </section>
        </div>
        <UpcomingObligationsPanel obligations={obligations} referenceMonth={referenceMonth} onViewDetails={setSelectedObligation} onShowUpcoming={handleShowUpcoming} />
      </div>

      {isCreateOpen && <NewObligationDialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} clients={data.clients} projects={data.projects} />}
      {selectedObligation && <ObligationDetailsDialog obligation={selectedObligation} onClose={() => setSelectedObligation(null)} onEdit={handleEditFromDetails} onMarkAsPaid={() => handleMarkAsPaid(selectedObligation.id)} />}
      {editingObligation && <EditObligationDialog obligation={editingObligation} clients={data.clients} projects={data.projects} onClose={() => setEditingObligation(null)} />}
    </div>
  );
}
