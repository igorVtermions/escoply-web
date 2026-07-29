"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, UserRound } from "lucide-react";
import { updateProfileAction, updateProfileAvatarAction } from "@/app/dashboard/configuracoes/actions";
import { showToast } from "@/components/ui/toast-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { UserProfile } from "./types";
import { SettingsSectionShell } from "./settings-section-shell";

const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getAvatarExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export function ProfileSettings({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [avatarPath, setAvatarPath] = useState(profile.avatarPath);
  const [isSaving, startSaving] = useTransition();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const isBusy = isSaving || isUploadingAvatar;

  function handleSubmit(formData: FormData) {
    startSaving(async () => {
      const result = await updateProfileAction(formData);

      showToast({
        type: result.success ? "success" : "error",
        title: result.success ? "Perfil salvo" : "Ação não concluída",
        description: result.message,
      });

      if (result.success) router.refresh();
    });
  }

  async function handleAvatarChange(file: File | null) {
    if (!file) return;

    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      showToast({ type: "error", title: "Imagem inválida", description: "Use JPG, PNG ou WebP." });
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      showToast({ type: "error", title: "Imagem muito grande", description: "A foto pode ter no máximo 2 MB." });
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      showToast({ type: "error", title: "Supabase não configurado", description: "Confira as variáveis públicas do projeto." });
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        showToast({ type: "error", title: "Sessão inválida", description: "Entre novamente para alterar sua foto." });
        return;
      }

      const newAvatarPath = `${userData.user.id}/profile-${Date.now()}.${getAvatarExtension(file)}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(newAvatarPath, file, {
        contentType: file.type,
        upsert: false,
      });

      if (uploadError) {
        showToast({ type: "error", title: "Upload não concluído", description: "Não foi possível enviar a foto agora." });
        return;
      }

      const result = await updateProfileAvatarAction(newAvatarPath);

      if (!result.success) {
        await supabase.storage.from("avatars").remove([newAvatarPath]);
        showToast({ type: "error", title: "Foto não salva", description: result.message });
        return;
      }

      const { data: signedAvatar } = await supabase.storage.from("avatars").createSignedUrl(newAvatarPath, 60 * 60);
      if (signedAvatar?.signedUrl) setAvatarUrl(signedAvatar.signedUrl);

      if (avatarPath) await supabase.storage.from("avatars").remove([avatarPath]);
      setAvatarPath(newAvatarPath);

      showToast({ type: "success", title: "Foto atualizada", description: "Sua imagem de perfil foi salva." });
      router.refresh();
    } finally {
      setIsUploadingAvatar(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <SettingsSectionShell icon={UserRound} title="Perfil" description="Atualize suas informações pessoais.">
      <form className="settings-form" action={handleSubmit}>
        <div className="settings-profile-grid">
          <div className="settings-avatar-block">
            <span>Foto de perfil</span>
            <div
              className={`settings-avatar ${avatarUrl ? "has-image" : ""}`}
              style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
              aria-label={`Avatar de ${profile.name}`}
            >
              {!avatarUrl && <strong>{getInitials(profile.name)}</strong>}
              <button type="button" aria-label="Alterar foto" disabled={isBusy} onClick={() => inputRef.current?.click()}>
                <Camera size={16} />
              </button>
            </div>
            <small>JPG, PNG ou WEBP. Tamanho máximo: 2MB.</small>
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => void handleAvatarChange(event.target.files?.[0] ?? null)}
            />
            <button type="button" className="settings-secondary-button" disabled={isBusy} onClick={() => inputRef.current?.click()}>
              <Upload size={15} /> {isUploadingAvatar ? "Enviando..." : "Alterar foto"}
            </button>
          </div>

          <div className="settings-form-grid">
            <label>
              Nome completo
              <input name="name" defaultValue={profile.name} minLength={2} maxLength={120} required />
            </label>
            <label>
              E-mail
              <input name="email" defaultValue={profile.email} disabled />
              <small>E-mail não pode ser alterado.</small>
            </label>
            <label>
              Telefone
              <input name="phone" defaultValue={profile.phone} maxLength={40} placeholder="(11) 99999-9999" />
            </label>
            <label>
              Cargo / Profissão
              <input name="profession" defaultValue={profile.role} maxLength={120} placeholder="Ex.: Designer freelancer" />
            </label>
            <label className="wide">
              Bio curta
              <textarea name="bio" rows={4} maxLength={280} defaultValue={profile.bio} placeholder="Conte brevemente como você trabalha." />
            </label>
          </div>
        </div>
        <footer>
          <button type="submit" className="settings-primary-button" disabled={isBusy}>
            {isSaving ? "Salvando..." : "Salvar alterações"}
          </button>
        </footer>
      </form>
    </SettingsSectionShell>
  );
}
