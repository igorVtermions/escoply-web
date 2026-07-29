"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { type FormEvent, useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Copy,
  DollarSign,
  Download,
  ExternalLink,
  FileArchive,
  FileText,
  FolderOpen,
  ImageIcon,
  Link2,
  Mail,
  MessageSquare,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Send,
  Share2,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { showToast } from "@/components/ui/toast-provider";
import type { ProjectDetailData } from "@/lib/projects/detail-data";
import { updateProjectAction } from "@/app/dashboard/projetos/actions";
import {
  archiveProjectAction,
  createMaterialAction,
  createPaymentAction,
  createReminderAction,
  createScopeItemAction,
  deleteMaterialAction,
  deleteProjectAndRedirectAction,
  deleteScopeItemAction,
  markPaymentPaidAction,
  saveBudgetAction,
  seedScopeItemsAction,
  toggleScopeItemAction,
  updateScopeItemAction,
  type DetailActionState,
} from "@/app/dashboard/projetos/[projectId]/actions";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const timeFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

const initialState: DetailActionState = { success: false, message: "" };
const statusLabels: Record<string, string> = { in_progress: "Em andamento", review: "Em revisão", completed: "Concluído", delayed: "Atrasado", archived: "Arquivado" };
const statusClasses: Record<string, string> = { in_progress: "green", review: "orange", completed: "green", delayed: "red", archived: "slate" };
const budgetLabels: Record<string, string> = { draft: "Rascunho", sent: "Enviado", approved: "Aprovado", rejected: "Recusado", expired: "Expirado" };
const paymentLabels: Record<string, string> = { paid: "Pago", pending: "Pendente", overdue: "Atrasado", cancelled: "Cancelado" };
const paymentTypeLabels: Record<string, string> = { deposit: "Sinal", installment: "Parcela", final_payment: "Saldo final", extra: "Extra" };
const reminderLabels: Record<string, string> = { meeting: "Reunião", action: "Ação", review: "Revisão", delivery: "Entrega", follow_up: "Follow-up", charge: "Cobrança", other: "Lembrete" };
const workTypeLabels: Record<string, string> = { design: "Design", tech: "Tech", marketing: "Marketing", content: "Conteúdo", consulting: "Consultoria", branding: "Branding", automation: "Automação", other: "Outro" };
const tagOptions = ["Landing page", "Identidade visual", "Social media", "E-commerce", "App", "Automação", "SEO", "Copywriting", "UI/UX", "Performance", "Manutenção", "Consultoria"];
const materialTabLabels: Record<"file" | "link" | "note", string> = { file: "Arquivos", link: "Links", note: "Anotações" };

type ModalName = "edit" | "reminder" | "budget" | "scope" | "material" | "payment" | "reminders" | null;

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "PR";
}

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(`${value}T12:00:00Z`)) : "Sem prazo";
}

function formatShortDate(value: string) {
  return shortDateFormatter.format(new Date(`${value}T12:00:00Z`));
}

function formatDateTime(value: string) {
  return `${shortDateFormatter.format(new Date(value))} às ${timeFormatter.format(new Date(value))}`;
}

function getDaysLeft(deadline: string | null) {
  if (!deadline) return null;
  const today = new Date();
  const target = new Date(`${deadline}T12:00:00Z`);
  const diff = Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Em 1 dia";
  if (diff < 0) return `${Math.abs(diff)} dias atrasado`;
  return `Em ${diff} dias`;
}

function isPersistedId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const amount = Number(digits) / 100;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
}

