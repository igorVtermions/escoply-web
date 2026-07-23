"use client";

import { useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, Banknote, Bell, BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Download, ExternalLink, FileText, Search, X } from "lucide-react";
import { TasksSection } from "@/components/dashboard/tasks-section";
import type { AgendaData, AgendaItem, AgendaItemKind, AgendaItemStatus } from "@/lib/agenda/data";
import type { TaskKind, TaskPeriodFilter, TasksData, TaskStatusFilter } from "@/lib/tasks/data";

type AgendaView = "agenda" | "kanban";
type CalendarMode = "day" | "week" | "month";

type AgendaSectionProps = {
  agendaData: AgendaData;
  tasksData: TasksData;
  initialView: AgendaView;
  initialCalendarMode: CalendarMode;
  selectedDate: string;
  filters: {
    search: string;
    kind: TaskKind | "all";
    status: TaskStatusFilter;
    period: TaskPeriodFilter;
  };
};

const kindLabels: Record<AgendaItemKind, string> = {
  task: "Tarefa",
  obligation: "Obrigação",
  project_deadline: "Prazo de projeto",
  budget_validity: "Orçamento",
  payment: "Recebimento",
};

const statusLabels: Record<AgendaItemStatus, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  completed: "Concluído",
  overdue: "Atrasado",
  cancelled: "Cancelado",
  info: "Informativo",
};

const rawStatusLabels: Record<string, string> = {
  todo: "A começar",
  in_progress: "Em andamento",
  paused: "Paralisada",
  completed: "Concluída",
  draft: "Rascunho",
  sent: "Enviado",
  approved: "Aprovado",
  rejected: "Recusado",
  expired: "Expirado",
  pending: "Pendente",
  paid: "Pago",
  overdue: "Atrasado",
  upcoming: "Próximo",
  inactive: "Inativo",
  cancelled: "Cancelado",
  not_started: "Não iniciada",
  review: "Em revisão",
};

const taskKindLabels: Record<string, string> = {
  meeting: "Reunião",
  action: "Ação",
  review: "Revisão",
  delivery: "Entrega",
  follow_up: "Follow-up",
  charge: "Cobrança",
  other: "Geral",
};

const obligationTypeLabels: Record<string, string> = {
  tax: "Imposto",
  subscription: "Assinatura",
  client: "Cliente",
  contribution: "Contribuição",
  administrative: "Administrativo",
  financial: "Financeiro",
  other: "Outro",
};

const shortWeekdayFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" });
const longDateFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
const monthTitleFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const dayNumberFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", timeZone: "UTC" });
const timeFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const calendarHours = Array.from({ length: 14 }, (_, index) => index + 7);

