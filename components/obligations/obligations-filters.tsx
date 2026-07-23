import { CalendarDays, RotateCcw, Search } from "lucide-react";
import { obligationRecurrenceLabels, obligationStatusLabels, obligationTypeLabels, type ObligationFiltersState, type ObligationPeriodFilter, type ObligationRecurrence, type ObligationStatus, type ObligationType } from "./types";

type ObligationsFiltersProps = {
  filters: ObligationFiltersState;
  onChange: (filters: ObligationFiltersState) => void;
  onClear: () => void;
};

const periodLabels: Record<ObligationPeriodFilter, string> = {
  all: "Todos",
  this_month: "Este mês",
  next_7_days: "Próx. 7 dias",
  overdue: "Atrasadas",
};

export function ObligationsFilters({ filters, onChange, onClear }: ObligationsFiltersProps) {
  return (
    <section className="obligations-filters" aria-label="Filtros de obrigações">
      <label className="obligations-search-field">
        <Search size={18} />
        <input
          type="search"
          value={filters.search}
          placeholder="Buscar obrigações..."
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
        />
      </label>

      <label className="obligations-select-field">
        <span>Tipo</span>
        <select value={filters.type} onChange={(event) => onChange({ ...filters, type: event.target.value as ObligationType | "all" })}>
          <option value="all">Todos</option>
          {Object.entries(obligationTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>

      <label className="obligations-select-field">
        <span>Status</span>
        <select value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value as ObligationStatus | "all" })}>
          <option value="all">Todos</option>
          {Object.entries(obligationStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>

      <label className="obligations-select-field">
        <span>Recorrência</span>
        <select value={filters.recurrence} onChange={(event) => onChange({ ...filters, recurrence: event.target.value as ObligationRecurrence | "all" })}>
          <option value="all">Todos</option>
          {Object.entries(obligationRecurrenceLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>

      <label className="obligations-select-field is-period">
        <CalendarDays size={17} />
        <span>Período</span>
        <select value={filters.period} onChange={(event) => onChange({ ...filters, period: event.target.value as ObligationPeriodFilter })}>
          {Object.entries(periodLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>

      <button type="button" className="obligations-clear-button" onClick={onClear}>
        <RotateCcw size={18} />
        Limpar filtros
      </button>
    </section>
  );
}
