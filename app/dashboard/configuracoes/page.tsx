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
  professional_type: string | null;
  document: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  instagram: string | null;
  linkedin: string | null;
  business_whatsapp: string | null;
};

type NotificationPreferencesRow = {
  daily_reminders: boolean;
  upcoming_deadlines: boolean;
  overdue_payments: boolean;
  pending_budgets: boolean;
  recurring_obligations: boolean;
  weekly_summary: boolean;
};

const defaultNotificationPreferences = {
  dailyReminders: true,
  upcomingDeadlines: true,
  overduePayments: true,
  pendingBudgets: true,
  recurringObligations: true,
  weeklySummary: false,
};

export default async function ConfiguracoesPage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const [profileResult, notificationPreferencesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, company_name, avatar_path, phone, profession, bio, professional_type, document, city, state, website, instagram, linkedin, business_whatsapp")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>(),
    supabase
      .from("notification_preferences")
      .select("daily_reminders, upcoming_deadlines, overdue_payments, pending_budgets, recurring_obligations, weekly_summary")
      .eq("owner_id", user.id)
      .maybeSingle<NotificationPreferencesRow>(),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (notificationPreferencesResult.error) throw notificationPreferencesResult.error;

  const profile = profileResult.data;
  const notificationPreferences = notificationPreferencesResult.data;

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
      professional={{
        brandName: profile?.company_name ?? "",
        profession: profile?.professional_type ?? "",
        document: profile?.document ?? "",
        city: profile?.city ?? "",
        state: profile?.state ?? "",
        website: profile?.website ?? "",
        instagram: profile?.instagram ?? "",
        linkedin: profile?.linkedin ?? "",
        whatsapp: profile?.business_whatsapp ?? "",
      }}
      notifications={notificationPreferences ? {
        dailyReminders: notificationPreferences.daily_reminders,
        upcomingDeadlines: notificationPreferences.upcoming_deadlines,
        overduePayments: notificationPreferences.overdue_payments,
        pendingBudgets: notificationPreferences.pending_budgets,
        recurringObligations: notificationPreferences.recurring_obligations,
        weeklySummary: notificationPreferences.weekly_summary,
      } : defaultNotificationPreferences}
    />
  );
}
