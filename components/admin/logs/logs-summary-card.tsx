import type { LucideIcon } from "lucide-react";

type LogsSummaryCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  description: string;
  tone: "blue" | "green" | "purple" | "orange" | "red" | "slate";
};

export function LogsSummaryCard({ icon: Icon, label, value, description, tone }: LogsSummaryCardProps) {
  return (
    <article className="admin-summary-card admin-log-summary-card">
      <span className={`admin-summary-icon tone-${tone}`}>
        <Icon size={22} />
      </span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{description}</small>
      </div>
    </article>
  );
}
