"use client";

import { useMemo, useState } from "react";
import { Bug, Eye, Lightbulb, LockKeyhole, MessageSquareText, MoreVertical, Send, WalletCards } from "lucide-react";
import type { SupportTicket, SupportTicketPriority, SupportTicketStatus, SupportTicketType, UserPlan } from "@/types/admin";
import { PlanBadge } from "./plan-badge";

type SupportPeriod = "all" | "today" | "week" | "month";

type SupportFilters = {
  query: string;
  type: "all" | SupportTicketType;
  status: "all" | SupportTicketStatus;
  priority: "all" | SupportTicketPriority;
  plan: "all" | UserPlan;
  period: SupportPeriod;
};

const ticketTypeLabels: Record<SupportTicketType, string> = {
  support: "Suporte",
  bug: "Bug",
  question: "Dúvida",
  billing: "Cobrança",
  access: "Acesso",
  suggestion: "Sugestão",
  feature_request: "Ideia",
  criticism: "Crítica",
};

const ticketStatusLabels: Record<SupportTicketStatus, string> = {
  new: "Novo",
  open: "Aberto",
  in_progress: "Em andamento",
  waiting_user: "Aguardando usuário",
  planned: "Planejado",
  resolved: "Resolvido",
  closed: "Fechado",
  rejected: "Recusado",
};

const ticketPriorityLabels: Record<SupportTicketPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

const ticketTypeIcons: Record<SupportTicketType, typeof MessageSquareText> = {
  support: MessageSquareText,
  bug: Bug,
  question: MessageSquareText,
  billing: WalletCards,
  access: LockKeyhole,
  suggestion: Lightbulb,
  feature_request: Lightbulb,
  criticism: MessageSquareText,
};

