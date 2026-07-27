import { Plus } from "lucide-react";

type ObligationsPageHeaderProps = {
  onCreate: () => void;
};

export function ObligationsPageHeader({ onCreate }: ObligationsPageHeaderProps) {
  return (
    <header className="obligations-page-header">
      <div>
        <h1>Obrigações</h1>
        <p>Controle impostos, assinaturas, compromissos recorrentes e tarefas administrativas.</p>
      </div>
      <button type="button" className="obligations-primary-button" onClick={onCreate}>
        <Plus size={20} />
        Nova obrigação
      </button>
    </header>
  );
}
