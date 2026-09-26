import { Bot, Mail, MessageCircle, PlugZap, Triangle } from "lucide-react";
import { GooglePanel } from "@/components/google/google-panel";
import type { GoogleStatus } from "@/lib/google/model";
import { SettingsSectionShell } from "./settings-section-shell";

const integrations = [
  { name: "WhatsApp", description: "Enviar mensagens e cobranças com contexto do cliente.", icon: MessageCircle },
  { name: "Google Drive", description: "Conectar arquivos e materiais dos projetos.", icon: Triangle },
  { name: "E-mail", description: "Centralizar aprovações, propostas e follow-ups.", icon: Mail },
  { name: "IA Escoply", description: "Resumo inteligente, busca em contexto e sugestões futuras.", icon: Bot },
];

export function IntegrationsSettings({ googleStatus }: { googleStatus: GoogleStatus }) {
  return (
    <SettingsSectionShell icon={PlugZap} title="Integrações" description="Conecte os serviços que fazem parte da sua rotina.">
      <GooglePanel status={googleStatus} />
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
