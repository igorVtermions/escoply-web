"use client";

import { useActionState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { updateObligationAction } from "@/app/dashboard/obrigacoes/actions";
import { showToast } from "@/components/ui/toast-provider";
import type { ObligationClientOption, ObligationProjectOption } from "@/lib/obligations/data";
import { obligationRecurrenceLabels, obligationStatusLabels, obligationTypeLabels, type Obligation } from "./types";

type EditObligationDialogProps = {
  obligation: Obligation;
  clients: ObligationClientOption[];
  projects: ObligationProjectOption[];
  onClose: () => void;
};

function formatAmountInput(value?: number) {
  return typeof value === "number" ? value.toFixed(2).replace(".", ",") : "";
}

export function EditObligationDialog({ obligation, clients, projects, onClose }: EditObligationDialogProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateObligationAction, { success: false, message: "" });

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

  useEffect(() => {
    if (!state.message) return;
    if (!state.success) {
      showToast({ type: "error", title: "Ação não concluída", description: state.message });
      return;
    }

    showToast({ type: "success", title: "Obrigação atualizada", description: state.message });
    onClose();
    router.refresh();
  }, [onClose, router, state]);

  return createPortal(
    <div className="obligations-dialog-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isPending) onClose(); }}>
      <section className="obligations-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-obligation-title">
        <header>
          <div>
            <span>Editar rotina</span>
            <h2 id="edit-obligation-title">Editar obrigação</h2>
          </div>
          <button type="button" aria-label="Fechar modal" onClick={onClose} disabled={isPending}>
            <X size={20} />
          </button>
        </header>

        <form action={formAction}>
          <input type="hidden" name="obligationId" value={obligation.id} />

          <label className="obligations-form-field is-full">
            <span>Título</span>
            <input name="title" required defaultValue={obligation.title} />
          </label>

          <label className="obligations-form-field is-full">
            <span>Descrição</span>
            <textarea name="description" defaultValue={obligation.description ?? ""} />
          </label>

          <label className="obligations-form-field">
            <span>Tipo</span>
            <select name="type" defaultValue={obligation.type}>
              {Object.entries(obligationTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label className="obligations-form-field">
            <span>Recorrência</span>
            <select name="recurrence" defaultValue={obligation.recurrence}>
              {Object.entries(obligationRecurrenceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label className="obligations-form-field">
            <span>Vencimento</span>
            <input name="dueDate" type="date" required defaultValue={obligation.dueDate} />
          </label>

          <label className="obligations-form-field">
            <span>Valor</span>
            <input name="amount" inputMode="decimal" defaultValue={formatAmountInput(obligation.amount)} />
          </label>

          <label className="obligations-form-field">
            <span>Cliente opcional</span>
            <select name="clientId" defaultValue={obligation.clientId ?? ""}>
              <option value="">Sem cliente</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}{client.companyName ? ` · ${client.companyName}` : ""}</option>)}
            </select>
          </label>

          <label className="obligations-form-field">
            <span>Projeto opcional</span>
            <select name="projectId" defaultValue={obligation.projectId ?? ""}>
              <option value="">Sem projeto</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}{project.clientName ? ` · ${project.clientName}` : ""}</option>)}
            </select>
          </label>

          <label className="obligations-form-field">
            <span>Status</span>
            <select name="status" defaultValue={obligation.status}>
              {Object.entries(obligationStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label className="obligations-form-field">
            <span>Situação</span>
            <select name="activityStatus" defaultValue={obligation.isActive ? "active" : "inactive"}>
              <option value="active">Ativa</option>
              <option value="inactive">Inativa</option>
            </select>
          </label>

          <footer>
            <button type="button" onClick={onClose} disabled={isPending}>Cancelar</button>
            <button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar alterações"}</button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}
