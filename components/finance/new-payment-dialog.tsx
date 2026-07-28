"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { paymentStatusLabels, paymentTypeLabels, paymentTypeUseCases, type FinanceClientOption, type FinanceProjectOption, type PaymentType } from "./types";

type NewPaymentDialogProps = {
  clients: FinanceClientOption[];
  projects: FinanceProjectOption[];
  isPending: boolean;
  onClose: () => void;
  onCreate: (formData: FormData) => void;
};

export function NewPaymentDialog({ clients, projects, isPending, onClose, onCreate }: NewPaymentDialogProps) {
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id ?? "all");
  const [selectedType, setSelectedType] = useState<PaymentType>("installment");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const visibleProjects = useMemo(() => {
    if (selectedClientId === "all") return projects;
    return projects.filter((project) => project.clientId === selectedClientId);
  }, [projects, selectedClientId]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onCreate(new FormData(event.currentTarget));
  };

  return createPortal(
    <div className="finance-dialog-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="finance-dialog" role="dialog" aria-modal="true" aria-labelledby="finance-dialog-title">
        <header className="finance-dialog-header">
          <div>
            <p className="finance-dialog-eyebrow">Financeiro</p>
            <h2 id="finance-dialog-title">Novo recebimento</h2>
          </div>
          <button type="button" className="finance-dialog-close" aria-label="Fechar modal" onClick={onClose}>
            <X size={22} />
          </button>
        </header>

        <form className="finance-dialog-form" onSubmit={handleSubmit}>
          <div className="finance-dialog-grid">
            <label className="finance-dialog-field">
              <span>Cliente</span>
              <select value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)}>
                <option value="all">Todos os clientes</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </label>
            <label className="finance-dialog-field">
              <span>Projeto</span>
              <select name="projectId" required>
                <option value="">Selecione um projeto</option>
                {visibleProjects.map((project) => <option key={project.id} value={project.id}>{project.name} · {project.clientName}</option>)}
              </select>
            </label>
          </div>

          <label className="finance-dialog-field">
            <span>Descrição</span>
            <input name="description" required placeholder="Ex.: Sinal 50%, parcela 1, saldo final..." />
          </label>

          <div className="finance-dialog-grid">
            <label className="finance-dialog-field">
              <span>Tipo</span>
              <select name="type" value={selectedType} onChange={(event) => setSelectedType(event.target.value as PaymentType)}>
                {Object.entries(paymentTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <small className="finance-type-help">{paymentTypeUseCases[selectedType]}</small>
            </label>
            <label className="finance-dialog-field">
              <span>Status</span>
              <select name="status" defaultValue="pending">
                {Object.entries(paymentStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="finance-dialog-field">
              <span>Vencimento</span>
              <input name="dueDate" type="date" required />
            </label>
            <label className="finance-dialog-field">
              <span>Recebido em</span>
              <input name="paidAt" type="date" />
            </label>
          </div>

          <label className="finance-dialog-field">
            <span>Valor</span>
            <input name="amount" inputMode="decimal" required placeholder="Ex.: 4.100,00" />
          </label>

          <footer className="finance-dialog-actions">
            <button type="button" className="finance-dialog-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="finance-dialog-primary" disabled={isPending}>{isPending ? "Criando..." : "Criar recebimento"}</button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}
