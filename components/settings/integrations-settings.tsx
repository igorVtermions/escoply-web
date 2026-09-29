import { Bot, ChevronDown, Mail, MessageCircle, PlugZap } from "lucide-react";
import { DrivePanel } from "@/components/google/drive-panel";
import { GooglePanel } from "@/components/google/google-panel";
import { CalendarLogo } from "@/components/google/google-agenda-button";
import type { GoogleStatus } from "@/lib/google/model";
import { SettingsSectionShell } from "./settings-section-shell";

const integrations = [
  { name: "WhatsApp", description: "Enviar mensagens e cobranças com contexto do cliente.", icon: MessageCircle },
  { name: "E-mail", description: "Centralizar aprovações, propostas e follow-ups.", icon: Mail },
  { name: "IA Escoply", description: "Resumo inteligente, busca em contexto e sugestões futuras.", icon: Bot },
];

export function IntegrationsSettings({ googleStatus }: { googleStatus: GoogleStatus }) {
  return (
    <SettingsSectionShell icon={PlugZap} title="Integrações" description="Conecte os serviços que fazem parte da sua rotina.">
      <details className="google-settings-disclosure">
        <summary>
          <CalendarLogo/>
          <span className="google-settings-name"><strong>Google Agenda e Tasks</strong><small>{googleStatus.email || "Conecte sua agenda e suas tarefas"}</small></span>
          <span className={`google-settings-status ${googleStatus.connected ? "is-connected" : "is-disconnected"}`}><i aria-hidden="true"/>{googleStatus.connected ? "Conectado" : "Desconectado"}</span>
          <span className="google-settings-toggle"><span className="google-settings-expand">Expandir</span><span className="google-settings-collapse">Recolher</span><ChevronDown size={18}/></span>
        </summary>
        <GooglePanel status={googleStatus} />
      </details>
      <DrivePanel />
      <div className="settings-integration-grid">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          return (
            <article key={integration.name}>
              <span><Icon size={20} /></span>
              <strong>{integration.name}</strong>
              <p>{integration.description}</p>
              <em>Em breve</em>
            </article>
          );
        })}
      </div>
    </SettingsSectionShell>
  );
}
