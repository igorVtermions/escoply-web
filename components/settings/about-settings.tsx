import { Code2, ExternalLink, Info } from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { SettingsSectionShell } from "./settings-section-shell";

export function AboutSettings() {
  return (
    <SettingsSectionShell icon={Info} title="Sobre" description="Informações do produto e links úteis.">
      <div className="settings-about-card">
        <BrandLogo />
        <h3>Escoply</h3>
        <p>Do briefing à entrega, tudo no controle.</p>
        <span>Versão 0.1.0</span>
      </div>
      <div className="settings-link-grid">
        <a href="https://github.com" target="_blank" rel="noreferrer"><Code2 size={17} /> GitHub <ExternalLink size={14} /></a>
        <a href="#roadmap"><ExternalLink size={17} /> Roadmap</a>
        <a href="mailto:contato@escoply.com"><ExternalLink size={17} /> Contato</a>
      </div>
      <p className="settings-made-by">Desenvolvido por Igor Franco.</p>
    </SettingsSectionShell>
  );
}
