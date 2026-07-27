"use client";

import { CheckCircle2, MoreVertical, Pencil, Power, Trash2 } from "lucide-react";
import { createElement, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatCurrency, formatDate, getTitleIcon } from "./obligations-utils";
import { obligationRecurrenceLabels, obligationStatusLabels, obligationTypeLabels, type Obligation } from "./types";

type ObligationsTableProps = {
  obligations: Obligation[];
  onViewDetails: (obligation: Obligation) => void;
  onEdit: (obligation: Obligation) => void;
  onMarkAsPaid: (id: string) => void;
  onDeactivate: (id: string) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
};

type OpenMenu = {
  id: string;
  top: number;
  left: number;
};

export function ObligationsTable({ obligations, onViewDetails, onEdit, onMarkAsPaid, onDeactivate, onDelete, isPending }: ObligationsTableProps) {
  const [openMenu, setOpenMenu] = useState<OpenMenu | null>(null);

  useEffect(() => {
    if (!openMenu) return;

    const closeMenu = () => setOpenMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    window.addEventListener("mousedown", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenu]);

  const handleToggleMenu = (obligationId: string, button: HTMLButtonElement) => {
    const rect = button.getBoundingClientRect();
    setOpenMenu((current) => current?.id === obligationId ? null : {
      id: obligationId,
      top: rect.bottom + 8,
      left: Math.max(12, Math.min(rect.right - 144, window.innerWidth - 156)),
    });
  };

  return (
    <section className="obligations-table-card" aria-label="Lista de obrigações">
      <div className="obligations-table-wrap">
        <table className="obligations-table">
          <thead>
            <tr>
              <th>Obrigação</th>
              <th>Tipo</th>
              <th>Recorrência</th>
              <th>Vencimento</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {obligations.map((obligation) => {
              const Icon = getTitleIcon(obligation.title, obligation.type);
              const isMenuOpen = openMenu?.id === obligation.id;

              return (
                <tr key={obligation.id} className="is-clickable" onClick={() => onViewDetails(obligation)}>
                  <td>
                    <div className="obligations-table-title">
                      <span className={`obligation-avatar is-${obligation.type}`}>{createElement(Icon, { size: 18 })}</span>
                      <div>
                        <strong>{obligation.title}</strong>
                        <small>{obligation.description ?? [obligation.clientName, obligation.projectName].filter(Boolean).join(" · ")}</small>
                      </div>
                    </div>
                  </td>
                  <td>{obligationTypeLabels[obligation.type]}</td>
                  <td>{obligationRecurrenceLabels[obligation.recurrence]}</td>
                  <td>{formatDate(obligation.dueDate)}</td>
                  <td>{formatCurrency(obligation.amount)}</td>
                  <td><span className={`obligation-status is-${obligation.status}`}>{obligationStatusLabels[obligation.status]}</span></td>
                  <td>
                    <div className="obligations-row-actions">
                      <button type="button" className="obligation-icon-button" title="Marcar como paga" disabled={obligation.status === "paid" || isPending} onClick={(event) => { event.stopPropagation(); onMarkAsPaid(obligation.id); }}>
                        <CheckCircle2 size={18} />
                      </button>
                      <button type="button" className="obligation-icon-button" title="Editar" onClick={(event) => { event.stopPropagation(); onEdit(obligation); }}>
                        <Pencil size={18} />
                      </button>
                      <button
                        type="button"
                        className="obligation-icon-button"
                        aria-label={`Mais ações de ${obligation.title}`}
                        aria-expanded={isMenuOpen}
                        disabled={isPending}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => { event.stopPropagation(); handleToggleMenu(obligation.id, event.currentTarget); }}
                      >
                        <MoreVertical size={19} />
                      </button>
                    </div>
                    {isMenuOpen && typeof document !== "undefined" && createPortal(
                      <div className="obligation-menu is-table-menu" role="menu" style={{ top: openMenu.top, left: openMenu.left }} onMouseDown={(event) => event.stopPropagation()}>
                        <button type="button" role="menuitem" onClick={() => { onDeactivate(obligation.id); setOpenMenu(null); }}>
                          <Power size={16} />
                          Desativar
                        </button>
                        <button type="button" role="menuitem" className="is-danger" onClick={() => { onDelete(obligation.id); setOpenMenu(null); }}>
                          <Trash2 size={16} />
                          Excluir
                        </button>
                      </div>,
                      document.body,
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="obligations-table-footer">
        <span>Mostrando 1 a {obligations.length} de {obligations.length} obrigações</span>
        <div>
          <button type="button" disabled>‹</button>
          <strong>1</strong>
          <button type="button" disabled>›</button>
        </div>
      </footer>
    </section>
  );
}
