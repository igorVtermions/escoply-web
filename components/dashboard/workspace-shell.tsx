"use client";

import { startTransition, useEffect, useMemo, useOptimistic, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BriefcaseBusiness, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Crown, Folder, Home, LogOut, Search, Settings, UsersRound } from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { showToast } from "@/components/ui/toast-provider";
import type { DashboardData } from "@/lib/dashboard/data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Profile = { full_name: string; company_name: string | null; avatar_path: string | null };

const navigation = [
  { label: "Dashboard", icon: Home, href: "/dashboard", available: true },
  { label: "Clientes", icon: UsersRound, href: "/dashboard/clientes", available: true },
  { label: "Projetos", icon: BriefcaseBusiness, href: "/dashboard/projetos", available: true },
  { label: "Lembretes", icon: Bell, href: "/dashboard/lembretes", available: false },
  { label: "Obrigações", icon: ClipboardList, href: "/dashboard/obrigacoes", available: false },
  { label: "Materiais", icon: Folder, href: "/dashboard/materiais", available: false },
  { label: "Configurações", icon: Settings, href: "/dashboard/configuracoes", available: false },
];

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const timeFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

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
  const activePath = optimisticPath;
  const displayName = useMemo(() => profile?.full_name || email?.split("@")[0] || "Freelancer", [email, profile]);

  useEffect(() => {
    router.prefetch("/dashboard");
    router.prefetch("/dashboard/clientes");
    router.prefetch("/dashboard/projetos");
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
            <div className="dashboard-action-wrap"><button type="button" aria-label="Lembretes de hoje" aria-expanded={activePopover === "notifications"} className={dashboardData.reminders.length ? "has-badge" : ""} onClick={() => setActivePopover((current) => current === "notifications" ? null : "notifications")}><Bell size={21} />{dashboardData.reminders.length > 0 && <span>{dashboardData.reminders.length}</span>}</button>{activePopover === "notifications" && <section className="dashboard-popover"><header><Bell size={18} /><strong>Lembretes de hoje</strong></header>{dashboardData.reminders.length === 0 ? <p>Nenhum lembrete pendente para hoje.</p> : dashboardData.reminders.map((reminder) => <div className="dashboard-popover-item" key={reminder.id}><span><strong>{reminder.title}</strong><small>{reminder.projectName ?? "Lembrete geral"}</small></span><time>{timeFormatter.format(new Date(reminder.scheduledAt))}</time></div>)}</section>}</div>
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