const initialFilters: SupportFilters = {
  query: "",
  type: "all",
  status: "all",
  priority: "all",
  plan: "all",
  period: "month",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function SupportTypeBadge({ type }: { type: SupportTicketType }) {
  const Icon = ticketTypeIcons[type];
  return <span className={`admin-badge support-type-${type}`}><Icon size={13} /> {ticketTypeLabels[type]}</span>;
}

function SupportStatusBadge({ status }: { status: SupportTicketStatus }) {
  return <span className={`admin-badge support-status-${status}`}>{ticketStatusLabels[status]}</span>;
}

function SupportPriorityBadge({ priority }: { priority: SupportTicketPriority }) {
  return <span className={`admin-badge support-priority-${priority}`}>{ticketPriorityLabels[priority]}</span>;
}

function matchesPeriod(ticket: SupportTicket, period: SupportPeriod) {
  if (period === "all") return true;
  if (period === "today") return ticket.createdAt.toLowerCase().includes("hoje");
  if (period === "week") return ticket.createdAt.toLowerCase().includes("hoje") || ticket.createdAt.toLowerCase().includes("ontem") || ticket.createdAt.includes("dias");
  return true;
}

function filterTickets(tickets: SupportTicket[], filters: SupportFilters) {
  const query = filters.query.trim().toLowerCase();

  return tickets.filter((ticket) => {
    const matchesQuery = !query || [ticket.userName, ticket.userEmail, ticket.subject, ticket.code].some((value) => value.toLowerCase().includes(query));
    const matchesType = filters.type === "all" || ticket.type === filters.type;
    const matchesStatus = filters.status === "all" || ticket.status === filters.status;
    const matchesPriority = filters.priority === "all" || ticket.priority === filters.priority;
    const matchesPlan = filters.plan === "all" || ticket.userPlan === filters.plan;

    return matchesQuery && matchesType && matchesStatus && matchesPriority && matchesPlan && matchesPeriod(ticket, filters.period);
  });
}

function SupportTicketDetail({ ticket }: { ticket: SupportTicket }) {
  return (
    <aside className="admin-support-detail">
      <header>
        <div>
          <span>{ticket.code}</span>
          <SupportStatusBadge status={ticket.status} />
        </div>
        <h2>{ticket.subject}</h2>
      </header>

      <dl className="admin-support-meta">
        <div><dt>Tipo</dt><dd><SupportTypeBadge type={ticket.type} /></dd></div>
        <div><dt>Prioridade</dt><dd><SupportPriorityBadge priority={ticket.priority} /></dd></div>
        <div><dt>Plano</dt><dd><PlanBadge plan={ticket.userPlan} /></dd></div>
        <div><dt>Criado em</dt><dd>{ticket.createdAt}</dd></div>
        <div><dt>Atualizado em</dt><dd>{ticket.updatedAt}</dd></div>
      </dl>

      <section className="admin-support-user-card">
        <span>{getInitials(ticket.userName) || "US"}</span>
        <div>
          <strong>{ticket.userName}</strong>
          <small>{ticket.userEmail}</small>
        </div>
        <button type="button">Ver usuário</button>
      </section>

      <section className="admin-support-message">
        <h3>Mensagem inicial</h3>
        <p>{ticket.message}</p>
      </section>

      <section className="admin-support-replies">
        <h3>Histórico de respostas</h3>
        <article>
          <span>{getInitials(ticket.userName) || "US"}</span>
          <div>
            <strong>{ticket.userName} <small>(Usuário)</small></strong>
            <p>{ticket.message}</p>
          </div>
          <time>{ticket.createdAt}</time>
        </article>
        {ticket.lastReplyAt ? (
          <article>
            <span>IF</span>
            <div>
              <strong>Igor Franco <small>(Admin)</small></strong>
              <p>Obrigado por reportar. Estamos verificando e retornamos com uma atualização.</p>
            </div>
            <time>{ticket.lastReplyAt}</time>
          </article>
        ) : null}
      </section>

      <div className="admin-support-reply-box">
        <textarea placeholder="Responder..." aria-label={`Responder chamado ${ticket.code}`} />
        <button type="button"><Send size={15} /> Enviar resposta</button>
      </div>

      <div className="admin-support-actions">
        <button type="button">Marcar em andamento</button>
        <button type="button">Aguardando usuário</button>
        <button type="button">Marcar resolvido</button>
        <button type="button">Recusar</button>
        <button type="button">Fechar chamado</button>
      </div>
    </aside>
  );
}

export function SupportCenter({ tickets }: { tickets: SupportTicket[] }) {
  const [filters, setFilters] = useState<SupportFilters>(initialFilters);
  const filteredTickets = useMemo(() => filterTickets(tickets, filters), [tickets, filters]);
  const [selectedTicketId, setSelectedTicketId] = useState(tickets[0]?.id);
  const selectedTicket = filteredTickets.find((ticket) => ticket.id === selectedTicketId) ?? filteredTickets[0] ?? tickets[0];

  function updateFilter<Key extends keyof SupportFilters>(key: Key, value: SupportFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="admin-stack">
      <section className="admin-filter-bar admin-support-filter-bar">
        <input
          type="search"
          placeholder="Buscar por usuário, e-mail ou assunto..."
          aria-label="Buscar chamados"
          value={filters.query}
          onChange={(event) => updateFilter("query", event.target.value)}
        />
        <select aria-label="Filtrar tipo" value={filters.type} onChange={(event) => updateFilter("type", event.target.value as SupportFilters["type"])}>
          <option value="all">Tipo: Todos</option>
          {Object.entries(ticketTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select aria-label="Filtrar status" value={filters.status} onChange={(event) => updateFilter("status", event.target.value as SupportFilters["status"])}>
          <option value="all">Status: Todos</option>
          {Object.entries(ticketStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select aria-label="Filtrar prioridade" value={filters.priority} onChange={(event) => updateFilter("priority", event.target.value as SupportFilters["priority"])}>
          <option value="all">Prioridade: Todas</option>
          {Object.entries(ticketPriorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select aria-label="Filtrar plano" value={filters.plan} onChange={(event) => updateFilter("plan", event.target.value as SupportFilters["plan"])}>
          <option value="all">Plano: Todos</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="ai">AI</option>
        </select>
        <select aria-label="Filtrar período" value={filters.period} onChange={(event) => updateFilter("period", event.target.value as SupportPeriod)}>
          <option value="month">Período: Este mês</option>
          <option value="today">Hoje</option>
          <option value="week">Esta semana</option>
          <option value="all">Todo período</option>
        </select>
        <button type="button" className="admin-secondary-button" onClick={() => setFilters(initialFilters)}>Limpar filtros</button>
        <button type="button" className="admin-primary-button"><MessageSquareText size={16} /> Novo chamado</button>
      </section>

      <section className="admin-support-layout">
        <div className="admin-table-card">
          <table className="admin-table admin-support-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Assunto</th>
                <th>Usuário</th>
                <th>Prioridade</th>
                <th>Status</th>
                <th>Criado em</th>
                <th>Última resposta</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className={selectedTicket?.id === ticket.id ? "is-selected" : undefined} onClick={() => setSelectedTicketId(ticket.id)}>
                  <td><SupportTypeBadge type={ticket.type} /></td>
                  <td className="admin-message-cell">{ticket.subject}</td>
                  <td><strong>{ticket.userName}</strong><small>{ticket.userEmail}</small></td>
                  <td><SupportPriorityBadge priority={ticket.priority} /></td>
                  <td><SupportStatusBadge status={ticket.status} /></td>
                  <td>{ticket.createdAt}</td>
                  <td>{ticket.lastReplyAt ?? "—"}</td>
                  <td>
                    <div className="admin-support-row-actions">
                      <button type="button" aria-label={`Ver chamado ${ticket.code}`} onClick={(event) => { event.stopPropagation(); setSelectedTicketId(ticket.id); }}><Eye size={17} /></button>
                      <button type="button" aria-label={`Ações do chamado ${ticket.code}`} onClick={(event) => event.stopPropagation()}><MoreVertical size={17} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTickets.length === 0 ? <p className="admin-empty-state">Nenhum chamado encontrado com os filtros atuais.</p> : null}
        </div>

        {selectedTicket ? <SupportTicketDetail ticket={selectedTicket} /> : null}
      </section>
    </div>
  );
}
