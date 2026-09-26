"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bug, Eye, Lightbulb, LockKeyhole, MessageSquareText, MoreVertical, Send, WalletCards, X } from "lucide-react";
import {
  createSupportTicketAction,
  replyToSupportTicketAction,
  updateSupportTicketStatusAction,
  type CreateSupportTicketInput,
} from "@/app/admin/support/actions";
import { showToast } from "@/components/ui/toast-provider";
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

const initialTicketForm: CreateSupportTicketInput = {
  userName: "",
  userEmail: "",
  userPlan: "free",
  type: "support",
  subject: "",
  message: "",
  priority: "medium",
  status: "new",
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

  const createdAt = ticket.createdAtIso ? new Date(ticket.createdAtIso) : null;
  if (!createdAt || Number.isNaN(createdAt.getTime())) return true;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (period === "today") return createdAt >= startOfToday;
  if (period === "week") return createdAt >= startOfWeek;
  return createdAt >= startOfMonth;
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

function NewSupportTicketModal({
  isPending,
  onClose,
  onSubmit,
}: {
  isPending: boolean;
  onClose: () => void;
  onSubmit: (input: CreateSupportTicketInput) => void;
}) {
  const [form, setForm] = useState<CreateSupportTicketInput>(initialTicketForm);

  function updateForm<Key extends keyof CreateSupportTicketInput>(key: Key, value: CreateSupportTicketInput[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="admin-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="admin-support-modal" role="dialog" aria-modal="true" aria-labelledby="new-support-ticket-title">
        <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Fechar novo chamado"><X size={20} /></button>
        <span>Suporte</span>
        <h2 id="new-support-ticket-title">Novo chamado</h2>
        <p>Crie um chamado real na central de suporte. Ele será salvo no Supabase.</p>

        <form className="admin-support-form" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
          <label>
            Nome do usuário
            <input value={form.userName} onChange={(event) => updateForm("userName", event.target.value)} placeholder="Ex.: Lucas Almeida" required />
          </label>
          <label>
            E-mail
            <input type="email" value={form.userEmail} onChange={(event) => updateForm("userEmail", event.target.value)} placeholder="usuario@email.com" required />
          </label>
          <label>
            Tipo
            <select value={form.type} onChange={(event) => updateForm("type", event.target.value as SupportTicketType)}>
              {Object.entries(ticketTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            Plano
            <select value={form.userPlan} onChange={(event) => updateForm("userPlan", event.target.value as UserPlan)}>
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="ai">AI</option>
            </select>
          </label>
          <label>
            Prioridade
            <select value={form.priority} onChange={(event) => updateForm("priority", event.target.value as SupportTicketPriority)}>
              {Object.entries(ticketPriorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            Status
            <select value={form.status} onChange={(event) => updateForm("status", event.target.value as SupportTicketStatus)}>
              {Object.entries(ticketStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="span-2">
            Assunto
            <input value={form.subject} onChange={(event) => updateForm("subject", event.target.value)} placeholder="Ex.: Erro ao criar projeto" required />
          </label>
          <label className="span-2">
            Mensagem
            <textarea value={form.message} onChange={(event) => updateForm("message", event.target.value)} placeholder="Descreva o chamado..." required />
          </label>
          <div className="admin-support-form-actions">
            <button type="button" onClick={onClose} disabled={isPending}>Cancelar</button>
            <button type="submit" disabled={isPending}>{isPending ? "Criando..." : "Criar chamado"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function SupportTicketDetail({
  ticket,
  isPending,
  onReply,
  onStatusChange,
}: {
  ticket: SupportTicket;
  isPending: boolean;
  onReply: (ticketId: string, message: string) => void;
  onStatusChange: (ticketId: string, status: SupportTicketStatus) => void;
}) {
  const [reply, setReply] = useState("");
  const replies = ticket.replies ?? [];

  function handleReplySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onReply(ticket.id, reply);
    setReply("");
  }

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
        {ticket.userId ? <a href={`/admin/users?usuario=${ticket.userId}`}>Ver usuário</a> : <em>Sem vínculo</em>}
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
        {replies.map((replyItem) => (
          <article key={replyItem.id}>
            <span>{getInitials(replyItem.authorName) || "AD"}</span>
            <div>
              <strong>{replyItem.authorName} <small>({replyItem.authorRole === "admin" ? "Admin" : "Usuário"})</small></strong>
              <p>{replyItem.message}</p>
            </div>
            <time>{replyItem.createdAt}</time>
          </article>
        ))}
      </section>

      <form className="admin-support-reply-box" onSubmit={handleReplySubmit}>
        <textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Responder..." aria-label={`Responder chamado ${ticket.code}`} />
        <button type="submit" disabled={isPending || reply.trim().length < 2}><Send size={15} /> Enviar resposta</button>
      </form>

      <div className="admin-support-actions">
        <button type="button" disabled={isPending} onClick={() => onStatusChange(ticket.id, "in_progress")}>Marcar em andamento</button>
        <button type="button" disabled={isPending} onClick={() => onStatusChange(ticket.id, "waiting_user")}>Aguardando usuário</button>
        <button type="button" disabled={isPending} onClick={() => onStatusChange(ticket.id, "resolved")}>Marcar resolvido</button>
        <button type="button" disabled={isPending} onClick={() => onStatusChange(ticket.id, "rejected")}>Recusar</button>
        <button type="button" disabled={isPending} onClick={() => onStatusChange(ticket.id, "closed")}>Fechar chamado</button>
      </div>
    </aside>
  );
}

export function SupportCenter({ tickets }: { tickets: SupportTicket[] }) {
  const router = useRouter();
  const [filters, setFilters] = useState<SupportFilters>(initialFilters);
  const [selectedTicketId, setSelectedTicketId] = useState(tickets[0]?.id);
  const [openActionsTicketId, setOpenActionsTicketId] = useState<string | null>(null);
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const filteredTickets = useMemo(() => filterTickets(tickets, filters), [tickets, filters]);
  const selectedTicket = filteredTickets.find((ticket) => ticket.id === selectedTicketId) ?? filteredTickets[0] ?? tickets[0];

  function updateFilter<Key extends keyof SupportFilters>(key: Key, value: SupportFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function runAction(action: () => Promise<void>, successMessage: string) {
    startTransition(async () => {
      try {
        await action();
        showToast({ type: "success", title: "Tudo certo", description: successMessage });
        router.refresh();
      } catch (error) {
        showToast({
          type: "error",
          title: "Ação não concluída",
          description: error instanceof Error ? error.message : "Não foi possível concluir a ação.",
        });
      }
    });
  }

  function handleCreateTicket(input: CreateSupportTicketInput) {
    runAction(async () => {
      await createSupportTicketAction(input);
      setIsNewTicketModalOpen(false);
    }, "Chamado criado no Supabase.");
  }

  function handleStatusChange(ticketId: string, status: SupportTicketStatus) {
    setOpenActionsTicketId(null);
    runAction(() => updateSupportTicketStatusAction(ticketId, status), `Status alterado para ${ticketStatusLabels[status]}.`);
  }

  function handleReply(ticketId: string, message: string) {
    runAction(() => replyToSupportTicketAction(ticketId, message), "Resposta registrada no chamado.");
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
        <button type="button" className="admin-primary-button" onClick={() => setIsNewTicketModalOpen(true)}><MessageSquareText size={16} /> Novo chamado</button>
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
                      <div className="admin-support-row-menu-wrap">
                        <button
                          type="button"
                          aria-label={`Ações do chamado ${ticket.code}`}
                          aria-expanded={openActionsTicketId === ticket.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenActionsTicketId((current) => current === ticket.id ? null : ticket.id);
                          }}
                        >
                          <MoreVertical size={17} />
                        </button>
                        {openActionsTicketId === ticket.id && (
                          <div className="admin-support-row-menu" onClick={(event) => event.stopPropagation()}>
                            <button type="button" onClick={() => handleStatusChange(ticket.id, "open")}>Abrir</button>
                            <button type="button" onClick={() => handleStatusChange(ticket.id, "in_progress")}>Em andamento</button>
                            <button type="button" onClick={() => handleStatusChange(ticket.id, "waiting_user")}>Aguardando usuário</button>
                            <button type="button" onClick={() => handleStatusChange(ticket.id, "planned")}>Planejar</button>
                            <button type="button" onClick={() => handleStatusChange(ticket.id, "resolved")}>Resolver</button>
                            <button type="button" onClick={() => handleStatusChange(ticket.id, "closed")}>Fechar</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTickets.length === 0 ? <p className="admin-empty-state">Nenhum chamado real encontrado no Supabase para os filtros atuais.</p> : null}
        </div>

        {selectedTicket ? (
          <SupportTicketDetail ticket={selectedTicket} isPending={isPending} onReply={handleReply} onStatusChange={handleStatusChange} />
        ) : (
          <aside className="admin-support-detail">
            <p className="admin-empty-state">Nenhum chamado cadastrado ainda.</p>
          </aside>
        )}
      </section>

      {isNewTicketModalOpen && <NewSupportTicketModal isPending={isPending} onClose={() => setIsNewTicketModalOpen(false)} onSubmit={handleCreateTicket} />}
    </div>
  );
}
