"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserPlan } from "@/types/admin";

const allowedPlans = new Set<UserPlan>(["free", "starter", "pro", "ai"]);

export type UpdatePlanPricingInput = {
  plan: UserPlan;
  monthlyPrice: number;
  isPromotionActive: boolean;
  promotionalPrice?: number;
  promotionLabel?: string;
  promotionEndsAt?: string;
};

async function assertCurrentUserIsAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("Usuário não autenticado.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", authData.user.id)
    .maybeSingle<{ role: string | null; status: string | null }>();

  if (profileError || !profile || profile.role !== "admin" || profile.status !== "active") {
    throw new Error("Ação permitida apenas para administradores ativos.");
  }
}

function normalizeMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export async function updatePlanPricingAction(input: UpdatePlanPricingInput) {
  await assertCurrentUserIsAdmin();

  if (!allowedPlans.has(input.plan)) {
    throw new Error("Plano inválido.");
  }

  if (!Number.isFinite(input.monthlyPrice) || input.monthlyPrice < 0) {
    throw new Error("Preço mensal inválido.");
  }

  const promotionalPrice = typeof input.promotionalPrice === "number" ? input.promotionalPrice : undefined;

  if (input.isPromotionActive && (typeof promotionalPrice !== "number" || !Number.isFinite(promotionalPrice) || promotionalPrice < 0)) {
    throw new Error("Informe um preço promocional válido.");
  }

  if (input.isPromotionActive && typeof promotionalPrice === "number" && promotionalPrice > input.monthlyPrice) {
    throw new Error("O preço promocional não pode ser maior que o preço mensal.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("plans")
    .update({
      monthly_price: normalizeMoney(input.monthlyPrice),
      promotional_price: input.isPromotionActive && typeof promotionalPrice === "number" ? normalizeMoney(promotionalPrice) : null,
      promotion_label: input.isPromotionActive ? input.promotionLabel?.trim() || "Promoção ativa" : null,
      promotion_ends_at: input.isPromotionActive ? input.promotionEndsAt || null : null,
      is_promotion_active: input.isPromotionActive,
    })
    .eq("plan", input.plan);

  if (error) throw error;

  revalidatePath("/admin");
  revalidatePath("/admin/plans");
  revalidatePath("/admin/settings");
}
