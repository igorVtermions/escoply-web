"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DollarSign,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Rocket,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { createProjectAction, deleteProjectAction, updateProjectAction, type ProjectActionState } from "@/app/dashboard/projetos/actions";
import { showToast } from "@/components/ui/toast-provider";
import type { ProjectListItem, ProjectSort, ProjectsData, ProjectStatus, ProjectWorkType } from "@/lib/projects/data";

type ProjectsSectionProps = {
  data: ProjectsData;
  filters: {
    search: string;
    status: ProjectStatus | "all";
    clientId: string | "all";
    sort: ProjectSort;
  };
};

const initialProjectState: ProjectActionState = { success: false, message: "" };
const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

const statusLabels: Record<ProjectStatus, string> = {
  in_progress: "Em andamento",
  review: "Em revisão",
  completed: "Concluído",
  delayed: "Atrasado",
  archived: "Arquivado",
};

const statusClasses: Record<ProjectStatus, string> = {
  in_progress: "blue",
  review: "orange",
  completed: "green",
  delayed: "red",
  archived: "slate",
};

const workTypeLabels: Record<ProjectWorkType, string> = {
  design: "Design",
  tech: "Tech",
  marketing: "Marketing",
  content: "Conteúdo",
  consulting: "Consultoria",
  branding: "Branding",
  automation: "Automação",
  other: "Outro",
};

const tagOptions = ["Landing page", "Identidade visual", "Social media", "E-commerce", "App", "Automação", "SEO", "Copywriting", "UI/UX", "Performance", "Manutenção", "Consultoria"];

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "PR";
}

function getDeadlineText(deadline: string | null) {
  if (!deadline) return "Sem prazo";
  return dateFormatter.format(new Date(`${deadline}T12:00:00Z`));
}

function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const amount = Number(digits) / 100;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
}

