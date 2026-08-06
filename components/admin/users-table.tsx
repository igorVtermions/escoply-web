"use client";

import type { AdminUser } from "@/types/admin";
import { PlanBadge } from "./plan-badge";
import { StatusBadge } from "./status-badge";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UsersTable({
  users,
  compact = false,
  onUserClick,
}: {
  users: AdminUser[];
  compact?: boolean;
  onUserClick?: (user: AdminUser) => void;
}) {
  return (
    <div className="admin-table-card">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Usuário</th>
            <th>E-mail</th>
            <th>Plano</th>
            <th>Status</th>
            {!compact ? <th>Profissão</th> : null}
            <th>Criado em</th>
            {!compact ? <th>Último acesso</th> : null}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.id}
              className={onUserClick ? "is-clickable" : undefined}
              tabIndex={onUserClick ? 0 : undefined}
              onClick={() => onUserClick?.(user)}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === " ") && onUserClick) onUserClick(user);
              }}
            >
              <td>
                <span className="admin-user-cell">
                  <i>{getInitials(user.name)}</i>
                  <strong>{user.name}</strong>
                </span>
              </td>
              <td>{user.email}</td>
              <td>
                <PlanBadge plan={user.plan} />
              </td>
              <td>
                <StatusBadge status={user.status} />
              </td>
              {!compact ? <td>{user.profession ?? "—"}</td> : null}
              <td>{user.createdAt}</td>
              {!compact ? <td>{user.lastLoginAt ?? "—"}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
