"use client";

import { FormEvent, startTransition, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  Trash2,
  X,
} from "lucide-react";
import { updatePasswordAction } from "@/app/dashboard/configuracoes/actions";
import { showToast } from "@/components/ui/toast-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { SettingsSectionShell } from "./settings-section-shell";

type SecurityModal = "password" | "delete" | null;

const passwordRules = [
  { label: "8 caracteres", test: (value: string) => value.length >= 8 },
  { label: "Letra maiúscula", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Letra minúscula", test: (value: string) => /[a-z]/.test(value) },
  { label: "Um número", test: (value: string) => /\d/.test(value) },
  { label: "Caractere especial", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

function SecurityModalShell({
  children,
  title,
  kicker,
  tone = "default",
  onClose,
}: {
  children: ReactNode;
  title: string;
  kicker: string;
  tone?: "default" | "danger";
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="settings-security-modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`settings-security-modal-card ${tone === "danger" ? "is-danger" : ""}`} role="dialog" aria-modal="true" aria-labelledby="settings-security-modal-title">
        <button type="button" className="settings-security-modal-close" aria-label="Fechar modal" onClick={onClose}>
          <X size={22} />
        </button>
        <span>{kicker}</span>
        <h3 id="settings-security-modal-title">{title}</h3>
        {children}
      </section>
    </div>
  );
}

export function SecuritySettings() {
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<SecurityModal>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const passedPasswordRules = useMemo(
    () => passwordRules.filter((rule) => rule.test(newPassword)).length,
    [newPassword],
  );

  function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIsSavingPassword(true);

    startTransition(() => {
      void updatePasswordAction(formData).then((result) => {
        setIsSavingPassword(false);

        if (!result.success) {
          showToast({ type: "error", title: "Senha não alterada", description: result.message });
          return;
        }

        showToast({ type: "success", title: "Senha atualizada", description: result.message });
        setNewPassword("");
        setActiveModal(null);
      });
    });
  }

  async function handleDeleteAccount() {
    if (deleteConfirmation !== "EXCLUIR") {
      showToast({ type: "error", title: "Confirmação inválida", description: "Digite EXCLUIR para confirmar." });
      return;
    }

    setIsDeletingAccount(true);
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setIsDeletingAccount(false);
      showToast({ type: "error", title: "Supabase não configurado", description: "Não foi possível excluir a conta agora." });
      return;
    }

    const { error } = await supabase.functions.invoke("delete-account", { method: "DELETE" });

    if (error) {
      setIsDeletingAccount(false);
      showToast({
        type: "error",
        title: "Conta não excluída",
        description: "Verifique se a Edge Function delete-account foi publicada no Supabase.",
      });
      return;
    }

    await supabase.auth.signOut();
    showToast({ type: "success", title: "Conta excluída", description: "Seus dados de autenticação foram removidos." });
    router.replace("/");
    router.refresh();
  }

  return (
    <SettingsSectionShell icon={LockKeyhole} title="Segurança" description="Gerencie acesso, senha e proteção da sua conta.">
      <div className="settings-action-list settings-security-list">
        <article>
          <span>
            <KeyRound size={18} />
            <strong>Alterar senha</strong>
            <small>Atualize sua senha com validação da senha atual e política forte.</small>
          </span>
          <button type="button" onClick={() => setActiveModal("password")}>Alterar</button>
        </article>

        <article className="danger">
          <span>
            <Trash2 size={18} />
            <strong>Excluir conta</strong>
            <small>Remove definitivamente o usuário do Auth e arquivos de perfil quando a função estiver publicada.</small>
          </span>
          <button type="button" onClick={() => setActiveModal("delete")}>Excluir</button>
        </article>
      </div>

      {activeModal === "password" ? (
        <SecurityModalShell title="Alterar senha" kicker="Segurança" onClose={() => setActiveModal(null)}>
          <form className="settings-security-form" onSubmit={handlePasswordSubmit}>
            <label>
              Senha atual
              <input name="currentPassword" type="password" autoComplete="current-password" required />
            </label>
            <label>
              Nova senha
              <input
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </label>
            <label>
              Confirme a nova senha
              <input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} />
            </label>
            <div className="settings-password-rules">
              <strong>Força da senha: {passedPasswordRules}/5</strong>
              <ul>
                {passwordRules.map((rule) => {
                  const isValid = rule.test(newPassword);
                  return (
                    <li key={rule.label} className={isValid ? "is-valid" : ""}>
                      <CheckCircle2 size={15} />
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            </div>
            <button type="submit" className="settings-primary-button" disabled={isSavingPassword}>
              {isSavingPassword ? "Alterando..." : "Salvar nova senha"}
            </button>
          </form>
        </SecurityModalShell>
      ) : null}

      {activeModal === "delete" ? (
        <SecurityModalShell title="Excluir conta definitivamente" kicker="Atenção" tone="danger" onClose={() => setActiveModal(null)}>
          <div className="settings-delete-warning">
            <AlertTriangle size={20} />
            <p>
              Esta ação remove sua conta do Supabase Auth. Antes de usar em produção, mantenha a Edge Function
              <strong> delete-account</strong> publicada e com a service role configurada.
            </p>
          </div>
          <label className="settings-delete-confirmation">
            Digite EXCLUIR para confirmar
            <input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} />
          </label>
          <div className="settings-security-actions">
            <button type="button" className="settings-secondary-button" onClick={() => setActiveModal(null)} disabled={isDeletingAccount}>
              Cancelar
            </button>
            <button type="button" className="settings-danger-button" onClick={handleDeleteAccount} disabled={isDeletingAccount}>
              {isDeletingAccount ? "Excluindo..." : "Excluir conta"}
            </button>
          </div>
        </SecurityModalShell>
      ) : null}
    </SettingsSectionShell>
  );
}
