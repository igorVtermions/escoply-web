"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  Crown,
  DollarSign,
  FileText,
  Folder,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { showToast } from "@/components/ui/toast-provider";

type Profile = {
  full_name: string;
  company_name: string | null;
  avatar_path: string | null;
};

const navigation = [
  { label: "Dashboard", icon: Home, active: true },
  { label: "Clientes", icon: UsersRound },
  { label: "Projetos", icon: BriefcaseBusiness },
  { label: "Lembretes", icon: Bell },
  { label: "Obrigações", icon: ClipboardList },
  { label: "Materiais", icon: Folder },
  { label: "Configurações", icon: Settings },
];

const metrics = [
  { label: "Clientes ativos", value: "12", change: "+ 20% vs. mês passado", icon: UsersRound, tone: "blue", trend: "M 0 22 L 10 17 L 20 19 L 30 10 L 40 14 L 50 6" },
  { label: "Projetos em andamento", value: "7", change: "+ 16% vs. mês passado", icon: BriefcaseBusiness, tone: "purple", trend: "M 0 21 L 11 16 L 20 19 L 31 8 L 41 15 L 50 10" },
  { label: "Prazos próximos", value: "5", change: "- 17% vs. mês passado", icon: Clock3, tone: "orange", trend: "M 0 8 L 10 10 L 19 16 L 30 14 L 40 22 L 50 18" },
  { label: "A receber", value: "R$ 18.450", change: "+ 28% vs. mês passado", icon: DollarSign, tone: "green", trend: "M 0 20 L 12 19 L 21 12 L 30 14 L 40 5 L 50 9" },
];

const reminders = [
  { time: "09:00", title: "Reunião de alinhamento", project: "Studio Lume · Identidade Visual", tag: "Reunião", color: "purple" },
  { time: "11:30", title: "Enviar proposta revisada", project: "Vértice · Landing Page", tag: "Ação", color: "orange" },
  { time: "14:00", title: "Aprovação de artes", project: "Agência Nexo · Social Media", tag: "Revisão", color: "blue" },
  { time: "16:30", title: "Entregar arquivos finais", project: "Brand UP · Manual da Marca", tag: "Entrega", color: "green" },
];

const deadlines = [
  { client: "Studio Lume", project: "Identidade Visual", progress: 75, date: "24 mai 2025", days: "2 dias", accent: "black" },
  { client: "Vértice", project: "Landing Page", progress: 60, date: "27 mai 2025", days: "5 dias", accent: "purple" },
  { client: "Agência Nexo", project: "Social Media", progress: 40, date: "30 mai 2025", days: "8 dias", accent: "black" },
  { client: "Brand UP", project: "Manual da Marca", progress: 90, date: "02 jun 2025", days: "11 dias", accent: "yellow" },
];

const budgets = [
  { client: "Studio Lume", project: "Embalagem", value: "R$ 3.200,00", status: "Enviado" },
  { client: "Vértice", project: "E-mail Marketing", value: "R$ 1.850,00", status: "Enviado" },
  { client: "Agência Nexo", project: "Apresentação Institucional", value: "R$ 2.750,00", status: "Rascunho" },
  { client: "Brand UP", project: "Ícones Personalizados", value: "R$ 1.200,00", status: "Rascunho" },
];

const obligations = [
  { name: "ISSQN - Maio/2025", type: "Imposto", due: "20/05/2025", status: "Paga", tone: "green" },
  { name: "INSS - Maio/2025", type: "Contribuição", due: "20/05/2025", status: "Pendente", tone: "orange" },
  { name: "Enviar relatório de atividades", type: "Administrativo", due: "31/05/2025", status: "Em andamento", tone: "blue" },
  { name: "Emitir nota fiscal - Studio Lume", type: "Financeiro", due: "31/05/2025", status: "Não iniciado", tone: "slate" },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "ES";
}

function WelcomeModal({ name, onClose }: { name: string; onClose: () => void }) {
  return (
    <div className="welcome-overlay" role="presentation">
      <section className="welcome-modal" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <button type="button" className="welcome-close" onClick={onClose} aria-label="Fechar boas-vindas">
          <X size={18} />
        </button>
        <div className="welcome-icon">
          <Sparkles size={28} />
        </div>
        <span className="welcome-kicker">Bem-vindo ao Escoply</span>
        <h2 id="welcome-title">Sua central de controle está pronta, {name.split(" ")[0]}.</h2>
        <p>
          Comece criando seus clientes, projetos e lembretes. A partir daqui, cada escopo, orçamento, prazo e entrega
          vai ter um lugar claro para acompanhar.
        </p>
        <div className="welcome-actions">
          <button type="button" onClick={onClose}>Explorar dashboard</button>
          <button type="button" onClick={onClose}>Criar primeiro projeto</button>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ metric }: { metric: (typeof metrics)[number] }) {
  const Icon = metric.icon;

  return (
    <article className="dashboard-metric">
      <div className={`dashboard-metric-icon tone-${metric.tone}`}>
        <Icon size={22} />
      </div>
      <div>
        <p>{metric.label}</p>
        <strong>{metric.value}</strong>
        <span className={metric.change.startsWith("+") ? "positive" : "negative"}>{metric.change}</span>
      </div>
      <svg viewBox="0 0 50 28" aria-hidden="true">
        <path d={metric.trend} />
      </svg>
    </article>
  );
}

type DashboardShellProps = {
  userId: string;
  email: string | null;
  profile: Profile | null;
};

