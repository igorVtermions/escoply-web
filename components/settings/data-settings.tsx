"use client";

import { startTransition, useState } from "react";
import { Archive, Database, Download, Eraser, FileJson, ShieldAlert, X } from "lucide-react";
import { clearTestDataAction, exportAccountDataAction, type AccountDataExport } from "@/app/dashboard/configuracoes/actions";
import { showToast } from "@/components/ui/toast-provider";
import { SettingsSectionShell } from "./settings-section-shell";

type DataModal = "clear-test-data" | null;
type ExportMode = "exportacao" | "backup" | "portabilidade";

function downloadJson(data: AccountDataExport, prefix: ExportMode) {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${prefix}-escoply-${timestamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function DataSettings() {
  const [activeModal, setActiveModal] = useState<DataModal>(null);
  const [confirmation, setConfirmation] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isPorting, setIsPorting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const hasPendingDownload = isExporting || isBackingUp || isPorting;

  function handleExport(mode: ExportMode) {
    if (mode === "exportacao") setIsExporting(true);
    if (mode === "backup") setIsBackingUp(true);
    if (mode === "portabilidade") setIsPorting(true);

    startTransition(() => {
      void exportAccountDataAction().then((result) => {
        setIsExporting(false);
        setIsBackingUp(false);
        setIsPorting(false);

        if (!result.success || !result.data) {
          showToast({ type: "error", title: "Exportação não concluída", description: result.message });
          return;
        }

        downloadJson(result.data, mode);
        showToast({
          type: "success",
          title:
            mode === "backup"
              ? "Backup gerado"
              : mode === "portabilidade"
                ? "Arquivo de portabilidade gerado"
                : "Dados exportados",
          description: "O arquivo JSON foi baixado no seu navegador.",
        });
      });
    });
  }

  function handleClearTestData() {
    if (confirmation !== "LIMPAR") {
      showToast({ type: "error", title: "Confirmação inválida", description: "Digite LIMPAR para confirmar." });
      return;
    }

    setIsClearing(true);
    startTransition(() => {
      void clearTestDataAction().then((result) => {
        setIsClearing(false);

        if (!result.success) {
          showToast({ type: "error", title: "Limpeza não concluída", description: result.message });
          return;
        }

        showToast({ type: "success", title: "Limpeza finalizada", description: result.message });
        setConfirmation("");
        setActiveModal(null);
      });
    });
  }

  return (
    <SettingsSectionShell icon={Database} title="Dados" description="Controle exportações, backups e limpeza de dados de teste.">
      <div className="settings-privacy-card">
        <ShieldAlert size={20} />
        <p>
          Seus dados de clientes, projetos, agenda, obrigações e financeiro são tratados como informação sensível. As
          exportações abaixo usam apenas dados da conta autenticada.
        </p>
      </div>

      <div className="settings-action-list">
        <article>
          <span>
            <FileJson size={18} />
            <strong>Exportar meus dados</strong>
            <small>Baixa um JSON com perfil, clientes, projetos, tarefas, financeiro, obrigações e configurações.</small>
          </span>
          <button type="button" onClick={() => handleExport("exportacao")} disabled={hasPendingDownload}>
            {isExporting ? "Exportando..." : "Exportar"}
          </button>
        </article>

        <article>
          <span>
            <Archive size={18} />
            <strong>Baixar backup</strong>
            <small>Gera um backup em JSON dos registros principais. Arquivos do Storage entram como referências.</small>
          </span>
          <button type="button" onClick={() => handleExport("backup")} disabled={hasPendingDownload}>
            {isBackingUp ? "Gerando..." : "Baixar"}
          </button>
        </article>

        <article>
          <span>
            <Download size={18} />
            <strong>Portabilidade</strong>
            <small>Baixa um JSON estruturado para auditoria, guarda pessoal ou migração futura.</small>
          </span>
          <button type="button" onClick={() => handleExport("portabilidade")} disabled={hasPendingDownload}>
            {isPorting ? "Gerando..." : "Baixar JSON"}
          </button>
        </article>

        <article className="danger">
          <span>
            <Eraser size={18} />
            <strong>Limpar dados de teste</strong>
            <small>Remove apenas registros com termos como teste, demo, mock ou exemplo.</small>
          </span>
          <button type="button" onClick={() => setActiveModal("clear-test-data")}>Limpar</button>
        </article>
      </div>

      {activeModal === "clear-test-data" ? (
        <div className="settings-data-modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setActiveModal(null)}>
          <section className="settings-data-modal-card" role="dialog" aria-modal="true" aria-labelledby="settings-data-clear-title">
            <button type="button" className="settings-data-modal-close" aria-label="Fechar modal" onClick={() => setActiveModal(null)}>
              <X size={22} />
            </button>
            <span>Limpeza</span>
            <h3 id="settings-data-clear-title">Limpar dados de teste?</h3>
            <p>
              Esta ação remove registros da sua conta que contenham termos típicos de teste, como teste, test, demo,
              mock ou exemplo. Dados reais sem esses termos não serão removidos.
            </p>
            <ul className="settings-data-clean-list">
              <li>Clientes, projetos, tarefas, pagamentos, obrigações e materiais com esses termos podem ser removidos.</li>
              <li>Projetos removidos também removem registros vinculados por cascata, quando houver relação no banco.</li>
              <li>Essa limpeza não exclui sua conta e não altera seu perfil.</li>
            </ul>
            <label>
              Digite LIMPAR para confirmar
              <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
            </label>
            <div className="settings-data-modal-actions">
              <button type="button" className="settings-secondary-button" onClick={() => setActiveModal(null)} disabled={isClearing}>
                Cancelar
              </button>
              <button type="button" className="settings-danger-button" onClick={handleClearTestData} disabled={isClearing}>
                {isClearing ? "Limpando..." : "Limpar dados"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </SettingsSectionShell>
  );
}
