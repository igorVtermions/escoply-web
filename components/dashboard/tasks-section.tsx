"use client";

import { useActionState, useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarDays, CheckCircle2, MoreHorizontal, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createTaskAction, deleteTaskAction, moveTaskToColumnAction, toggleTaskCompletedAction, type TaskActionState } from "@/app/dashboard/tarefas/actions";
import { showToast } from "@/components/ui/toast-provider";
import type { TaskItem, TaskKind, TaskPeriodFilter, TasksData, TaskStatusFilter } from "@/lib/tasks/data";

type TasksSectionProps = {
  data: TasksData;
  filters: {
    search: string;
    kind: TaskKind | "all";
    status: TaskStatusFilter;
    period: TaskPeriodFilter;
  };
};

type TaskColumnId = "overdue" | "today" | "upcoming" | "completed";

const initialTaskState: TaskActionState = { success: false, message: "" };

const taskKindLabels: Record<TaskKind, string> = {
  meeting: "Reunião",
  action: "Ação",
  review: "Revisão",
  delivery: "Entrega",
  follow_up: "Follow-up",
  charge: "Cobrança",
  other: "Geral",
};

const taskKindClasses: Record<TaskKind, string> = {
  meeting: "purple",
  action: "orange",
  review: "blue",
  delivery: "green",
  follow_up: "blue",
  charge: "red",
  other: "slate",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });
const timeFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

function getTodayKey() {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getDateKey(value: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(value)).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getRelativeDate(task: TaskItem) {
  if (task.completedAt) return "Concluída";
  const today = getTodayKey();
  const taskDate = getDateKey(task.scheduledAt);
  if (taskDate === today) return `Hoje às ${timeFormatter.format(new Date(task.scheduledAt))}`;
  const difference = Math.round((new Date(`${taskDate}T12:00:00Z`).getTime() - new Date(`${today}T12:00:00Z`).getTime()) / 86_400_000);
  if (difference === -1) return "Venceu ontem";
  if (difference < 0) return `${Math.abs(difference)} dias atrasada`;
  if (difference === 1) return "Amanhã";
  return dateFormatter.format(new Date(task.scheduledAt));
}

function TaskMiniChart({ tone }: { tone: "blue" | "red" | "green" | "purple" }) {
  return (
    <svg viewBox="0 0 90 34" aria-hidden="true" className={`tasks-mini-chart ${tone}`}>
      <path d="M2 25 L15 23 L27 13 L41 18 L53 20 L66 9 L77 16 L88 8" />
    </svg>
  );
}

function TaskMetricCard({ label, value, helper, tone, icon: Icon }: { label: string; value: number; helper: string; tone: "blue" | "red" | "green" | "purple"; icon: LucideIcon }) {
  return (
    <article className="tasks-stat-card">
      <span className={`tasks-stat-icon ${tone}`}><Icon size={24} /></span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{helper}</small>
      </div>
      <TaskMiniChart tone={tone} />
    </article>
  );
}

function TaskCard({ task, onToggle, onDelete, onDragStart, isPending }: { task: TaskItem; onToggle: (task: TaskItem) => void; onDelete: (task: TaskItem) => void; onDragStart: (task: TaskItem | null) => void; isPending: boolean }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const kindClass = taskKindClasses[task.kind] ?? "slate";

  return (
    <article
      className={`task-card ${task.completedAt ? "is-completed" : ""} ${isPending ? "is-moving" : ""}`}
      draggable={!isPending}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", task.id);
        onDragStart(task);
      }}
      onDragEnd={() => onDragStart(null)}
    >
      <div className="task-card-main">
        <button type="button" className="task-check" disabled={isPending} onClick={() => onToggle(task)} aria-label={task.completedAt ? "Reabrir tarefa" : "Concluir tarefa"}>
          {task.completedAt && <CheckCircle2 size={16} />}
        </button>
        <div>
          <strong>{task.title}</strong>
          <span>{[task.clientName, task.projectName].filter(Boolean).join(" · ") || "Tarefa geral"}</span>
        </div>
        <button type="button" className="task-menu-button" onClick={() => setIsMenuOpen((current) => !current)} aria-label="Abrir ações"><MoreHorizontal size={18} /></button>
      </div>

      <footer>
        <time className={task.bucket === "overdue" ? "danger" : task.bucket === "today" ? "today" : task.completedAt ? "success" : ""}><CalendarDays size={15} />{getRelativeDate(task)}</time>
        <em className={kindClass}>{taskKindLabels[task.kind]}</em>
      </footer>

      {isMenuOpen && (
        <div className="task-card-menu">
          <button type="button" onClick={() => { setIsMenuOpen(false); onToggle(task); }} disabled={isPending}>
            {task.completedAt ? <RotateCcw size={15} /> : <CheckCircle2 size={15} />}
            {task.completedAt ? "Reabrir" : "Concluir"}
          </button>
          <button type="button" onClick={() => { setIsMenuOpen(false); onDelete(task); }} disabled={isPending}>
            <Trash2 size={15} /> Excluir
          </button>
        </div>
      )}
    </article>
  );
}