function CurrencyInput({ name, defaultValue = 0, required = false }: { name: string; defaultValue?: number; required?: boolean }) {
  const [value, setValue] = useState(() => defaultValue > 0 ? currencyFormatter.format(defaultValue) : "");

  return (
    <input
      name={name}
      inputMode="numeric"
      value={value}
      required={required}
      placeholder="R$ 0,00"
      onChange={(event) => setValue(formatCurrencyInput(event.target.value))}
    />
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

function getShortUrl(value: string | null) {
  if (!value) return "Link salvo";
  try {
    const url = new URL(value);
    const path = url.pathname.replace(/\/$/, "");
    const text = `${url.hostname}${path && path !== "/" ? path : ""}`;
    return text.length > 28 ? `${text.slice(0, 25)}...` : text;
  } catch {
    return value.length > 28 ? `${value.slice(0, 25)}...` : value;
  }
}

function getNotePreview(value: string | null) {
  if (!value) return "Sem conteúdo na anotação.";
  return value.length > 42 ? `${value.slice(0, 39)}...` : value;
}

function isImageMaterial(material: ProjectDetailData["materials"][number]) {
  return material.mimeType?.startsWith("image/") && Boolean(material.fileUrl);
}

function ProjectAvatar({ project }: { project: ProjectDetailData }) {
  return <span className={`project-detail-avatar ${project.client.logoUrl ? "has-image" : ""}`} style={project.client.logoUrl ? { backgroundImage: `url(${project.client.logoUrl})` } : undefined}>{!project.client.logoUrl && getInitials(project.client.name)}</span>;
}

function SectionCard({ number, title, icon: Icon, children, action }: { number: number; title: string; icon: typeof BriefcaseBusiness; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <article className="project-detail-card">
      <header>
        <div><Icon size={18} /><h2>{number}. {title}</h2></div>
        {action}
      </header>
      {children}
    </article>
  );
}

function ActionModal({ title, eyebrow, children, onClose }: { title: string; eyebrow?: string; children: React.ReactNode; onClose: () => void }) {
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

  if (typeof document === "undefined") return null;

  return createPortal((
    <div className="project-detail-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="project-detail-modal" role="dialog" aria-modal="true" aria-labelledby="project-detail-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="project-detail-modal-close" type="button" onClick={onClose} aria-label="Fechar modal"><X size={22} /></button>
        {eyebrow && <span className="project-detail-modal-eyebrow">{eyebrow}</span>}
        <h2 id="project-detail-modal-title">{title}</h2>
        {children}
      </div>
    </div>
  ), document.body);
}

function MoreActionsMenu({ anchor, onClose, onEdit, onArchive, onDelete }: { anchor: { top: number; right: number }; onClose: () => void; onEdit: () => void; onArchive: () => void; onDelete: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal((
    <>
      <button type="button" className="project-detail-menu-dismiss" aria-label="Fechar menu" onClick={onClose} />
      <div className="project-detail-more-menu" style={{ top: anchor.top, right: anchor.right }} role="menu">
        <button type="button" role="menuitem" onClick={onEdit}><Pencil size={16} /> Editar projeto</button>
        <button type="button" role="menuitem" onClick={onArchive}><Trash2 size={16} /> Arquivar projeto</button>
        <button type="button" role="menuitem" className="danger" onClick={onDelete}><Trash2 size={16} /> Excluir definitivamente</button>
      </div>
    </>
  ), document.body);
}

export function ProjectDetailSection({ project }: { project: ProjectDetailData }) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalName>(null);
  const [moreMenu, setMoreMenu] = useState<{ top: number; right: number } | null>(null);
  const [editingScopeItem, setEditingScopeItem] = useState<ProjectDetailData["scopeItems"][number] | null>(null);
  const [selectedNote, setSelectedNote] = useState<ProjectDetailData["materials"][number] | null>(null);
  const [activeMaterialTab, setActiveMaterialTab] = useState<"file" | "link" | "note">("file");
  const [isPending, startTransition] = useTransition();
  const budget = project.budget;
  const hasOnlySuggestedScope = project.scopeItems.some((item) => !isPersistedId(item.id));
  const completedScope = project.scopeItems.filter((item) => item.completedAt).length;
  const scopeProgress = project.scopeItems.length > 0 ? Math.round((completedScope / project.scopeItems.length) * 100) : project.progress;
  const totalPaid = project.payments.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + payment.amount, 0);
  const paymentTotal = project.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const filteredMaterials = project.materials.filter((material) => material.kind === activeMaterialTab);

  function runAction(task: () => Promise<DetailActionState>, successTitle: string) {
    startTransition(async () => {
      const result = await task();
      showToast({ type: result.success ? "success" : "error", title: result.success ? successTitle : "Ação não concluída", description: result.message });
      if (result.success) {
        setModal(null);
        router.refresh();
      }
    });
  }

  function submitWith(action: (state: DetailActionState, formData: FormData) => Promise<DetailActionState>, title: string) {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      runAction(() => action(initialState, formData), title);
    };
  }

  function handleEditProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateProjectAction(formData);
      showToast({ type: result.success ? "success" : "error", title: result.success ? "Projeto atualizado" : "Projeto não atualizado", description: result.message });
      if (result.success) {
        setModal(null);
        router.refresh();
      }
    });
  }

  function sendMessage() {
    const text = encodeURIComponent(`Olá, ${project.client.name}. Quero falar sobre o projeto ${project.name}.`);
    const phone = project.client.whatsapp?.replace(/\D/g, "") || project.client.phone?.replace(/\D/g, "");
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${text}`, "_blank", "noopener,noreferrer");
      return;
    }
    if (project.client.email) {
      window.location.href = `mailto:${project.client.email}?subject=${encodeURIComponent(project.name)}&body=${text}`;
      return;
    }
    showToast({ type: "error", title: "Sem contato", description: "Cadastre WhatsApp, telefone ou e-mail do cliente." });
  }

  async function copyProjectLink() {
    await navigator.clipboard.writeText(window.location.href);
    showToast({ type: "success", title: "Link copiado", description: "O link do projeto foi copiado." });
  }

  async function copyMaterialLink(url: string | null) {
    if (!url) {
      showToast({ type: "error", title: "Link indisponível", description: "Este material não possui um link cadastrado." });
      return;
    }
    await navigator.clipboard.writeText(url);
    showToast({ type: "success", title: "Link copiado", description: "O link do material foi copiado." });
  }

  async function shareProject() {
    const shareData = { title: project.name, text: `Projeto ${project.name} no Escoply`, url: window.location.href };
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }
    await copyProjectLink();
  }

  function exportSummary() {
    const companyName = project.owner.companyName || project.owner.displayName;
    const logoBlock = project.owner.avatarUrl
      ? `<img src="${project.owner.avatarUrl}" alt="${escapeHtml(companyName)}" />`
      : `<span>${escapeHtml(getInitials(companyName))}</span>`;
    const tags = project.tags.length ? project.tags.map((tag) => `<em>${escapeHtml(tag)}</em>`).join("") : "<em>Sem tags</em>";
    const scopeItems = project.scopeItems.map((item) => `<li><span>${item.completedAt ? "✓" : "○"}</span>${escapeHtml(item.title)}<strong>${item.completedAt ? "Concluído" : "Pendente"}</strong></li>`).join("");
    const materials = project.materials.map((material) => `<li><span>${escapeHtml(materialTabLabels[material.kind as "file" | "link" | "note"] ?? "Material")}</span>${escapeHtml(material.title)}</li>`).join("");
    const payments = project.payments.map((payment) => `<tr><td>${escapeHtml(payment.description)}</td><td>${escapeHtml(paymentTypeLabels[payment.type] ?? "Recebimento")}</td><td>${formatShortDate(payment.dueDate)}</td><td>${currencyFormatter.format(payment.amount)}</td><td>${escapeHtml(paymentLabels[payment.status] ?? payment.status)}</td></tr>`).join("");
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Resumo - ${escapeHtml(project.name)}</title><style>
      @page{size:A4;margin:18mm}*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;color:#071542;background:#f8fafc}.page{min-height:100vh;padding:34px;background:radial-gradient(circle at 100% 0,rgba(139,92,246,.14),transparent 30%),#fff;border:1px solid #e2e8f0;border-radius:24px}.brand{display:flex;align-items:center;gap:14px}.brand img,.brand span{display:grid;width:54px;height:54px;place-items:center;border-radius:16px;color:#fff;background:linear-gradient(135deg,#071e63,#7c3aed);object-fit:cover;font-weight:900}.brand h1{margin:0;font-size:24px}.brand p{margin:4px 0 0;color:#64748b}.hero{margin-top:34px;padding:28px;border-radius:22px;color:#fff;background:linear-gradient(135deg,#071e63,#6d28d9)}.hero small{letter-spacing:.14em;text-transform:uppercase;font-weight:800;color:#c4b5fd}.hero h2{margin:10px 0 8px;font-size:34px;line-height:1.05}.hero p{margin:0;color:#e0e7ff}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:18px}.metric,.card{padding:16px;border:1px solid #e2e8f0;border-radius:18px;background:#fff}.metric span,.card>span{display:block;color:#64748b;font-size:12px;font-weight:700}.metric strong{display:block;margin-top:8px;font-size:18px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px}.card.full{grid-column:1/-1}.card h3{margin:0 0 10px;font-size:18px}.card p{margin:8px 0 0;color:#334155;line-height:1.65}.tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.tags em{padding:7px 10px;border-radius:999px;color:#6d28d9;background:#f5f3ff;font-size:12px;font-style:normal;font-weight:800}ul{display:grid;gap:8px;margin:10px 0 0;padding:0;list-style:none}li{display:flex;align-items:center;justify-content:space-between;gap:12px;color:#334155;font-size:13px}li span{color:#6d28d9;font-weight:900}li strong{color:#64748b;font-size:12px}table{width:100%;margin-top:10px;border-collapse:collapse;font-size:13px}th,td{padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:left}th{color:#64748b;font-size:12px}.footer{display:flex;justify-content:space-between;gap:18px;margin-top:32px;padding-top:18px;border-top:1px solid #e2e8f0;color:#64748b;font-size:13px}@media print{body{background:#fff}.page{border:0;border-radius:0;padding:0}.no-print{display:none}}</style></head><body><main class="page"><section class="brand">${logoBlock}<div><h1>${escapeHtml(companyName)}</h1><p>Resumo de projeto</p></div></section><section class="hero"><small>Relatório do projeto</small><h2>${escapeHtml(project.name)}</h2><p>Cliente: ${escapeHtml(project.client.name)} · ${escapeHtml(workTypeLabels[project.workType] ?? "Projeto freelancer")}</p></section><section class="metrics"><article class="metric"><span>Status</span><strong>${escapeHtml(statusLabels[project.status] ?? project.status)}</strong></article><article class="metric"><span>Prazo</span><strong>${escapeHtml(formatDate(project.deadline))}</strong></article><article class="metric"><span>Progresso</span><strong>${project.progress}%</strong></article><article class="metric"><span>Valor</span><strong>${currencyFormatter.format(project.estimatedValue)}</strong></article></section><section class="grid"><article class="card full"><span>Resumo</span><p>${escapeHtml(project.description || "Sem resumo cadastrado.")}</p><div class="tags">${tags}</div></article><article class="card"><h3>Escopo</h3><ul>${scopeItems || "<li>Sem etapas cadastradas.</li>"}</ul></article><article class="card"><h3>Materiais</h3><ul>${materials || "<li>Sem materiais cadastrados.</li>"}</ul></article><article class="card full"><h3>Recebimentos</h3><table><thead><tr><th>Descrição</th><th>Data</th><th>Valor</th><th>Status</th></tr></thead><tbody>${payments || "<tr><td colspan='4'>Nenhum recebimento cadastrado.</td></tr>"}</tbody></table></article></section><section class="footer"><span>Gerado em ${new Date().toLocaleDateString("pt-BR")}</span><span>${escapeHtml(project.client.email || project.client.companyName || project.client.name)}</span></section><p class="no-print" style="margin-top:24px;color:#64748b">Use o diálogo aberto para salvar como PDF.</p></main></body></html>`;
    const existingFrame = document.getElementById("escoply-summary-print-frame");
    existingFrame?.remove();

    const frame = document.createElement("iframe");
    frame.id = "escoply-summary-print-frame";
    frame.title = "Resumo do projeto para impressão";
    frame.setAttribute("aria-hidden", "true");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    frame.style.opacity = "0";
    document.body.appendChild(frame);

    const frameDocument = frame.contentDocument;
    const frameWindow = frame.contentWindow;
    if (!frameDocument || !frameWindow) {
      frame.remove();
      showToast({ type: "error", title: "PDF não gerado", description: "Não foi possível preparar o resumo para impressão." });
      return;
    }

    frameDocument.open();
    frameDocument.write(html);
    frameDocument.close();

    const printSummary = () => {
      frameWindow.focus();
      frameWindow.print();
      window.setTimeout(() => frame.remove(), 1500);
    };

    if (frameDocument.readyState === "complete") {
      window.setTimeout(printSummary, 250);
      return;
    }
    frame.addEventListener("load", () => window.setTimeout(printSummary, 250), { once: true });
  }

  function archiveProject() {
    if (!window.confirm("Arquivar este projeto? Ele sairá dos indicadores principais.")) return;
    runAction(() => archiveProjectAction(project.id), "Projeto arquivado");
  }

  function deleteProject() {
    if (!window.confirm("Excluir este projeto definitivamente? Essa ação não pode ser desfeita.")) return;
    startTransition(() => { void deleteProjectAndRedirectAction(project.id); });
  }

  function exportBudgetPdf() {
    const companyName = project.owner.companyName || project.owner.displayName;
    const budgetAmount = budget?.amount ?? project.estimatedValue;
    const condition = budget?.paymentCondition || (project.payments.length > 1 ? "Parcelado" : "À combinar");
    const validUntil = budget?.validUntil ? formatDate(budget.validUntil) : "Sem validade definida";
    const logoBlock = project.owner.avatarUrl
      ? `<img src="${project.owner.avatarUrl}" alt="${escapeHtml(companyName)}" />`
      : `<span>${escapeHtml(getInitials(companyName))}</span>`;
    const tags = project.tags.length ? project.tags.map((tag) => `<em>${escapeHtml(tag)}</em>`).join("") : "<em>Projeto freelancer</em>";
    const scope = project.scopeItems.map((item) => `<li>${escapeHtml(item.title)}</li>`).join("");
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Orçamento - ${escapeHtml(project.name)}</title><style>
      @page{size:A4;margin:18mm}*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;color:#071542;background:#f8fafc}.page{min-height:100vh;padding:34px;background:radial-gradient(circle at 100% 0,rgba(139,92,246,.14),transparent 28%),#fff;border:1px solid #e2e8f0;border-radius:24px}.brand{display:flex;align-items:center;gap:14px}.brand img,.brand span{display:grid;width:54px;height:54px;place-items:center;border-radius:16px;color:#fff;background:linear-gradient(135deg,#071e63,#7c3aed);object-fit:cover;font-weight:900}.brand h1{margin:0;font-size:24px}.brand p{margin:4px 0 0;color:#64748b}.hero{margin-top:40px;padding:28px;border-radius:22px;color:#fff;background:linear-gradient(135deg,#071e63,#6d28d9)}.hero small{letter-spacing:.14em;text-transform:uppercase;font-weight:800;color:#c4b5fd}.hero h2{margin:10px 0 8px;font-size:34px;line-height:1.05}.hero p{margin:0;color:#e0e7ff}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:22px}.card{padding:18px;border:1px solid #e2e8f0;border-radius:18px;background:#fff}.card span{display:block;color:#64748b;font-size:13px}.card strong{display:block;margin-top:7px;font-size:20px}.full{grid-column:1/-1}.tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.tags em{padding:7px 10px;border-radius:999px;color:#6d28d9;background:#f5f3ff;font-size:12px;font-style:normal;font-weight:800}ul{margin:10px 0 0;padding-left:20px;color:#334155;line-height:1.7}.footer{display:flex;justify-content:space-between;gap:18px;margin-top:32px;padding-top:18px;border-top:1px solid #e2e8f0;color:#64748b;font-size:13px}.total strong{font-size:32px;color:#071542}@media print{body{background:#fff}.page{border:0;border-radius:0;padding:0}.no-print{display:none}}</style></head><body><main class="page"><section class="brand">${logoBlock}<div><h1>${escapeHtml(companyName)}</h1><p>Orçamento profissional</p></div></section><section class="hero"><small>Proposta comercial</small><h2>${escapeHtml(project.name)}</h2><p>Cliente: ${escapeHtml(project.client.name)}</p></section><section class="grid"><article class="card total"><span>Valor total</span><strong>${currencyFormatter.format(budgetAmount)}</strong></article><article class="card"><span>Condição de pagamento</span><strong>${escapeHtml(condition)}</strong></article><article class="card"><span>Validade da proposta</span><strong>${escapeHtml(validUntil)}</strong></article><article class="card"><span>Status</span><strong>${escapeHtml(budget ? budgetLabels[budget.status] ?? budget.status : "Não criado")}</strong></article><article class="card full"><span>Resumo</span><p>${escapeHtml(project.description || "Serviços conforme escopo alinhado entre as partes.")}</p><div class="tags">${tags}</div></article><article class="card full"><span>Escopo previsto</span><ul>${scope || "<li>Escopo a detalhar.</li>"}</ul></article></section><section class="footer"><span>Gerado em ${new Date().toLocaleDateString("pt-BR")}</span><span>${escapeHtml(project.client.email || project.client.companyName || project.client.name)}</span></section><p class="no-print" style="margin-top:24px;color:#64748b">Use Ctrl/Cmd + P ou o diálogo aberto para salvar como PDF.</p></main></body></html>`;
    const existingFrame = document.getElementById("escoply-budget-print-frame");
    existingFrame?.remove();

    const frame = document.createElement("iframe");
    frame.id = "escoply-budget-print-frame";
    frame.title = "Orçamento para impressão";
    frame.setAttribute("aria-hidden", "true");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    frame.style.opacity = "0";
    document.body.appendChild(frame);

    const frameDocument = frame.contentDocument;
    const frameWindow = frame.contentWindow;
    if (!frameDocument || !frameWindow) {
      frame.remove();
      showToast({ type: "error", title: "PDF não gerado", description: "Não foi possível preparar o documento para impressão." });
      return;
    }

    frameDocument.open();
    frameDocument.write(html);
    frameDocument.close();

    const printBudget = () => {
      frameWindow.focus();
      frameWindow.print();
      window.setTimeout(() => frame.remove(), 1500);
    };

    if (frameDocument.readyState === "complete") {
      window.setTimeout(printBudget, 250);
      return;
    }
    frame.addEventListener("load", () => window.setTimeout(printBudget, 250), { once: true });
  }

  return (
    <div className="project-detail-page">
      <div className="project-detail-breadcrumb"><Link href="/dashboard/projetos">Projetos</Link><span>›</span><strong>{project.name}</strong></div>

      <div className="project-detail-heading">
        <div>
          <h1><BriefcaseBusiness size={23} />{project.name}</h1>
          <p>Cliente: <Link href={`/dashboard/clientes?cliente=${project.client.id}`}>{project.client.name}</Link></p>
        </div>
        <div className="project-detail-heading-actions">
          <button type="button" onClick={() => setModal("edit")}><Pencil size={16} /> Editar projeto</button>
          <button type="button" onClick={() => setModal("reminder")}><Plus size={16} /> Novo lembrete</button>
          <button type="button" aria-label="Mais ações" onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setMoreMenu({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
          }}><MoreVertical size={18} /></button>
        </div>
      </div>

      <section className="project-detail-summary">
        <div><span>Status atual</span><strong className={`project-detail-status ${statusClasses[project.status]}`}>{statusLabels[project.status] ?? project.status}</strong></div>
        <div><span>Prazo final</span><strong><CalendarDays size={17} />{formatDate(project.deadline)}</strong><small>{getDaysLeft(project.deadline) ?? "Sem data definida"}</small></div>
        <div><span>Valor estimado</span><strong>{currencyFormatter.format(project.estimatedValue)}</strong></div>
        <div><span>Criado em</span><strong>{formatDate(project.createdAt.slice(0, 10))}</strong></div>
        <div><span>Responsável</span><strong><ProjectAvatar project={project} />{project.client.name}</strong></div>
      </section>

      <div className="project-detail-layout">
        <main className="project-detail-main">
          <div className="project-detail-grid top">
            <SectionCard number={1} title="Resumo do projeto" icon={ClipboardList} action={<button type="button" onClick={() => setModal("edit")}>Editar</button>}>
              <p className="project-detail-description">{project.description || "Este projeto ainda não possui um resumo detalhado cadastrado."}</p>
              <dl className="project-detail-definition">
                <div><dt>Tipo de trabalho</dt><dd>{workTypeLabels[project.workType] ?? "Projeto freelancer"}</dd></div>
                <div><dt>Categoria</dt><dd>{project.client.companyName || "Serviço"}</dd></div>
                <div><dt>Prioridade</dt><dd><span className="project-detail-chip purple">{project.status === "delayed" ? "Alta" : "Normal"}</span></dd></div>
                <div><dt>Tags</dt><dd>{project.tags.length ? project.tags.map((tag) => <span className="project-detail-chip" key={tag}>{tag}</span>) : <span className="project-detail-chip">Sem tags</span>}</dd></div>
                <div><dt>Observações</dt><dd>{project.client.notes || "—"}</dd></div>
              </dl>
            </SectionCard>

            <SectionCard number={2} title="Escopo" icon={Sparkles} action={<div className="project-detail-card-actions">{hasOnlySuggestedScope && <button type="button" onClick={() => runAction(() => seedScopeItemsAction(project.id, project.scopeItems.map((item) => item.title)), "Escopo salvo")}>Salvar sugestões</button>}<button type="button" onClick={() => setModal("scope")}><Plus size={14} /> Etapa</button></div>}>
              <div className="project-detail-progress"><i style={{ width: `${scopeProgress}%` }} /></div>
              <div className="project-detail-checklist">
                {project.scopeItems.map((item) => (
                  <div key={item.id} className="project-detail-scope-row">
                    <button type="button" disabled={!isPersistedId(item.id) || isPending} onClick={() => runAction(() => toggleScopeItemAction(item.id, project.id), "Escopo atualizado")}>
                      <CheckCircle2 className={item.completedAt ? "done" : ""} size={17} /><span>{item.title}</span><em>{item.completedAt ? "Concluído" : isPersistedId(item.id) ? "Pendente" : "Sugestão"}</em>
                    </button>
                    {isPersistedId(item.id) && <span className="project-detail-scope-actions"><button type="button" aria-label="Editar etapa" onClick={() => setEditingScopeItem(item)}><Pencil size={14} /></button><button type="button" aria-label="Excluir etapa" onClick={() => runAction(() => deleteScopeItemAction(item.id, project.id), "Etapa excluída")}><Trash2 size={14} /></button></span>}
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard number={3} title="Orçamento" icon={FileText} action={<button type="button" onClick={() => setModal("budget")}>Editar</button>}>
              <div className="project-detail-budget">
                <div><span>Status</span><em className={budget?.status ?? "draft"}>{budget ? budgetLabels[budget.status] ?? budget.status : "Não criado"}</em></div>
                <div><span>Valor total</span><strong>{currencyFormatter.format(budget?.amount ?? project.estimatedValue)}</strong></div>
                <div><span>Condição de pagamento</span><strong>{budget?.paymentCondition || (project.payments.length > 1 ? "Parcelado" : "À combinar")}</strong></div>
                <div><span>Validade da proposta</span><strong>{budget?.validUntil ? formatDate(budget.validUntil) : "Sem validade"}</strong></div>
                <button type="button" onClick={exportBudgetPdf}>Exportar PDF</button>
              </div>
            </SectionCard>
          </div>

          <div className="project-detail-grid middle">
            <SectionCard number={4} title="Materiais" icon={FolderOpen} action={<button type="button" onClick={() => setModal("material")}><Plus size={14} /> Material</button>}>
              <div className="project-detail-tabs" role="tablist" aria-label="Tipos de materiais">
                {Object.entries(materialTabLabels).map(([kind, label]) => (
                  <button
                    type="button"
                    key={kind}
                    role="tab"
                    aria-selected={activeMaterialTab === kind}
                    className={activeMaterialTab === kind ? "active" : ""}
                    onClick={() => setActiveMaterialTab(kind as "file" | "link" | "note")}
                  >
                    {label}
                    <span>{project.materials.filter((material) => material.kind === kind).length}</span>
                  </button>
                ))}
              </div>
              {filteredMaterials.length === 0 ? (
                <div className="project-detail-material-empty">
                  <FolderOpen size={26} />
                  <strong>Nenhum {materialTabLabels[activeMaterialTab].toLowerCase()} cadastrado</strong>
                  <p>{activeMaterialTab === "file" ? "Adicione PDFs, imagens ou arquivos importantes do projeto." : activeMaterialTab === "link" ? "Salve links de Drive, Figma, referências, briefing ou documentos externos." : "Registre observações soltas, decisões e contexto importante do projeto."}</p>
                  <button type="button" onClick={() => setModal("material")}><Plus size={14} /> Adicionar {materialTabLabels[activeMaterialTab].slice(0, -1).toLowerCase()}</button>
                </div>
              ) : (
                <div className="project-detail-material-list">
                  {filteredMaterials.map((material) => (
                    <div key={material.id} className={`project-detail-material-item is-${material.kind}`}>
                      {material.kind === "file" && (
                        <>
                          <span className={`project-detail-material-thumb ${isImageMaterial(material) ? "has-image" : ""}`} style={isImageMaterial(material) ? { backgroundImage: `url(${material.fileUrl})` } : undefined}>
                            {!isImageMaterial(material) && (material.mimeType?.includes("zip") ? <FileArchive size={20} /> : material.mimeType?.startsWith("image/") ? <ImageIcon size={20} /> : <FileText size={20} />)}
                          </span>
                          <span><strong>{material.title}</strong><small>{material.mimeType ?? "Arquivo"}{material.fileSize ? ` · ${Math.round(material.fileSize / 1024)} KB` : ""}</small></span>
                          {material.fileUrl && <a href={material.fileUrl} download target="_blank" rel="noreferrer" aria-label="Baixar arquivo"><Download size={16} /></a>}
                        </>
                      )}
                      {material.kind === "link" && (
                        <>
                          <span className="project-detail-material-thumb"><Link2 size={20} /></span>
                          <span><strong>{material.title}</strong><small>{getShortUrl(material.url)}</small></span>
                          <button type="button" onClick={() => { void copyMaterialLink(material.url); }} aria-label="Copiar link"><Copy size={16} /></button>
                          {material.url && <a href={material.url} target="_blank" rel="noreferrer" aria-label="Abrir link"><ExternalLink size={16} /></a>}
                        </>
                      )}
                      {material.kind === "note" && (
                        <>
                          <span className="project-detail-material-thumb"><FileText size={20} /></span>
                          <span><strong>{material.title}</strong><small>{getNotePreview(material.note)}</small></span>
                          <button type="button" onClick={() => setSelectedNote(material)} aria-label="Abrir anotação"><ExternalLink size={16} /></button>
                        </>
                      )}
                      <button type="button" onClick={() => runAction(() => deleteMaterialAction(material.id, project.id), "Material excluído")}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard number={5} title="Lembretes do projeto" icon={Bell} action={<button type="button" onClick={() => setModal("reminder")}><Plus size={14} /> Novo</button>}>
              <div className="project-detail-reminders">
                {project.reminders.length === 0 && <p>Nenhum lembrete futuro para este projeto.</p>}
                {project.reminders.map((reminder) => <div key={reminder.id}><time>{timeFormatter.format(new Date(reminder.scheduledAt))}</time><span><strong>{reminder.title}</strong><small>{formatDateTime(reminder.scheduledAt)}</small></span><em>{reminderLabels[reminder.kind] ?? "Lembrete"}</em></div>)}
              </div>
            </SectionCard>
          </div>

          <SectionCard number={6} title="Pagamentos / Recebimentos" icon={DollarSign} action={<button type="button" onClick={() => setModal("payment")}><Plus size={14} /> Recebimento</button>}>
            <div className="project-detail-payments">
              <div><span>Descrição</span><span>Tipo</span><span>Data</span><span>Valor</span><span>Status</span><span>Comprovante</span><span>Recebido em</span><span>Ação</span></div>
              {project.payments.length === 0 && <p>Nenhum pagamento cadastrado para este projeto.</p>}
              {project.payments.map((payment) => <div key={payment.id}><strong>{payment.description}</strong><span className={`project-detail-payment-type is-${payment.type}`}>{paymentTypeLabels[payment.type]}</span><time>{formatShortDate(payment.dueDate)}</time><span>{currencyFormatter.format(payment.amount)}</span><em className={payment.status}>{paymentLabels[payment.status] ?? payment.status}</em><span>{payment.receiptUrl ? <a className="project-detail-receipt-link" href={payment.receiptUrl} target="_blank" rel="noreferrer"><Download size={14} /> Recibo</a> : "—"}</span><time>{payment.paidAt ? shortDateFormatter.format(new Date(payment.paidAt)) : "—"}</time><button type="button" disabled={payment.status === "paid"} onClick={() => runAction(() => markPaymentPaidAction(payment.id, project.id), "Recebimento atualizado")}>Marcar pago</button></div>)}
              {(project.payments.length > 0 || project.estimatedValue > 0) && <footer><span>Total recebido</span><strong>{currencyFormatter.format(totalPaid)}</strong><span>Total do projeto</span><strong>{currencyFormatter.format(paymentTotal || project.estimatedValue)}</strong></footer>}
            </div>
          </SectionCard>
        </main>

        <aside className="project-detail-aside">
          <article className="project-detail-side-card">
            <header><UserRound size={18} /><strong>Contato do projeto</strong></header>
            <div className="project-detail-contact-profile"><ProjectAvatar project={project} /><span><strong>{project.client.name}</strong><small>{project.client.companyName || "Cliente"}</small></span></div>
            <div className="project-detail-contact-list">
              {project.client.email && <a href={`mailto:${project.client.email}`}><Mail size={16} />{project.client.email}</a>}
              {project.client.phone && <a href={`tel:${project.client.phone}`}><Phone size={16} />{project.client.phone}</a>}
              {project.client.whatsapp && <a href={`https://wa.me/${project.client.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageSquare size={16} />{project.client.whatsapp}</a>}
              {!project.client.email && !project.client.phone && !project.client.whatsapp && <p>Nenhum contato cadastrado.</p>}
            </div>
          </article>

          <article className="project-detail-side-card">
            <header><CalendarDays size={18} /><strong>Próximos prazos</strong></header>
            <div className="project-detail-side-deadlines">
              <div><strong>Prazo final</strong><span>{formatDate(project.deadline)}</span><em>{getDaysLeft(project.deadline) ?? "Sem data"}</em></div>
              {project.reminders.slice(0, 2).map((reminder) => <div key={reminder.id}><strong>{reminder.title}</strong><span>{formatDateTime(reminder.scheduledAt)}</span><em>{reminderLabels[reminder.kind] ?? "Lembrete"}</em></div>)}
            </div>
          </article>

          <article className="project-detail-side-card">
            <header><Sparkles size={18} /><strong>Ações rápidas</strong></header>
            <div className="project-detail-quick-actions">
              <button type="button" onClick={sendMessage}><Send size={16} /> Enviar mensagem</button>
              <button type="button" onClick={() => { void shareProject(); }}><Share2 size={16} /> Compartilhar projeto</button>
              <button type="button" onClick={() => { void copyProjectLink(); }}><Link2 size={16} /> Copiar link</button>
              <button type="button" onClick={exportSummary}><Download size={16} /> Exportar resumo</button>
              <button type="button" className="danger" onClick={archiveProject}><Trash2 size={16} /> Arquivar projeto</button>
            </div>
          </article>
        </aside>
      </div>

      {modal === "edit" && (
        <ActionModal title="Editar projeto" eyebrow="Projeto" onClose={() => setModal(null)}>
          <form className="project-detail-form" onSubmit={handleEditProject}>
            <input type="hidden" name="project_id" value={project.id} />
            <input type="hidden" name="client_id" value={project.client.id} />
            <label>Nome do projeto<input name="name" defaultValue={project.name} required minLength={2} /></label>
            <label>Resumo<textarea name="description" defaultValue={project.description ?? ""} rows={4} /></label>
            <div className="project-detail-form-grid"><label>Status<select name="status" defaultValue={project.status}><option value="in_progress">Em andamento</option><option value="review">Em revisão</option><option value="completed">Concluído</option><option value="delayed">Atrasado</option><option value="archived">Arquivado</option></select></label><label>Tipo de trabalho<select name="work_type" defaultValue={project.workType}>{Object.entries(workTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
            <div className="project-detail-form-grid"><label>Prazo<input name="deadline" type="date" defaultValue={project.deadline ?? ""} /></label><label>Valor estimado<CurrencyInput name="estimated_value" defaultValue={project.estimatedValue} /></label></div>
            <fieldset className="project-detail-tag-picker">
              <legend>Tags do projeto</legend>
              <div>{tagOptions.map((tag) => <label key={tag}><input type="checkbox" name="tags" value={tag} defaultChecked={project.tags.includes(tag)} /><span>{tag}</span></label>)}</div>
              <label>Tags personalizadas<input name="tags" defaultValue={project.tags.filter((tag) => !tagOptions.includes(tag)).join(", ")} placeholder="Ex.: Urgente, Contrato anual" /></label>
            </fieldset>
            <label>Progresso<input name="progress" type="number" min={0} max={100} defaultValue={project.progress} /></label>
            <button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar alterações"}</button>
          </form>
        </ActionModal>
      )}

      {modal === "reminder" && (
        <ActionModal title="Novo lembrete" eyebrow="Agenda" onClose={() => setModal(null)}>
          <form className="project-detail-form" onSubmit={submitWith(createReminderAction, "Lembrete criado")}>
            <input type="hidden" name="project_id" value={project.id} />
            <label>Título<input name="title" placeholder="Ex.: Aprovação final" required minLength={2} /></label>
            <div className="project-detail-form-grid"><label>Tipo<select name="kind" defaultValue="action"><option value="meeting">Reunião</option><option value="action">Ação</option><option value="review">Revisão</option><option value="delivery">Entrega</option><option value="follow_up">Follow-up</option><option value="charge">Cobrança</option><option value="other">Outro</option></select></label><label>Data e horário<input name="scheduled_at" type="datetime-local" required /></label></div>
            <button type="submit" disabled={isPending}>{isPending ? "Criando..." : "Criar lembrete"}</button>
          </form>
        </ActionModal>
      )}

      {modal === "budget" && (
        <ActionModal title="Editar orçamento" eyebrow="Financeiro" onClose={() => setModal(null)}>
          <form className="project-detail-form" onSubmit={submitWith(saveBudgetAction, "Orçamento salvo")}>
            <input type="hidden" name="project_id" value={project.id} />
            <input type="hidden" name="budget_id" value={budget?.id ?? ""} />
            <label>Valor<CurrencyInput name="amount" defaultValue={budget?.amount ?? project.estimatedValue} required /></label>
            <label>Condição de pagamento<input name="payment_condition" defaultValue={budget?.paymentCondition ?? ""} placeholder="Ex.: 50% na aprovação e 50% na entrega" /></label>
            <div className="project-detail-form-grid"><label>Status<select name="status" defaultValue={budget?.status ?? "draft"}><option value="draft">Rascunho</option><option value="sent">Enviado</option><option value="approved">Aprovado</option><option value="rejected">Recusado</option><option value="expired">Expirado</option></select></label><label>Validade<input name="valid_until" type="date" defaultValue={budget?.validUntil ?? ""} /></label></div>
            <button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar orçamento"}</button>
          </form>
        </ActionModal>
      )}

      {modal === "scope" && (
        <ActionModal title="Adicionar etapa ao escopo" eyebrow="Escopo" onClose={() => setModal(null)}>
          <form className="project-detail-form" onSubmit={submitWith(createScopeItemAction, "Etapa adicionada")}>
            <input type="hidden" name="project_id" value={project.id} />
            <label>Etapa<input name="title" placeholder="Ex.: Aprovação do wireframe" required minLength={2} /></label>
            <button type="submit" disabled={isPending}>{isPending ? "Adicionando..." : "Adicionar etapa"}</button>
          </form>
        </ActionModal>
      )}

      {editingScopeItem && (
        <ActionModal title="Editar etapa do escopo" eyebrow="Escopo" onClose={() => setEditingScopeItem(null)}>
          <form className="project-detail-form" onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            runAction(() => updateScopeItemAction(initialState, formData), "Etapa atualizada");
            setEditingScopeItem(null);
          }}>
            <input type="hidden" name="project_id" value={project.id} />
            <input type="hidden" name="scope_item_id" value={editingScopeItem.id} />
            <label>Etapa<input name="title" defaultValue={editingScopeItem.title} required minLength={2} /></label>
            <button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar etapa"}</button>
          </form>
        </ActionModal>
      )}

      {modal === "material" && (
        <ActionModal title="Adicionar material" eyebrow="Materiais" onClose={() => setModal(null)}>
          <form className="project-detail-form" onSubmit={submitWith(createMaterialAction, "Material salvo")}>
            <input type="hidden" name="project_id" value={project.id} />
            <label>Tipo<select name="kind" value={activeMaterialTab} onChange={(event) => setActiveMaterialTab(event.target.value as "file" | "link" | "note")}><option value="file">Arquivo</option><option value="link">Link</option><option value="note">Anotação</option></select></label>
            <label>Título<input name="title" placeholder="Ex.: Briefing inicial" required minLength={2} /></label>
            {activeMaterialTab === "file" && <label>Arquivo<input name="file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp,text/plain,text/csv,.zip,.rar,.doc,.docx,.xls,.xlsx,.ppt,.pptx" required /></label>}
            {activeMaterialTab === "link" && <label>Link<input name="url" type="url" placeholder="https://..." required /></label>}
            {activeMaterialTab === "note" && <label>Anotação<textarea name="note" rows={5} required placeholder="Escreva a anotação completa..." /></label>}
            <button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar material"}</button>
          </form>
        </ActionModal>
      )}

      {modal === "payment" && (
        <ActionModal title="Novo recebimento" eyebrow="Financeiro" onClose={() => setModal(null)}>
          <form className="project-detail-form" onSubmit={submitWith(createPaymentAction, "Recebimento criado")}>
            <input type="hidden" name="project_id" value={project.id} />
            <input type="hidden" name="budget_id" value={budget?.id ?? ""} />
            <label>Descrição<input name="description" placeholder="Ex.: Sinal - 50%" required minLength={2} /></label>
            <div className="project-detail-form-grid"><label>Tipo<select name="payment_type" defaultValue="installment"><option value="deposit">Sinal</option><option value="final_payment">Saldo final</option><option value="installment">Parcela</option><option value="extra">Extra</option></select></label><label>Valor<CurrencyInput name="amount" required /></label></div>
            <label>Data do recebimento<input name="due_date" type="date" required /></label>
            <label>Comprovante de pagamento <small>opcional · PDF, imagem, TXT ou CSV até 10 MB</small><input name="receipt" type="file" accept="application/pdf,image/png,image/jpeg,image/webp,text/plain,text/csv" /></label>
            <button type="submit" disabled={isPending}>{isPending ? "Criando..." : "Criar recebimento"}</button>
          </form>
        </ActionModal>
      )}

      {selectedNote && (
        <ActionModal title={selectedNote.title} eyebrow="Anotação" onClose={() => setSelectedNote(null)}>
          <div className="project-detail-note-modal">
            <p>{selectedNote.note || "Esta anotação não possui conteúdo."}</p>
            <button type="button" onClick={() => setSelectedNote(null)}>Fechar anotação</button>
          </div>
        </ActionModal>
      )}

      {moreMenu && <MoreActionsMenu anchor={moreMenu} onClose={() => setMoreMenu(null)} onEdit={() => { setMoreMenu(null); setModal("edit"); }} onArchive={() => { setMoreMenu(null); archiveProject(); }} onDelete={() => { setMoreMenu(null); deleteProject(); }} />}
    </div>
  );
}
