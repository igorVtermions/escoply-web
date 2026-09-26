import type { AdminLogSeverity, AdminLogStatus, AdminLogType } from "@/types/admin-log";
import { severityLabels, statusLabels, typeLabels } from "./log-badges";

export type LogsPeriodFilter = "all" | "today" | "yesterday" | "week" | "month";

export type LogsFiltersState = {
  query: string;
  type: "all" | AdminLogType;
  severity: "all" | AdminLogSeverity;
  status: "all" | AdminLogStatus;
  admin: string;
  period: LogsPeriodFilter;
};

type LogsFiltersProps = {
  filters: LogsFiltersState;
  admins: string[];
  onChange: <Key extends keyof LogsFiltersState>(key: Key, value: LogsFiltersState[Key]) => void;
  onClear: () => void;
};

export const initialLogsFilters: LogsFiltersState = {
  query: "",
  type: "all",
  severity: "all",
  status: "all",
  admin: "all",
  period: "month",
};

export function LogsFilters({ filters, admins, onChange, onClear }: LogsFiltersProps) {
  return (
    <section className="admin-filter-bar admin-logs-filter-bar">
      <input
        type="search"
        placeholder="Buscar por ação, usuário ou detalhe..."
        aria-label="Buscar logs"
        value={filters.query}
        onChange={(event) => onChange("query", event.target.value)}
      />
      <select aria-label="Filtrar tipo" value={filters.type} onChange={(event) => onChange("type", event.target.value as LogsFiltersState["type"])}>
        <option value="all">Tipo: Todos</option>
        {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <select aria-label="Filtrar severidade" value={filters.severity} onChange={(event) => onChange("severity", event.target.value as LogsFiltersState["severity"])}>
        <option value="all">Severidade: Todas</option>
        {Object.entries(severityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <select aria-label="Filtrar status" value={filters.status} onChange={(event) => onChange("status", event.target.value as LogsFiltersState["status"])}>
        <option value="all">Status: Todos</option>
        {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <select aria-label="Filtrar admin" value={filters.admin} onChange={(event) => onChange("admin", event.target.value)}>
        <option value="all">Admin: Todos</option>
        {admins.map((adminName) => <option key={adminName} value={adminName}>{adminName}</option>)}
      </select>
      <select aria-label="Filtrar período" value={filters.period} onChange={(event) => onChange("period", event.target.value as LogsPeriodFilter)}>
        <option value="month">Período: Este mês</option>
        <option value="today">Hoje</option>
        <option value="yesterday">Ontem</option>
        <option value="week">Últimos 7 dias</option>
        <option value="all">Todo período</option>
      </select>
      <button type="button" className="admin-secondary-button" onClick={onClear}>Limpar filtros</button>
    </section>
  );
}
