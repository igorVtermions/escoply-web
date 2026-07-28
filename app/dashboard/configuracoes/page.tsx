import { SettingsPageContent } from "@/components/settings/settings-page-content";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import "./settings.css";
import "./settings-overrides.css";

type ProfileRow = {
  full_name: string | null;
  company_name: string | null;
  avatar_path: string | null;
  phone: string | null;
  profession: string | null;
  bio: string | null;
};

export default async function ConfiguracoesPage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company_name, avatar_path, phone, profession, bio")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  const avatarResult = profile?.avatar_path
    ? await supabase.storage.from("avatars").createSignedUrl(profile.avatar_path, 60 * 60)
    : null;

  const email = user.email ?? "";
  const fallbackName = email.split("@")[0] || "Freelancer";

  return (
    <SettingsPageContent
      profile={{
        name: profile?.full_name ?? fallbackName,
        email,
        phone: profile?.phone ?? "",
        role: profile?.profession ?? "",
        bio: profile?.bio ?? "",
        avatarUrl: avatarResult?.data?.signedUrl ?? undefined,
        avatarPath: profile?.avatar_path ?? undefined,
      }}
    />
  );
}
