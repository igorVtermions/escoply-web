"use client";

import { useState, useTransition } from "react";
import { Percent, Save } from "lucide-react";
import { updatePlanPricingAction } from "@/app/admin/plans/actions";
import { showToast } from "@/components/ui/toast-provider";
import type { AdminPlanOverview } from "@/lib/admin/plans";

type PlanPricingForm = {
  monthlyPrice: string;
  isPromotionActive: boolean;
  promotionalPrice: string;
  promotionLabel: string;
  promotionEndsAt: string;
};

function toMoneyInput(value: number | undefined) {
  if (typeof value !== "number") return "";
  return value.toFixed(2).replace(".", ",");
}

function parseMoney(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function buildInitialForms(plans: AdminPlanOverview[]) {
  return plans.reduce<Record<string, PlanPricingForm>>((accumulator, plan) => {
    accumulator[plan.plan] = {
      monthlyPrice: toMoneyInput(plan.monthlyPrice),
      isPromotionActive: plan.isPromotionActive,
      promotionalPrice: toMoneyInput(plan.promotionalPrice),
      promotionLabel: plan.promotionLabel ?? "",
      promotionEndsAt: plan.promotionEndsAt ?? "",
    };

    return accumulator;
  }, {});
}

export function PlansPricingManager({ plans }: { plans: AdminPlanOverview[] }) {
  const [forms, setForms] = useState(() => buildInitialForms(plans));
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateForm(planId: string, values: Partial<PlanPricingForm>) {
    setForms((current) => ({
      ...current,
      [planId]: {
        ...current[planId],
        ...values,
      },
    }));
  }

  function handleSave(plan: AdminPlanOverview) {
    const form = forms[plan.plan];
    const monthlyPrice = parseMoney(form.monthlyPrice);
    const promotionalPrice = form.promotionalPrice ? parseMoney(form.promotionalPrice) : undefined;

    if (!Number.isFinite(monthlyPrice) || monthlyPrice < 0) {
      showToast({ type: "error", title: "Preço inválido", description: "Informe um preço mensal válido." });
      return;
    }

    if (form.isPromotionActive && (typeof promotionalPrice !== "number" || !Number.isFinite(promotionalPrice) || promotionalPrice < 0)) {
      showToast({ type: "error", title: "Promoção inválida", description: "Informe o valor promocional antes de salvar." });
      return;
    }

    startTransition(async () => {
      try {
        setPendingPlan(plan.plan);
        await updatePlanPricingAction({
          plan: plan.plan,
          monthlyPrice,
          isPromotionActive: form.isPromotionActive,
          promotionalPrice,
          promotionLabel: form.promotionLabel,
          promotionEndsAt: form.promotionEndsAt,
        });
        showToast({ type: "success", title: "Plano atualizado", description: `Preço e promoção do plano ${plan.name} foram salvos.` });
      } catch (error) {
        showToast({
          type: "error",
          title: "Plano não atualizado",
          description: error instanceof Error ? error.message : "Não foi possível salvar as alterações.",
        });
      } finally {
        setPendingPlan(null);
      }
    });
  }

  return (
    <section className="admin-panel">
      <header>
        <div>
          <h2>Editar preços e promoções</h2>
          <p>As alterações são salvas no Supabase e passam a impactar os cálculos do painel admin.</p>
        </div>
      </header>
      <div className="admin-plan-editor-grid">
        {plans.map((plan) => {
          const form = forms[plan.plan];
          const isSavingThisPlan = isPending && pendingPlan === plan.plan;

          return (
            <article key={plan.plan} className={`admin-plan-editor-card plan-${plan.plan}`}>
              <header>
                <span>{plan.name}</span>
                <small>{plan.usersCount} usuários</small>
              </header>
              <label>
                Preço mensal
                <input
                  inputMode="decimal"
                  value={form.monthlyPrice}
                  onChange={(event) => updateForm(plan.plan, { monthlyPrice: event.target.value })}
                  placeholder="Ex.: 39,90"
                />
              </label>
              <label className="admin-plan-toggle">
                <span>
                  <Percent size={16} />
                  Ativar promoção neste plano
                </span>
                <input
                  type="checkbox"
                  checked={form.isPromotionActive}
                  onChange={(event) => updateForm(plan.plan, { isPromotionActive: event.target.checked })}
                />
              </label>
              {form.isPromotionActive ? (
                <div className="admin-plan-promo-fields">
                  <label>
                    Preço promocional
                    <input
                      inputMode="decimal"
                      value={form.promotionalPrice}
                      onChange={(event) => updateForm(plan.plan, { promotionalPrice: event.target.value })}
                      placeholder="Ex.: 29,90"
                    />
                  </label>
                  <label>
                    Nome da promoção
                    <input
                      value={form.promotionLabel}
                      onChange={(event) => updateForm(plan.plan, { promotionLabel: event.target.value })}
                      placeholder="Ex.: Black Friday"
                    />
                  </label>
                  <label>
                    Final da promoção
                    <input
                      type="date"
                      value={form.promotionEndsAt}
                      onChange={(event) => updateForm(plan.plan, { promotionEndsAt: event.target.value })}
                    />
                  </label>
                </div>
              ) : null}
              <button type="button" onClick={() => handleSave(plan)} disabled={isSavingThisPlan}>
                <Save size={16} />
                {isSavingThisPlan ? "Salvando..." : "Salvar alterações"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
