"use client";

import { useState } from "react";
import { AboutSettings } from "./about-settings";
import { DataSettings } from "./data-settings";
import { IntegrationsSettings } from "./integrations-settings";
import { NotificationsSettings } from "./notifications-settings";
import { PlanSettings } from "./plan-settings";
import { PreferencesSettings } from "./preferences-settings";
import { ProfessionalSettings } from "./professional-settings";
import { ProfileSettings } from "./profile-settings";
import { SecuritySettings } from "./security-settings";
import { SettingsPageHeader } from "./settings-page-header";
import { SettingsSidebar } from "./settings-sidebar";
import { mockNotifications, mockPreferences, mockProfessionalProfile } from "./settings-data";
import type { SettingsTab, UserProfile } from "./types";

function renderSettingsTab(tab: SettingsTab, profile: UserProfile) {
  if (tab === "profile") return <ProfileSettings profile={profile} />;
  if (tab === "professional") return <ProfessionalSettings professional={mockProfessionalProfile} />;
  if (tab === "preferences") return <PreferencesSettings preferences={mockPreferences} />;
  if (tab === "notifications") return <NotificationsSettings notifications={mockNotifications} />;
  if (tab === "plan") return <PlanSettings />;
  if (tab === "security") return <SecuritySettings />;
  if (tab === "data") return <DataSettings />;
  if (tab === "integrations") return <IntegrationsSettings />;
  return <AboutSettings />;
}

export function SettingsPageContent({ profile }: { profile: UserProfile }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  return (
    <div className="settings-page">
      <SettingsPageHeader />
      <div className="settings-layout">
        <SettingsSidebar activeTab={activeTab} onChange={setActiveTab} />
        {renderSettingsTab(activeTab, profile)}
      </div>
    </div>
  );
}
