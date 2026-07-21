"use client";

import { startTransition, useEffect, useMemo, useOptimistic, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Crown, Folder, Home, LogOut, Search, Settings, Trash2, UsersRound } from "lucide-react";
import { clearNotificationsAction, markReminderSeenAction } from "@/app/dashboard/actions";
import { BrandLogo } from "@/components/ui/brand-logo";
import { showToast } from "@/components/ui/toast-provider";
import type { DashboardData } from "@/lib/dashboard/data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Profile = { full_name: string; company_name: string | null; avatar_path: string | null };

const navigation = [
  { label: "Dashboard", icon: Home, href: "/dashboard", available: true },
  { label: "Clientes", icon: UsersRound, href: "/dashboard/clientes", available: true },
  { label: "Projetos", icon: BriefcaseBusiness, href: "/dashboard/projetos", available: true },
  { label: "Agenda", icon: CalendarDays, href: "/dashboard/agenda", available: true },
  { label: "Obrigações", icon: ClipboardList, href: "/dashboard/obrigacoes", available: false },
  { label: "Materiais", icon: Folder, href: "/dashboard/materiais", available: false },
  { label: "Configurações", icon: Settings, href: "/dashboard/configuracoes", available: false },
];

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const timeFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

const reminderKindLabels: Record<string, string> = {
  meeting: "Reunião",
  action: "Ação",
  review: "Revisão",
  delivery: "Entrega",
  follow_up: "Follow-up",
  charge: "Cobrança",
  other: "Lembrete",
};

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "ES";
}

function LogoutConfirmationModal({ isLoggingOut, onCancel, onConfirm }: { isLoggingOut: boolean; onCancel: () => void; onConfirm: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoggingOut) onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoggingOut, onCancel]);

  return (
    <div className="logout-confirm-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isLoggingOut) onCancel(); }}>
      <section className="logout-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="logout-confirm-title" aria-describedby="logout-confirm-description">
        <div className="logout-confirm-icon"><LogOut size={26} /></div>
        <h2 id="logout-confirm-title">Deseja realmente sair?</h2>
        <p id="logout-confirm-description">Sua sessão será encerrada neste navegador e será necessário entrar novamente para acessar o dashboard.</p>
        <div className="logout-confirm-actions"><button type="button" disabled={isLoggingOut} onClick={onCancel}>Continuar no Escoply</button><button type="button" disabled={isLoggingOut} onClick={onConfirm}>{isLoggingOut ? "Saindo..." : "Sim, quero sair"}</button></div>
      </section>
    </div>
  );
}

