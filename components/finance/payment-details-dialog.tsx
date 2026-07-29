"use client";

/* eslint-disable @next/next/no-img-element */

import { CalendarDays, CheckCircle2, Clock3, FolderKanban, Trash2, UserRound, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { currencyFormatter, formatDate, getInitials } from "./finance-utils";
import { PaymentStatusBadge } from "./payment-status-badge";
import { paymentTypeLabels, paymentTypeUseCases, type Payment } from "./types";

type PaymentDetailsDialogProps = {
  payment: Payment;
  isPending: boolean;
  onClose: () => void;
  onMarkAsPaid: () => void;
  onDelete: () => void;
};

export function PaymentDetailsDialog({ payment, isPending, onClose, onMarkAsPaid, onDelete }: PaymentDetailsDialogProps) {
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
    <div className="finance-dialog-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="finance-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="finance-detail-title">
        <header className="finance-detail-header">
          <div className="finance-detail-title-row">
            {payment.clientLogoUrl ? (
              <img className="finance-detail-logo" src={payment.clientLogoUrl} alt={`Logo de ${payment.clientName}`} />
            ) : (
              <span className="finance-detail-avatar">{getInitials(payment.clientName)}</span>
            )}
            <div>
              <p className="finance-dialog-eyebrow">Recebimento</p>
              <h2 id="finance-detail-title">{payment.description}</h2>
              <span>{payment.clientName} · {payment.projectName}</span>
            </div>
          </div>
          <button type="button" className="finance-dialog-close" aria-label="Fechar modal" onClick={onClose}>
            <X size={22} />
          </button>
        </header>

        <div className="finance-detail-body">
          <div className="finance-detail-value-card">
            <span>Valor</span>
            <strong>{currencyFormatter.format(payment.amount)}</strong>
            <PaymentStatusBadge status={payment.status} />
          </div>

          <div className="finance-detail-grid">
            <article>
              <CalendarDays size={18} />
              <span>Vencimento</span>
              <strong>{formatDate(payment.dueDate)}</strong>
            </article>
            <article>
              <Clock3 size={18} />
              <span>Recebido em</span>
              <strong>{formatDate(payment.paidAt)}</strong>
            </article>
            <article>
              <UserRound size={18} />
              <span>Cliente</span>
              <strong>{payment.clientName}</strong>
            </article>
            <article>
              <FolderKanban size={18} />
              <span>Projeto</span>
              <strong>{payment.projectName}</strong>
            </article>
            <article>
              <CheckCircle2 size={18} />
              <span>Tipo</span>
              <strong>{paymentTypeLabels[payment.type]}</strong>
            </article>
            <article>
              <CheckCircle2 size={18} />
              <span>Status</span>
              <strong>{payment.status === "paid" ? "Pago" : payment.status === "overdue" ? "Atrasado" : payment.status === "canceled" ? "Cancelado" : "Pendente"}</strong>
            </article>
            <article className="finance-detail-grid-full">
              <CheckCircle2 size={18} />
              <span>Como isso entra no controle financeiro</span>
              <strong>{paymentTypeUseCases[payment.type]}</strong>
            </article>
          </div>
        </div>

        <footer className="finance-detail-actions">
          <button type="button" className="finance-detail-paid-button" disabled={isPending || payment.status === "paid"} onClick={onMarkAsPaid}>
            <CheckCircle2 size={16} />
            Marcar como pago
          </button>
          <button type="button" className="finance-detail-delete-button" disabled={isPending} onClick={onDelete}>
            <Trash2 size={16} />
            Excluir
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
