import { Plus } from "lucide-react";

export function FinancePageHeader({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="finance-page-header">
      <div>
        <h1>Financeiro</h1>
        <p>Controle recebimentos, cobranças e pagamentos vinculados aos seus projetos.</p>
      </div>
      <button type="button" className="finance-primary-button" onClick={onCreate}>
        <Plus size={19} />
        Novo recebimento
      </button>
    </div>
  );
}
