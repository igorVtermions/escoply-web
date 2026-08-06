import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { WorkspaceShell } from "@/components/dashboard/workspace-shell";
import { getDashboardData, getTodayInSaoPaulo } from "@/lib/dashboard/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import "./dashboard.css";
import "./dashboard-scale.css";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company_name, avatar_path, status")
    .eq("id", user.id)
    .maybeSingle<{ full_name: string; company_name: string | null; avatar_path: string | null; status: string | null }>();

  if (profile?.status === "blocked") {
    redirect("/auth/blocked");
  }
  const avatarResult = profile?.avatar_path ? await supabase.storage.from("avatars").createSignedUrl(profile.avatar_path, 60 * 60) : null;
  const dashboardData = await getDashboardData(user.id, getTodayInSaoPaulo());

  return <WorkspaceShell email={user.email ?? null} profile={profile ?? null} avatarUrl={avatarResult?.data?.signedUrl ?? null} dashboardData={dashboardData}>{children}</WorkspaceShell>;
}
