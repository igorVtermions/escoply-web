import { CheckCircle2, XCircle } from "lucide-react";
import type { AdminPlanOverview } from "@/lib/admin/plans";

function formatLimit(value: number | "unlimited") {
  return value === "unlimited" ? "Ilimitado" : value.toString();
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string | undefined) {
  if (!value) return null;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${value}T00:00:00`));
}

export function PlanCard({ plan }: { plan: AdminPlanOverview }) {
  const hasPromotion = plan.isPromotionActive && typeof plan.promotionalPrice === "number";
  const promotionEndDate = formatDate(plan.promotionEndsAt);

  return (
    <article className={`admin-plan-card plan-${plan.plan}`}>
      <header>
        <span>{plan.name}</span>
        <em>{plan.isActive ? "Ativo" : "Inativo"}</em>
      </header>
      <div className="admin-plan-price">
        {hasPromotion ? <small>{formatCurrency(plan.monthlyPrice)}</small> : null}
        <strong>{formatCurrency(plan.effectiveMonthlyPrice)}</strong>
      </div>
      {hasPromotion ? (
        <mark>
          {plan.promotionLabel || "Promoção ativa"}
          {promotionEndDate ? ` · até ${promotionEndDate}` : ""}
        </mark>
      ) : null}
      <p>{plan.description}</p>
      <ul>
        <li>Clientes: {formatLimit(plan.clientsLimit)}</li>
        <li>Projetos: {formatLimit(plan.projectsLimit)}</li>
        <li>Storage: {plan.storageLimit}</li>
        <li>{plan.hasPdf ? <CheckCircle2 size={15} /> : <XCircle size={15} />} PDF</li>
        <li>{plan.hasAi ? <CheckCircle2 size={15} /> : <XCircle size={15} />} IA</li>
      </ul>
      <footer>
        {plan.usersCount} usuários · {plan.activeUsersCount} ativos
        <small>{formatCurrency(plan.estimatedMonthlyRevenue)} / mês estimado</small>
      </footer>
    </article>
  );
}
