"use client";

import { startTransition, useEffect, useMemo, useOptimistic, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, CreditCard, Home, LogOut, Menu, Settings, Trash2, UsersRound, X } from "lucide-react";
import { clearNotificationsAction, markNotificationSeenAction } from "@/app/dashboard/actions";
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
  { label: "Obrigações", icon: ClipboardList, href: "/dashboard/obrigacoes", available: true },
  { label: "Financeiro", icon: CreditCard, href: "/dashboard/financeiro", available: true },
  { label: "Configurações", icon: Settings, href: "/dashboard/configuracoes", available: true },
];

const timeFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

const reminderKindLabels: Record<string, string> = {
  meeting: "Reunião",
  action: "Ação",
  review: "Revisão",
  delivery: "Entrega",
  follow_up: "Follow-up",
  charge: "Cobrança",
  other: "Lembrete",
  obligation: "Obrigação",
};

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "ES";
}

function MobileNavigation({ activePath, onClose, onNavigate }: { activePath: string; onClose: () => void; onNavigate: (href: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  const [isClosing, setIsClosing] = useState(false);
  const requestClose = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) close.current();
    else setIsClosing(true);
  };
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!isClosing) return;
    const timer = window.setTimeout(() => close.current(), 320);
    return () => window.clearTimeout(timer);
  }, [isClosing]);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    const desktop = window.matchMedia("(min-width: 821px)");
    const handleResize = () => { if (desktop.matches) close.current(); };
    desktop.addEventListener("change", handleResize);
    return () => { desktop.removeEventListener("change", handleResize); element?.close(); document.body.style.overflow = overflow; previousFocus?.focus(); };
  }, []);
  return createPortal(<dialog ref={dialog} id="workspace-mobile-menu" className={`workspace-mobile-drawer${isClosing ? " is-closing" : ""}`} aria-label="Menu principal" onCancel={event => { event.preventDefault(); requestClose(); }} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) requestClose();
  }}>
    <header><BrandLogo inverse/><button type="button" autoFocus aria-label="Fechar menu" onClick={requestClose}><X size={22}/></button></header>
    <nav className="dashboard-nav" aria-label="Navegação mobile">{navigation.map(item => {
      const Icon = item.icon;
      const active = item.href === "/dashboard" ? activePath === item.href : activePath === item.href || activePath.startsWith(`${item.href}/`);
      return <Link key={item.href} href={item.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined} onClick={event => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { onNavigate(item.href); requestClose(); } }}><Icon size={20}/><span>{item.label}</span></Link>;
    })}</nav>
  </dialog>, document.body);
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePopover, setActivePopover] = useState<"notifications" | null>(null);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [pendingReminderId, setPendingReminderId] = useState<string | null>(null);
  const [isClearingNotifications, setIsClearingNotifications] = useState(false);
  const [readReminderIds, setReadReminderIds] = useState<Set<string>>(() => new Set());
  const [clearedReminderIds, setClearedReminderIds] = useState<Set<string>>(() => new Set());
  const activePath = optimisticPath;
  const displayName = useMemo(() => profile?.full_name || email?.split("@")[0] || "Freelancer", [email, profile]);
  const visibleNotifications = useMemo(() => dashboardData.notifications.filter((notification) => !clearedReminderIds.has(`${notification.source}:${notification.id}`)), [dashboardData.notifications, clearedReminderIds]);
  const unreadNotificationsCount = useMemo(() => visibleNotifications.filter((notification) => !notification.readAt && !readReminderIds.has(`${notification.source}:${notification.id}`)).length, [readReminderIds, visibleNotifications]);

  useEffect(() => {
    router.prefetch("/dashboard");
    router.prefetch("/dashboard/clientes");
    router.prefetch("/dashboard/projetos");
    router.prefetch("/dashboard/agenda");
    router.prefetch("/dashboard/obrigacoes");
    router.prefetch("/dashboard/financeiro");
    router.prefetch("/dashboard/configuracoes");
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

  const handleMarkReminderSeen = (notification: DashboardData["notifications"][number]) => {
    const notificationKey = `${notification.source}:${notification.id}`;
    setPendingReminderId(notificationKey);
    startTransition(() => {
      void markNotificationSeenAction(notification.source, notification.id).then((result) => {
        setPendingReminderId(null);
        if (!result.success) {
          showToast({ type: "error", title: "Ação não concluída", description: result.message });
          return;
        }

        setReadReminderIds((current) => {
          const next = new Set(current);
          next.add(notificationKey);
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
          visibleNotifications.forEach((notification) => next.add(`${notification.source}:${notification.id}`));
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
        <div className="dashboard-sidebar-header"><BrandLogo inverse compact={isSidebarCollapsed} /><button type="button" className="workspace-mobile-menu-button" aria-label="Abrir menu de navegação" aria-haspopup="dialog" aria-expanded={mobileMenuOpen} aria-controls={mobileMenuOpen ? "workspace-mobile-menu" : undefined} onClick={() => setMobileMenuOpen(true)}><Menu size={24}/></button><button type="button" className="dashboard-sidebar-toggle" aria-label={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"} onClick={() => setIsSidebarCollapsed((current) => !current)}>{isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}</button></div>
        <nav className="dashboard-nav" aria-label="Menu principal">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/dashboard" ? activePath === item.href : activePath === item.href || activePath.startsWith(`${item.href}/`);
            if (!item.available) return <button key={item.href} type="button" disabled title={`${item.label} — em breve`}><Icon size={20} /><span>{item.label}</span></button>;
            return <Link key={item.href} href={item.href} prefetch className={isActive ? "active" : ""} aria-current={isActive ? "page" : undefined} title={isSidebarCollapsed ? item.label : undefined} onClick={() => startTransition(() => setOptimisticPath(item.href))}><Icon size={20} /><span>{item.label}</span></Link>;
          })}
        </nav>
      </aside>
      {mobileMenuOpen && <MobileNavigation activePath={activePath} onClose={() => setMobileMenuOpen(false)} onNavigate={href => startTransition(() => setOptimisticPath(href))}/>}

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-actions">
            {activePopover && <button type="button" className="dashboard-popover-dismiss" aria-label="Fechar menu" onClick={() => setActivePopover(null)} />}
            <div className="dashboard-action-wrap"><button type="button" aria-label="Notificações" aria-expanded={activePopover === "notifications"} className={unreadNotificationsCount ? "has-badge" : ""} onClick={() => setActivePopover((current) => current === "notifications" ? null : "notifications")}><Bell size={21} />{unreadNotificationsCount > 0 && <span>{unreadNotificationsCount}</span>}</button>{activePopover === "notifications" && <section className="dashboard-popover dashboard-reminders-popover"><header><div><Bell size={18} /><strong>Notificações</strong></div><span>{unreadNotificationsCount} {unreadNotificationsCount === 1 ? "nova" : "novas"}</span></header>{visibleNotifications.length === 0 ? <p>Nenhuma notificação pendente.</p> : <><div className="dashboard-notification-tools"><small>{visibleNotifications.length} {visibleNotifications.length === 1 ? "item na central" : "itens na central"}</small><button type="button" onClick={handleClearNotifications} disabled={isClearingNotifications}><Trash2 size={14} />{isClearingNotifications ? "Limpando..." : "Limpar notificações"}</button></div><div className="dashboard-reminders-popover-list">{visibleNotifications.map((notification) => { const notificationKey = `${notification.source}:${notification.id}`; const isRead = Boolean(notification.readAt || readReminderIds.has(notificationKey)); return <article className={`dashboard-reminder-card ${isRead ? "is-read" : ""}`} key={notificationKey}><div className="dashboard-reminder-card-icon">{isRead ? <CheckCircle2 size={17} /> : <Bell size={17} />}</div><div className="dashboard-reminder-card-content"><div><strong>{notification.title}</strong><time>{timeFormatter.format(new Date(notification.scheduledAt))}</time></div><p>{notification.source === "obligation" ? "Obrigação recorrente" : notification.projectName ?? "Tarefa geral"}{notification.clientName ? ` · ${notification.clientName}` : ""}</p><span>{isRead ? "Lida" : reminderKindLabels[notification.kind] ?? "Tarefa"}</span></div><button type="button" onClick={() => handleMarkReminderSeen(notification)} disabled={isRead || pendingReminderId === notificationKey}><CheckCircle2 size={16} />{isRead ? "Lida" : pendingReminderId === notificationKey ? "Marcando..." : "Marcar como lida"}</button></article>; })}</div></>}</section>}</div>
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
