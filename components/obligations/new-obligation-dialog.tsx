"use client";

import { useActionState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createObligationAction } from "@/app/dashboard/obrigacoes/actions";
import { showToast } from "@/components/ui/toast-provider";
import type { ObligationClientOption, ObligationProjectOption } from "@/lib/obligations/data";
import { obligationRecurrenceLabels, obligationTypeLabels } from "./types";

type NewObligationDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  clients: ObligationClientOption[];
  projects: ObligationProjectOption[];
};

export function NewObligationDialog({ isOpen, onClose, clients, projects }: NewObligationDialogProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createObligationAction, { success: false, message: "" });

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) onClose();
    };
    document.body.classList.add("obligations-dialog-open");
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("obligations-dialog-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, isPending, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    if (!state.message) return;
    if (!state.success) {
      showToast({ type: "error", title: "Ação não concluída", description: state.message });
      return;
    }

    showToast({ type: "success", title: "Obrigação criada", description: state.message });
    onClose();
    router.refresh();
  }, [isOpen, onClose, router, state]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="obligations-dialog-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isPending) onClose(); }}>
      <section className="obligations-dialog" role="dialog" aria-modal="true" aria-labelledby="new-obligation-title">
        <header>
          <div>
            <span>Nova rotina</span>
            <h2 id="new-obligation-title">Adicionar obrigação</h2>
          </div>
          <button type="button" aria-label="Fechar modal" onClick={onClose} disabled={isPending}>
            <X size={24} />
          </button>
        </header>

        <form action={formAction}>
          <label className="obligations-form-field is-full">
            <span>Título</span>
            <input name="title" required placeholder="Ex.: DAS MEI — Junho/2025" />
          </label>

          <label className="obligations-form-field is-full">
            <span>Descrição</span>
            <textarea name="description" placeholder="Contexto, referência, instruções ou observações..." />
          </label>

          <label className="obligations-form-field">
            <span>Tipo</span>
            <select name="type" defaultValue="tax">
              {Object.entries(obligationTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="obligations-form-field">
            <span>Recorrência</span>
            <select name="recurrence" defaultValue="monthly">
              {Object.entries(obligationRecurrenceLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="obligations-form-field">
            <span>Vencimento</span>
            <input name="dueDate" type="date" required />
          </label>

          <label className="obligations-form-field">
            <span>Valor</span>
            <input name="amount" inputMode="decimal" placeholder="Ex.: 89,90" />
          </label>

          <label className="obligations-form-field">
            <span>Cliente opcional</span>
            <select name="clientId" defaultValue="">
              <option value="">Sem cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}{client.companyName ? ` · ${client.companyName}` : ""}</option>
              ))}
            </select>
          </label>

          <label className="obligations-form-field">
            <span>Projeto opcional</span>
            <select name="projectId" defaultValue="">
              <option value="">Sem projeto</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}{project.clientName ? ` · ${project.clientName}` : ""}</option>
              ))}
            </select>
          </label>

          <label className="obligations-form-field is-full">
            <span>Status</span>
            <select name="activityStatus" defaultValue="active">
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </label>

          <footer>
            <button type="button" onClick={onClose} disabled={isPending}>Cancelar</button>
            <button type="submit" disabled={isPending}>{isPending ? "Cadastrando..." : "Cadastrar obrigação"}</button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}
