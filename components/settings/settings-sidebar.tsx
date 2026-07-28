"use client";

import { Bell, BriefcaseBusiness, CreditCard, Database, HelpCircle, Info, LockKeyhole, PlugZap, Settings2, SlidersHorizontal, UserRound } from "lucide-react";
import type { SettingsTab } from "./types";

const settingsItems: Array<{ id: SettingsTab; label: string; badge?: string; icon: typeof UserRound }> = [
  { id: "profile", label: "Perfil", icon: UserRound },
  { id: "professional", label: "Profissional", icon: BriefcaseBusiness },
  { id: "preferences", label: "Preferências", icon: SlidersHorizontal },
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
        <strong>Precisa de ajuda?</strong>
        <p>Fale com o suporte ou consulte nossa central de ajuda.</p>
        <button type="button"><HelpCircle size={14} /> Abrir ajuda</button>
      </article>
    </aside>
  );
}
