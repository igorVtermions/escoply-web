import type { NotificationPreferences, ProfessionalProfile, UserPreferences, UserProfile } from "./types";

export const mockUserProfile: UserProfile = {
  name: "Igor Franco",
  email: "igor@email.com",
  phone: "(11) 99999-9999",
  role: "Desenvolvedor Full Stack",
  bio: "Freelancer focado em produtos digitais, web apps e automações.",
};

export const mockProfessionalProfile: ProfessionalProfile = {
  brandName: "Dev Family",
  profession: "Desenvolvedor freelancer",
  document: "",
  city: "São Paulo",
  state: "SP",
  website: "https://escoply.com",
  instagram: "@escoply",
  linkedin: "linkedin.com/in/igorfranco",
  whatsapp: "(11) 99999-9999",
};

export const mockPreferences: UserPreferences = {
  theme: "system",
  currency: "BRL",
  dateFormat: "dd/MM/yyyy",
  startPage: "dashboard",
  language: "pt-BR",
  density: "comfortable",
};

export const mockNotifications: NotificationPreferences = {
  dailyReminders: true,
  upcomingDeadlines: true,
  overduePayments: true,
  pendingBudgets: true,
  recurringObligations: true,
  weeklySummary: false,
};
