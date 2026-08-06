import type { AdminLog } from "@/types/admin";

export function LogsTable({ logs }: { logs: AdminLog[] }) {
  return (
    <div className="admin-table-card">
      <table className="admin-table">
        <thead>
          <tr><th>Ação</th><th>Usuário afetado</th><th>Admin responsável</th><th>Data</th><th>Detalhes</th></tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td><strong>{log.action}</strong></td>
              <td>{log.affectedUser ?? "—"}</td>
              <td>{log.adminName}</td>
              <td>{log.createdAt}</td>
              <td className="admin-message-cell">{log.details ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
