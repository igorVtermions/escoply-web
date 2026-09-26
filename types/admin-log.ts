export type AdminLogType =
  | "auth"
  | "user"
  | "plan"
  | "support"
  | "settings"
  | "security"
  | "system";

export type AdminLogSeverity = "info" | "warning" | "danger" | "success";

export type AdminLogStatus = "success" | "failed";

export type AdminAuditLog = {
  id: string;
  title: string;
  description: string;
  type: AdminLogType;
  severity: AdminLogSeverity;
  status: AdminLogStatus;
  affectedUser?: string;
  affectedUserEmail?: string;
  adminName: string;
  adminEmail?: string;
  createdAt: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: {
    before?: string;
    after?: string;
  };
};
