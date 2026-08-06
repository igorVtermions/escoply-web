import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminNotification = {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
  kind: "new_user" | "pro_plan";
};

function formatRelativeTime(value: string | null | undefined) {
  if (!value) return "—";

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) return "Agora";
  if (diffMinutes < 60) return `${diffMinutes} min atrás`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? "hora" : "horas"} atrás`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "Ontem";
  return `${diffDays} dias atrás`;
}

async function listRecentAuthUsers() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 8 });

  if (error) return [];

  return data.users
    .slice()
    .sort((a, b) => new Date(b.created_at ?? "").getTime() - new Date(a.created_at ?? "").getTime())
    .slice(0, 4)
    .map((user): AdminNotification => {
      const name = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : user.email?.split("@")[0] ?? "Usuário";

      return {
        id: `new-user-${user.id}`,
        title: "Novo usuário cadastrado",
        detail: `${name} · ${user.email ?? "sem e-mail"}`,
        createdAt: formatRelativeTime(user.created_at),
        kind: "new_user",
      };
    });
}

async function listRecentProProfiles() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, company_name, updated_at")
    .eq("plan", "pro")
    .neq("role", "admin")
    .order("updated_at", { ascending: false })
    .limit(4);

  if (error || !data) return [];

  return data.map((profile): AdminNotification => ({
    id: `pro-plan-${profile.id}`,
    title: "Usuário no plano Pro",
    detail: `${profile.full_name ?? "Usuário"}${profile.company_name ? ` · ${profile.company_name}` : ""}`,
    createdAt: formatRelativeTime(profile.updated_at),
    kind: "pro_plan",
  }));
}

export async function getAdminNotifications() {
  const [newUsers, proProfiles] = await Promise.all([listRecentAuthUsers(), listRecentProProfiles()]);

  return [...newUsers, ...proProfiles].slice(0, 6);
}
