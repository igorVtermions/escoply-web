import type { LucideIcon } from "lucide-react";

export function AdminSummaryCard({
  icon: Icon,
  label,
  value,
  description,
  tone = "blue",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  description: string;
  tone?: "blue" | "green" | "purple" | "orange" | "red";
}) {
  return (
    <article className="admin-summary-card">
      <span className={`admin-summary-icon tone-${tone}`}>
        <Icon size={24} />
      </span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{description}</small>
      </div>
    </article>
  );
}
