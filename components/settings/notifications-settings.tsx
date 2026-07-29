"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import { showToast } from "@/components/ui/toast-provider";
import type { NotificationPreferences } from "./types";
import { SettingsSectionShell } from "./settings-section-shell";

const notificationItems: Array<{ key: keyof NotificationPreferences; title: string; description: string }> = [
  { key: "dailyReminders", title: "Lembretes do dia", description: "Notificar tarefas e compromissos marcados para hoje." },
  { key: "upcomingDeadlines", title: "Prazos próximos", description: "Avisar quando entregas estiverem perto do vencimento." },
  { key: "overduePayments", title: "Pagamentos atrasados", description: "Destacar cobranças que passaram da data prevista." },
  { key: "pendingBudgets", title: "Orçamentos pendentes", description: "Lembrar propostas que precisam de follow-up." },
  { key: "recurringObligations", title: "Obrigações recorrentes", description: "Avisar impostos, assinaturas e rotinas administrativas." },
  { key: "weeklySummary", title: "Resumo semanal", description: "Receber um panorama da semana por e-mail futuramente." },
];

export function NotificationsSettings({ notifications }: { notifications: NotificationPreferences }) {
  const [values, setValues] = useState(notifications);

  return (
    <SettingsSectionShell icon={Bell} title="Notificações" description="Controle quais alertas aparecem no Escoply.">
      <div className="settings-toggle-list">
        {notificationItems.map((item) => (
          <label key={item.key} className="settings-toggle-row">
            <span><strong>{item.title}</strong><small>{item.description}</small></span>
            <input type="checkbox" checked={values[item.key]} onChange={(event) => setValues((current) => ({ ...current, [item.key]: event.target.checked }))} />
            <i aria-hidden="true" />
          </label>
        ))}
      </div>
      <footer className="settings-panel-footer"><button type="button" className="settings-primary-button" onClick={() => showToast({ type: "success", title: "Notificações salvas", description: "Preferências atualizadas localmente." })}>Salvar notificações</button></footer>
    </SettingsSectionShell>
  );
}
