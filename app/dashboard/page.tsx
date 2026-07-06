import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import "./dashboard.css";

type Profile = {
  full_name: string;
  company_name: string | null;
  avatar_path: string | null;
};

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company_name, avatar_path")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  return (
    <DashboardShell
      userId={user.id}
      email={user.email ?? null}
      profile={profile ?? null}
    />
  );
}
