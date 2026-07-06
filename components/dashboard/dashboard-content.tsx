"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, BriefcaseBusiness, CalendarDays, CheckCircle2, ClipboardList, Clock3, DollarSign, FileText, Plus, UsersRound } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard/data";

const reminderPresentation: Record<string, { label: string; color: string }> = { meeting: { label: "Reunião", color: "purple" }, action: { label: "Ação", color: "orange" }, review: { label: "Revisão", color: "blue" }, delivery: { label: "Entrega", color: "green" }, follow_up: { label: "Follow-up", color: "blue" }, charge: { label: "Cobrança", color: "orange" }, other: { label: "Lembrete", color: "purple" } };
const budgetLabels: Record<string, string> = { draft: "Rascunho", sent: "Enviado" };
const obligationTypes: Record<string, string> = { tax: "Imposto", contribution: "Contribuição", administrative: "Administrativo", financial: "Financeiro", other: "Outro" };
const obligationPresentation: Record<string, { label: string; tone: string }> = { paid: { label: "Paga", tone: "green" }, completed: { label: "Concluída", tone: "green" }, pending: { label: "Pendente", tone: "orange" }, in_progress: { label: "Em andamento", tone: "blue" }, not_started: { label: "Não iniciada", tone: "slate" } };
const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const timeFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

function getInitials(name: string) { return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CL"; }
function getDaysUntil(date: string, selectedDate: string) { const difference = Math.round((new Date(`${date}T12:00:00Z`).getTime() - new Date(`${selectedDate}T12:00:00Z`).getTime()) / 86_400_000); if (difference === 0) return "Hoje"; if (difference === 1) return "1 dia"; if (difference < 0) return `${Math.abs(difference)} dias atrasado`; return `${difference} dias`; }
function EmptyPanelState({ children }: { children: string }) { return <p className="dashboard-empty-state">{children}</p>; }

export function DashboardContent({ data, selectedDate }: { data: DashboardData; selectedDate: string }) {
  const router = useRouter();
  const [isDatePending, startDateTransition] = useTransition();
  const metrics = [
    { label: "Clientes ativos", value: String(data.metrics.activeClients), helper: "Dados atuais", icon: UsersRound, tone: "blue" },
    { label: "Projetos em andamento", value: String(data.metrics.projectsInProgress), helper: "Em andamento ou revisão", icon: BriefcaseBusiness, tone: "purple" },
    { label: "Prazos próximos", value: String(data.metrics.upcomingDeadlines), helper: "Próximos 30 dias", icon: Clock3, tone: "orange" },
    { label: "A receber", value: currencyFormatter.format(data.metrics.receivableAmount), helper: "Pendente ou atrasado", icon: DollarSign, tone: "green" },
  ];

  return <div className="dashboard-content">
    <div className="dashboard-title-row"><div><h1>Dashboard</h1><p>Do briefing à entrega, tudo no controle.</p></div><label className={`dashboard-date ${isDatePending ? "is-loading" : ""}`}><CalendarDays size={18} /><input type="date" value={selectedDate} onChange={(event) => { const date = event.target.value; if (date) startDateTransition(() => router.replace(`/dashboard?date=${encodeURIComponent(date)}`)); }} aria-label="Filtrar dashboard por data" /></label></div>
    <section className="dashboard-metrics" aria-label="Indicadores gerais">{metrics.map((metric) => { const Icon = metric.icon; return <article className="dashboard-metric" key={metric.label}><div className={`dashboard-metric-icon tone-${metric.tone}`}><Icon size={22} /></div><div><p>{metric.label}</p><strong>{metric.value}</strong><span>{metric.helper}</span></div></article>; })}</section>
    <section className="dashboard-grid">
      <article className="dashboard-panel"><header><div><Bell size={20} /><h2>Lembretes do dia</h2></div><button type="button">Ver todos</button></header><div className="reminder-list">{data.reminders.length === 0 && <EmptyPanelState>Nenhum lembrete para a data selecionada.</EmptyPanelState>}{data.reminders.map((reminder) => { const presentation = reminderPresentation[reminder.kind] ?? reminderPresentation.other; return <div key={reminder.id} className={`reminder-item ${presentation.color}`}><time>{timeFormatter.format(new Date(reminder.scheduledAt))}</time><div><strong>{reminder.title}</strong><span>{[reminder.clientName, reminder.projectName].filter(Boolean).join(" · ") || "Lembrete geral"}</span></div><em>{presentation.label}</em></div>; })}</div></article>
      <article className="dashboard-panel"><header><div><CalendarDays size={20} /><h2>Próximos prazos</h2></div><button type="button">Ver todos</button></header><div className="deadline-list">{data.deadlines.length === 0 && <EmptyPanelState>Nenhum prazo futuro cadastrado.</EmptyPanelState>}{data.deadlines.map((deadline) => <div key={deadline.id} className="deadline-item"><span className="client-avatar">{getInitials(deadline.clientName)}</span><div><strong>{deadline.clientName}</strong><small>{deadline.name}</small></div><div className="deadline-progress"><i style={{ width: `${deadline.progress}%` }} /></div><time><strong>{dateFormatter.format(new Date(`${deadline.deadline}T12:00:00Z`))}</strong><small>{getDaysUntil(deadline.deadline, selectedDate)}</small></time></div>)}</div></article>
      <article className="dashboard-panel"><header><div><FileText size={20} /><h2>Orçamentos pendentes</h2></div><button type="button">Ver todos</button></header><div className="budget-list">{data.budgets.length === 0 && <EmptyPanelState>Nenhum orçamento pendente.</EmptyPanelState>}{data.budgets.map((budget) => <div key={budget.id} className="budget-item"><span>{getInitials(budget.clientName)}</span><strong>{budget.clientName}</strong><small>{budget.projectName}</small><b>{currencyFormatter.format(budget.amount)}</b><em className={budget.status === "sent" ? "sent" : "draft"}>{budgetLabels[budget.status] ?? budget.status}</em></div>)}{data.budgets.length > 0 && <footer><span>Total</span><strong>{currencyFormatter.format(data.budgets.reduce((total, budget) => total + budget.amount, 0))}</strong></footer>}</div></article>
      <article className="dashboard-panel dashboard-obligations"><header><div><ClipboardList size={20} /><h2>Obrigações do mês</h2></div><button type="button"><Plus size={16} /> Nova obrigação</button></header><div className="obligation-table">{data.obligations.length === 0 && <EmptyPanelState>Nenhuma obrigação cadastrada para este mês.</EmptyPanelState>}{data.obligations.map((obligation) => { const presentation = obligationPresentation[obligation.status] ?? obligationPresentation.not_started; return <div key={obligation.id}><strong>{obligation.title}</strong><span>{obligationTypes[obligation.type] ?? obligation.type}</span><time>{dateFormatter.format(new Date(`${obligation.dueDate}T12:00:00Z`))}</time><em className={presentation.tone}><CheckCircle2 size={14} />{presentation.label}</em></div>; })}</div></article>
    </section>
  </div>;
}
