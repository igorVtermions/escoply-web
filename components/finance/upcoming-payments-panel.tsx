import { CalendarDays } from "lucide-react";
import { currencyFormatter, sortByDueDate } from "./finance-utils";
import { PaymentStatusBadge } from "./payment-status-badge";
import type { Payment } from "./types";

export function UpcomingPaymentsPanel({ payments }: { payments: Payment[] }) {
  const upcoming = sortByDueDate(payments.filter((payment) => payment.status === "pending" || payment.status === "overdue")).slice(0, 4);

  return (
    <section className="finance-side-card">
      <header>
        <h2>Próximas cobranças</h2>
        <span><CalendarDays size={17} /></span>
      </header>
      <div className="finance-upcoming-list">
        {upcoming.map((payment) => {
          const date = new Date(`${payment.dueDate}T12:00:00Z`);

          return (
            <article key={payment.id} className="finance-upcoming-item">
              <time className="finance-date-pill" dateTime={payment.dueDate}>
                <strong>{String(date.getUTCDate()).padStart(2, "0")}</strong>
                <span>{date.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }).replace(".", "")}</span>
              </time>
              <div>
                <strong>{payment.clientName}</strong>
                <span>{payment.projectName}</span>
              </div>
              <div className="finance-upcoming-value">
                <strong>{currencyFormatter.format(payment.amount)}</strong>
                <PaymentStatusBadge status={payment.status} />
              </div>
            </article>
          );
        })}
        {upcoming.length === 0 && <p className="finance-empty">Nenhuma cobrança próxima.</p>}
      </div>
    </section>
  );
}
