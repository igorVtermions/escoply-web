"use client";

import { SlidersHorizontal } from "lucide-react";
import { showToast } from "@/components/ui/toast-provider";
import type { UserPreferences } from "./types";
import { SettingsSectionShell } from "./settings-section-shell";

export function PreferencesSettings({ preferences }: { preferences: UserPreferences }) {
  return (
    <SettingsSectionShell icon={SlidersHorizontal} title="Preferências" description="Ajuste a experiência da interface para sua rotina.">
      <form className="settings-form" onSubmit={(event) => { event.preventDefault(); showToast({ type: "success", title: "Preferências salvas", description: "As preferências foram registradas localmente." }); }}>
        <div className="settings-form-grid">
          <label>Tema<select defaultValue={preferences.theme}><option value="system">Sistema</option><option value="light">Claro</option><option value="dark">Escuro</option></select></label>
          <label>Moeda<select defaultValue={preferences.currency}><option value="BRL">BRL</option><option value="USD">USD</option><option value="EUR">EUR</option></select></label>
          <label>Formato de data<select defaultValue={preferences.dateFormat}><option value="dd/MM/yyyy">dd/MM/yyyy</option><option value="MM/dd/yyyy">MM/dd/yyyy</option><option value="yyyy-MM-dd">yyyy-MM-dd</option></select></label>
          <label>Página inicial padrão<select defaultValue={preferences.startPage}><option value="dashboard">Dashboard</option><option value="projects">Projetos</option><option value="reminders">Agenda</option></select></label>
          <label>Idioma<select defaultValue={preferences.language}><option value="pt-BR">Português Brasil</option><option value="en-US">English US</option></select></label>
          <label>Densidade da interface<select defaultValue={preferences.density}><option value="comfortable">Confortável</option><option value="compact">Compacta</option></select></label>
        </div>
        <footer><button type="submit" className="settings-primary-button">Salvar preferências</button></footer>
      </form>
    </SettingsSectionShell>
  );
}
