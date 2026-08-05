import { Mail, Phone, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { SettingsSectionShell } from "./settings-section-shell";

export function AboutSettings() {
  return (
    <SettingsSectionShell icon={Sparkles} title="Sobre" description="Informações do produto e contato.">
      <div className="settings-about-card">
        <BrandLogo />
        <p>Do briefing à entrega, tudo no controle.</p>
        <span>Versão 0.1.0</span>
      </div>

      <div className="settings-about-idea">
        <h3>A ideia do Escoply</h3>
        <p>
          O Escoply nasceu para ajudar freelancers a centralizar clientes, projetos, escopos, orçamentos, prazos,
          obrigações, materiais e recebimentos em um único fluxo. A proposta é reduzir informação espalhada em WhatsApp,
          Drive, planilhas e memória, deixando a rotina mais clara e controlada.
        </p>
      </div>

      <div className="settings-link-grid settings-contact-grid">
        <a href="mailto:igorviniciusf10@gmail.com">
          <Mail size={17} />
          igorviniciusf10@gmail.com
        </a>
        <a href="tel:+5521974885166">
          <Phone size={17} />
          (21) 97488-5166
        </a>
      </div>

      <p className="settings-made-by">Desenvolvido por Igor Franco.</p>
    </SettingsSectionShell>
  );
}
