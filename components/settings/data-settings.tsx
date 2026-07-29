"use client";

import { Database, Download, Eraser, ShieldAlert, Trash2 } from "lucide-react";
import { showToast } from "@/components/ui/toast-provider";
import { SettingsSectionShell } from "./settings-section-shell";

export function DataSettings() {
  return (
    <SettingsSectionShell icon={Database} title="Dados" description="Controle exportações, backup e ações sensíveis.">
      <div className="settings-privacy-card">
        <ShieldAlert size={20} />
        <p>Seus dados de clientes, projetos e finanças devem ser tratados como informação sensível. Exportações e exclusões permanentes terão dupla confirmação quando conectadas ao backend.</p>
      </div>
      <div className="settings-action-list">
        <article><span><Download size={18} /><strong>Exportar meus dados</strong><small>Baixe uma cópia das informações principais da conta.</small></span><button type="button" onClick={() => showToast({ type: "success", title: "Exportação planejada", description: "Exportação real será conectada em etapa futura." })}>Exportar</button></article>
        <article><span><Download size={18} /><strong>Baixar backup</strong><small>Backup completo de arquivos e registros futuramente.</small></span><em>Em breve</em></article>
        <article><span><Eraser size={18} /><strong>Limpar dados de teste</strong><small>Remove registros criados para demonstração.</small></span><button type="button">Limpar</button></article>
        <article className="danger"><span><Trash2 size={18} /><strong>Excluir conta permanentemente</strong><small>Ação irreversível com confirmação reforçada.</small></span><button type="button">Excluir</button></article>
      </div>
    </SettingsSectionShell>
  );
}
