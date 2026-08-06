import type { UserRole } from "@/types/admin";

const labels: Record<UserRole, string> = {
  admin: "Admin",
  user: "Usuário",
};

export function RoleBadge({ role }: { role: UserRole }) {
  return <span className={`admin-badge role-${role}`}>{labels[role]}</span>;
}
