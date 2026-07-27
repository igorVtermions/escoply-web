import type { ObligationSummary } from "./types";

type ObligationsSummaryCardProps = {
  summary: ObligationSummary;
};

export function ObligationsSummaryCard({ summary }: ObligationsSummaryCardProps) {
  const Icon = summary.icon;

  return (
    <article className={`obligations-summary-card is-${summary.tone}`}>
      <div className="obligations-summary-icon">
        <Icon size={28} />
      </div>
      <div>
        <span>{summary.label}</span>
        <strong>{summary.value}</strong>
        <small>{summary.helper}</small>
      </div>
    </article>
  );
}
