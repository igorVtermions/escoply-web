import { CalendarDays, RotateCcw, Search } from "lucide-react";
import { paymentStatusLabels, paymentTypeLabels, type FinanceClientOption, type FinanceFiltersState } from "./types";

type FinanceFiltersProps = {
  filters: FinanceFiltersState;
  clients: FinanceClientOption[];
  onChange: (filters: FinanceFiltersState) => void;
  onClear: () => void;
};

export function FinanceFilters({ filters, clients, onChange, onClear }: FinanceFiltersProps) {
  return (
    <section className="finance-filters" aria-label="Filtros financeiros">
      <label className="finance-search-field">
        <Search size={18} />
        <input
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Buscar por cliente, projeto ou descrição..."
        />
      </label>

      <label className="finance-select-field">
        <span>Status</span>
        <select value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value as FinanceFiltersState["status"] })}>
          <option value="all">Todos</option>
          {Object.entries(paymentStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>

      <label className="finance-select-field">
        <CalendarDays size={16} />
        <span>Período</span>
        <select value={filters.period} onChange={(event) => onChange({ ...filters, period: event.target.value as FinanceFiltersState["period"] })}>
          <option value="all">Todos</option>
          <option value="this_month">Este mês</option>
          <option value="next_30_days">Próximos 30 dias</option>
          <option value="overdue">Atrasados</option>
        </select>
      </label>

      <label className="finance-select-field">
        <span>Cliente</span>
        <select value={filters.client} onChange={(event) => onChange({ ...filters, client: event.target.value })}>
          <option value="all">Todos</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
      </label>

      <label className="finance-select-field">
        <span>Tipo</span>
        <select value={filters.type} onChange={(event) => onChange({ ...filters, type: event.target.value as FinanceFiltersState["type"] })}>
          <option value="all">Todos</option>
          {Object.entries(paymentTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>

      <button type="button" className="finance-clear-button" onClick={onClear}>
        <RotateCcw size={17} />
        Limpar filtros
      </button>
    </section>
  );
}
