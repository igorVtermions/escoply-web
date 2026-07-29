"use client";

import { useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  FolderKanban,
  HardDrive,
  Info,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { showToast } from "@/components/ui/toast-provider";
import { SettingsSectionShell } from "./settings-section-shell";

const usage = [
  { label: "Projetos", value: 7, limit: 10, icon: FolderKanban },
  { label: "Clientes", value: 24, limit: 50, icon: UsersRound },
  { label: "Armazenamento", value: 1.8, limit: 5, suffix: "GB", icon: HardDrive },
];

const plannedPlans = [
  {
    name: "Free",
    price: "R$ 0",
    badge: "Atual nos testes",
    description: "Para validar a rotina e organizar os primeiros clientes.",
    features: ["Clientes e projetos básicos", "Tarefas e prazos essenciais", "Obrigações recorrentes"],
  },
  {
    name: "Profissional",
    price: "Planejado",
    badge: "Recomendado",
    description: "Para freelancers com mais volume e rotina recorrente.",
    features: ["Mais projetos e clientes", "Financeiro completo", "Relatórios e exportações"],
    highlighted: true,
  },
  {
    name: "Studio",
    price: "Futuro",
    badge: "Roadmap",
    description: "Para operações maiores, parcerias e pequenos times.",
    features: ["Multiusuário", "Permissões por perfil", "Automações avançadas"],
  },
];

export function PlanSettings() {
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);

  function handleUnavailableBillingAction(action: string) {
    showToast({
      type: "success",
      title: "Planos em modo simulado",
      description: `${action} será conectada quando o gateway de pagamento entrar no produto.`,
    });
    setIsPlansModalOpen(true);
  }

  return (
    <SettingsSectionShell icon={CreditCard} title="Plano" description="Acompanhe seu plano atual e limites de uso.">
      <div className="settings-plan-hero">
        <span>Plano atual</span>
        <h3>Profissional</h3>
        <p>Ambiente de testes sem cobrança ativa. Gateway de pagamento ainda não está conectado.</p>
        <em>Mockado</em>
      </div>

      <div className="settings-plan-notice">
        <Info size={18} />
        <p>
          Esta seção já deixa a base visual de planos preparada, mas nenhuma cobrança real é criada e nenhum cartão é
          solicitado por enquanto.
        </p>
      </div>

      <div className="settings-usage-grid">
        {usage.map((item) => {
          const Icon = item.icon;
          const percent = Math.min(100, Math.round((item.value / item.limit) * 100));

          return (
            <article key={item.label}>
              <header>
                <Icon size={18} />
                <strong>{item.label}</strong>
              </header>
              <p>
                {item.value}
                {item.suffix ? ` ${item.suffix}` : ""} de {item.limit}
                {item.suffix ? ` ${item.suffix}` : ""}
              </p>
              <div>
                <i style={{ width: `${percent}%` }} />
              </div>
            </article>
          );
        })}
      </div>

      <div className="settings-plan-grid">
        {plannedPlans.map((plan) => (
          <article key={plan.name} className={plan.highlighted ? "highlighted" : undefined}>
            <header>
              <span>
                <Sparkles size={18} />
              </span>
              <em>{plan.badge}</em>
            </header>
            <strong>{plan.name}</strong>
            <h4>{plan.price}</h4>
            <p>{plan.description}</p>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>
                  <CheckCircle2 size={15} />
                  {feature}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <footer className="settings-panel-footer">
        <button type="button" className="settings-secondary-button" onClick={() => setIsPlansModalOpen(true)}>
          Ver planos planejados
        </button>
        <button
          type="button"
          className="settings-primary-button"
          onClick={() => handleUnavailableBillingAction("Alteração de plano")}
        >
          Simular alteração
        </button>
      </footer>

      {isPlansModalOpen ? (
        <div className="settings-plan-modal" role="dialog" aria-modal="true" aria-labelledby="settings-plan-modal-title">
          <div className="settings-plan-modal-card">
            <button
              type="button"
              className="settings-plan-modal-close"
              aria-label="Fechar modal de planos"
              onClick={() => setIsPlansModalOpen(false)}
            >
              <X size={22} />
            </button>
            <span className="settings-plan-modal-kicker">Planos</span>
            <h3 id="settings-plan-modal-title">Cobrança ainda não está ativa</h3>
            <p>
              Por enquanto, o Escoply está preparado para testes do produto. A estrutura visual de planos já existe, mas
              checkout, gateway de pagamento, cobrança recorrente e troca real de plano entram em uma etapa futura.
            </p>
            <div className="settings-plan-modal-list">
              <span>Sem cartão de crédito nesta fase</span>
              <span>Sem cobrança real ao alterar plano</span>
              <span>Limites exibidos como referência de produto</span>
            </div>
          </div>
        </div>
      ) : null}
    </SettingsSectionShell>
  );
}
