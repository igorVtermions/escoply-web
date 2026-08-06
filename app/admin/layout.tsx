import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Sora } from "next/font/google";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import "./admin.css";
import "./admin-realtime.css";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-admin",
});

type AdminProfile = {
  full_name: string | null;
  role: string | null;
  status: string | null;
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, role, status")
    .eq("id", user.id)
    .maybeSingle<AdminProfile>();

  if (error || !profile || profile.role !== "admin" || profile.status !== "active") {
    redirect("/dashboard");
  }

  // TODO: mover ações sensíveis do admin para API segura com service role.
  // TODO: criar conta admin via Supabase usando ADMIN_EMAIL e ADMIN_PASSWORD em ambiente seguro.

  return (
    <main className={`admin-app ${sora.variable}`}>
      <AdminSidebar adminName={profile.full_name ?? "Admin Escoply"} adminEmail={user.email ?? "admin@escoply.com"} />
      <section className="admin-main">{children}</section>
    </main>
  );
}
