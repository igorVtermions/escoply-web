"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

type ToastPayload = {
  type?: ToastType;
  title: string;
  description?: string;
  duration?: number;
};

type ToastItem = Required<Pick<ToastPayload, "type" | "duration">> &
  Pick<ToastPayload, "title" | "description"> & {
    id: string;
  };

const TOAST_EVENT = "escoply:toast";
const DEFAULT_DURATION = 5200;

export function showToast(payload: ToastPayload) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<ToastPayload>(TOAST_EVENT, {
      detail: payload,
    }),
  );
}

function getToastIcon(type: ToastType) {
  if (type === "success") return <CheckCircle2 size={20} aria-hidden="true" />;
  if (type === "error") return <AlertCircle size={20} aria-hidden="true" />;
  return <Info size={20} aria-hidden="true" />;
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToast = (event: Event) => {
      const customEvent = event as CustomEvent<ToastPayload>;
      const payload = customEvent.detail;
      const id = crypto.randomUUID();

      setToasts((current) => [
        ...current,
        {
          id,
          type: payload.type ?? "info",
          title: payload.title,
          description: payload.description,
          duration: payload.duration ?? DEFAULT_DURATION,
        },
      ]);
    };

    window.addEventListener(TOAST_EVENT, handleToast);
    return () => window.removeEventListener(TOAST_EVENT, handleToast);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;

    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, toast.duration),
    );

    return () => timers.forEach(window.clearTimeout);
  }, [toasts]);

  const visibleToasts = useMemo(() => toasts.slice(-4), [toasts]);

  if (visibleToasts.length === 0) return null;

  return (
    <div className="toast-viewport" role="region" aria-label="Notificações">
      {visibleToasts.map((toast) => (
        <div key={toast.id} className={`toast-card toast-${toast.type}`} role="status" aria-live="polite">
          <div className="toast-icon">{getToastIcon(toast.type)}</div>
          <div className="toast-content">
            <p>{toast.title}</p>
            {toast.description && <span>{toast.description}</span>}
          </div>
          <button
            type="button"
            className="toast-close"
            onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
            aria-label="Fechar notificação"
          >
            <X size={16} />
          </button>
          <span className="toast-progress" style={{ animationDuration: `${toast.duration}ms` }} />
        </div>
      ))}
    </div>
  );
}
