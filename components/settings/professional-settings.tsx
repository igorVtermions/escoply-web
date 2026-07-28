"use client";

import { BriefcaseBusiness } from "lucide-react";
import { showToast } from "@/components/ui/toast-provider";
import type { ProfessionalProfile } from "./types";
import { SettingsSectionShell } from "./settings-section-shell";

export function ProfessionalSettings({ professional }: { professional: ProfessionalProfile }) {
  return (
    <SettingsSectionShell icon={BriefcaseBusiness} title="Profissional" description="Defina como sua marca aparece em documentos e relatórios.">
      <form className="settings-form" onSubmit={(event) => { event.preventDefault(); showToast({ type: "success", title: "Perfil profissional salvo", description: "As preferências profissionais foram atualizadas." }); }}>
        <div className="settings-form-grid">
          <label>Nome profissional ou marca<input defaultValue={professional.brandName} /></label>
          <label>Tipo de profissional<select defaultValue={professional.profession}><option>Desenvolvedor freelancer</option><option>Designer freelancer</option><option>Social media</option><option>Consultor</option><option>Outro</option></select></label>
          <label>Documento / CNPJ <small>(opcional)</small><input defaultValue={professional.document} placeholder="00.000.000/0001-00" /></label>
          <label>Cidade<input defaultValue={professional.city} /></label>
          <label>Estado<input defaultValue={professional.state} /></label>
          <label>Site<input defaultValue={professional.website} /></label>
          <label>Instagram<input defaultValue={professional.instagram} /></label>
          <label>LinkedIn<input defaultValue={professional.linkedin} /></label>
          <label>WhatsApp comercial<input defaultValue={professional.whatsapp} /></label>
        </div>
        <footer><button type="submit" className="settings-primary-button">Salvar perfil profissional</button></footer>
      </form>
    </SettingsSectionShell>
  );
}
