import { AdminHeader } from "@/components/admin/admin-header";
import { LogsTable } from "@/components/admin/logs-table";
import { adminLogs } from "@/data/admin-mock";

export default function AdminLogsPage() {
  return (
    <div className="admin-page">
      <AdminHeader title="Logs" description="Auditoria de ações importantes realizadas na plataforma." />
      <section className="admin-filter-bar">
        <input type="search" placeholder="Buscar logs..." aria-label="Buscar logs" />
        <select aria-label="Filtrar ação"><option>Ação: Todas</option><option>Login de admin</option><option>Usuário bloqueado</option><option>Plano alterado</option></select>
        <select aria-label="Filtrar admin"><option>Admin: Todos</option><option>Igor Franco</option></select>
        <select aria-label="Filtrar período"><option>Período: Últimos 30 dias</option><option>Hoje</option><option>Ontem</option></select>
        <button type="button" className="admin-secondary-button">Limpar filtros</button>
      </section>
      <LogsTable logs={adminLogs} />
    </div>
  );
}
