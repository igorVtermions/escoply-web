"use client";

import { CreditCard, HardDrive, UsersRound, FolderKanban } from "lucide-react";
import { showToast } from "@/components/ui/toast-provider";
import { SettingsSectionShell } from "./settings-section-shell";

const usage = [
  { label: "Projetos", value: 7, limit: 10, icon: FolderKanban },
  { label: "Clientes", value: 24, limit: 50, icon: UsersRound },
  { label: "Armazenamento", value: 1.8, limit: 5, suffix: "GB", icon: HardDrive },
];

export function PlanSettings() {
  return (
    <SettingsSectionShell icon={CreditCard} title="Plano" description="Acompanhe seu plano atual e limites de uso.">
      <div className="settings-plan-hero">
        <span>Plano atual</span>
        <h3>Profissional</h3>
        <p>Status ativo · cobrança em definição para a fase inicial.</p>
        <em>Ativo</em>
      </div>
      <div className="settings-usage-grid">
        {usage.map((item) => {
          const Icon = item.icon;
          const percent = Math.min(100, Math.round((item.value / item.limit) * 100));
          return (
            <article key={item.label}>
              <header><Icon size={18} /><strong>{item.label}</strong></header>
              <p>{item.value}{item.suffix ? ` ${item.suffix}` : ""} de {item.limit}{item.suffix ? ` ${item.suffix}` : ""}</p>
              <div><i style={{ width: `${percent}%` }} /></div>
            </article>
          );
        })}
      </div>
      <footer className="settings-panel-footer">
        <button type="button" className="settings-secondary-button" onClick={() => showToast({ type: "success", title: "Planos", description: "A tela de planos será conectada em uma próxima etapa." })}>Ver planos</button>
        <button type="button" className="settings-primary-button" onClick={() => showToast({ type: "success", title: "Plano", description: "Alteração de plano ainda está planejada." })}>Alterar plano</button>
      </footer>
    </SettingsSectionShell>
  );
}
