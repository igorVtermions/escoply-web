"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { AboutSettings } from "./about-settings";
import type { GoogleStatus } from "@/lib/google/model";
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

function renderSettingsTab(tab: SettingsTab, profile: UserProfile, professional: ProfessionalProfile, notifications: NotificationPreferences, googleStatus: GoogleStatus) {
  if (tab === "profile") return <ProfileSettings profile={profile} />;
  if (tab === "professional") return <ProfessionalSettings professional={professional} />;
  if (tab === "notifications") return <NotificationsSettings notifications={notifications} />;
  if (tab === "plan") return <PlanSettings />;
  if (tab === "security") return <SecuritySettings />;
  if (tab === "data") return <DataSettings />;
  if (tab === "integrations") return <IntegrationsSettings googleStatus={googleStatus} />;
  return <AboutSettings />;
}

export function SettingsPageContent({ profile, professional, notifications, googleStatus }: { googleStatus: GoogleStatus; profile: UserProfile; professional: ProfessionalProfile; notifications: NotificationPreferences }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const activeTab: SettingsTab = validTabs.includes(initialTab as SettingsTab) ? (initialTab as SettingsTab) : "profile";

  function handleTabChange(tab: SettingsTab) {
    if (tab === activeTab) return;
    const params = new URLSearchParams(window.location.search);
    if (tab === "profile") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    // Tabs use the already loaded props. Native history updates useSearchParams
    // without a server navigation and its repeated profile/integration queries.
    window.history.replaceState(null, "", `${nextUrl}${window.location.hash}`);
  }

  return (
    <div className="settings-page">
      <SettingsPageHeader />
      <div className="settings-layout">
        <SettingsSidebar activeTab={activeTab} onChange={handleTabChange} />
        {renderSettingsTab(activeTab, profile, professional, notifications, googleStatus)}
      </div>
    </div>
  );
}
