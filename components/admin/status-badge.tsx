import type { UserStatus } from "@/types/admin";

const userLabels: Record<UserStatus, string> = {
  active: "Ativo",
  pending: "Pendente",
  blocked: "Bloqueado",
};

export function StatusBadge({ status }: { status: UserStatus }) {
  return <span className={`admin-badge status-${status}`}>{userLabels[status]}</span>;
}
