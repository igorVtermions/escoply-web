"use client";

import { Bell, BriefcaseBusiness, CreditCard, Database, Info, LockKeyhole, MessageCircle, PlugZap, Settings2, UserRound } from "lucide-react";
import type { SettingsTab } from "./types";

const settingsItems: Array<{ id: SettingsTab; label: string; badge?: string; icon: typeof UserRound }> = [
  { id: "profile", label: "Perfil", icon: UserRound },
  { id: "professional", label: "Profissional", icon: BriefcaseBusiness },
  { id: "notifications", label: "Notificações", icon: Bell },
  { id: "plan", label: "Plano", icon: CreditCard },
  { id: "security", label: "Segurança", icon: LockKeyhole },
  { id: "data", label: "Dados", icon: Database },
  { id: "integrations", label: "Integrações", badge: "Em breve", icon: PlugZap },
  { id: "about", label: "Sobre", icon: Info },
];

export function SettingsSidebar({ activeTab, onChange }: { activeTab: SettingsTab; onChange: (tab: SettingsTab) => void }) {
  return (
    <aside className="settings-sidebar" aria-label="Menu de configurações">
      <nav>
        {settingsItems.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} type="button" className={activeTab === item.id ? "active" : ""} onClick={() => onChange(item.id)}>
              <Icon size={17} />
              <span>{item.label}</span>
              {item.badge && <em>{item.badge}</em>}
            </button>
          );
        })}
      </nav>
      <article className="settings-help-card">
        <Settings2 size={18} />
        <strong>Canal de feedback</strong>
        <p>Encontrou um problema ou tem uma sugestÃ£o? Envie direto para o responsÃ¡vel pelo produto.</p>
        <a
          href="https://wa.me/5521974885166?text=Ol%C3%A1%2C%20tenho%20um%20feedback%20sobre%20o%20Escoply%3A"
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle size={14} /> Enviar feedback
        </a>
      </article>
    </aside>
  );
}
