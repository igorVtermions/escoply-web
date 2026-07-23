import { BarChart3 } from "lucide-react";
import { currencyFormatter, sumPayments } from "./finance-utils";
import type { Payment } from "./types";

export function FinanceMonthSummary({ payments }: { payments: Payment[] }) {
  const received = payments.filter((payment) => payment.status === "paid");
  const pending = payments.filter((payment) => payment.status === "pending");
  const overdue = payments.filter((payment) => payment.status === "overdue");
  const total = payments.filter((payment) => payment.status !== "canceled");

  return (
    <section className="finance-side-card">
      <header>
        <h2>Resumo do mês</h2>
        <span><BarChart3 size={17} /></span>
      </header>
      <div className="finance-month-lines">
        <div className="is-success"><span>Recebido</span><strong>{currencyFormatter.format(sumPayments(received))}</strong></div>
        <div className="is-warning"><span>Pendente</span><strong>{currencyFormatter.format(sumPayments(pending))}</strong></div>
        <div className="is-danger"><span>Atrasado</span><strong>{currencyFormatter.format(sumPayments(overdue))}</strong></div>
      </div>
      <footer>
        <span>Total previsto</span>
        <strong>{currencyFormatter.format(sumPayments(total))}</strong>
      </footer>
    </section>
  );
}