function TaskColumn({ id, title, tone, tasks, onAdd, onToggle, onDelete, onMove, onDragStart, isDragTarget, pendingTaskId }: { id: TaskColumnId; title: string; tone: "red" | "purple" | "blue" | "green"; tasks: TaskItem[]; onAdd: () => void; onToggle: (task: TaskItem) => void; onDelete: (task: TaskItem) => void; onMove: (column: TaskColumnId) => void; onDragStart: (task: TaskItem | null) => void; isDragTarget: boolean; pendingTaskId: string | null }) {
  return (
    <section
      className={`tasks-column ${tone} ${isDragTarget ? "is-drag-target" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (event.dataTransfer.getData("text/plain")) onMove(id);
      }}
    >
      <header><h2>{title}</h2><span>{tasks.length}</span></header>
      <div className="tasks-column-list">
        {tasks.length === 0 && <p>Nenhuma tarefa nesta coluna.</p>}
        {tasks.map((task) => <TaskCard key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onDragStart={onDragStart} isPending={pendingTaskId === task.id} />)}
      </div>
      <button type="button" className="tasks-column-add" onClick={onAdd}><Plus size={16} /> Adicionar tarefa</button>
    </section>
  );
}

export function TasksSection({ data, filters }: TasksSectionProps) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.search);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<TaskItem | null>(null);
  const [, startTransition] = useTransition();

  const totalVisible = useMemo(() => Object.values(data.columns).reduce((total, tasks) => total + tasks.length, 0), [data.columns]);

  const navigate = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === "all" || value === "week") params.delete(key);
      else params.set(key, value);
    });
    router.replace(`/dashboard/tarefas${params.size ? `?${params}` : ""}`);
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate({ busca: search.trim() });
  };

  const handleToggle = (task: TaskItem) => {
    setPendingTaskId(task.id);
    startTransition(async () => {
      const result = await toggleTaskCompletedAction(task.id);
      setPendingTaskId(null);
      if (!result.success) {
        showToast({ type: "error", title: "Ação não concluída", description: result.message });
        return;
      }
      showToast({ type: "success", title: task.completedAt ? "Tarefa reaberta" : "Tarefa concluída", description: result.message });
      router.refresh();
    });
  };

  const handleDelete = (task: TaskItem) => {
    setPendingTaskId(task.id);
    startTransition(async () => {
      const result = await deleteTaskAction(task.id);
      setPendingTaskId(null);
      if (!result.success) {
        showToast({ type: "error", title: "Tarefa não excluída", description: result.message });
        return;
      }
      showToast({ type: "success", title: "Tarefa excluída", description: result.message });
      router.refresh();
    });
  };

  const handleMove = (column: TaskColumnId) => {
    if (!draggedTask || draggedTask.bucket === column) {
      setDraggedTask(null);
      return;
    }

    setPendingTaskId(draggedTask.id);
    startTransition(async () => {
      const result = await moveTaskToColumnAction(draggedTask.id, column);
      setPendingTaskId(null);
      setDraggedTask(null);
      if (!result.success) {
        showToast({ type: "error", title: "Tarefa não movida", description: result.message });
        return;
      }
      showToast({ type: "success", title: "Tarefa movida", description: result.message });
      router.refresh();
    });
  };

  return (
    <div className="tasks-content">
      <div className="tasks-heading-row">
        <div>
          <h1>Tarefas</h1>
          <p>Organize prazos, cobranças, follow-ups e obrigações importantes.</p>
        </div>
        <button type="button" className="tasks-new-button" onClick={() => setIsCreateOpen(true)}><Plus size={19} /> Nova tarefa</button>
      </div>

      <section className="tasks-stats" aria-label="Indicadores de tarefas">
        <TaskMetricCard label="Hoje" value={data.metrics.today} helper="Pendentes para hoje" tone="purple" icon={CalendarDays} />
        <TaskMetricCard label="Atrasadas" value={data.metrics.overdue} helper="Precisam de atenção" tone="red" icon={AlertTriangle} />
        <TaskMetricCard label="Esta semana" value={data.metrics.week} helper="Próximos 7 dias" tone="blue" icon={CalendarDays} />
        <TaskMetricCard label="Concluídas" value={data.metrics.completed} helper="Histórico geral" tone="green" icon={CheckCircle2} />
      </section>

      <section className="tasks-filters-card" aria-label="Filtros de tarefas">
        <form className="tasks-search" onSubmit={handleSearch}>
          <Search size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar tarefa..." />
          <button type="submit">Buscar</button>
        </form>

        <label>Tipo
          <select value={filters.kind} onChange={(event) => navigate({ tipo: event.target.value })}>
            <option value="all">Todos</option>
            {Object.entries(taskKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        <label>Status
          <select value={filters.status} onChange={(event) => navigate({ status: event.target.value })}>
            <option value="all">Todos</option>
            <option value="overdue">Atrasadas</option>
            <option value="today">Hoje</option>
            <option value="upcoming">Próximas</option>
            <option value="completed">Concluídas</option>
          </select>
        </label>

        <label>Período
          <select value={filters.period} onChange={(event) => navigate({ periodo: event.target.value })}>
            <option value="week">Esta semana</option>
            <option value="month">Este mês</option>
            <option value="all">Todos</option>
          </select>
        </label>

        <button type="button" className="tasks-clear-button" onClick={() => { setSearch(""); router.replace("/dashboard/tarefas"); }}><RotateCcw size={17} /> Limpar filtros</button>
      </section>

      <div className="tasks-board" aria-label={`${totalVisible} tarefas encontradas`}>
        <TaskColumn id="overdue" title="Atrasadas" tone="red" tasks={data.columns.overdue} onAdd={() => setIsCreateOpen(true)} onToggle={handleToggle} onDelete={handleDelete} onMove={handleMove} onDragStart={setDraggedTask} isDragTarget={draggedTask !== null && draggedTask.bucket !== "overdue"} pendingTaskId={pendingTaskId} />
        <TaskColumn id="today" title="Hoje" tone="purple" tasks={data.columns.today} onAdd={() => setIsCreateOpen(true)} onToggle={handleToggle} onDelete={handleDelete} onMove={handleMove} onDragStart={setDraggedTask} isDragTarget={draggedTask !== null && draggedTask.bucket !== "today"} pendingTaskId={pendingTaskId} />
        <TaskColumn id="upcoming" title="Próximas" tone="blue" tasks={data.columns.upcoming} onAdd={() => setIsCreateOpen(true)} onToggle={handleToggle} onDelete={handleDelete} onMove={handleMove} onDragStart={setDraggedTask} isDragTarget={draggedTask !== null && draggedTask.bucket !== "upcoming"} pendingTaskId={pendingTaskId} />
        <TaskColumn id="completed" title="Concluídas" tone="green" tasks={data.columns.completed} onAdd={() => setIsCreateOpen(true)} onToggle={handleToggle} onDelete={handleDelete} onMove={handleMove} onDragStart={setDraggedTask} isDragTarget={draggedTask !== null && draggedTask.bucket !== "completed"} pendingTaskId={pendingTaskId} />
      </div>

      {isCreateOpen && <CreateTaskModal projects={data.projects} onClose={() => setIsCreateOpen(false)} />}
    </div>
  );
}

function CreateTaskModal({ projects, onClose }: { projects: TasksData["projects"]; onClose: () => void }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createTaskAction, initialTaskState);
  const today = getTodayKey();

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
      showToast({ type: "error", title: "Tarefa não criada", description: state.message });
      return;
    }
    showToast({ type: "success", title: "Tarefa criada", description: state.message });
    onClose();
    router.refresh();
  }, [onClose, router, state]);

  return createPortal(
    <div className="tasks-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isPending) onClose(); }}>
      <section className="tasks-modal" role="dialog" aria-modal="true" aria-labelledby="tasks-modal-title">
        <button type="button" className="tasks-modal-close" onClick={onClose} disabled={isPending} aria-label="Fechar"><X size={22} /></button>
        <span>Tarefa</span>
        <h2 id="tasks-modal-title">Nova tarefa</h2>
        <p>Crie uma cobrança, follow-up, reunião, entrega ou lembrete operacional ligado a um projeto.</p>

        <form action={formAction} className="tasks-modal-form">
          <label>
            Título
            <input name="title" required minLength={2} maxLength={180} placeholder="Ex.: Cobrar aprovação do orçamento" />
          </label>

          <label>
            Projeto
            <select name="project_id" defaultValue="">
              <option value="">Tarefa geral</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}{project.clientName ? ` · ${project.clientName}` : ""}</option>)}
            </select>
          </label>

          <div>
            <label>
              Tipo
              <select name="kind" defaultValue="action">
                {Object.entries(taskKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              Data
              <input name="scheduled_date" type="date" required defaultValue={today} />
            </label>
            <label>
              Horário
              <input name="scheduled_time" type="time" required defaultValue="09:00" />
            </label>
          </div>

          <button type="submit" disabled={isPending}>{isPending ? "Criando..." : "Criar tarefa"}</button>
        </form>
      </section>
    </div>,
    document.body,
  );
}
