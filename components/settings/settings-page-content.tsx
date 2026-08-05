"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AboutSettings } from "./about-settings";
import { DataSettings } from "./data-settings";
import { IntegrationsSettings } from "./integrations-settings";
import { NotificationsSettings } from "./notifications-settings";
import { PlanSettings } from "./plan-settings";
import { ProfessionalSettings } from "./professional-settings";
import { ProfileSettings } from "./profile-settings";
import { SecuritySettings } from "./security-settings";
import { SettingsPageHeader } from "./settings-page-header";
import { SettingsSidebar } from "./settings-sidebar";
import type { NotificationPreferences, ProfessionalProfile, SettingsTab, UserProfile } from "./types";

const validTabs: SettingsTab[] = ["profile", "professional", "notifications", "plan", "security", "data", "integrations", "about"];

function renderSettingsTab(tab: SettingsTab, profile: UserProfile, professional: ProfessionalProfile, notifications: NotificationPreferences) {
  if (tab === "profile") return <ProfileSettings profile={profile} />;
  if (tab === "professional") return <ProfessionalSettings professional={professional} />;
  if (tab === "notifications") return <NotificationsSettings notifications={notifications} />;
  if (tab === "plan") return <PlanSettings />;
  if (tab === "security") return <SecuritySettings />;
  if (tab === "data") return <DataSettings />;
  if (tab === "integrations") return <IntegrationsSettings />;
  return <AboutSettings />;
}

export function SettingsPageContent({ profile, professional, notifications }: { profile: UserProfile; professional: ProfessionalProfile; notifications: NotificationPreferences }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const activeTab: SettingsTab = validTabs.includes(initialTab as SettingsTab) ? (initialTab as SettingsTab) : "profile";

  function handleTabChange(tab: SettingsTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "profile") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }

  return (
    <div className="settings-page">
      <SettingsPageHeader />
      <div className="settings-layout">
        <SettingsSidebar activeTab={activeTab} onChange={handleTabChange} />
        {renderSettingsTab(activeTab, profile, professional, notifications)}
      </div>
    </div>
  );
}
