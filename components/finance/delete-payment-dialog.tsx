"use client";

import { Trash2 } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { currencyFormatter } from "./finance-utils";
import type { Payment } from "./types";

type DeletePaymentDialogProps = {
  payment: Payment;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeletePaymentDialog({ payment, isPending, onClose, onConfirm }: DeletePaymentDialogProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPending, onClose]);

  return createPortal(
    <div className="finance-dialog-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isPending) onClose(); }}>
      <section className="finance-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-payment-title" aria-describedby="delete-payment-description">
        <div className="finance-delete-icon"><Trash2 size={25} /></div>
        <h2 id="delete-payment-title">Excluir recebimento?</h2>
        <p id="delete-payment-description">
          Esta ação remove definitivamente o recebimento <strong>{payment.description}</strong> de <strong>{payment.clientName}</strong>, no valor de <strong>{currencyFormatter.format(payment.amount)}</strong>.
        </p>
        <div className="finance-delete-actions">
          <button type="button" onClick={onClose} disabled={isPending}>Cancelar</button>
          <button type="button" onClick={onConfirm} disabled={isPending}>{isPending ? "Excluindo..." : "Sim, excluir"}</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
