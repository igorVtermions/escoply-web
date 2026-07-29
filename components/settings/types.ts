export type SettingsTab =
  | "profile"
  | "professional"
  | "notifications"
  | "plan"
  | "security"
  | "data"
  | "integrations"
  | "about";

export type UserProfile = {
  name: string;
  email: string;
  phone?: string;
  role?: string;
  bio?: string;
  avatarUrl?: string;
  avatarPath?: string;
};

export type ProfessionalProfile = {
  brandName?: string;
  profession?: string;
  document?: string;
  city?: string;
  state?: string;
  website?: string;
  instagram?: string;
  linkedin?: string;
  whatsapp?: string;
};

export type NotificationPreferences = {
  dailyReminders: boolean;
  upcomingDeadlines: boolean;
  overduePayments: boolean;
  pendingBudgets: boolean;
  recurringObligations: boolean;
  weeklySummary: boolean;
};
