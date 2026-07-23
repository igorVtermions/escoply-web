import { paymentStatusLabels, type PaymentStatus } from "./types";

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <span className={`finance-status-badge is-${status}`}>{paymentStatusLabels[status]}</span>;
}
