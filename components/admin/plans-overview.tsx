import type { AdminPlanOverview } from "@/lib/admin/plans";
import { PlanBadge } from "./plan-badge";
import { PlanCard } from "./plan-card";
import { PlansPricingManager } from "./plans-pricing-manager";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatLimit(value: number | "unlimited", label: string) {
  return value === "unlimited" ? `${label} ilimitados` : `${value} ${label.toLowerCase()}`;
}

export function PlansOverview({ plans }: { plans: AdminPlanOverview[] }) {
  const totalUsers = plans.reduce((sum, plan) => sum + plan.usersCount, 0);
  const totalRevenue = plans.reduce((sum, plan) => sum + plan.estimatedMonthlyRevenue, 0);
  const paidUsers = plans.filter((plan) => plan.effectiveMonthlyPrice > 0).reduce((sum, plan) => sum + plan.usersCount, 0);

  return (
    <div className="admin-stack">
      <section className="admin-plan-kpis" aria-label="Resumo real dos planos">
        <article>
          <span>Usuários em planos</span>
          <strong>{totalUsers}</strong>
          <small>Excluindo administradores</small>
        </article>
        <article>
          <span>Usuários pagantes</span>
          <strong>{paidUsers}</strong>
          <small>Starter, Pro e AI</small>
        </article>
        <article>
          <span>Receita mensal estimada</span>
          <strong>{formatCurrency(totalRevenue)}</strong>
          <small>Baseada no preço efetivo dos planos</small>
        </article>
      </section>

      <section className="admin-plan-grid">
        {plans.map((plan) => (
          <PlanCard key={plan.plan} plan={plan} />
        ))}
      </section>

      <PlansPricingManager plans={plans} />

      <section className="admin-panel">
        <header>
          <h2>Usuários por plano</h2>
          <p>Dados reais vindos de profiles.plan no Supabase.</p>
        </header>
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Plano</th>
                <th>Usuários</th>
                <th>Ativos</th>
                <th>Bloqueados</th>
                <th>Pendentes</th>
                <th>Preço efetivo</th>
                <th>Receita estimada</th>
                <th>Limites</th>
                <th>Recursos</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.plan}>
                  <td><PlanBadge plan={plan.plan} /></td>
                  <td>{plan.usersCount}</td>
                  <td>{plan.activeUsersCount}</td>
                  <td>{plan.blockedUsersCount}</td>
                  <td>{plan.pendingUsersCount}</td>
                  <td>
                    {formatCurrency(plan.effectiveMonthlyPrice)}
                    {plan.isPromotionActive ? <small>Promoção ativa</small> : null}
                  </td>
                  <td>{formatCurrency(plan.estimatedMonthlyRevenue)}</td>
                  <td>
                    {formatLimit(plan.clientsLimit, "Clientes")}
                    <small>{formatLimit(plan.projectsLimit, "Projetos")} · {plan.storageLimit}</small>
                  </td>
                  <td>
                    {plan.hasPdf ? "PDF incluso" : "Sem PDF"}
                    <small>{plan.hasAi ? "IA inclusa" : "Sem IA"}</small>
                  </td>
                  <td><span className={plan.isActive ? "admin-badge status-active" : "admin-badge status-rejected"}>{plan.isActive ? "Ativo" : "Inativo"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-panel">
        <header>
          <h2>Usuários reais por plano</h2>
          <p>Lista operacional para conferir quem está em cada plano.</p>
        </header>
        <div className="admin-plan-users-grid">
          {plans.map((plan) => (
            <article key={plan.plan}>
              <header>
                <PlanBadge plan={plan.plan} />
                <strong>{plan.usersCount}</strong>
              </header>
              {plan.users.length > 0 ? (
                <ul>
                  {plan.users.slice(0, 8).map((user) => (
                    <li key={user.id}>
                      <span>{user.name}</span>
                      <small>{user.email}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Nenhum usuário neste plano.</p>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
