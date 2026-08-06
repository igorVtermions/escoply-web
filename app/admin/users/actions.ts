"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserPlan, UserStatus } from "@/types/admin";

const allowedPlans = new Set<UserPlan>(["free", "starter", "pro", "ai"]);
const allowedStatuses = new Set<UserStatus>(["active", "blocked", "pending"]);

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

  return authData.user.id;
}

async function updateUserProfile(userId: string, values: { plan?: UserPlan; status?: UserStatus }) {
  await assertCurrentUserIsAdmin();

  const supabase = createSupabaseAdminClient();
  const { data: targetProfile, error: targetError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle<{ role: string | null }>();

  if (targetError) throw targetError;
  if (!targetProfile) throw new Error("Perfil do usuário não encontrado.");
  if (targetProfile.role === "admin") throw new Error("Usuários admin não podem ser alterados por esta tela.");

  const { error } = await supabase.from("profiles").update(values).eq("id", userId);
  if (error) throw error;

  revalidatePath("/admin");
  revalidatePath("/admin/users");
}

export async function updateAdminUserPlanAction(userId: string, plan: UserPlan) {
  if (!allowedPlans.has(plan)) throw new Error("Plano inválido.");
  await updateUserProfile(userId, { plan });
}

export async function updateAdminUserStatusAction(userId: string, status: UserStatus) {
  if (!allowedStatuses.has(status)) throw new Error("Status inválido.");
  await assertCurrentUserIsAdmin();

  const supabase = createSupabaseAdminClient();
  const { error: banError } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: status === "blocked" ? "876000h" : "none",
  });

  if (banError) throw banError;

  await updateUserProfile(userId, { status });
}
