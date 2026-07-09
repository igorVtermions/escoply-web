"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock3, Globe2, ImagePlus, Mail, MoreHorizontal, Pencil, Phone, Plus, Search, Trash2, UserRound, UsersRound, X } from "lucide-react";
import { createClientAction, deleteClientAction, updateClientAction, type CreateClientState } from "@/app/dashboard/clientes/actions";
import { showToast } from "@/components/ui/toast-provider";
import type { ClientsData, ClientStatus } from "@/lib/clients/data";

type ClientsSectionProps = {
  data: ClientsData;
  filters: { search: string; status: ClientStatus | "all" };
};

const statusLabels: Record<ClientStatus, string> = { active: "Ativo", prospect: "Prospect", inactive: "Inativo" };
const initialCreateClientState: CreateClientState = { success: false, message: "" };
const projectStatusLabels: Record<string, string> = { in_progress: "Em andamento", review: "Em revisão", completed: "Concluído", delayed: "Atrasado", archived: "Arquivado" };
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CL";
}

function getRelativeContact(value: string | null) {
  if (!value) return "Sem contato";
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (days === 0) return "Hoje";
  if (days === 1) return "1 dia atrás";
  return `${days} dias atrás`;
}

function formatBrazilianPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function getWhatsAppUrl(value: string) {
  const digits = value.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("55") && digits.length > 11 ? digits : `55${digits}`}`;
}

function PhoneInput({ name, placeholder, initialValue = "" }: { name: string; placeholder: string; initialValue?: string }) {
  const [value, setValue] = useState(() => formatBrazilianPhone(initialValue));
  return <input name={name} type="tel" inputMode="numeric" autoComplete="tel" maxLength={15} value={value} onChange={(event) => setValue(formatBrazilianPhone(event.target.value))} placeholder={placeholder} />;
}

function ClientLogoInput({ initialUrl = null }: { initialUrl?: string | null }) {
  const [preview, setPreview] = useState(initialUrl);
  return <label className="client-logo-upload"><span className={preview ? "has-image" : ""} style={preview ? { backgroundImage: `url(${preview})` } : undefined}>{!preview && <ImagePlus size={23} />}</span><div><strong>{initialUrl ? "Trocar logo do cliente" : "Adicionar logo do cliente"}</strong><small>Opcional · PNG, JPG ou WebP · até 3 MB</small></div><input name="logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 3 * 1024 * 1024) { event.target.value = ""; showToast({ type: "error", title: "Arquivo muito grande", description: "A logo pode ter no máximo 3 MB." }); return; } const reader = new FileReader(); reader.onload = () => { if (typeof reader.result === "string") setPreview(reader.result); }; reader.readAsDataURL(file); }} /></label>;
}

export function ClientsSection({ data, filters }: ClientsSectionProps) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.search);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editClient, setEditClient] = useState<ClientsData["clients"][number] | null>(null);
  const [deleteClient, setDeleteClient] = useState<ClientsData["clients"][number] | null>(null);
  const [actionMenu, setActionMenu] = useState<{ client: ClientsData["clients"][number]; top: number; right: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  const navigate = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "" || value === "all") params.delete(key);
      else params.set(key, String(value));
    });
    router.replace(`/dashboard/clientes${params.size ? `?${params}` : ""}`);
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate({ busca: search.trim(), pagina: 1, cliente: undefined });
  };

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await createClientAction(initialCreateClientState, formData);
      if (!result.success) {
        showToast({ type: "error", title: "Cadastro não concluído", description: result.message });
        return;
      }

      showToast({ type: "success", title: "Cliente cadastrado", description: result.message });
      form.reset();
      setIsCreateOpen(false);
      navigate({ cliente: result.clientId, pagina: 1 });
      router.refresh();
    });
  };

  const handleUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateClientAction(formData);
      if (!result.success) {
        showToast({ type: "error", title: "Alteração não concluída", description: result.message });
        return;
      }
      showToast({ type: "success", title: "Cliente atualizado", description: result.message });
      setEditClient(null);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!deleteClient) return;
    startTransition(async () => {
      const result = await deleteClientAction(deleteClient.id);
      if (!result.success) {
        showToast({ type: "error", title: "Exclusão não concluída", description: result.message });
        return;
      }
      showToast({ type: "success", title: "Cliente excluído", description: result.message });
      setDeleteClient(null);
      navigate({ cliente: undefined, pagina: 1 });
      router.refresh();
    });
  };

  const statCards = [
    { label: "Total de clientes", value: data.counts.total, tone: "blue", icon: UsersRound },
    { label: "Clientes ativos", value: data.counts.active, tone: "blue", icon: UserRound },
    { label: "Prospects", value: data.counts.prospects, tone: "orange", icon: Clock3 },
    { label: "Inativos", value: data.counts.inactive, tone: "red", icon: Clock3 },
  ];

  return (
    <div className="clients-content">
      <div className="clients-heading-row">
        <div><h1>Clientes</h1><p>Gerencie seus clientes e histórico.</p></div>
        <div className="clients-toolbar">
          <form className="clients-search" onSubmit={handleSearch}>
            <Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, empresa ou e-mail..." /><button type="submit">Buscar</button>
          </form>
          <select value={filters.status} onChange={(event) => navigate({ status: event.target.value, pagina: 1, cliente: undefined })} aria-label="Filtrar clientes por status">
            <option value="all">Status: Todos</option><option value="active">Ativos</option><option value="prospect">Prospects</option><option value="inactive">Inativos</option>
          </select>
          <button type="button" className="clients-new-button" onClick={() => setIsCreateOpen(true)}><Plus size={18} /> Novo cliente</button>
        </div>
      </div>

      <section className="clients-stats" aria-label="Indicadores de clientes">
        {statCards.map(({ label, value, tone, icon: Icon }) => <article key={label}><span className={`client-stat-icon ${tone}`}><Icon size={22} /></span><div><p>{label}</p><strong>{value}</strong><small>Dados atuais</small></div></article>)}
      </section>

      <div className="clients-layout">
        <section className="clients-table-card">
          <div className="clients-table" role="table" aria-label="Lista de clientes">
            <div className="clients-table-head" role="row"><span>Cliente</span><span>Empresa</span><span>Contato</span><span>Projetos ativos</span><span>Status</span><span>Último contato</span><span /></div>
            {data.clients.length === 0 && <div className="clients-empty"><UsersRound size={28} /><strong>Nenhum cliente encontrado</strong><p>Cadastre um cliente ou ajuste os filtros utilizados.</p></div>}
            {data.clients.map((client) => (
              <div role="row" key={client.id} className={`clients-table-row ${data.selectedClient?.id === client.id ? "is-selected" : ""}`} onClick={() => navigate({ cliente: client.id })} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate({ cliente: client.id }); }} tabIndex={0}>
                <span className="client-name-cell"><i className={client.logoUrl ? "has-image" : ""} style={client.logoUrl ? { backgroundImage: `url(${client.logoUrl})` } : undefined}>{!client.logoUrl && getInitials(client.name)}</i><strong>{client.name}</strong></span>
                <span>{client.companyName || "—"}</span>
                <span className="client-contact-cell"><b>{client.email || "Sem e-mail"}</b><small>{client.phone || "Sem telefone"}</small></span>
                <span>{client.activeProjects}</span>
                <span><em className={`client-status ${client.status}`}>{statusLabels[client.status]}</em></span>
                <span className="client-contact-cell"><b>{client.lastContactAt ? dateFormatter.format(new Date(client.lastContactAt)) : "—"}</b><small>{getRelativeContact(client.lastContactAt)}</small></span>
                <span className="client-actions-cell"><button type="button" aria-label={`Ações de ${client.name}`} onClick={(event) => { event.stopPropagation(); const rect = event.currentTarget.getBoundingClientRect(); setActionMenu({ client, top: rect.bottom + 6, right: window.innerWidth - rect.right }); }}><MoreHorizontal size={18} /></button></span>
              </div>
            ))}
          </div>
          <footer className="clients-pagination">
            <span>{data.pagination.total === 0 ? "0 clientes" : `${(data.pagination.page - 1) * data.pagination.pageSize + 1}–${Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.total)} de ${data.pagination.total} clientes`}</span>
            <div>
              <button type="button" disabled={data.pagination.page <= 1} onClick={() => navigate({ pagina: data.pagination.page - 1, cliente: undefined })}><ChevronLeft size={17} /></button>
              <strong>{data.pagination.page}</strong><span>de {data.pagination.pages}</span>
              <button type="button" disabled={data.pagination.page >= data.pagination.pages} onClick={() => navigate({ pagina: data.pagination.page + 1, cliente: undefined })}><ChevronRight size={17} /></button>
            </div>
          </footer>
        </section>

        <aside className="client-details-card">
          {!data.selectedClient ? <div className="client-details-empty"><UserRound size={30} /><p>Selecione um cliente para visualizar os detalhes.</p></div> : <ClientDetailsPanel client={data.selectedClient} />}
        </aside>
      </div>

      {isCreateOpen && <CreateClientModal isPending={isPending} onClose={() => !isPending && setIsCreateOpen(false)} onSubmit={handleCreate} />}
      {actionMenu && <ClientActionsMenu menu={actionMenu} onClose={() => setActionMenu(null)} onEdit={() => { setEditClient(actionMenu.client); setActionMenu(null); }} onDelete={() => { setDeleteClient(actionMenu.client); setActionMenu(null); }} />}
      {editClient && <EditClientModal client={editClient} isPending={isPending} onClose={() => !isPending && setEditClient(null)} onSubmit={handleUpdate} />}
      {deleteClient && <DeleteClientModal clientName={deleteClient.name} isPending={isPending} onClose={() => !isPending && setDeleteClient(null)} onConfirm={handleDelete} />}
    </div>
  );
}

function ClientDetailsPanel({ client }: { client: NonNullable<ClientsData["selectedClient"]> }) {
  return (
    <>
      <header><strong>Detalhes do cliente</strong></header>
      <div className="client-details-profile"><span className={client.logoUrl ? "has-image" : ""} style={client.logoUrl ? { backgroundImage: `url(${client.logoUrl})` } : undefined}>{!client.logoUrl && getInitials(client.name)}</span><div><h2>{client.name}</h2><p>{client.companyName || "Profissional independente"}</p></div><em className={`client-status ${client.status}`}>{statusLabels[client.status]}</em></div>
      <div className="client-details-contact">
        {client.email && <a href={`mailto:${client.email}`}><Mail size={16} />{client.email}</a>}
        {client.phone && <a href={`tel:${client.phone}`}><Phone size={16} />{client.phone}</a>}
        {client.whatsapp && <a href={getWhatsAppUrl(client.whatsapp)} target="_blank" rel="noreferrer"><Phone size={16} />{client.whatsapp}</a>}
        {client.website && <a href={client.website} target="_blank" rel="noreferrer"><Globe2 size={16} />{client.website.replace(/^https?:\/\//, "")}</a>}
      </div>
      <section className="client-details-section"><h3>Notas</h3><p>{client.notes || "Nenhuma observação cadastrada."}</p></section>
      <section className="client-details-section"><h3>Projetos recentes</h3>{client.recentProjects.length === 0 ? <p>Nenhum projeto vinculado.</p> : client.recentProjects.map((project) => <div className="client-detail-line" key={project.id}><span>{project.name}</span><em>{projectStatusLabels[project.status] ?? project.status}</em></div>)}</section>
      <section className="client-details-section"><h3>Próximos lembretes</h3>{client.reminders.length === 0 ? <p>Nenhum lembrete futuro.</p> : client.reminders.map((reminder) => <div className="client-detail-line" key={reminder.id}><span>{reminder.title}</span><time>{dateTimeFormatter.format(new Date(reminder.scheduledAt))}</time></div>)}</section>
    </>
  );
}

function ClientActionsMenu({ menu, onClose, onEdit, onDelete }: { menu: { client: ClientsData["clients"][number]; top: number; right: number }; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(<><button type="button" className="client-actions-dismiss" aria-label="Fechar ações" onClick={onClose} /><div className="client-actions-menu" style={{ top: menu.top, right: menu.right }} role="menu"><button type="button" role="menuitem" onClick={onEdit}><Pencil size={16} /> Editar cliente</button><button type="button" role="menuitem" className="danger" onClick={onDelete}><Trash2 size={16} /> Excluir cliente</button></div></>, document.body);
}

function EditClientModal({ client, isPending, onClose, onSubmit }: { client: ClientsData["clients"][number]; isPending: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  return createPortal(<div className="client-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="client-modal client-edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-client-title"><header><div><span>Editar cadastro</span><h2 id="edit-client-title">Editar cliente</h2></div><button type="button" onClick={onClose} aria-label="Fechar"><X size={20} /></button></header><form onSubmit={onSubmit}><input type="hidden" name="client_id" value={client.id} /><div className="client-form-grid"><ClientLogoInput initialUrl={client.logoUrl} /><label>Nome completo ou responsável<input name="name" defaultValue={client.name} /></label><label>Empresa <small>(opcional)</small><input name="company_name" defaultValue={client.companyName ?? ""} /></label><label>E-mail<input name="email" type="email" defaultValue={client.email ?? ""} /></label><label>Telefone<PhoneInput name="phone" placeholder="(11) 99999-8888" initialValue={client.phone ?? ""} /></label><label>Status<select name="status" defaultValue={client.status}><option value="active">Ativo</option><option value="prospect">Prospect</option><option value="inactive">Inativo</option></select></label></div><footer><button type="button" onClick={onClose} disabled={isPending}>Cancelar</button><button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar alterações"}</button></footer></form></section></div>, document.body);
}

function DeleteClientModal({ clientName, isPending, onClose, onConfirm }: { clientName: string; isPending: boolean; onClose: () => void; onConfirm: () => void }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  return createPortal(<div className="client-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="client-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-client-title"><div className="client-delete-icon"><Trash2 size={25} /></div><h2 id="delete-client-title">Excluir {clientName}?</h2><p>Esta ação remove definitivamente o cliente e todos os projetos, lembretes, orçamentos e recebimentos vinculados.</p><div><button type="button" onClick={onClose} disabled={isPending}>Cancelar</button><button type="button" onClick={onConfirm} disabled={isPending}>{isPending ? "Excluindo..." : "Sim, excluir cliente"}</button></div></section></div>, document.body);
}

function CreateClientModal({ isPending, onClose, onSubmit }: { isPending: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
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
    <div className="client-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="client-modal" role="dialog" aria-modal="true" aria-labelledby="new-client-title">
        <header><div><span>Novo cadastro</span><h2 id="new-client-title">Adicionar cliente</h2></div><button type="button" onClick={onClose} aria-label="Fechar"><X size={20} /></button></header>
        <form onSubmit={onSubmit}>
          <div className="client-form-grid">
            <ClientLogoInput />
            <label>Nome completo ou responsável<input name="name" autoComplete="name" placeholder="Ex.: Lucas Silva" /></label>
            <label>Empresa <small>(opcional)</small><input name="company_name" autoComplete="organization" placeholder="Ex.: Studio Lume" /></label>
            <label>E-mail<input name="email" type="email" autoComplete="email" placeholder="cliente@empresa.com" /></label>
            <label>Telefone<PhoneInput name="phone" placeholder="(11) 99999-8888" /></label>
            <label>WhatsApp <small>(opcional)</small><PhoneInput name="whatsapp" placeholder="(11) 99999-8888" /></label>
            <label>Site <small>(opcional)</small><input name="website" type="url" placeholder="https://empresa.com" /></label>
            <label>Status<select name="status" defaultValue="active"><option value="active">Ativo</option><option value="prospect">Prospect</option><option value="inactive">Inativo</option></select></label>
            <label className="client-form-notes">Observações <small>(opcional)</small><textarea name="notes" rows={3} placeholder="Preferências, contexto e informações importantes..." /></label>
          </div>
          <footer><button type="button" onClick={onClose} disabled={isPending}>Cancelar</button><button type="submit" disabled={isPending}>{isPending ? "Cadastrando..." : "Cadastrar cliente"}</button></footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}