export function DashboardShell({ userId, email, profile }: DashboardShellProps) {
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(false);

  const displayName = useMemo(() => {
    return profile?.full_name || email?.split("@")[0] || "Freelancer";
  }, [email, profile]);

  useEffect(() => {
    const welcomeKey = `escoply:welcome:${userId}`;
    if (localStorage.getItem(welcomeKey)) return;
    const timer = window.setTimeout(() => setShowWelcome(true), 0);
    return () => window.clearTimeout(timer);
  }, [userId]);

  const closeWelcome = () => {
    localStorage.setItem(`escoply:welcome:${userId}`, "seen");
    setShowWelcome(false);
  };

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    showToast({
      type: "success",
      title: "Sessão encerrada",
      description: "Você saiu da sua conta com segurança.",
    });
    router.replace("/");
    router.refresh();
  };

  return (
    <main className="dashboard-app">
      <aside className="dashboard-sidebar">
        <BrandLogo inverse />

        <nav className="dashboard-nav" aria-label="Menu principal">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.label} type="button" className={item.active ? "active" : ""}>
                <Icon size={20} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="dashboard-plan-card">
          <Crown size={18} />
          <strong>Plano Profissional</strong>
          <span>Seu plano está ativo</span>
          <div className="dashboard-plan-progress"><i /></div>
          <p>7 de 10 projetos</p>
          <button type="button">Ver plano</button>
        </div>

        <button type="button" className="dashboard-collapse">
          <Menu size={18} />
          Recolher menu
        </button>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <label className="dashboard-search">
            <Search size={18} />
            <input type="search" placeholder="Buscar clientes, projetos, lembretes..." />
            <kbd>⌘ K</kbd>
          </label>

          <div className="dashboard-actions">
            <button type="button" aria-label="Calendário"><CalendarDays size={21} /></button>
            <button type="button" aria-label="Mensagens"><MessageCircle size={21} /></button>
            <button type="button" aria-label="Notificações" className="has-badge"><Bell size={21} /><span>3</span></button>
            <div className="dashboard-user">
              <span>{getInitials(displayName)}</span>
              <div>
                <strong>{displayName}</strong>
                <small>{profile?.company_name || "Designer Freelancer"}</small>
              </div>
              <ChevronDown size={16} />
            </div>
            <button type="button" className="dashboard-logout" onClick={handleLogout} aria-label="Sair">
              <LogOut size={19} />
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          <div className="dashboard-title-row">
            <div>
              <h1>Dashboard</h1>
              <p>Do briefing à entrega, tudo no controle.</p>
            </div>
            <button type="button" className="dashboard-date">
              <CalendarDays size={18} />
              22 de maio de 2025
              <ChevronDown size={16} />
            </button>
          </div>

          <section className="dashboard-metrics" aria-label="Indicadores gerais">
            {metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
          </section>

          <section className="dashboard-grid">
            <article className="dashboard-panel">
              <header>
                <div><Bell size={20} /><h2>Lembretes de hoje</h2></div>
                <button type="button">Ver todos</button>
              </header>
              <div className="reminder-list">
                {reminders.map((reminder) => (
                  <div key={`${reminder.time}-${reminder.title}`} className={`reminder-item ${reminder.color}`}>
                    <time>{reminder.time}</time>
                    <div>
                      <strong>{reminder.title}</strong>
                      <span>{reminder.project}</span>
                    </div>
                    <em>{reminder.tag}</em>
                  </div>
                ))}
              </div>
            </article>

            <article className="dashboard-panel">
              <header>
                <div><CalendarDays size={20} /><h2>Próximos prazos</h2></div>
                <button type="button">Ver todos</button>
              </header>
              <div className="deadline-list">
                {deadlines.map((deadline) => (
                  <div key={`${deadline.client}-${deadline.project}`} className="deadline-item">
                    <span className={`client-avatar ${deadline.accent}`}>{deadline.client.slice(0, 2).toUpperCase()}</span>
                    <div>
                      <strong>{deadline.client}</strong>
                      <small>{deadline.project}</small>
                    </div>
                    <div className="deadline-progress"><i style={{ width: `${deadline.progress}%` }} /></div>
                    <time><strong>{deadline.date}</strong><small>{deadline.days}</small></time>
                  </div>
                ))}
              </div>
            </article>

            <article className="dashboard-panel">
              <header>
                <div><FileText size={20} /><h2>Orçamentos pendentes</h2></div>
                <button type="button">Ver todos</button>
              </header>
              <div className="budget-list">
                {budgets.map((budget) => (
                  <div key={`${budget.client}-${budget.project}`} className="budget-item">
                    <span>{budget.client.slice(0, 2).toUpperCase()}</span>
                    <strong>{budget.client}</strong>
                    <small>{budget.project}</small>
                    <b>{budget.value}</b>
                    <em className={budget.status === "Enviado" ? "sent" : "draft"}>{budget.status}</em>
                  </div>
                ))}
                <footer><span>Total</span><strong>R$ 8.200,00</strong></footer>
              </div>
            </article>

            <article className="dashboard-panel dashboard-obligations">
              <header>
                <div><ClipboardList size={20} /><h2>Obrigações do mês</h2></div>
                <button type="button"><Plus size={16} /> Nova obrigação</button>
              </header>
              <div className="obligation-table">
                {obligations.map((obligation) => (
                  <div key={obligation.name}>
                    <strong>{obligation.name}</strong>
                    <span>{obligation.type}</span>
                    <time>{obligation.due}</time>
                    <em className={obligation.tone}><CheckCircle2 size={14} />{obligation.status}</em>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </div>
      </section>

      {showWelcome && <WelcomeModal name={displayName} onClose={closeWelcome} />}
    </main>
  );
}
