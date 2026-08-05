"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { updateNotificationPreferencesAction } from "@/app/dashboard/configuracoes/actions";
import { showToast } from "@/components/ui/toast-provider";
import type { NotificationPreferences } from "./types";
import { SettingsSectionShell } from "./settings-section-shell";

const notificationItems: Array<{ key: keyof NotificationPreferences; title: string; description: string }> = [
  { key: "dailyReminders", title: "Tarefas e compromissos do dia", description: "Mostrar tarefas, reuniões, cobranças e follow-ups vencidos ou marcados para hoje." },
  { key: "upcomingDeadlines", title: "Prazos próximos", description: "Mostrar entregas de projetos com prazo próximo." },
  { key: "overduePayments", title: "Pagamentos atrasados", description: "Mostrar recebimentos que passaram da data prevista." },
  { key: "pendingBudgets", title: "Orçamentos pendentes", description: "Mostrar propostas em rascunho ou enviadas que precisam de follow-up." },
  { key: "recurringObligations", title: "Obrigações recorrentes", description: "Mostrar impostos, assinaturas e rotinas administrativas vencidas ou de hoje." },
  { key: "weeklySummary", title: "Resumo semanal", description: "Preferência salva para envio de resumo semanal quando a rotina de e-mails for ativada." },
];

export function NotificationsSettings({ notifications }: { notifications: NotificationPreferences }) {
  const router = useRouter();
  const [values, setValues] = useState(notifications);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateNotificationPreferencesAction(formData);

      showToast({
        type: result.success ? "success" : "error",
        title: result.success ? "Notificações salvas" : "Ação não concluída",
        description: result.message,
      });

      if (result.success) router.refresh();
    });
  }

  return (
    <SettingsSectionShell icon={Bell} title="Notificações" description="Controle quais alertas aparecem no Escoply.">
      <form className="settings-form" action={handleSubmit}>
        <div className="settings-toggle-list">
          {notificationItems.map((item) => (
            <label key={item.key} className="settings-toggle-row">
              <span>
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
              <input
                type="checkbox"
                name={item.key}
                checked={values[item.key]}
                onChange={(event) => setValues((current) => ({ ...current, [item.key]: event.target.checked }))}
              />
              <i aria-hidden="true" />
            </label>
          ))}
        </div>
        <footer className="settings-panel-footer">
          <button type="submit" className="settings-primary-button" disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar notificações"}
          </button>
        </footer>
      </form>
    </SettingsSectionShell>
  );
}
