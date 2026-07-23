"use client";

import { createElement, useEffect } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, CheckCircle2, ClipboardList, DollarSign, Repeat2, Tag, UserRound, X, type LucideIcon } from "lucide-react";
import { formatCurrency, formatDate } from "./obligations-utils";
import { obligationRecurrenceLabels, obligationStatusLabels, obligationTypeLabels, type Obligation } from "./types";

type ObligationDetailsDialogProps = {
  obligation: Obligation;
  onClose: () => void;
  onEdit: () => void;
  onMarkAsPaid: () => void;
};

function DetailItem({ label, value, icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="obligations-detail-item">
      {createElement(icon, { size: 16 })}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function ObligationDetailsDialog({ obligation, onClose, onEdit, onMarkAsPaid }: ObligationDetailsDialogProps) {
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

  return createPortal(
    <div className="obligations-dialog-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="obligations-dialog obligations-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="obligation-detail-title">
        <header>
          <div>
            <span>Detalhes da obrigação</span>
            <h2 id="obligation-detail-title">{obligation.title}</h2>
          </div>
          <button type="button" aria-label="Fechar modal" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <div className="obligations-detail-body">
          <p>{obligation.description || "Nenhuma descrição cadastrada para esta obrigação."}</p>
          <div className="obligations-detail-grid">
            <DetailItem label="Tipo" value={obligationTypeLabels[obligation.type]} icon={Tag} />
            <DetailItem label="Recorrência" value={obligationRecurrenceLabels[obligation.recurrence]} icon={Repeat2} />
            <DetailItem label="Vencimento" value={formatDate(obligation.dueDate)} icon={CalendarDays} />
            <DetailItem label="Valor" value={formatCurrency(obligation.amount)} icon={DollarSign} />
            <DetailItem label="Status" value={obligationStatusLabels[obligation.status]} icon={CheckCircle2} />
            <DetailItem label="Situação" value={obligation.isActive ? "Ativa" : "Inativa"} icon={ClipboardList} />
          </div>

          {(obligation.clientName || obligation.projectName) && (
            <div className="obligations-detail-context">
              <UserRound size={17} />
              <div>
                <span>Contexto vinculado</span>
                <strong>{[obligation.clientName, obligation.projectName].filter(Boolean).join(" · ")}</strong>
              </div>
            </div>
          )}
        </div>

        <footer>
          <button type="button" onClick={onEdit}>Editar</button>
          <button type="button" disabled={obligation.status === "paid"} onClick={onMarkAsPaid}>{obligation.status === "paid" ? "Já está paga" : "Marcar como paga"}</button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
