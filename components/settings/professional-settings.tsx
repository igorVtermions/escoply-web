"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness } from "lucide-react";
import { updateProfessionalProfileAction } from "@/app/dashboard/configuracoes/actions";
import { showToast } from "@/components/ui/toast-provider";
import type { ProfessionalProfile } from "./types";
import { SettingsSectionShell } from "./settings-section-shell";

const professionalTypeOptions = [
  "Desenvolvedor freelancer",
  "Designer freelancer",
  "Social media",
  "Copywriter",
  "Consultor",
  "Gestor de tráfego",
  "Editor de vídeo",
  "Fotógrafo",
  "Outro",
];

export function ProfessionalSettings({ professional }: { professional: ProfessionalProfile }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateProfessionalProfileAction(formData);

      showToast({
        type: result.success ? "success" : "error",
        title: result.success ? "Perfil profissional salvo" : "Ação não concluída",
        description: result.message,
      });

      if (result.success) router.refresh();
    });
  }

  return (
    <SettingsSectionShell icon={BriefcaseBusiness} title="Profissional" description="Defina como sua marca aparece em documentos e relatórios.">
      <form className="settings-form" action={handleSubmit}>
        <div className="settings-form-grid">
          <label>
            Nome profissional ou marca
            <input name="brand_name" defaultValue={professional.brandName} maxLength={160} placeholder="Ex.: Dev Family" autoComplete="organization" />
          </label>

          <label>
            Tipo de profissional
            <select name="professional_type" defaultValue={professional.profession || ""}>
              <option value="">Selecione uma opção</option>
              {professionalTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            Documento / CNPJ <small>(opcional)</small>
            <input name="document" defaultValue={professional.document} maxLength={40} placeholder="00.000.000/0001-00" />
          </label>

          <label>
            Cidade
            <input name="city" defaultValue={professional.city} maxLength={120} placeholder="Ex.: São Paulo" autoComplete="address-level2" />
          </label>

          <label>
            Estado
            <input name="state" defaultValue={professional.state} maxLength={60} placeholder="Ex.: SP" autoComplete="address-level1" />
          </label>

          <label>
            Site
            <input name="website" defaultValue={professional.website} maxLength={240} placeholder="https://suaempresa.com" inputMode="url" autoComplete="url" />
          </label>

          <label>
            Instagram
            <input name="instagram" defaultValue={professional.instagram} maxLength={120} placeholder="@sua_marca" />
          </label>

          <label>
            LinkedIn
            <input name="linkedin" defaultValue={professional.linkedin} maxLength={240} placeholder="https://linkedin.com/in/seu-perfil" />
          </label>

          <label>
            WhatsApp comercial
            <input name="business_whatsapp" defaultValue={professional.whatsapp} maxLength={40} placeholder="(11) 99999-9999" inputMode="tel" autoComplete="tel" />
          </label>
        </div>

        <footer>
          <button type="submit" className="settings-primary-button" disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar perfil profissional"}
          </button>
        </footer>
      </form>
    </SettingsSectionShell>
  );
}
