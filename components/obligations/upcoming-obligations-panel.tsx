"use client";

import { CalendarDays, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { formatCurrency, getStatusIcon, sortByDueDate, sumAmounts } from "./obligations-utils";
import { obligationStatusLabels, type Obligation } from "./types";

type SummaryPeriod = "current_month" | "next_month" | "all" | "overdue";

type UpcomingObligationsPanelProps = {
  obligations: Obligation[];
  referenceMonth: string;
  onViewDetails: (obligation: Obligation) => void;
  onShowUpcoming: () => void;
};

function getNextMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const next = new Date(Date.UTC(year, month, 1, 12));
  return next.toISOString().slice(0, 7);
}

function isInMonth(obligation: Obligation, monthKey: string) {
  return obligation.dueDate.startsWith(monthKey);
}

function getPeriodObligations(obligations: Obligation[], period: SummaryPeriod, referenceMonth: string) {
  if (period === "all") return obligations;
  if (period === "overdue") return obligations.filter((obligation) => obligation.status === "overdue");
  if (period === "next_month") return obligations.filter((obligation) => isInMonth(obligation, getNextMonth(referenceMonth)));
  return obligations.filter((obligation) => isInMonth(obligation, referenceMonth));
}

export function UpcomingObligationsPanel({ obligations, referenceMonth, onViewDetails, onShowUpcoming }: UpcomingObligationsPanelProps) {
  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>("current_month");

  const upcoming = useMemo(
    () => sortByDueDate(obligations.filter((obligation) => obligation.isActive && obligation.status !== "paid" && obligation.status !== "inactive")).slice(0, 4),
    [obligations],
  );

  const summaryObligations = useMemo(
    () => getPeriodObligations(obligations, summaryPeriod, referenceMonth),
    [obligations, referenceMonth, summaryPeriod],
  );

  const paid = summaryObligations.filter((obligation) => obligation.status === "paid");
  const pending = summaryObligations.filter((obligation) => obligation.status === "pending" || obligation.status === "upcoming");
  const overdue = summaryObligations.filter((obligation) => obligation.status === "overdue");

  return (
    <aside className="obligations-side-panel">
      <section className="obligations-panel-card">
        <header>
          <h2>Próximos vencimentos</h2>
          <button type="button" className="obligations-panel-icon-button" onClick={onShowUpcoming} aria-label="Ver próximos vencimentos">
            <CalendarDays size={17} />
          </button>
        </header>
        <div className="obligations-upcoming-list">
          {upcoming.length === 0 && <p className="obligations-panel-empty">Nenhum vencimento próximo.</p>}
          {upcoming.map((obligation) => {
            const StatusIcon = getStatusIcon(obligation.status);
            const date = new Date(`${obligation.dueDate}T12:00:00Z`);
            return (
              <button key={obligation.id} type="button" className="obligations-upcoming-item" onClick={() => onViewDetails(obligation)}>
                <time>
                  <strong>{String(date.getUTCDate()).padStart(2, "0")}</strong>
                  <span>{date.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }).replace(".", "")}</span>
                </time>
                <span>
                  <strong>{obligation.title}</strong>
                  <small>{formatCurrency(obligation.amount)} · {obligationStatusLabels[obligation.status]}</small>
                </span>
                <span className={`obligations-upcoming-status is-${obligation.status}`}><StatusIcon size={17} /></span>
              </button>
            );
          })}
        </div>
        <button type="button" className="obligations-panel-link" onClick={onShowUpcoming}>
          Ver todas as próximas
          <ChevronRight size={17} />
        </button>
      </section>

      <section className="obligations-panel-card">
        <header>
          <h2>Resumo</h2>
          <select aria-label="Período do resumo" value={summaryPeriod} onChange={(event) => setSummaryPeriod(event.target.value as SummaryPeriod)}>
            <option value="current_month">Mês atual</option>
            <option value="next_month">Próximo mês</option>
            <option value="all">Todas</option>
            <option value="overdue">Atrasadas</option>
          </select>
        </header>
        <div className="obligations-month-grid">
          <div className="is-success">
            <span>Pagas</span>
            <strong>{formatCurrency(sumAmounts(paid))}</strong>
            <small>{paid.length} obrigações</small>
          </div>
          <div className="is-warning">
            <span>Pendentes</span>
            <strong>{formatCurrency(sumAmounts(pending))}</strong>
            <small>{pending.length} obrigações</small>
          </div>
          <div className="is-danger">
            <span>Atrasadas</span>
            <strong>{formatCurrency(sumAmounts(overdue))}</strong>
            <small>{overdue.length} obrigações</small>
          </div>
        </div>
        <footer>
          <span>Total do período</span>
          <strong>{formatCurrency(sumAmounts(summaryObligations))}</strong>
        </footer>
      </section>
    </aside>
  );
}