export function WorkspaceShell({ children, email, profile, avatarUrl, dashboardData }: { children: ReactNode; email: string | null; profile: Profile | null; avatarUrl: string | null; dashboardData: DashboardData }) {
  const pathname = usePathname();
  const router = useRouter();
  const [optimisticPath, setOptimisticPath] = useOptimistic(pathname);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activePopover, setActivePopover] = useState<"calendar" | "notifications" | null>(null);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [pendingReminderId, setPendingReminderId] = useState<string | null>(null);
  const [isClearingNotifications, setIsClearingNotifications] = useState(false);
  const [readReminderIds, setReadReminderIds] = useState<Set<string>>(() => new Set());
  const [clearedReminderIds, setClearedReminderIds] = useState<Set<string>>(() => new Set());
  const activePath = optimisticPath;
  const displayName = useMemo(() => profile?.full_name || email?.split("@")[0] || "Freelancer", [email, profile]);
  const visibleNotifications = useMemo(() => dashboardData.notifications.filter((notification) => !clearedReminderIds.has(notification.id)), [dashboardData.notifications, clearedReminderIds]);
  const unreadNotificationsCount = useMemo(() => visibleNotifications.filter((notification) => !notification.readAt && !readReminderIds.has(notification.id)).length, [readReminderIds, visibleNotifications]);

  useEffect(() => {
    router.prefetch("/dashboard");
    router.prefetch("/dashboard/clientes");
    router.prefetch("/dashboard/projetos");
    router.prefetch("/dashboard/agenda");
  }, [router]);

  useEffect(() => {
    if (!activePopover) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setActivePopover(null); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [activePopover]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = supabase ? await supabase.auth.signOut() : { error: new Error("Supabase não configurado") };
    if (error) {
      setIsLoggingOut(false);
      showToast({ type: "error", title: "Não foi possível sair", description: "Tente encerrar sua sessão novamente." });
      return;
    }
    showToast({ type: "success", title: "Sessão encerrada", description: "Você saiu da sua conta com segurança." });
    router.replace("/");
    router.refresh();
  };

  const handleMarkReminderSeen = (reminderId: string) => {
    setPendingReminderId(reminderId);
    startTransition(() => {
      void markReminderSeenAction(reminderId).then((result) => {
        setPendingReminderId(null);
        if (!result.success) {
          showToast({ type: "error", title: "Ação não concluída", description: result.message });
          return;
        }

        setReadReminderIds((current) => {
          const next = new Set(current);
          next.add(reminderId);
          return next;
        });
        showToast({ type: "success", title: "Notificação lida", description: "Ela não contará mais como nova." });
        router.refresh();
      });
    });
  };

  const handleClearNotifications = () => {
    if (visibleNotifications.length === 0) return;

    setIsClearingNotifications(true);
    startTransition(() => {
      void clearNotificationsAction().then((result) => {
        setIsClearingNotifications(false);
        if (!result.success) {
          showToast({ type: "error", title: "Ação não concluída", description: result.message });
          return;
        }

        setClearedReminderIds((current) => {
          const next = new Set(current);
          visibleNotifications.forEach((notification) => next.add(notification.id));
          return next;
        });
        showToast({ type: "success", title: "Notificações limpas", description: "A central foi esvaziada sem excluir suas tarefas." });
        router.refresh();
      });
    });
  };

  return (
    <main className={`dashboard-app ${isSidebarCollapsed ? "is-sidebar-collapsed" : ""}`}>
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar-header"><BrandLogo inverse compact={isSidebarCollapsed} /><button type="button" className="dashboard-sidebar-toggle" aria-label={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"} onClick={() => setIsSidebarCollapsed((current) => !current)}>{isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}</button></div>
        <nav className="dashboard-nav" aria-label="Menu principal">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/dashboard" ? activePath === item.href : activePath === item.href || activePath.startsWith(`${item.href}/`);
            if (!item.available) return <button key={item.href} type="button" disabled title={`${item.label} — em breve`}><Icon size={20} /><span>{item.label}</span></button>;
            return <Link key={item.href} href={item.href} prefetch className={isActive ? "active" : ""} aria-current={isActive ? "page" : undefined} title={isSidebarCollapsed ? item.label : undefined} onClick={() => startTransition(() => setOptimisticPath(item.href))}><Icon size={20} /><span>{item.label}</span></Link>;
          })}
        </nav>
        <div className="dashboard-plan-card"><Crown size={18} /><strong>Plano Profissional</strong><span>Seu plano está ativo</span><div className="dashboard-plan-progress"><i /></div><p>7 de 10 projetos</p><button type="button">Ver plano</button></div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <label className="dashboard-search"><Search size={18} /><input type="search" placeholder="Buscar clientes, projetos, lembretes..." /><kbd>⌘ K</kbd></label>
          <div className="dashboard-actions">
            {activePopover && <button type="button" className="dashboard-popover-dismiss" aria-label="Fechar menu" onClick={() => setActivePopover(null)} />}
            <div className="dashboard-action-wrap"><button type="button" aria-label="Próximos prazos" aria-expanded={activePopover === "calendar"} onClick={() => setActivePopover((current) => current === "calendar" ? null : "calendar")}><CalendarDays size={21} /></button>{activePopover === "calendar" && <section className="dashboard-popover"><header><CalendarDays size={18} /><strong>Próximos prazos</strong></header>{dashboardData.deadlines.length === 0 ? <p>Nenhum prazo futuro cadastrado.</p> : dashboardData.deadlines.map((deadline) => <div className="dashboard-popover-item" key={deadline.id}><span><strong>{deadline.name}</strong><small>{deadline.clientName}</small></span><time>{dateFormatter.format(new Date(`${deadline.deadline}T12:00:00Z`))}</time></div>)}</section>}</div>
            <div className="dashboard-action-wrap"><button type="button" aria-label="Notificações" aria-expanded={activePopover === "notifications"} className={unreadNotificationsCount ? "has-badge" : ""} onClick={() => setActivePopover((current) => current === "notifications" ? null : "notifications")}><Bell size={21} />{unreadNotificationsCount > 0 && <span>{unreadNotificationsCount}</span>}</button>{activePopover === "notifications" && <section className="dashboard-popover dashboard-reminders-popover"><header><div><Bell size={18} /><strong>Notificações</strong></div><span>{unreadNotificationsCount} {unreadNotificationsCount === 1 ? "nova" : "novas"}</span></header>{visibleNotifications.length === 0 ? <p>Nenhuma notificação pendente.</p> : <><div className="dashboard-notification-tools"><small>{visibleNotifications.length} {visibleNotifications.length === 1 ? "item na central" : "itens na central"}</small><button type="button" onClick={handleClearNotifications} disabled={isClearingNotifications}><Trash2 size={14} />{isClearingNotifications ? "Limpando..." : "Limpar notificações"}</button></div><div className="dashboard-reminders-popover-list">{visibleNotifications.map((notification) => { const isRead = Boolean(notification.readAt || readReminderIds.has(notification.id)); return <article className={`dashboard-reminder-card ${isRead ? "is-read" : ""}`} key={notification.id}><div className="dashboard-reminder-card-icon">{isRead ? <CheckCircle2 size={17} /> : <Bell size={17} />}</div><div className="dashboard-reminder-card-content"><div><strong>{notification.title}</strong><time>{timeFormatter.format(new Date(notification.scheduledAt))}</time></div><p>{notification.projectName ?? "Tarefa geral"}{notification.clientName ? ` · ${notification.clientName}` : ""}</p><span>{isRead ? "Lida" : reminderKindLabels[notification.kind] ?? "Tarefa"}</span></div><button type="button" onClick={() => handleMarkReminderSeen(notification.id)} disabled={isRead || pendingReminderId === notification.id}><CheckCircle2 size={16} />{isRead ? "Lida" : pendingReminderId === notification.id ? "Marcando..." : "Marcar como lida"}</button></article>; })}</div></>}</section>}</div>
            <div className="dashboard-user"><span className={avatarUrl ? "has-image" : ""} style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}>{!avatarUrl && getInitials(displayName)}</span><div><strong>{displayName}</strong><small>{profile?.company_name || "Designer Freelancer"}</small></div></div>
            <button type="button" className="dashboard-logout" onClick={() => setShowLogoutConfirmation(true)} aria-label="Sair"><LogOut size={19} /></button>
          </div>
        </header>
        <div className="workspace-route-content" key={pathname}>{children}</div>
      </section>
      {showLogoutConfirmation && <LogoutConfirmationModal isLoggingOut={isLoggingOut} onCancel={() => setShowLogoutConfirmation(false)} onConfirm={handleLogout} />}
    </main>
  );
}
