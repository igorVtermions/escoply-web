"use client";

import { CheckCircle2, MoreVertical, Pencil, Power, Trash2 } from "lucide-react";
import { createElement, useState } from "react";
import { formatCurrency, formatDate, getInitials, getTitleIcon } from "./obligations-utils";
import { obligationRecurrenceLabels, obligationStatusLabels, obligationTypeLabels, type Obligation } from "./types";

type ObligationCardProps = {
  obligation: Obligation;
  onViewDetails: (obligation: Obligation) => void;
  onEdit: (obligation: Obligation) => void;
  onMarkAsPaid: (id: string) => void;
  onDeactivate: (id: string) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
};

export function ObligationCard({
  obligation,
  onViewDetails,
  onEdit,
  onMarkAsPaid,
  onDeactivate,
  onDelete,
  isPending,
}: ObligationCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const Icon = getTitleIcon(obligation.title, obligation.type);

  return (
    <article
      className="obligation-card"
      role="button"
      tabIndex={0}
      onClick={() => onViewDetails(obligation)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onViewDetails(obligation);
      }}
    >
      <div className="obligation-card-top">
        <div className={`obligation-avatar is-${obligation.type}`}>
          {createElement(Icon, { size: 20 })}
        </div>
        <div>
          <h3>{obligation.title}</h3>
          {obligation.description && <p>{obligation.description}</p>}
        </div>
        <div className="obligation-menu-wrap">
          <button
            type="button"
            className="obligation-icon-button"
            aria-label={`Ações de ${obligation.title}`}
            disabled={isPending}
            onClick={(event) => {
              event.stopPropagation();
              setIsMenuOpen((current) => !current);
            }}
          >
            <MoreVertical size={19} />
          </button>
          {isMenuOpen && (
            <div className="obligation-menu" role="menu" onClick={(event) => event.stopPropagation()}>
              <button type="button" role="menuitem" onClick={() => { onEdit(obligation); setIsMenuOpen(false); }}>
                <Pencil size={16} />
                Editar
              </button>
              <button type="button" role="menuitem" onClick={() => { onDeactivate(obligation.id); setIsMenuOpen(false); }}>
                <Power size={16} />
                Desativar
              </button>
              <button type="button" role="menuitem" className="is-danger" onClick={() => { onDelete(obligation.id); setIsMenuOpen(false); }}>
                <Trash2 size={16} />
                Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="obligation-card-meta">
        <span>{obligationTypeLabels[obligation.type]}</span>
        <span>{obligationRecurrenceLabels[obligation.recurrence]}</span>
        <span>{formatDate(obligation.dueDate)}</span>
      </div>

      {(obligation.clientName || obligation.projectName) && (
        <p className="obligation-card-context">
          {obligation.clientName && <strong>{getInitials(obligation.clientName)}</strong>}
          <span>{[obligation.clientName, obligation.projectName].filter(Boolean).join(" · ")}</span>
        </p>
      )}

      <div className="obligation-card-bottom">
        <strong>{formatCurrency(obligation.amount)}</strong>
        <span className={`obligation-status is-${obligation.status}`}>{obligationStatusLabels[obligation.status]}</span>
      </div>

      <button
        type="button"
        className="obligation-mark-paid"
        disabled={obligation.status === "paid" || isPending}
        onClick={(event) => {
          event.stopPropagation();
          onMarkAsPaid(obligation.id);
        }}
      >
        <CheckCircle2 size={17} />
        {obligation.status === "paid" ? "Obrigação paga" : isPending ? "Atualizando..." : "Marcar como paga"}
      </button>
    </article>
  );
}