function getTodayKey() {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function toUtcDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00Z`);
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateKey: string, days: number) {
  const date = toUtcDate(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateKey(date);
}

function addMonths(dateKey: string, months: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, Math.min(day, 28), 12));
  return formatDateKey(date);
}

function getWeekStart(dateKey: string) {
  const date = toUtcDate(dateKey);
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return formatDateKey(date);
}

function getMonthDays(dateKey: string) {
  const [year, month] = dateKey.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, month - 1, 1, 12));
  const lastDay = new Date(Date.UTC(year, month, 0, 12));
  const startDate = addDays(formatDateKey(firstDay), -firstDay.getUTCDay());
  const endDate = addDays(formatDateKey(lastDay), 6 - lastDay.getUTCDay());
  const days: string[] = [];
  let cursor = startDate;
  while (cursor <= endDate) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

function getWeekDays(dateKey: string) {
  const startDate = getWeekStart(dateKey);
  return Array.from({ length: 7 }, (_, index) => addDays(startDate, index));
}

function getDateKey(value: string) {
  return value.slice(0, 10);
}

function getCalendarTitle(dateKey: string, mode: CalendarMode) {
  if (mode === "day") return longDateFormatter.format(toUtcDate(dateKey));
  if (mode === "week") {
    const days = getWeekDays(dateKey);
    return `${dayNumberFormatter.format(toUtcDate(days[0]))} — ${longDateFormatter.format(toUtcDate(days[6]))}`;
  }
  return monthTitleFormatter.format(toUtcDate(dateKey));
}

function getNavigationDate(dateKey: string, mode: CalendarMode, direction: -1 | 1) {
  if (mode === "day") return addDays(dateKey, direction);
  if (mode === "week") return addDays(dateKey, direction * 7);
  return addMonths(dateKey, direction);
}

function getItemHour(item: AgendaItem) {
  return new Date(item.date).getHours();
}

function formatDateOnly(value: string | null) {
  if (!value) return "Sem data definida";
  return longDateFormatter.format(toUtcDate(getDateKey(value)));
}

function formatRawStatus(value: string | null) {
  if (!value) return "Não informado";
  return rawStatusLabels[value] ?? value;
}

function getItemCategory(item: AgendaItem) {
  if (!item.description) return "Geral";
  if (item.kind === "task") return taskKindLabels[item.description] ?? item.description;
  if (item.kind === "obligation") return obligationTypeLabels[item.description] ?? item.description;
  return item.description;
}

function AgendaKindIcon({ kind }: { kind: AgendaItemKind }) {
  if (kind === "obligation") return <ClipboardList size={18} />;
  if (kind === "project_deadline") return <BriefcaseBusiness size={18} />;
  if (kind === "budget_validity") return <FileText size={18} />;
  if (kind === "payment") return <Banknote size={18} />;
  return <Bell size={18} />;
}

function AgendaMetricIcon({ tone }: { tone: string }) {
  if (tone === "red") return <AlertTriangle size={24} />;
  if (tone === "green") return <CheckCircle2 size={24} />;
  return <CalendarDays size={24} />;
}

function AgendaMetricCard({ label, value, helper, tone }: { label: string; value: number; helper: string; tone: string }) {
  return (
    <article className="agenda-metric-card">
      <span className={`agenda-metric-icon ${tone}`}><AgendaMetricIcon tone={tone} /></span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{helper}</small>
      </div>
    </article>
  );
}

function CalendarEventChip({ item, compact = false, onSelect }: { item: AgendaItem; compact?: boolean; onSelect: (item: AgendaItem) => void }) {
  return (
    <button type="button" className={`calendar-event-chip ${item.kind} ${item.status} ${compact ? "is-compact" : ""}`} onClick={() => onSelect(item)}>
      {!compact && <time>{timeFormatter.format(new Date(item.date))}</time>}
      <span>{item.title}</span>
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function AgendaEventModal({ item, onClose }: { item: AgendaItem; onClose: () => void }) {
  const projectHref = item.projectId ? `/dashboard/projetos/${item.projectId}` : null;
  const context = [item.clientName, item.clientCompanyName, item.projectName].filter(Boolean).join(" · ") || "Atividade geral";
  const hasProjectContext = Boolean(item.projectName || item.clientName || item.projectDeadline || item.projectProgress !== null);
  const hasFinancialContext = item.amount !== null || Boolean(item.paymentCondition || item.paidAt || item.receiptFileName);

  return createPortal(
    <div className="agenda-event-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="agenda-event-modal" role="dialog" aria-modal="true" aria-labelledby="agenda-event-title">
        <button type="button" className="agenda-event-close" onClick={onClose} aria-label="Fechar"><X size={22} /></button>
        <div className="agenda-event-hero">
          <span className={`agenda-item-icon ${item.kind}`}><AgendaKindIcon kind={item.kind} /></span>
          <div>
            <small>{kindLabels[item.kind]}</small>
            <h2 id="agenda-event-title">{item.title}</h2>
            <p>{context}</p>
          </div>
        </div>

        <div className="agenda-event-status-row">
          <span className={`agenda-event-status ${item.status}`}>{statusLabels[item.status]}</span>
          <span>{getItemCategory(item)}</span>
        </div>

        <section className="agenda-event-section">
          <h3>Quando acontece</h3>
          <dl className="agenda-event-details-grid">
            <DetailRow label={item.kind === "payment" ? "Data do recebimento" : item.kind === "budget_validity" ? "Validade" : item.kind === "project_deadline" ? "Prazo final" : "Data"} value={formatDateOnly(item.date)} />
            <DetailRow label="Horário" value={timeFormatter.format(new Date(item.date))} />
            <DetailRow label="Status original" value={formatRawStatus(item.rawStatus)} />
          </dl>
        </section>

        {hasProjectContext && (
          <section className="agenda-event-section">
            <h3>Contexto do projeto</h3>
            <dl className="agenda-event-details-grid">
              <DetailRow label="Cliente" value={item.clientName ?? "Sem cliente vinculado"} />
              <DetailRow label="Empresa" value={item.clientCompanyName ?? "Não informada"} />
              <DetailRow label="Projeto" value={item.projectName ?? "Sem projeto vinculado"} />
              <DetailRow label="Prazo do projeto" value={formatDateOnly(item.projectDeadline)} />
              <DetailRow label="Progresso" value={item.projectProgress !== null ? `${item.projectProgress}%` : "Não informado"} />
            </dl>
          </section>
        )}

        {hasFinancialContext && (
          <section className="agenda-event-section">
            <h3>Detalhes financeiros</h3>
            <dl className="agenda-event-details-grid">
              {item.amount !== null && <DetailRow label="Valor" value={currencyFormatter.format(item.amount)} />}
              {item.paymentCondition && <DetailRow label="Condição de pagamento" value={item.paymentCondition} />}
              {item.paidAt && <DetailRow label="Recebido em" value={formatDateOnly(item.paidAt)} />}
              {item.receiptFileName && <DetailRow label="Comprovante" value={item.receiptFileName} />}
            </dl>
            {item.receiptUrl && <a className="agenda-event-receipt-link" href={item.receiptUrl} target="_blank" rel="noreferrer"><Download size={16} /> Baixar comprovante</a>}
          </section>
        )}

        {projectHref && (
          <footer>
            <a href={projectHref}><ExternalLink size={16} /> Abrir projeto completo</a>
          </footer>
        )}
      </section>
    </div>,
    document.body,
  );
}

function MonthCalendar({ dateKey, itemsByDate, onSelect }: { dateKey: string; itemsByDate: Map<string, AgendaItem[]>; onSelect: (item: AgendaItem) => void }) {
  const days = getMonthDays(dateKey);
  const currentMonth = dateKey.slice(0, 7);
  const today = getTodayKey();

  return (
    <section className="agenda-calendar month" aria-label="Calendário mensal">
      <div className="agenda-month-weekdays">
        {getWeekDays(days[0]).map((day) => <span key={day}>{shortWeekdayFormatter.format(toUtcDate(day))}</span>)}
      </div>
      <div className="agenda-month-grid">
        {days.map((day) => {
          const dayItems = itemsByDate.get(day) ?? [];
          const visibleItems = dayItems.slice(0, 3);
          return (
            <article className={`agenda-month-day ${day.slice(0, 7) !== currentMonth ? "is-muted" : ""} ${day === today ? "is-today" : ""}`} key={day}>
              <header><time>{dayNumberFormatter.format(toUtcDate(day))}</time></header>
              <div>
                {visibleItems.map((item) => <CalendarEventChip key={`${item.kind}-${item.id}`} item={item} compact onSelect={onSelect} />)}
                {dayItems.length > visibleItems.length && <button type="button" className="calendar-more-button" onClick={() => onSelect(dayItems[visibleItems.length])}>+ {dayItems.length - visibleItems.length}</button>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function WeekCalendar({ dateKey, itemsByDate, onSelect }: { dateKey: string; itemsByDate: Map<string, AgendaItem[]>; onSelect: (item: AgendaItem) => void }) {
  const days = getWeekDays(dateKey);
  const today = getTodayKey();

  return (
    <section className="agenda-calendar week" aria-label="Calendário semanal">
      <div className="agenda-week-header">
        <span />
        {days.map((day) => <time className={day === today ? "is-today" : ""} key={day}>{shortWeekdayFormatter.format(toUtcDate(day))}<strong>{dayNumberFormatter.format(toUtcDate(day))}</strong></time>)}
      </div>
      <div className="agenda-week-grid">
        {calendarHours.map((hour) => (
          <div className="agenda-week-row" key={hour}>
            <time>{String(hour).padStart(2, "0")}:00</time>
            {days.map((day) => {
              const items = (itemsByDate.get(day) ?? []).filter((item) => getItemHour(item) === hour);
              return <div className="agenda-week-cell" key={`${day}-${hour}`}>{items.map((item) => <CalendarEventChip key={`${item.kind}-${item.id}`} item={item} onSelect={onSelect} />)}</div>;
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function DayCalendar({ dateKey, itemsByDate, onSelect }: { dateKey: string; itemsByDate: Map<string, AgendaItem[]>; onSelect: (item: AgendaItem) => void }) {
  const dayItems = itemsByDate.get(dateKey) ?? [];

  return (
    <section className="agenda-calendar day" aria-label="Calendário diário">
      <header><h2>{longDateFormatter.format(toUtcDate(dateKey))}</h2><span>{dayItems.length} {dayItems.length === 1 ? "atividade" : "atividades"}</span></header>
      <div className="agenda-day-schedule">
        {calendarHours.map((hour) => {
          const items = dayItems.filter((item) => getItemHour(item) === hour);
          return (
            <div className="agenda-day-slot" key={hour}>
              <time>{String(hour).padStart(2, "0")}:00</time>
              <div>{items.length === 0 ? <span className="agenda-empty-slot" /> : items.map((item) => <CalendarEventChip key={`${item.kind}-${item.id}`} item={item} onSelect={onSelect} />)}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function AgendaSection({ agendaData, tasksData, initialView, initialCalendarMode, selectedDate, filters }: AgendaSectionProps) {
  const router = useRouter();
  const [view, setView] = useState<AgendaView>(initialView);
  const [calendarMode, setCalendarMode] = useState<CalendarMode>(initialCalendarMode);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<AgendaItemKind | "all">("all");
  const [status, setStatus] = useState<AgendaItemStatus | "all">("all");
  const [selectedItem, setSelectedItem] = useState<AgendaItem | null>(null);
  const [, startTransition] = useTransition();

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return agendaData.items.filter((item) => {
      const matchesSearch = !normalizedSearch || [item.title, item.clientName, item.projectName, item.description].filter(Boolean).some((value) => value?.toLowerCase().includes(normalizedSearch));
      const matchesKind = kind === "all" || item.kind === kind;
      const matchesStatus = status === "all" || item.status === status;
      return matchesSearch && matchesKind && matchesStatus;
    });
  }, [agendaData.items, kind, search, status]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    filteredItems.forEach((item) => {
      const date = getDateKey(item.date);
      map.set(date, [...map.get(date) ?? [], item]);
    });
    map.forEach((items) => items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    return map;
  }, [filteredItems]);

  const replaceAgendaUrl = (updates: { nextView?: AgendaView; nextMode?: CalendarMode; nextDate?: string }) => {
    const nextView = updates.nextView ?? view;
    const nextMode = updates.nextMode ?? calendarMode;
    const nextDate = updates.nextDate ?? selectedDate;
    const params = new URLSearchParams(window.location.search);
    if (nextView === "agenda") params.delete("visualizacao");
    else params.set("visualizacao", nextView);
    params.set("modo", nextMode);
    params.set("data", nextDate);
    startTransition(() => router.replace(`/dashboard/agenda?${params}`));
  };

  const changeView = (nextView: AgendaView) => {
    setView(nextView);
    replaceAgendaUrl({ nextView });
  };

  const changeCalendarMode = (nextMode: CalendarMode) => {
    setCalendarMode(nextMode);
    replaceAgendaUrl({ nextMode });
  };

  const goToDate = (nextDate: string) => {
    replaceAgendaUrl({ nextDate });
  };

  return (
    <div className="agenda-content">
      <div className="agenda-heading-row">
        <div>
          <h1>Agenda</h1>
          <p>Veja compromissos, tarefas, obrigações, prazos de projetos, orçamentos e recebimentos em um calendário geral da conta.</p>
        </div>
        <div className="agenda-view-tabs" role="tablist" aria-label="Visualização da agenda">
          <button type="button" role="tab" aria-selected={view === "agenda"} className={view === "agenda" ? "is-active" : ""} onClick={() => changeView("agenda")}><CalendarDays size={17} /> Calendário</button>
          <button type="button" role="tab" aria-selected={view === "kanban"} className={view === "kanban" ? "is-active" : ""} onClick={() => changeView("kanban")}><BriefcaseBusiness size={17} /> Kanban de tarefas</button>
        </div>
      </div>

      {view === "agenda" ? (
        <>
          <section className="agenda-metrics" aria-label="Indicadores da agenda">
            <AgendaMetricCard label="Hoje" value={agendaData.metrics.today} helper="Pendências para hoje" tone="purple" />
            <AgendaMetricCard label="Atrasados" value={agendaData.metrics.overdue} helper="Precisam de atenção" tone="red" />
            <AgendaMetricCard label="Esta semana" value={agendaData.metrics.week} helper="Próximos 7 dias" tone="blue" />
            <AgendaMetricCard label="Concluídos" value={agendaData.metrics.completed} helper="Histórico geral" tone="green" />
          </section>

          <section className="agenda-toolbar" aria-label="Controles do calendário">
            <div className="agenda-date-navigation">
              <button type="button" onClick={() => goToDate(getTodayKey())}>Hoje</button>
              <button type="button" aria-label="Voltar período" onClick={() => goToDate(getNavigationDate(selectedDate, calendarMode, -1))}><ChevronLeft size={18} /></button>
              <strong>{getCalendarTitle(selectedDate, calendarMode)}</strong>
              <button type="button" aria-label="Avançar período" onClick={() => goToDate(getNavigationDate(selectedDate, calendarMode, 1))}><ChevronRight size={18} /></button>
            </div>
            <div className="agenda-mode-tabs" role="tablist" aria-label="Modo do calendário">
              <button type="button" className={calendarMode === "day" ? "is-active" : ""} onClick={() => changeCalendarMode("day")}>Dia</button>
              <button type="button" className={calendarMode === "week" ? "is-active" : ""} onClick={() => changeCalendarMode("week")}>Semana</button>
              <button type="button" className={calendarMode === "month" ? "is-active" : ""} onClick={() => changeCalendarMode("month")}>Mês</button>
            </div>
          </section>

          <section className="agenda-filters-card" aria-label="Filtros da agenda">
            <label className="agenda-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar na agenda..." /></label>
            <label>Tipo
              <select value={kind} onChange={(event) => setKind(event.target.value as AgendaItemKind | "all")}>
                <option value="all">Todos</option>
                {Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>Status
              <select value={status} onChange={(event) => setStatus(event.target.value as AgendaItemStatus | "all")}>
                <option value="all">Todos</option>
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => { setSearch(""); setKind("all"); setStatus("all"); }}>Limpar filtros</button>
          </section>

          {calendarMode === "month" && <MonthCalendar dateKey={selectedDate} itemsByDate={itemsByDate} onSelect={setSelectedItem} />}
          {calendarMode === "week" && <WeekCalendar dateKey={selectedDate} itemsByDate={itemsByDate} onSelect={setSelectedItem} />}
          {calendarMode === "day" && <DayCalendar dateKey={selectedDate} itemsByDate={itemsByDate} onSelect={setSelectedItem} />}
        </>
      ) : (
        <TasksSection
          basePath="/dashboard/agenda"
          title="Kanban de tarefas"
          description="Arraste tarefas entre as etapas operacionais sem misturar com a visão de calendário."
          data={tasksData}
          filters={filters}
        />
      )}
      {selectedItem && <AgendaEventModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </div>
  );
}
