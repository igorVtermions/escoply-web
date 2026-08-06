"use client";

import { BriefcaseBusiness, CalendarDays, DollarSign, FolderKanban, Mail, Phone, ReceiptText, ShieldOff, ShieldCheck, UserRound } from "lucide-react";
import type { AdminUser, UserPlan, UserStatus } from "@/types/admin";
import { PlanBadge } from "./plan-badge";
import { StatusBadge } from "./status-badge";

const planOptions: Array<{ value: UserPlan; label: string }> = [
  { value: "free", label: "Free" },
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
  { value: "ai", label: "AI" },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatCurrency(value?: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

export function UserDetailsPanel({
  user,
  isSaving,
  onPlanChange,
  onStatusChange,
}: {
  user: AdminUser;
  isSaving: boolean;
  onPlanChange: (userId: string, plan: UserPlan) => void;
  onStatusChange: (userId: string, status: UserStatus) => void;
}) {
  const nextStatus = user.status === "blocked" ? "active" : "blocked";

  return (
    <aside className="admin-detail-panel">
      <header>
        <span>{getInitials(user.name)}</span>
        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
        </div>
      </header>

      <div className="admin-detail-badges">
        <PlanBadge plan={user.plan} />
        <StatusBadge status={user.status} />
      </div>

      <section className="admin-detail-controls" aria-label="Ações administrativas do usuário">
        <label>
          Plano do usuário
          <select value={user.plan} disabled={isSaving} onChange={(event) => onPlanChange(user.id, event.target.value as UserPlan)}>
            {planOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={nextStatus === "blocked" ? "danger" : "success"}
          disabled={isSaving}
          onClick={() => onStatusChange(user.id, nextStatus)}
        >
          {nextStatus === "blocked" ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
          {nextStatus === "blocked" ? "Bloquear usuário" : "Desbloquear usuário"}
        </button>
      </section>

      <dl>
        <div>
          <dt>Empresa / marca</dt>
          <dd>{user.companyName ?? "—"}</dd>
        </div>
        <div>
          <dt>Profissão</dt>
          <dd>{user.profession ?? "—"}</dd>
        </div>
        <div>
          <dt>Telefone</dt>
          <dd>{user.phone ?? "—"}</dd>
        </div>
        <div>
          <dt>Criado em</dt>
          <dd>{user.createdAt}</dd>
        </div>
        <div>
          <dt>Último acesso</dt>
          <dd>{user.lastLoginAt ?? "—"}</dd>
        </div>
      </dl>

      <section className="admin-detail-metrics" aria-label="Uso do usuário">
        <article>
          <UserRound size={17} />
          <strong>{user.clientsCount ?? 0}</strong>
          <span>Clientes</span>
        </article>
        <article>
          <FolderKanban size={17} />
          <strong>{user.projectsCount ?? 0}</strong>
          <span>Projetos</span>
        </article>
        <article>
          <CalendarDays size={17} />
          <strong>{user.activeProjectsCount ?? 0}</strong>
          <span>Projetos ativos</span>
        </article>
        <article>
          <ReceiptText size={17} />
          <strong>{user.obligationsCount ?? 0}</strong>
          <span>Obrigações</span>
        </article>
      </section>

      <section className="admin-detail-finance" aria-label="Resumo financeiro do usuário">
        <div>
          <DollarSign size={17} />
          <span>Recebido</span>
          <strong>{formatCurrency(user.paidPaymentsTotal)}</strong>
        </div>
        <div>
          <BriefcaseBusiness size={17} />
          <span>A receber</span>
          <strong>{formatCurrency(user.pendingPaymentsTotal)}</strong>
        </div>
        <div>
          <Mail size={17} />
          <span>Recebimentos</span>
          <strong>{user.paymentsCount ?? 0}</strong>
        </div>
        <div>
          <Phone size={17} />
          <span>Contato</span>
          <strong>{user.phone ? "Informado" : "Pendente"}</strong>
        </div>
      </section>
    </aside>
  );
}
