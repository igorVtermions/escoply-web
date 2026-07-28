import { Bot, CalendarDays, Mail, MessageCircle, PlugZap, Triangle } from "lucide-react";
import { SettingsSectionShell } from "./settings-section-shell";

const integrations = [
  { name: "WhatsApp", description: "Enviar mensagens e cobranças com contexto do cliente.", icon: MessageCircle },
  { name: "Google Calendar", description: "Sincronizar agenda, prazos e obrigações.", icon: CalendarDays },
  { name: "Google Drive", description: "Conectar arquivos e materiais dos projetos.", icon: Triangle },
  { name: "E-mail", description: "Centralizar aprovações, propostas e follow-ups.", icon: Mail },
  { name: "IA Escoply", description: "Resumo inteligente, busca em contexto e sugestões futuras.", icon: Bot },
];

export function IntegrationsSettings() {
  return (
    <SettingsSectionShell icon={PlugZap} title="Integrações" description="Conexões planejadas para automatizar sua rotina.">
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
