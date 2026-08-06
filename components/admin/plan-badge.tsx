import type { UserPlan } from "@/types/admin";

const labels: Record<UserPlan, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  ai: "AI",
};

export function PlanBadge({ plan }: { plan: UserPlan }) {
  return <span className={`admin-badge plan-${plan}`}>{labels[plan]}</span>;
}
