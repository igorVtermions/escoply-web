"use client";

import { useMemo, useState } from "react";
import { BriefcaseBusiness, Building2, CalendarDays, ClipboardList, Mail, Phone, UserRound, WalletCards, X } from "lucide-react";
import type { AdminDashboardData } from "@/lib/admin/data";
import type { AdminUser } from "@/types/admin";
import { PlanBadge } from "./plan-badge";
import { StatusBadge } from "./status-badge";
import { UsersTable } from "./users-table";

type GrowthRange = "days7" | "days30" | "days90" | "year";

const rangeLabels: Record<GrowthRange, string> = {
  days7: "Últimos 7 dias",
  days30: "Últimos 30 dias",
  days90: "Últimos 90 dias",
  year: "Últimos 12 meses",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatCurrency(value: number | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value ?? 0);
}

function DetailMetric({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <article>
      <strong>{value}</strong>
      <span>{label}</span>
      {helper ? <small>{helper}</small> : null}
    </article>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string | undefined }) {
  return (
    <div>
      <Icon size={17} />
      <span>
        <dt>{label}</dt>
        <dd>{value || "—"}</dd>
      </span>
    </div>
  );
}

function UserDetailsModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  return (
    <div className="admin-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="admin-user-modal" role="dialog" aria-modal="true" aria-labelledby="admin-user-modal-title">
        <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Fechar detalhes do usuário"><X size={20} /></button>
        <header>
          <span>{getInitials(user.name) || "US"}</span>
          <div>
            <small>Usuário da plataforma</small>
            <h2 id="admin-user-modal-title">{user.name}</h2>
            <p>{user.companyName || user.profession || "Perfil sem marca ou profissão cadastrada"}</p>
            <div className="admin-user-modal-badges">
              <PlanBadge plan={user.plan} />
              <StatusBadge status={user.status} />
            </div>
          </div>
        </header>
        <section className="admin-user-modal-metrics" aria-label="Resumo do usuário">
          <DetailMetric label="Clientes" value={user.clientsCount ?? 0} />
          <DetailMetric label="Projetos" value={user.projectsCount ?? 0} helper={`${user.activeProjectsCount ?? 0} ativos`} />
          <DetailMetric label="Recebido" value={formatCurrency(user.paidPaymentsTotal)} />
          <DetailMetric label="A receber" value={formatCurrency(user.pendingPaymentsTotal)} />
        </section>
        <section className="admin-user-modal-sections">
          <article>
            <h3>Conta e contato</h3>
            <dl>
              <DetailItem icon={Mail} label="E-mail" value={user.email} />
              <DetailItem icon={Phone} label="Telefone" value={user.phone} />
              <DetailItem icon={Building2} label="Empresa ou marca" value={user.companyName} />
              <DetailItem icon={BriefcaseBusiness} label="Profissão" value={user.profession} />
            </dl>
          </article>
          <article>
            <h3>Uso da plataforma</h3>
            <dl>
              <DetailItem icon={CalendarDays} label="Criado em" value={user.createdAt} />
              <DetailItem icon={UserRound} label="Último acesso" value={user.lastLoginAt} />
              <DetailItem icon={WalletCards} label="Recebimentos cadastrados" value={`${user.paymentsCount ?? 0}`} />
              <DetailItem icon={ClipboardList} label="Obrigações cadastradas" value={`${user.obligationsCount ?? 0}`} />
            </dl>
          </article>
        </section>
      </section>
    </div>
  );
}

export function AdminGrowthChart({ ranges }: { ranges: AdminDashboardData["growthRanges"] }) {
  const [range, setRange] = useState<GrowthRange>("days30");
  const data = ranges[range];
  const maxGrowth = Math.max(...data.map((item) => item.users), 1);

  const footerLabels = useMemo(() => {
    if (data.length <= 4) return data.map((item) => item.label);
    return [data[0]?.label, data[Math.floor(data.length / 3)]?.label, data[Math.floor((data.length / 3) * 2)]?.label, data[data.length - 1]?.label].filter(Boolean);
  }, [data]);

  return (
    <article className="admin-panel">
      <header>
        <h2>Crescimento de usuários</h2>
        <select aria-label="Filtrar período do gráfico de crescimento" value={range} onChange={(event) => setRange(event.target.value as GrowthRange)}>
          {Object.entries(rangeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </header>
      <div className="admin-growth-chart" aria-label={`Crescimento de usuários: ${rangeLabels[range]}`}>
        {data.map((item, index) => (
          <span key={`${item.label}-${item.users}-${index}`} title={`${item.label}: ${item.users} usuários`} style={{ height: `${Math.max(6, (item.users / maxGrowth) * 100)}%` }} />
        ))}
      </div>
      <div className="admin-chart-footer">{footerLabels.map((label) => <span key={label}>{label}</span>)}</div>
    </article>
  );
}

export function RecentUsersPanel({ users }: { users: AdminUser[] }) {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  return (
    <section className="admin-panel">
      <header><h2>Usuários recentes</h2></header>
      {users.length === 0 ? <p className="admin-empty-state">Nenhum usuário comum cadastrado ainda.</p> : <UsersTable users={users} compact onUserClick={setSelectedUser} />}
      {selectedUser && <UserDetailsModal user={selectedUser} onClose={() => setSelectedUser(null)} />}
    </section>
  );
}
