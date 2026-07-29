"use client";

/* eslint-disable @next/next/no-img-element */

import { CheckCircle2, MoreVertical, Trash2 } from "lucide-react";
import { useState } from "react";
import { currencyFormatter, formatDate, getInitials } from "./finance-utils";
import { PaymentStatusBadge } from "./payment-status-badge";
import { paymentTypeLabels, type Payment } from "./types";

type PaymentsTableProps = {
  payments: Payment[];
  isPending: boolean;
  onViewDetails: (payment: Payment) => void;
  onMarkAsPaid: (payment: Payment) => void;
  onDelete: (payment: Payment) => void;
};

function ClientAvatar({ payment }: { payment: Payment }) {
  if (payment.clientLogoUrl) {
    return <img className="finance-client-logo" src={payment.clientLogoUrl} alt={`Logo de ${payment.clientName}`} />;
  }

  return <i>{getInitials(payment.clientName)}</i>;
}

export function PaymentsTable({ payments, isPending, onViewDetails, onMarkAsPaid, onDelete }: PaymentsTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <section className="finance-table-card" aria-label="Recebimentos">
      <div className="finance-table-wrap">
        <table className="finance-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Projeto</th>
              <th>Descrição</th>
              <th>Tipo</th>
              <th>Vencimento</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Recebido em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <div className="finance-table-empty">
                    <strong>Nenhum recebimento encontrado</strong>
                    <span>Cadastre um recebimento ou ajuste os filtros para visualizar os dados financeiros.</span>
                  </div>
                </td>
              </tr>
            )}
            {payments.map((payment) => (
              <tr key={payment.id} className="is-clickable" onClick={() => onViewDetails(payment)}>
                <td>
                  <span className="finance-client-cell">
                    <ClientAvatar payment={payment} />
                    <strong>{payment.clientName}</strong>
                  </span>
                </td>
                <td>{payment.projectName}</td>
                <td>{payment.description}</td>
                <td>
                  <span className={`finance-type-badge is-${payment.type}`}>
                    {paymentTypeLabels[payment.type]}
                  </span>
                </td>
                <td className={payment.status === "overdue" ? "is-danger" : ""}>{formatDate(payment.dueDate)}</td>
                <td><strong>{currencyFormatter.format(payment.amount)}</strong></td>
                <td><PaymentStatusBadge status={payment.status} /></td>
                <td>{formatDate(payment.paidAt)}</td>
                <td>
                  <div className="finance-menu-wrap" onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      className="finance-icon-button"
                      aria-label={`Ações de ${payment.description}`}
                      aria-expanded={openMenuId === payment.id}
                      onClick={() => setOpenMenuId((current) => current === payment.id ? null : payment.id)}
                    >
                      <MoreVertical size={18} />
                    </button>
                    {openMenuId === payment.id && (
                      <div className="finance-menu" role="menu">
                        <button type="button" role="menuitem" onClick={() => { setOpenMenuId(null); onViewDetails(payment); }}>
                          Ver detalhes
                        </button>
                        <button type="button" role="menuitem" disabled={isPending || payment.status === "paid"} onClick={() => { setOpenMenuId(null); onMarkAsPaid(payment); }}>
                          <CheckCircle2 size={15} />
                          Marcar como pago
                        </button>
                        <button type="button" role="menuitem" className="is-danger" disabled={isPending} onClick={() => { setOpenMenuId(null); onDelete(payment); }}>
                          <Trash2 size={15} />
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="finance-table-footer">
        <span>{payments.length > 0 ? `Mostrando 1 a ${payments.length} de ${payments.length} recebimentos` : "Mostrando 0 de 0 recebimentos"}</span>
        <div className="finance-pagination">
          <button type="button" className="finance-page-button" disabled>‹</button>
          <strong className="finance-page-button is-active">1</strong>
          <button type="button" className="finance-page-button" disabled>›</button>
        </div>
      </footer>
    </section>
  );
}
