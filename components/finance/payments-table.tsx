import { MoreVertical } from "lucide-react";
import { currencyFormatter, formatDate, getInitials } from "./finance-utils";
import { PaymentStatusBadge } from "./payment-status-badge";
import { paymentTypeLabels, type Payment } from "./types";

export function PaymentsTable({ payments }: { payments: Payment[] }) {
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
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td>
                  <span className="finance-client-cell">
                    <i>{getInitials(payment.clientName)}</i>
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
                  <button type="button" className="finance-icon-button" aria-label={`Ações de ${payment.description}`}>
                    <MoreVertical size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="finance-table-footer">
        <span>Mostrando 1 a {payments.length} de {payments.length} recebimentos</span>
        <div className="finance-pagination">
          <button type="button" className="finance-page-button" disabled>‹</button>
          <strong className="finance-page-button is-active">1</strong>
          <button type="button" className="finance-page-button" disabled>›</button>
        </div>
      </footer>
    </section>
  );
}
