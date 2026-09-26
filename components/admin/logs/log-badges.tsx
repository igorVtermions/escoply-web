import type { AdminLogSeverity, AdminLogStatus, AdminLogType } from "@/types/admin-log";

const typeLabels: Record<AdminLogType, string> = {
  auth: "Autenticação",
  user: "Usuário",
  plan: "Plano",
  support: "Suporte",
  settings: "Configurações",
  security: "Segurança",
  system: "Sistema",
};

const severityLabels: Record<AdminLogSeverity, string> = {
  info: "Informação",
  warning: "Atenção",
  danger: "Crítico",
  success: "Sucesso",
};

const statusLabels: Record<AdminLogStatus, string> = {
  success: "Sucesso",
  failed: "Falhou",
};

export function LogTypeBadge({ type }: { type: AdminLogType }) {
  return <span className={`admin-badge admin-log-type-${type}`}>{typeLabels[type]}</span>;
}

export function LogSeverityBadge({ severity }: { severity: AdminLogSeverity }) {
  return <span className={`admin-badge admin-log-severity-${severity}`}>{severityLabels[severity]}</span>;
}

export function LogStatusBadge({ status }: { status: AdminLogStatus }) {
  return <span className={`admin-badge admin-log-status-${status}`}><i /> {statusLabels[status]}</span>;
}

export { severityLabels, statusLabels, typeLabels };
