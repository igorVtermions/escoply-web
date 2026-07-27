import { createElement } from "react";
import type { FinanceSummary } from "./types";

export function FinanceSummaryCard({ summary }: { summary: FinanceSummary }) {
  return (
    <article className={`finance-summary-card is-${summary.tone}`}>
      <span className="finance-summary-icon">{createElement(summary.icon, { size: 24 })}</span>
      <div>
        <span>{summary.label}</span>
        <strong>{summary.value}</strong>
        <small>{summary.helper}</small>
      </div>
    </article>
  );
}
