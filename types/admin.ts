export type UserRole = "user" | "admin";

export type UserStatus = "active" | "blocked" | "pending";

export type UserPlan = "free" | "starter" | "pro" | "ai";

export type SupportTicketType =
  | "support"
  | "bug"
  | "question"
  | "billing"
  | "access"
  | "suggestion"
  | "feature_request"
  | "criticism";

export type SupportTicketStatus =
  | "new"
  | "open"
  | "in_progress"
  | "waiting_user"
  | "planned"
  | "resolved"
  | "closed"
  | "rejected";

export type SupportTicketPriority = "low" | "medium" | "high" | "urgent";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  plan: UserPlan;
  companyName?: string;
  phone?: string;
  profession?: string;
  createdAt: string;
  lastLoginAt?: string;
  clientsCount?: number;
  projectsCount?: number;
  activeProjectsCount?: number;
  paymentsCount?: number;
  paidPaymentsTotal?: number;
  pendingPaymentsTotal?: number;
  obligationsCount?: number;
};

export type SupportTicket = {
  id: string;
  code: string;
  type: SupportTicketType;
  subject: string;
  message: string;
  userName: string;
  userEmail: string;
  userPlan: UserPlan;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  createdAt: string;
  updatedAt: string;
  lastReplyAt?: string;
};

export type AdminLog = {
  id: string;
  action: string;
  affectedUser?: string;
  adminName: string;
  createdAt: string;
  details?: string;
};

export type PlanLimit = {
  plan: UserPlan;
  name: string;
  description: string;
  monthlyPrice: number;
  promotionalPrice?: number;
  promotionLabel?: string;
  promotionEndsAt?: string;
  isPromotionActive: boolean;
  clientsLimit: number | "unlimited";
  projectsLimit: number | "unlimited";
  storageLimit: string;
  hasPdf: boolean;
  hasAi: boolean;
  isActive: boolean;
};
