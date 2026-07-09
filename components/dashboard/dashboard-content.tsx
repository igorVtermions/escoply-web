"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Bell, BriefcaseBusiness, Building2, CalendarDays, CheckCircle2, ClipboardList, Clock3, DollarSign, FileText, Globe2, Mail, Phone, Plus, UsersRound, X } from "lucide-react";
import { createObligationAction } from "@/app/dashboard/actions";
import { showToast } from "@/components/ui/toast-provider";
import type { DashboardData } from "@/lib/dashboard/data";

const reminderPresentation: Record<string, { label: string; color: string }> = {
  meeting: { label: "Reunião", color: "purple" },
  action: { label: "Ação", color: "orange" },
  review: { label: "Revisão", color: "blue" },
  delivery: { label: "Entrega", color: "green" },
  follow_up: { label: "Follow-up", color: "blue" },
  charge: { label: "Cobrança", color: "orange" },
  other: { label: "Lembrete", color: "purple" },
};

const budgetLabels: Record<string, string> = { draft: "Rascunho", sent: "Enviado" };
const obligationTypes: Record<string, string> = { tax: "Imposto", contribution: "Contribuição", administrative: "Administrativo", financial: "Financeiro", other: "Outro" };
const obligationPresentation: Record<string, { label: string; tone: string }> = {
  paid: { label: "Paga", tone: "green" },
  completed: { label: "Concluída", tone: "green" },
  pending: { label: "Pendente", tone: "orange" },
  in_progress: { label: "Em andamento", tone: "blue" },
  not_started: { label: "Não iniciada", tone: "slate" },
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const timeFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CL";
}

function getDaysUntil(date: string, selectedDate: string) {
  const difference = Math.round((new Date(`${date}T12:00:00Z`).getTime() - new Date(`${selectedDate}T12:00:00Z`).getTime()) / 86_400_000);
  if (difference === 0) return "Hoje";
  if (difference === 1) return "1 dia";
  if (difference < 0) return `${Math.abs(difference)} dias atrasado`;
  return `${difference} dias`;
}

