import { Crown, MessageSquareText, Signal, UserPlus, UsersRound } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSummaryCard } from "@/components/admin/admin-summary-card";
import { AdminGrowthChart, RecentUsersPanel } from "@/components/admin/admin-dashboard-client";
import { PlatformStatusCard } from "@/components/admin/platform-status-card";
import { RecentActivity } from "@/components/admin/recent-activity";
import { supportTickets } from "@/data/admin-mock";
import { getAdminDashboardData } from "@/lib/admin/data";

function formatPercent(value: number) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function buildPlanGradient(distribution: Awaited<ReturnType<typeof getAdminDashboardData>>["planDistribution"]) {
  let cursor = 0;
  const segments = distribution.map((item) => {
    const start = cursor;
    const end = cursor + item.percentage;
    cursor = end;
    return `${item.color} ${start}% ${end}%`;
  });

  return segments.length ? `conic-gradient(${segments.join(", ")})` : undefined;
}

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();
  const activePercent = data.totalUsers ? (data.activeUsers / data.totalUsers) * 100 : 0;
  const totalPlanUsers = data.planDistribution.reduce((total, item) => total + item.users, 0);
  const pendingSupportTickets = supportTickets.filter((ticket) => ticket.status === "new" || ticket.status === "open" || ticket.priority === "urgent").length;

  return (
    <div className="admin-dashboard">
      <AdminHeader title="Dashboard Admin" description="Visão geral real da plataforma Escoply." />

      <section className="admin-summary-grid">
        <AdminSummaryCard icon={UsersRound} label="Total de usuários" value={String(data.totalUsers)} description="contas no Supabase Auth" tone="purple" />
        <AdminSummaryCard icon={UsersRound} label="Usuários ativos" value={String(data.activeUsers)} description={`${formatPercent(activePercent)} do total`} tone="green" />
        <AdminSummaryCard icon={UserPlus} label="Novos usuários" value={String(data.newUsersThisMonth)} description="cadastros neste mês" tone="blue" />
        <AdminSummaryCard icon={Crown} label="Planos Pro" value={String(data.proUsers)} description="usuários no plano Pro" tone="purple" />
        <AdminSummaryCard icon={MessageSquareText} label="Chamados pendentes" value={String(pendingSupportTickets || data.pendingSupportTickets)} description="central de suporte" tone="red" />
        <AdminSummaryCard icon={Signal} label="Status da plataforma" value="Online" description="consultas admin respondendo" tone="green" />
      </section>

      <section className="admin-grid-3">
        <AdminGrowthChart ranges={data.growthRanges} />

        <article className="admin-panel">
          <header><h2>Distribuição de planos</h2></header>
          <div className="admin-plan-distribution">
            <div className="admin-donut" style={{ background: buildPlanGradient(data.planDistribution) }}><span>{totalPlanUsers}<br />Total</span></div>
            <ul>
              {data.planDistribution.map((item) => (
                <li key={item.plan}><span><i style={{ backgroundColor: item.color }} />{item.name}</span><strong>{item.users} ({formatPercent(item.percentage)})</strong></li>
              ))}
            </ul>
          </div>
        </article>

        <PlatformStatusCard services={data.platformServices} />
      </section>

      <section className="admin-grid-2">
        <RecentUsersPanel users={data.recentUsers} />
        <RecentActivity activities={data.recentActivities} />
      </section>
    </div>
  );
}
