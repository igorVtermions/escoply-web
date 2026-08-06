import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AdminUser, PlanLimit, UserPlan, UserStatus } from "@/types/admin";
import { getAdminUsersData } from "./data";

export type AdminPlanOverview = PlanLimit & {
  usersCount: number;
  activeUsersCount: number;
  blockedUsersCount: number;
  pendingUsersCount: number;
  effectiveMonthlyPrice: number;
  estimatedMonthlyRevenue: number;
  users: AdminUser[];
};

export const adminPlanDefinitions: PlanLimit[] = [
  {
    plan: "free",
    name: "Free",
    description: "Para freelancers validarem a rotina inicial no Escoply.",
    monthlyPrice: 0,
    isPromotionActive: false,
    clientsLimit: 3,
    projectsLimit: 3,
    storageLimit: "100MB",
    hasPdf: false,
    hasAi: false,
    isActive: true,
  },
  {
    plan: "starter",
    name: "Starter",
    description: "Para freelancers com primeiros clientes recorrentes.",
    monthlyPrice: 19.9,
    isPromotionActive: false,
    clientsLimit: 15,
    projectsLimit: 15,
    storageLimit: "1GB",
    hasPdf: true,
    hasAi: false,
    isActive: true,
  },
  {
    plan: "pro",
    name: "Pro",
    description: "Para freelancers com volume maior e operação mais completa.",
    monthlyPrice: 39.9,
    isPromotionActive: false,
    clientsLimit: "unlimited",
    projectsLimit: "unlimited",
    storageLimit: "5GB",
    hasPdf: true,
    hasAi: false,
    isActive: true,
  },
  {
    plan: "ai",
    name: "AI",
    description: "Tudo do Pro com camada inteligente planejada para o produto.",
    monthlyPrice: 69.9,
    isPromotionActive: false,
    clientsLimit: "unlimited",
    projectsLimit: "unlimited",
    storageLimit: "10GB",
    hasPdf: true,
    hasAi: true,
    isActive: true,
  },
];

type PlanRow = {
  plan: string;
  name: string;
  description: string;
  monthly_price: number | string;
  promotional_price: number | string | null;
  promotion_label: string | null;
  promotion_ends_at: string | null;
  is_promotion_active: boolean;
  clients_limit: number | null;
  projects_limit: number | null;
  storage_limit: string;
  has_pdf: boolean;
  has_ai: boolean;
  is_active: boolean;
};

function countByStatus(users: AdminUser[], status: UserStatus) {
  return users.filter((user) => user.status === status).length;
}

function isUserPlan(value: string): value is UserPlan {
  return value === "free" || value === "starter" || value === "pro" || value === "ai";
}

function mapPlanRow(row: PlanRow): PlanLimit | null {
  if (!isUserPlan(row.plan)) return null;

  return {
    plan: row.plan,
    name: row.name,
    description: row.description,
    monthlyPrice: Number(row.monthly_price),
    promotionalPrice: row.promotional_price === null ? undefined : Number(row.promotional_price),
    promotionLabel: row.promotion_label ?? undefined,
    promotionEndsAt: row.promotion_ends_at ?? undefined,
    isPromotionActive: row.is_promotion_active,
    clientsLimit: row.clients_limit === null ? "unlimited" : row.clients_limit,
    projectsLimit: row.projects_limit === null ? "unlimited" : row.projects_limit,
    storageLimit: row.storage_limit,
    hasPdf: row.has_pdf,
    hasAi: row.has_ai,
    isActive: row.is_active,
  };
}

function getEffectiveMonthlyPrice(plan: PlanLimit) {
  if (plan.isPromotionActive && typeof plan.promotionalPrice === "number") {
    return plan.promotionalPrice;
  }

  return plan.monthlyPrice;
}

export async function getAdminPlanDefinitions(): Promise<PlanLimit[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("plans")
    .select("plan, name, description, monthly_price, promotional_price, promotion_label, promotion_ends_at, is_promotion_active, clients_limit, projects_limit, storage_limit, has_pdf, has_ai, is_active")
    .order("monthly_price", { ascending: true });

  if (error || !data) {
    return adminPlanDefinitions;
  }

  const mappedPlans = (data as PlanRow[]).map(mapPlanRow).filter((plan): plan is PlanLimit => Boolean(plan));
  const definitionsByPlan = new Map<UserPlan, PlanLimit>(adminPlanDefinitions.map((plan) => [plan.plan, plan]));
  mappedPlans.forEach((plan) => definitionsByPlan.set(plan.plan, plan));

  return (["free", "starter", "pro", "ai"] as UserPlan[]).map((plan) => definitionsByPlan.get(plan)).filter((plan): plan is PlanLimit => Boolean(plan));
}

export async function getAdminPlansData(): Promise<AdminPlanOverview[]> {
  const users = await getAdminUsersData();
  const planDefinitions = await getAdminPlanDefinitions();
  const usersByPlan = users.reduce<Record<UserPlan, AdminUser[]>>(
    (accumulator, user) => {
      accumulator[user.plan].push(user);
      return accumulator;
    },
    { free: [], starter: [], pro: [], ai: [] },
  );

  return planDefinitions.map((plan) => {
    const planUsers = usersByPlan[plan.plan];
    const effectiveMonthlyPrice = getEffectiveMonthlyPrice(plan);

    return {
      ...plan,
      usersCount: planUsers.length,
      activeUsersCount: countByStatus(planUsers, "active"),
      blockedUsersCount: countByStatus(planUsers, "blocked"),
      pendingUsersCount: countByStatus(planUsers, "pending"),
      effectiveMonthlyPrice,
      estimatedMonthlyRevenue: planUsers.length * effectiveMonthlyPrice,
      users: planUsers,
    };
  });
}