function getWhatsAppUrl(value: string) {
  const digits = value.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("55") && digits.length > 11 ? digits : `55${digits}`}`;
}

function EmptyPanelState({ children }: { children: string }) {
  return <p className="dashboard-empty-state">{children}</p>;
}

function ClientAvatar({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return <span className={`client-avatar ${logoUrl ? "has-image" : ""}`} style={logoUrl ? { backgroundImage: `url(${logoUrl})` } : undefined}>{!logoUrl && getInitials(name)}</span>;
}

export function DashboardContent({ data, selectedDate }: { data: DashboardData; selectedDate: string }) {
  const router = useRouter();
  const [selectedDeadline, setSelectedDeadline] = useState<DashboardData["deadlines"][number] | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<DashboardData["budgets"][number] | null>(null);
  const [isObligationModalOpen, setIsObligationModalOpen] = useState(false);
  const [isDatePending, startDateTransition] = useTransition();
  const metrics = [
    { label: "Clientes ativos", value: String(data.metrics.activeClients), helper: "Dados atuais", icon: UsersRound, tone: "blue" },
    { label: "Projetos em andamento", value: String(data.metrics.projectsInProgress), helper: "Em andamento ou revisão", icon: BriefcaseBusiness, tone: "purple" },
    { label: "Prazos próximos", value: String(data.metrics.upcomingDeadlines), helper: "Próximos 30 dias", icon: Clock3, tone: "orange" },
    { label: "A receber", value: currencyFormatter.format(data.metrics.receivableAmount), helper: "Pendente ou atrasado", icon: DollarSign, tone: "green" },
  ];

  return (
    <div className="dashboard-content">
      <div className="dashboard-title-row">
        <div>
          <h1>Dashboard</h1>
          <p>Do briefing à entrega, tudo no controle.</p>
        </div>
        <label className={`dashboard-date ${isDatePending ? "is-loading" : ""}`}>
          <CalendarDays size={18} />
          <input type="date" value={selectedDate} onChange={(event) => { const date = event.target.value; if (date) startDateTransition(() => router.replace(`/dashboard?date=${encodeURIComponent(date)}`)); }} aria-label="Filtrar dashboard por data" />
        </label>
      </div>

      <section className="dashboard-metrics" aria-label="Indicadores gerais">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return <article className="dashboard-metric" key={metric.label}><div className={`dashboard-metric-icon tone-${metric.tone}`}><Icon size={22} /></div><div><p>{metric.label}</p><strong>{metric.value}</strong><span>{metric.helper}</span></div></article>;
        })}
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-panel">
          <header><div><Bell size={20} /><h2>Lembretes do dia</h2></div><button type="button">Ver todos</button></header>
          <div className="reminder-list">
            {data.reminders.length === 0 && <EmptyPanelState>Nenhum lembrete para a data selecionada.</EmptyPanelState>}
            {data.reminders.map((reminder) => {
              const presentation = reminderPresentation[reminder.kind] ?? reminderPresentation.other;
              return <div key={reminder.id} className={`reminder-item ${presentation.color}`}><time>{timeFormatter.format(new Date(reminder.scheduledAt))}</time><div><strong>{reminder.title}</strong><span>{[reminder.clientName, reminder.projectName].filter(Boolean).join(" · ") || "Lembrete geral"}</span></div><em>{presentation.label}</em></div>;
            })}
          </div>
        </article>

        <article className="dashboard-panel">
          <header><div><CalendarDays size={20} /><h2>Próximos prazos</h2></div><button type="button">Ver todos</button></header>
          <div className="deadline-list">
            {data.deadlines.length === 0 && <EmptyPanelState>Nenhum prazo futuro cadastrado.</EmptyPanelState>}
            {data.deadlines.map((deadline) => (
              <button type="button" key={deadline.id} className="deadline-item is-clickable" onClick={() => setSelectedDeadline(deadline)}>
                <ClientAvatar name={deadline.clientName} logoUrl={deadline.clientLogoUrl} />
                <div><strong>{deadline.clientName}</strong><small>{deadline.name}</small></div>
                <div className="deadline-progress"><i style={{ width: `${deadline.progress}%` }} /></div>
                <time><strong>{dateFormatter.format(new Date(`${deadline.deadline}T12:00:00Z`))}</strong><small>{getDaysUntil(deadline.deadline, selectedDate)}</small></time>
              </button>
            ))}
          </div>
        </article>

        <article className="dashboard-panel">
          <header><div><FileText size={20} /><h2>Orçamentos pendentes</h2></div><button type="button">Ver todos</button></header>
          <div className="budget-list">
            {data.budgets.length === 0 && <EmptyPanelState>Nenhum orçamento pendente.</EmptyPanelState>}
            {data.budgets.map((budget) => (
              <button type="button" key={budget.id} className="budget-item is-clickable" onClick={() => setSelectedBudget(budget)}>
                <ClientAvatar name={budget.clientName} logoUrl={budget.clientLogoUrl} />
                <strong>{budget.clientName}</strong>
                <small>{budget.projectName}</small>
                <b>{currencyFormatter.format(budget.amount)}</b>
                <em className={budget.status === "sent" ? "sent" : "draft"}>{budgetLabels[budget.status] ?? budget.status}</em>
              </button>
            ))}
            {data.budgets.length > 0 && <footer><span>Total</span><strong>{currencyFormatter.format(data.budgets.reduce((total, budget) => total + budget.amount, 0))}</strong></footer>}
          </div>
        </article>

        <article className="dashboard-panel dashboard-obligations">
          <header><div><ClipboardList size={20} /><h2>Obrigações do mês</h2></div><button type="button" onClick={() => setIsObligationModalOpen(true)}><Plus size={16} /> Nova obrigação</button></header>
          <div className="obligation-table">
            {data.obligations.length === 0 && <EmptyPanelState>Nenhuma obrigação cadastrada para este mês.</EmptyPanelState>}
            {data.obligations.map((obligation) => {
              const presentation = obligationPresentation[obligation.status] ?? obligationPresentation.not_started;
              return <div key={obligation.id}><strong>{obligation.title}</strong><span>{obligationTypes[obligation.type] ?? obligation.type}</span><time>{dateFormatter.format(new Date(`${obligation.dueDate}T12:00:00Z`))}</time><em className={presentation.tone}><CheckCircle2 size={14} />{presentation.label}</em></div>;
            })}
          </div>
        </article>
      </section>

      {selectedDeadline && <DeadlineClientModal deadline={selectedDeadline} selectedDate={selectedDate} onClose={() => setSelectedDeadline(null)} />}
      {selectedBudget && <BudgetDetailsModal budget={selectedBudget} selectedDate={selectedDate} onClose={() => setSelectedBudget(null)} />}
      {isObligationModalOpen && <CreateObligationModal selectedDate={selectedDate} onClose={() => setIsObligationModalOpen(false)} />}
    </div>
  );
}

function CreateObligationModal({ selectedDate, onClose }: { selectedDate: string; onClose: () => void }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createObligationAction, { success: false, message: "" });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPending, onClose]);

  useEffect(() => {
    if (!state.message) return;
    if (!state.success) {
      showToast({ type: "error", title: "Ação não concluída", description: state.message });
      return;
    }

    showToast({ type: "success", title: "Obrigação criada", description: state.message });
    onClose();
    router.refresh();
  }, [onClose, router, state]);

  return createPortal(
    <div className="dashboard-client-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isPending) onClose(); }}>
      <section className="dashboard-client-modal dashboard-obligation-modal" role="dialog" aria-modal="true" aria-labelledby="dashboard-obligation-modal-title">
        <button type="button" className="dashboard-client-modal-close" onClick={onClose} disabled={isPending} aria-label="Fechar"><X size={20} /></button>
        <span className="dashboard-modal-kicker">Obrigação</span>
        <h2 id="dashboard-obligation-modal-title">Nova obrigação</h2>
        <p>Cadastre impostos, contribuições, cobranças administrativas ou tarefas financeiras do mês.</p>

        <form action={formAction} className="dashboard-obligation-form">
          <label>
            Título
            <input name="title" type="text" required minLength={2} maxLength={180} placeholder="Ex.: DAS MEI, INSS, relatório mensal..." />
          </label>

          <div>
            <label>
              Tipo
              <select name="type" defaultValue="administrative">
                <option value="tax">Imposto</option>
                <option value="contribution">Contribuição</option>
                <option value="administrative">Administrativo</option>
                <option value="financial">Financeiro</option>
                <option value="other">Outro</option>
              </select>
            </label>

            <label>
              Vencimento
              <input name="due_date" type="date" required defaultValue={selectedDate} />
            </label>
          </div>

          <label>
            Status
            <select name="status" defaultValue="not_started">
              <option value="not_started">Não iniciada</option>
              <option value="pending">Pendente</option>
              <option value="in_progress">Em andamento</option>
              <option value="paid">Paga</option>
              <option value="completed">Concluída</option>
            </select>
          </label>

          <button type="submit" disabled={isPending}>{isPending ? "Criando..." : "Criar obrigação"}</button>
        </form>
      </section>
    </div>,
    document.body,
  );
}

function DeadlineClientModal({ deadline, selectedDate, onClose }: { deadline: DashboardData["deadlines"][number]; selectedDate: string; onClose: () => void }) {
  const router = useRouter();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="dashboard-client-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="dashboard-client-modal" role="dialog" aria-modal="true" aria-labelledby="dashboard-client-modal-title">
        <button type="button" className="dashboard-client-modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        <div className="dashboard-client-modal-profile">
          <ClientAvatar name={deadline.clientName} logoUrl={deadline.clientLogoUrl} />
          <div>
            <span>Detalhes do cliente</span>
            <h2 id="dashboard-client-modal-title">{deadline.clientName}</h2>
            <p>{deadline.clientCompanyName || "Profissional independente"}</p>
          </div>
        </div>

        <div className="dashboard-client-modal-contact">
          {deadline.clientEmail && <a href={`mailto:${deadline.clientEmail}`}><Mail size={16} />{deadline.clientEmail}</a>}
          {deadline.clientPhone && <a href={`tel:${deadline.clientPhone}`}><Phone size={16} />{deadline.clientPhone}</a>}
          {deadline.clientWhatsapp && <a href={getWhatsAppUrl(deadline.clientWhatsapp)} target="_blank" rel="noreferrer"><Phone size={16} />{deadline.clientWhatsapp}</a>}
          {deadline.clientWebsite && <a href={deadline.clientWebsite} target="_blank" rel="noreferrer"><Globe2 size={16} />{deadline.clientWebsite.replace(/^https?:\/\//, "")}</a>}
          {!deadline.clientEmail && !deadline.clientPhone && !deadline.clientWhatsapp && !deadline.clientWebsite && <p>Nenhum contato cadastrado para este cliente.</p>}
        </div>

        <div className="dashboard-client-modal-project">
          <strong><BriefcaseBusiness size={17} /> Projeto com prazo próximo</strong>
          <div>
            <span><Building2 size={16} />{deadline.name}</span>
            <span><CalendarDays size={16} />{dateFormatter.format(new Date(`${deadline.deadline}T12:00:00Z`))} · {getDaysUntil(deadline.deadline, selectedDate)}</span>
            <span><CheckCircle2 size={16} />{deadline.progress}% de progresso</span>
          </div>
        </div>

        <div className="dashboard-client-modal-notes">
          <strong>Notas</strong>
          <p>{deadline.clientNotes || "Nenhuma observação cadastrada para este cliente."}</p>
        </div>

        <button type="button" className="dashboard-budget-open-project" onClick={() => router.push(`/dashboard/projetos/${deadline.id}`)}>Abrir projeto completo</button>
      </section>
    </div>,
    document.body,
  );
}

function BudgetDetailsModal({ budget, selectedDate, onClose }: { budget: DashboardData["budgets"][number]; selectedDate: string; onClose: () => void }) {
  const router = useRouter();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="dashboard-client-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="dashboard-client-modal dashboard-budget-modal" role="dialog" aria-modal="true" aria-labelledby="dashboard-budget-modal-title">
        <button type="button" className="dashboard-client-modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        <div className="dashboard-client-modal-profile">
          <ClientAvatar name={budget.clientName} logoUrl={budget.clientLogoUrl} />
          <div>
            <span>Detalhes do orçamento</span>
            <h2 id="dashboard-budget-modal-title">{budget.projectName}</h2>
            <p>{budget.clientName}{budget.clientCompanyName ? ` · ${budget.clientCompanyName}` : ""}</p>
          </div>
        </div>

        <div className="dashboard-budget-detail-grid">
          <div><span>Valor</span><strong>{currencyFormatter.format(budget.amount)}</strong></div>
          <div><span>Status</span><em className={budget.status === "sent" ? "sent" : "draft"}>{budgetLabels[budget.status] ?? budget.status}</em></div>
          <div><span>Validade da proposta</span><strong>{budget.validUntil ? dateFormatter.format(new Date(`${budget.validUntil}T12:00:00Z`)) : "Sem validade"}</strong></div>
          <div><span>Condição de pagamento</span><strong>{budget.paymentCondition || "Não definida"}</strong></div>
        </div>

        <div className="dashboard-client-modal-project">
          <strong><BriefcaseBusiness size={17} /> Projeto vinculado</strong>
          <div>
            <span><Building2 size={16} />{budget.projectName}</span>
            <span><CheckCircle2 size={16} />{budget.projectProgress ?? 0}% de progresso</span>
            <span><CalendarDays size={16} />{budget.projectDeadline ? `${dateFormatter.format(new Date(`${budget.projectDeadline}T12:00:00Z`))} · ${getDaysUntil(budget.projectDeadline, selectedDate)}` : "Sem prazo definido"}</span>
          </div>
        </div>

        <div className="dashboard-client-modal-contact">
          {budget.clientEmail && <a href={`mailto:${budget.clientEmail}`}><Mail size={16} />{budget.clientEmail}</a>}
          {budget.clientPhone && <a href={`tel:${budget.clientPhone}`}><Phone size={16} />{budget.clientPhone}</a>}
          {budget.clientWhatsapp && <a href={getWhatsAppUrl(budget.clientWhatsapp)} target="_blank" rel="noreferrer"><Phone size={16} />{budget.clientWhatsapp}</a>}
          {!budget.clientEmail && !budget.clientPhone && !budget.clientWhatsapp && <p>Nenhum contato cadastrado para este cliente.</p>}
        </div>

        {budget.projectId && <button type="button" className="dashboard-budget-open-project" onClick={() => router.push(`/dashboard/projetos/${budget.projectId}`)}>Abrir projeto completo</button>}
      </section>
    </div>,
    document.body,
  );
}