function formatInitialCurrency(value: number) {
  if (!value) return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function CurrencyInput({ defaultValue = 0 }: { defaultValue?: number }) {
  const [value, setValue] = useState(() => formatInitialCurrency(defaultValue));

  return (
    <input
      name="estimated_value"
      inputMode="numeric"
      value={value}
      onChange={(event) => setValue(formatCurrencyInput(event.target.value))}
      placeholder="R$ 0,00"
    />
  );
}

function ProjectAvatar({ project, size = "normal" }: { project: Pick<ProjectListItem, "client" | "name">; size?: "normal" | "small" }) {
  return (
    <span
      className={`project-avatar ${size === "small" ? "is-small" : ""} ${project.client.logoUrl ? "has-image" : ""}`}
      style={project.client.logoUrl ? { backgroundImage: `url(${project.client.logoUrl})` } : undefined}
    >
      {!project.client.logoUrl && getInitials(project.client.name || project.name)}
    </span>
  );
}

function ProjectMiniChart({ tone }: { tone: "blue" | "orange" | "green" | "red" }) {
  return (
    <svg viewBox="0 0 90 34" aria-hidden="true" className={`projects-mini-chart ${tone}`}>
      <path d="M2 25 L15 21 L27 12 L40 18 L52 20 L64 8 L77 14 L88 7" />
    </svg>
  );
}

function ProjectStatCard({ label, value, tone, icon: Icon }: { label: string; value: number; tone: "purple" | "orange" | "green" | "red"; icon: typeof Rocket }) {
  return (
    <article className="projects-stat-card">
      <span className={`projects-stat-icon ${tone}`}><Icon size={23} /></span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small className={tone === "red" ? "negative" : "positive"}>{tone === "red" ? "Atenção necessária" : "Dados atuais"}</small>
      </div>
      <ProjectMiniChart tone={tone === "purple" ? "blue" : tone} />
    </article>
  );
}

export function ProjectsSection({ data, filters }: ProjectsSectionProps) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.search);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editProject, setEditProject] = useState<ProjectListItem | null>(null);
  const [deleteProject, setDeleteProject] = useState<ProjectListItem | null>(null);
  const [actionMenu, setActionMenu] = useState<{ project: ProjectListItem; top: number; right: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  const navigate = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "" || value === "all") params.delete(key);
      else params.set(key, String(value));
    });
    router.replace(`/dashboard/projetos${params.size ? `?${params}` : ""}`);
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate({ busca: search.trim(), pagina: 1 });
  };

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await createProjectAction(initialProjectState, formData);
      if (!result.success) {
        showToast({ type: "error", title: "Projeto não cadastrado", description: result.message });
        return;
      }
      showToast({ type: "success", title: "Projeto cadastrado", description: result.message });
      form.reset();
      setIsCreateOpen(false);
      navigate({ pagina: 1 });
      router.refresh();
    });
  };

  const handleUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateProjectAction(formData);
      if (!result.success) {
        showToast({ type: "error", title: "Projeto não atualizado", description: result.message });
        return;
      }
      showToast({ type: "success", title: "Projeto atualizado", description: result.message });
      setEditProject(null);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!deleteProject) return;
    startTransition(async () => {
      const result = await deleteProjectAction(deleteProject.id);
      if (!result.success) {
        showToast({ type: "error", title: "Projeto não excluído", description: result.message });
        return;
      }
      showToast({ type: "success", title: "Projeto excluído", description: result.message });
      setDeleteProject(null);
      navigate({ pagina: 1 });
      router.refresh();
    });
  };

  return (
    <div className="projects-content">
      <div className="projects-heading-row">
        <div>
          <h1>Projetos</h1>
          <p>Acompanhe todos os seus projetos.</p>
        </div>
        <button type="button" className="projects-new-button" onClick={() => setIsCreateOpen(true)}><Plus size={18} /> Novo projeto</button>
      </div>

      <div className="projects-filters-row">
        <form className="projects-search" onSubmit={handleSearch}>
          <Search size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar projetos..." />
          <button type="submit">Buscar</button>
        </form>
        <select value={filters.status} onChange={(event) => navigate({ status: event.target.value, pagina: 1 })} aria-label="Filtrar projetos por status">
          <option value="all">Status: Todos</option>
          <option value="in_progress">Em andamento</option>
          <option value="review">Em revisão</option>
          <option value="completed">Concluídos</option>
          <option value="delayed">Atrasados</option>
          <option value="archived">Arquivados</option>
        </select>
        <select value={filters.clientId} onChange={(event) => navigate({ cliente: event.target.value, pagina: 1 })} aria-label="Filtrar projetos por cliente">
          <option value="all">Cliente: Todos</option>
          {data.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
      </div>

      <section className="projects-stats" aria-label="Indicadores de projetos">
        <ProjectStatCard label="Em andamento" value={data.counts.inProgress} tone="purple" icon={Rocket} />
        <ProjectStatCard label="Em revisão" value={data.counts.review} tone="orange" icon={Clock3} />
        <ProjectStatCard label="Concluídos" value={data.counts.completed} tone="green" icon={CheckCircle2} />
        <ProjectStatCard label="Atrasados" value={data.counts.delayed} tone="red" icon={Clock3} />
      </section>

      <div className="projects-layout">
        <section className="projects-list-card">
          <header>
            <div><strong>Todos os projetos</strong><span>{data.pagination.total}</span></div>
            <select aria-label="Ordenar projetos" value={filters.sort} onChange={(event) => navigate({ ordem: event.target.value, pagina: 1 })}>
              <option value="recent">Ordenar: Mais recentes</option>
              <option value="deadline">Ordenar: Prazo mais próximo</option>
              <option value="value_desc">Ordenar: Maior valor</option>
              <option value="progress_desc">Ordenar: Maior progresso</option>
              <option value="name">Ordenar: Nome A-Z</option>
            </select>
          </header>

          {data.projects.length === 0 ? (
            <div className="projects-empty"><BriefcaseBusiness size={34} /><strong>Nenhum projeto encontrado</strong><p>Cadastre um projeto ou ajuste os filtros utilizados.</p></div>
          ) : (
            <div className="projects-grid">
              {data.projects.map((project) => (
                <article
                  className="project-card"
                  key={project.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/dashboard/projetos/${project.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") router.push(`/dashboard/projetos/${project.id}`);
                  }}
                >
                  <header>
                    <ProjectAvatar project={project} />
                    <div>
                      <h2>{project.name}</h2>
                      <p>{project.client.name}</p>
                    </div>
                    <em className={`project-status ${statusClasses[project.status]}`}>{statusLabels[project.status]}</em>
                  </header>
                  <div className="project-meta">
                    <span><CalendarDays size={16} /> Prazo: <strong>{getDeadlineText(project.deadline)}</strong></span>
                    <span><DollarSign size={16} /> Valor: <strong>{currencyFormatter.format(project.estimatedValue)}</strong></span>
                  </div>
                  <div className="project-progress-row">
                    <div><span>Progresso</span><strong>{project.progress}%</strong></div>
                    <div className="project-progress"><i style={{ width: `${project.progress}%` }} /></div>
                    <small>Escopo concluído: {project.scopeCompleted}/{project.scopeTotal}</small>
                  </div>
                  <div className="project-actions">
                    <button
                      type="button"
                      aria-label={`Ações de ${project.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        const rect = event.currentTarget.getBoundingClientRect();
                        setActionMenu({ project, top: rect.bottom + 6, right: window.innerWidth - rect.right });
                      }}
                    >
                      <MoreHorizontal size={17} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <footer className="projects-pagination">
            <span>{data.pagination.total === 0 ? "0 projetos" : `Mostrando ${(data.pagination.page - 1) * data.pagination.pageSize + 1} a ${Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.total)} de ${data.pagination.total} projetos`}</span>
            <div>
              <button type="button" disabled={data.pagination.page <= 1} onClick={() => navigate({ pagina: data.pagination.page - 1 })}><ChevronLeft size={17} /></button>
              <strong>{data.pagination.page}</strong>
              <span>de {data.pagination.pages}</span>
              <button type="button" disabled={data.pagination.page >= data.pagination.pages} onClick={() => navigate({ pagina: data.pagination.page + 1 })}><ChevronRight size={17} /></button>
            </div>
          </footer>
        </section>

        <aside className="projects-side-column">
          <ProjectDeadlinesPanel deadlines={data.deadlines} />
          <ProjectBudgetsPanel budgets={data.budgets} />
        </aside>
      </div>

      {isCreateOpen && <ProjectFormModal title="Novo projeto" eyebrow="Novo cadastro" data={data} isPending={isPending} onClose={() => !isPending && setIsCreateOpen(false)} onSubmit={handleCreate} />}
      {actionMenu && <ProjectActionsMenu menu={actionMenu} onClose={() => setActionMenu(null)} onEdit={() => { setEditProject(actionMenu.project); setActionMenu(null); }} onDelete={() => { setDeleteProject(actionMenu.project); setActionMenu(null); }} />}
      {editProject && <ProjectFormModal title="Editar projeto" eyebrow="Editar cadastro" data={data} project={editProject} isPending={isPending} onClose={() => !isPending && setEditProject(null)} onSubmit={handleUpdate} />}
      {deleteProject && <DeleteProjectModal projectName={deleteProject.name} isPending={isPending} onClose={() => !isPending && setDeleteProject(null)} onConfirm={handleDelete} />}
    </div>
  );
}

function ProjectActionsMenu({ menu, onClose, onEdit, onDelete }: { menu: { project: ProjectListItem; top: number; right: number }; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <>
      <button type="button" className="project-actions-dismiss" aria-label="Fechar ações" onClick={onClose} />
      <div className="project-actions-menu" style={{ top: menu.top, right: menu.right }} role="menu">
        <button type="button" role="menuitem" onClick={onEdit}><Pencil size={16} /> Editar projeto</button>
        <button type="button" role="menuitem" className="danger" onClick={onDelete}><Trash2 size={16} /> Excluir projeto</button>
      </div>
    </>,
    document.body,
  );
}

function ProjectDeadlinesPanel({ deadlines }: { deadlines: ProjectsData["deadlines"] }) {
  return (
    <section className="projects-side-card">
      <header><div><CalendarDays size={19} /><strong>Prazos próximos</strong></div><button type="button" disabled title="Tela de prazos em breve">Ver todos</button></header>
      <div className="project-side-list">
        {deadlines.length === 0 && <p className="project-side-empty">Nenhum prazo próximo cadastrado.</p>}
        {deadlines.map((deadline) => (
          <div className="project-deadline-item" key={deadline.id}>
            <span className={`project-avatar is-small ${deadline.logoUrl ? "has-image" : ""}`} style={deadline.logoUrl ? { backgroundImage: `url(${deadline.logoUrl})` } : undefined}>{!deadline.logoUrl && getInitials(deadline.clientName)}</span>
            <div><strong>{deadline.name}</strong><small>{deadline.clientName}</small></div>
            <time><strong>{dateFormatter.format(new Date(`${deadline.deadline}T12:00:00Z`))}</strong><small>{deadline.daysLeft === 0 ? "Hoje" : `${deadline.daysLeft} dias`}</small></time>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProjectBudgetsPanel({ budgets }: { budgets: ProjectsData["budgets"] }) {
  const total = budgets.reduce((sum, budget) => sum + budget.amount, 0);
  return (
    <section className="projects-side-card">
      <header><div><FileText size={19} /><strong>Orçamentos pendentes</strong></div><button type="button" disabled title="Tela de orçamentos em breve">Ver todos</button></header>
      <div className="project-budget-table">
        <div><span>Cliente</span><span>Projeto</span><span>Valor</span></div>
        {budgets.length === 0 && <p className="project-side-empty">Nenhum orçamento pendente.</p>}
        {budgets.map((budget) => (
          <div key={budget.id}>
            <strong><span className={`project-avatar is-tiny ${budget.logoUrl ? "has-image" : ""}`} style={budget.logoUrl ? { backgroundImage: `url(${budget.logoUrl})` } : undefined}>{!budget.logoUrl && getInitials(budget.clientName)}</span>{budget.clientName}</strong>
            <small>{budget.projectName}</small>
            <b>{currencyFormatter.format(budget.amount)}</b>
            <em className={budget.status}>{budget.status === "sent" ? "Enviado" : "Rascunho"}</em>
          </div>
        ))}
        {budgets.length > 0 && <footer><span>Total</span><strong>{currencyFormatter.format(total)}</strong></footer>}
      </div>
    </section>
  );
}

function ProjectFormModal({
  title,
  eyebrow,
  data,
  project,
  isPending,
  onClose,
  onSubmit,
}: {
  title: string;
  eyebrow: string;
  data: ProjectsData;
  project?: ProjectListItem;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
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

  return createPortal(
    <div className="project-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="project-modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
        <header><div><span>{eyebrow}</span><h2 id="project-modal-title">{title}</h2></div><button type="button" onClick={onClose} aria-label="Fechar"><X size={20} /></button></header>
        <form onSubmit={onSubmit}>
          {project && <input type="hidden" name="project_id" value={project.id} />}
          <div className="project-form-grid">
            <label>Cliente<select name="client_id" defaultValue={project?.client.id || ""} required><option value="" disabled>Selecione um cliente</option>{data.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
            <label>Status<select name="status" defaultValue={project?.status ?? "in_progress"}><option value="in_progress">Em andamento</option><option value="review">Em revisão</option><option value="completed">Concluído</option><option value="delayed">Atrasado</option><option value="archived">Arquivado</option></select></label>
            <label className="is-wide">Nome do projeto<input name="name" defaultValue={project?.name ?? ""} placeholder="Ex.: Landing Page — Studio Lume" required /></label>
            <label>Tipo de trabalho<select name="work_type" defaultValue={project?.workType ?? "design"}>{Object.entries(workTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Prazo final<input name="deadline" type="date" defaultValue={project?.deadline ?? ""} /></label>
            <label>Valor estimado<CurrencyInput defaultValue={project?.estimatedValue ?? 0} /></label>
            <label>Progresso<input name="progress" type="number" min={0} max={100} defaultValue={project?.progress ?? 0} /></label>
            <fieldset className="project-tag-picker">
              <legend>Tags do projeto</legend>
              <div>
                {tagOptions.map((tag) => <label key={tag}><input type="checkbox" name="tags" value={tag} defaultChecked={project?.tags.includes(tag) ?? false} /><span>{tag}</span></label>)}
              </div>
              <label>Tags personalizadas<input name="tags" defaultValue={project?.tags.filter((tag) => !tagOptions.includes(tag)).join(", ") ?? ""} placeholder="Ex.: Urgente, Contrato anual" /></label>
            </fieldset>
            <label className="is-wide">Resumo do projeto<textarea name="description" rows={4} defaultValue={project?.description ?? ""} placeholder="Contexto, objetivo, entregáveis e observações principais..." /></label>
          </div>
          <footer><button type="button" onClick={onClose} disabled={isPending}>Cancelar</button><button type="submit" disabled={isPending}>{isPending ? "Salvando..." : project ? "Salvar alterações" : "Cadastrar projeto"}</button></footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}

function DeleteProjectModal({ projectName, isPending, onClose, onConfirm }: { projectName: string; isPending: boolean; onClose: () => void; onConfirm: () => void }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  return createPortal(
    <div className="project-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="project-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-project-title">
        <div className="project-delete-icon"><Trash2 size={25} /></div>
        <h2 id="delete-project-title">Excluir {projectName}?</h2>
        <p>Esta ação remove o projeto e também os lembretes, orçamentos e recebimentos vinculados a ele.</p>
        <div><button type="button" disabled={isPending} onClick={onClose}>Cancelar</button><button type="button" disabled={isPending} onClick={onConfirm}>{isPending ? "Excluindo..." : "Sim, excluir projeto"}</button></div>
      </section>
    </div>,
    document.body,
  );
}
