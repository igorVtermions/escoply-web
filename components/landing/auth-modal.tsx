"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Check, Eye, EyeOff, ImagePlus, LockKeyhole, Mail, ShieldAlert, UserRound, X } from "lucide-react";
import { getSupabaseBrowserClient, setAuthPersistence } from "@/lib/supabase/client";
import { showToast } from "@/components/ui/toast-provider";
import styles from "./auth-modal.module.css";

export type AuthMode = "login" | "signup";
type LegalDocument = "terms" | "privacy";
type AuthFeedback = {
  type: "success" | "error" | "info";
  title?: string;
  text: string;
};

type AuthModalProps = {
  isOpen: boolean;
  mode: AuthMode;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
};

type PasswordFieldProps = {
  id: string;
  label: string;
  autoComplete: string;
  placeholder: string;
  value?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  describedBy?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  required?: boolean;
};

const DASHBOARD_PATH = "/dashboard";
const ADMIN_PATH = "/admin";

const legalContent = {
  terms: {
    title: "Termos de Uso",
    intro: "Estes termos regulam o acesso e o uso do Escoply. Esta é uma versão preliminar e poderá ser atualizada antes do lançamento comercial.",
    sections: [
      ["1. Uso da plataforma", "O Escoply oferece ferramentas para organização de clientes, projetos, escopos, materiais, lembretes e rotinas profissionais. Você deve utilizar a plataforma de forma lícita e compatível com estes termos."],
      ["2. Conta e segurança", "Você é responsável por fornecer informações corretas, proteger suas credenciais e comunicar qualquer acesso não autorizado. A conta é pessoal e não deve ser compartilhada de forma que comprometa sua segurança."],
      ["3. Conteúdo do usuário", "Você mantém a propriedade sobre os dados e materiais inseridos. Ao utilizar o serviço, autoriza somente o processamento necessário para armazenar, organizar e disponibilizar esse conteúdo para você."],
      ["4. Condutas proibidas", "Não é permitido usar o Escoply para atividades ilegais, violar direitos de terceiros, distribuir código malicioso, tentar acessar contas alheias ou comprometer a disponibilidade da plataforma."],
      ["5. Disponibilidade e alterações", "Buscaremos manter o serviço disponível e seguro, mas poderão ocorrer manutenções e interrupções. Funcionalidades, limites e planos poderão mudar mediante comunicação adequada."],
      ["6. Encerramento e contato", "Você poderá solicitar o encerramento da conta. Violações destes termos poderão causar suspensão. Dúvidas podem ser enviadas para contato@escoply.com."],
    ],
  },
  privacy: {
    title: "Política de Privacidade",
    intro: "Esta política preliminar explica como o Escoply pretende tratar dados pessoais em conformidade com a LGPD. Ela será revisada antes do lançamento comercial.",
    sections: [
      ["1. Dados coletados", "Poderemos tratar dados de cadastro, como nome, e-mail, foto e empresa; dados inseridos no workspace; informações técnicas de acesso; e comunicações enviadas ao suporte."],
      ["2. Finalidades", "Os dados serão usados para criar e proteger sua conta, prestar as funcionalidades contratadas, personalizar a experiência, oferecer suporte, prevenir fraudes e cumprir obrigações legais."],
      ["3. Compartilhamento", "Os dados poderão ser processados por fornecedores essenciais de infraestrutura, armazenamento, comunicação e segurança, sempre limitados à finalidade necessária. Não venderemos seus dados pessoais."],
      ["4. Armazenamento e segurança", "Aplicaremos medidas técnicas e administrativas proporcionais aos riscos. Os dados serão mantidos pelo período necessário à prestação do serviço, ao cumprimento legal ou ao exercício de direitos."],
      ["5. Seus direitos", "Você poderá solicitar confirmação de tratamento, acesso, correção, portabilidade quando aplicável, eliminação, informação sobre compartilhamento e revisão de consentimentos, conforme a LGPD."],
      ["6. Contato", "Solicitações relacionadas à privacidade poderão ser enviadas para contato@escoply.com. Esta política poderá ser atualizada, com comunicação quando houver mudanças relevantes."],
    ],
  },
} as const;

function PasswordField({ id, label, autoComplete, placeholder, value, onChange, describedBy, onFocus, onBlur, required = true }: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="auth-label">{label}</label>
      <div className="auth-input-wrap">
        <LockKeyhole size={18} aria-hidden="true" />
        <input id={id} name={id} type={isVisible ? "text" : "password"} autoComplete={autoComplete} placeholder={placeholder} aria-required={required} value={value} onChange={onChange} aria-describedby={describedBy} onFocus={onFocus} onBlur={onBlur} />
        <button type="button" className="auth-password-toggle" onClick={() => setIsVisible((current) => !current)} aria-label={isVisible ? "Ocultar senha" : "Mostrar senha"}>
          {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

function LegalModal({ document, onClose }: { document: LegalDocument; onClose: () => void }) {
  const content = legalContent[document];

  return (
    <div className="legal-overlay" style={{ position: "fixed", inset: 0, zIndex: 200, display: "grid", placeItems: "center", padding: "1rem", background: "rgba(4, 19, 66, .78)", backdropFilter: "blur(12px)" }} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="legal-modal" style={{ display: "flex", width: "min(100%, 42rem)", maxHeight: "calc(100dvh - 2rem)", flexDirection: "column", overflow: "hidden", borderRadius: "1.5rem", background: "white", boxShadow: "0 32px 90px -24px rgba(4,19,66,.65)" }} role="dialog" aria-modal="true" aria-labelledby="legal-title">
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", padding: "1.4rem 1.5rem 1.1rem", borderBottom: "1px solid #e2e8f0" }}>
          <div>
            <span style={{ color: "#6d28d9", fontSize: ".68rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".12em" }}>Versão preliminar</span>
            <h2 id="legal-title" style={{ marginTop: ".35rem", color: "#0f172a", fontSize: "1.45rem", fontWeight: 800 }}>{content.title}</h2>
            <p style={{ marginTop: ".2rem", color: "#94a3b8", fontSize: ".7rem" }}>Última atualização: julho de 2026</p>
          </div>
          <button type="button" style={{ display: "grid", width: "2.3rem", height: "2.3rem", flexShrink: 0, placeItems: "center", borderRadius: ".7rem", color: "#64748b", background: "#f1f5f9" }} onClick={onClose} aria-label={`Fechar ${content.title}`}><X size={20} /></button>
        </header>
        <div className="legal-body" style={{ overflowY: "auto", padding: "1.25rem 1.5rem" }}>
          <p className="legal-intro" style={{ padding: ".9rem 1rem", border: "1px solid #ddd6fe", borderRadius: ".8rem", color: "#4c1d95", background: "#f5f3ff", fontSize: ".78rem", lineHeight: 1.55 }}>{content.intro}</p>
          {content.sections.map(([title, text]) => (
            <section key={title} style={{ marginTop: "1.15rem" }}>
              <h3 style={{ color: "#0f172a", fontSize: ".82rem", fontWeight: 750 }}>{title}</h3>
              <p style={{ marginTop: ".35rem", color: "#64748b", fontSize: ".76rem", lineHeight: 1.65 }}>{text}</p>
            </section>
          ))}
        </div>
        <footer style={{ padding: "1rem 1.5rem", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <button type="button" style={{ width: "100%", minHeight: "2.7rem", borderRadius: ".75rem", color: "white", background: "#071e63", fontSize: ".8rem", fontWeight: 750 }} onClick={onClose}>Entendi</button>
        </footer>
      </section>
    </div>
  );
}

function getFormValue(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

function getFileExtension(file: File): string {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg" || extension === "png" || extension === "webp") {
    return extension === "jpg" ? "jpeg" : extension;
  }

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpeg";
}

function getAuthErrorMessage(message: string): string {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) return "E-mail ou senha inválidos.";
  if (normalizedMessage.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (normalizedMessage.includes("user already registered") || normalizedMessage.includes("already registered")) return "Já existe uma conta cadastrada com este e-mail.";
  if (normalizedMessage.includes("password")) return "A senha não atende aos requisitos de segurança.";
  if (normalizedMessage.includes("rate limit")) return "Muitas tentativas em sequência. Aguarde alguns minutos e tente novamente.";

  return "Não foi possível concluir a autenticação agora. Tente novamente em instantes.";
}

function didSupabaseReturnExistingUser(user: { identities?: unknown[] | null } | null): boolean {
  return Boolean(user && Array.isArray(user.identities) && user.identities.length === 0);
}

function getFeedbackTitle(type: AuthFeedback["type"]): string {
  if (type === "success") return "Tudo certo";
  if (type === "error") return "Ação não concluída";
  return "Atenção";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function getPostLoginResult(supabase: NonNullable<ReturnType<typeof getSupabaseBrowserClient>>, userId: string) {
  const { data, error } = await supabase.from("profiles").select("role, status").eq("id", userId).maybeSingle<{ role: string | null; status: string | null }>();

  if (error) return { path: DASHBOARD_PATH, status: "active" };
  return {
    path: data?.role === "admin" && data.status === "active" ? ADMIN_PATH : DASHBOARD_PATH,
    status: data?.status ?? "active",
  };
}

export function AuthModal({ isOpen, mode, onClose, onModeChange }: AuthModalProps) {
  const router = useRouter();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupPassword, setSignupPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [legalDocument, setLegalDocument] = useState<LegalDocument | null>(null);
  const [blockedAccountEmail, setBlockedAccountEmail] = useState("");
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const passwordChecks = [
    { label: "8 caracteres", valid: signupPassword.length >= 8 },
    { label: "Letra maiúscula", valid: /[A-Z]/.test(signupPassword) },
    { label: "Letra minúscula", valid: /[a-z]/.test(signupPassword) },
    { label: "Um número", valid: /\d/.test(signupPassword) },
    { label: "Caractere especial", valid: /[^A-Za-z0-9]/.test(signupPassword) },
  ];

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (legalDocument) setLegalDocument(null);
      else {
        setBlockedAccountEmail("");
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, legalDocument, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleClose = () => {
    setBlockedAccountEmail("");
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      notify({
        type: "error",
        title: "Supabase não configurado",
        text: "Confira NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no .env e reinicie o servidor.",
      });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = getFormValue(formData, "email").toLowerCase();
    const password = getFormValue(formData, "auth-password");

    if (!email) {
      notifyValidationError("Informe seu e-mail para continuar.", "auth-email");
      return;
    }

    if (!isValidEmail(email)) {
      notifyValidationError("Informe um e-mail válido para continuar.", "auth-email");
      return;
    }

    if (!password) {
      notifyValidationError("Informe sua senha para continuar.", "auth-password");
      return;
    }

    try {
      if (mode === "login") {
        setAuthPersistence(formData.get("remember") === "on");
        setIsSubmitting(true);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          if (error.code === "email_not_confirmed") {
            notify({
              type: "error",
              title: "Confirme seu e-mail",
              text: "O Supabase ainda está exigindo confirmação por e-mail para esta conta. Confirme o e-mail ou desative essa opção no painel para testes.",
            });
          } else {
            notify({ type: "error", text: getAuthErrorMessage(error.message) });
          }
          return;
        }

        const loginResult = data.user ? await getPostLoginResult(supabase, data.user.id) : { path: DASHBOARD_PATH, status: "active" };

        if (loginResult.status === "blocked") {
          await supabase.auth.signOut();
          setBlockedAccountEmail(email);
          return;
        }

        notify({ type: "success", text: "Login realizado com sucesso." });
        onClose();
        router.replace(loginResult.path);
        router.refresh();
        return;
      }

      const fullName = getFormValue(formData, "name");
      const companyName = getFormValue(formData, "company");
      const acceptedTerms = formData.get("terms") === "on";

      if (fullName.length < 2) {
        notifyValidationError("Informe seu nome completo para criar a conta.", "auth-name");
        return;
      }

      if (!isStrongPassword(password)) {
        notifyValidationError("A senha precisa ter 8 caracteres, letra maiúscula, letra minúscula, número e caractere especial.", "auth-password");
        return;
      }

      if (signupPassword !== passwordConfirmation) {
        notifyValidationError("As senhas informadas não são iguais.", "auth-password-confirm");
        return;
      }

      if (!acceptedTerms) {
        notifyValidationError("Aceite os Termos de Uso e a Política de Privacidade para continuar.", "auth-terms");
        return;
      }

      setIsSubmitting(true);
      setAuthPersistence(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${DASHBOARD_PATH}`,
          data: {
            full_name: fullName,
            company_name: companyName || null,
          },
        },
      });

      if (error) {
        notify({ type: "error", text: getAuthErrorMessage(error.message) });
        return;
      }

      if (didSupabaseReturnExistingUser(data.user)) {
        notify({
          type: "error",
          title: "E-mail já cadastrado",
          text: "Essa conta já existe. Use a aba Entrar para acessar com sua senha.",
        });
        onModeChange("login");
        return;
      }

      if (data.user && !data.session) {
        notify({
          type: "error",
          title: "Confirmação de e-mail ativa",
          text: "A conta foi criada, mas o Supabase ainda está bloqueando o acesso até a confirmação por e-mail. Desative Confirm email para testes.",
        });
        onModeChange("login");
        return;
      }

      if (!data.session || !data.user) {
        notify({
          type: "error",
          title: "Cadastro não concluído",
          text: "Não foi possível iniciar sua sessão. Tente novamente ou entre com uma conta existente.",
        });
        return;
      }

      if (profileFile) {
        const avatarPath = `${data.user.id}/profile-${Date.now()}.${getFileExtension(profileFile)}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(avatarPath, profileFile, {
          contentType: profileFile.type,
          upsert: true,
        });

        if (!uploadError) {
          await supabase.from("profiles").update({ avatar_path: avatarPath }).eq("id", data.user.id);
        }
      }

      notify({ type: "success", text: "Conta criada com sucesso." });
      onClose();
      router.replace(DASHBOARD_PATH);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProfileFile(file);

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") setProfileImage(reader.result);
    });
    reader.readAsDataURL(file);
  };

  const changeMode = (nextMode: AuthMode) => {
    setIsSubmitting(false);
    setIsPasswordFocused(false);
    setSignupPassword("");
    setPasswordConfirmation("");
    setBlockedAccountEmail("");
    onModeChange(nextMode);
  };

  const notify = (nextFeedback: AuthFeedback) => {
    showToast({
      type: nextFeedback.type,
      title: nextFeedback.title ?? getFeedbackTitle(nextFeedback.type),
      description: nextFeedback.text,
    });
  };

  const notifyValidationError = (text: string, fieldId?: string) => {
    notify({ type: "error", text });

    if (!fieldId) return;
    window.requestAnimationFrame(() => {
      document.getElementById(fieldId)?.focus();
    });
  };

  const handlePasswordRecovery = async () => {
    const supabase = getSupabaseBrowserClient();
    const form = formRef.current;

    if (!supabase || !form) {
      notify({
        type: "error",
        text: "Configuração do Supabase não encontrada. Confira as variáveis públicas no .env.",
      });
      return;
    }

    const email = getFormValue(new FormData(form), "email").toLowerCase();
    if (!email) {
      notify({ type: "error", text: "Informe seu e-mail para receber o link de recuperação." });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      });

      if (error) {
        notify({ type: "error", text: getAuthErrorMessage(error.message) });
        return;
      }

      notify({ type: "success", text: "Enviamos um link de recuperação para o seu e-mail." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <>
      <div className={`auth-overlay ${styles.overlay}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) handleClose(); }}>
        <section className={`auth-modal ${styles.modal}`} style={{ display: "block", gridTemplateColumns: "none" }} role="dialog" aria-modal="true" aria-labelledby="auth-title">
          <div className={`auth-content ${styles.content}`}>
            <div key={mode} className="auth-content-panel">
            <button ref={closeButtonRef} type="button" className="auth-close" onClick={handleClose} aria-label="Fechar modal"><X size={20} /></button>

            <div className={`auth-tabs ${mode === "signup" ? "is-signup" : "is-login"}`} role="tablist" aria-label="Acesso à conta">
              <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "is-active" : ""} onClick={() => changeMode("login")}>Entrar</button>
              <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "is-active" : ""} onClick={() => changeMode("signup")}>Criar conta</button>
            </div>

            {blockedAccountEmail ? (
              <div className="banned-account-panel">
                <span><ShieldAlert size={24} /></span>
                <small>Usuário banido</small>
                <h2 id="auth-title">Seu acesso ao Escoply foi bloqueado.</h2>
                <p>A conta <strong>{blockedAccountEmail}</strong> está banida. Entre em contato com o suporte para contestar o bloqueio ou solicitar uma revisão.</p>
                <a href={`mailto:igorviniciusf10@gmail.com?subject=${encodeURIComponent("Contestação de bloqueio Escoply")}&body=${encodeURIComponent(`Olá, gostaria de contestar o bloqueio da conta ${blockedAccountEmail}.`)}`}>Contestar bloqueio</a>
                <button type="button" onClick={() => setBlockedAccountEmail("")}>Tentar outra conta</button>
              </div>
            ) : (
              <>
            <div style={{ marginTop: "1.25rem" }}>
              <p className="text-sm font-semibold text-secondary-dark">{mode === "login" ? "Bem-vindo de volta" : "Comece gratuitamente"}</p>
              <h2 id="auth-title" className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{mode === "login" ? "Acesse sua conta" : "Crie sua conta Escoply"}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{mode === "login" ? "Continue de onde parou e mantenha sua rotina sob controle." : "Organize seus primeiros clientes e projetos em poucos minutos."}</p>
            </div>

            <form ref={formRef} noValidate style={{ display: "grid", gap: ".75rem", marginTop: "1rem" }} onSubmit={handleSubmit}>
              {mode === "signup" && (
                <>
                  <label htmlFor="auth-profile-image" className="auth-profile-upload">
                    <div className="auth-profile-preview" style={profileImage ? { backgroundImage: `url(${profileImage})` } : undefined}>{!profileImage && <ImagePlus size={22} aria-hidden="true" />}</div>
                    <div><span className="auth-upload-button">Adicionar foto ou logo</span><input id="auth-profile-image" name="profileImage" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={handleImageChange} /><p>Opcional · PNG, JPG ou WebP</p></div>
                  </label>
                  <div>
                    <label htmlFor="auth-name" className="auth-label">Nome completo</label>
                    <div className="auth-input-wrap"><UserRound size={18} aria-hidden="true" /><input id="auth-name" name="name" type="text" autoComplete="name" placeholder="Como podemos chamar você?" aria-required="true" /></div>
                  </div>
                  <div>
                    <label htmlFor="auth-company" className="auth-label">Nome da empresa <span className="font-normal text-muted">(opcional)</span></label>
                    <div className="auth-input-wrap"><Building2 size={18} aria-hidden="true" /><input id="auth-company" name="company" type="text" autoComplete="organization" placeholder="Sua marca ou nome profissional" /></div>
                  </div>
                </>
              )}

              <div>
                <label htmlFor="auth-email" className="auth-label">E-mail</label>
                <div className="auth-input-wrap"><Mail size={18} aria-hidden="true" /><input id="auth-email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="voce@exemplo.com" aria-required="true" /></div>
              </div>

              <div className={mode === "signup" ? "auth-password-group" : ""}>
                <PasswordField
                  key={mode}
                  id="auth-password"
                  label="Senha"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="Mínimo de 8 caracteres"
                  value={mode === "signup" ? signupPassword : undefined}
                  onChange={mode === "signup" ? (event) => setSignupPassword(event.target.value) : undefined}
                  describedBy={mode === "signup" ? "password-requirements" : undefined}
                  onFocus={mode === "signup" ? () => setIsPasswordFocused(true) : undefined}
                  onBlur={mode === "signup" ? () => setIsPasswordFocused(false) : undefined}
                />
                {mode === "signup" && isPasswordFocused && (
                  <ul id="password-requirements" className="auth-password-requirements" style={{ display: "flex", maxHeight: "none", flexWrap: "wrap", gap: ".4rem .65rem", marginTop: ".55rem", overflow: "visible", visibility: "visible", opacity: 1, transform: "none" }} aria-label="Requisitos da senha">
                    {passwordChecks.map((check) => <li key={check.label} className={check.valid ? "is-valid" : ""}><span><Check size={10} /></span>{check.label}</li>)}
                  </ul>
                )}
              </div>

              {mode === "signup" && (
                <>
                  <PasswordField id="auth-password-confirm" label="Confirme sua senha" autoComplete="new-password" placeholder="Digite a senha novamente" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} />
                  {passwordConfirmation && <p className={`-mt-2 text-xs font-medium ${signupPassword === passwordConfirmation ? "text-emerald-700" : "text-red-500"}`}>{signupPassword === passwordConfirmation ? "As senhas são iguais." : "As senhas ainda não coincidem."}</p>}
                </>
              )}

              {mode === "login" ? (
                <div className="flex items-center justify-between gap-4 text-sm">
                  <label className="flex cursor-pointer items-center gap-2 text-muted"><input type="checkbox" name="remember" className="auth-checkbox" /> Lembrar de mim</label>
                  <button type="button" className="font-semibold text-primary transition hover:text-secondary-dark disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting} onClick={handlePasswordRecovery}>Esqueci minha senha</button>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-xs leading-5 text-muted"><input id="auth-terms" type="checkbox" name="terms" className="auth-checkbox mt-0.5" aria-required="true" /><p><label htmlFor="auth-terms" className="cursor-pointer">Concordo com os </label><button type="button" className="auth-legal-link" onClick={() => setLegalDocument("terms")}>Termos de Uso</button> e a <button type="button" className="auth-legal-link" onClick={() => setLegalDocument("privacy")}>Política de Privacidade</button>.</p></div>
              )}

              <button type="submit" className="auth-submit" disabled={isSubmitting}>
                {isSubmitting ? "Processando..." : mode === "login" ? "Entrar na minha conta" : "Criar minha conta"}
                {!isSubmitting && <ArrowRight size={18} />}
              </button>
            </form>
              </>
            )}
            </div>
          </div>
        </section>
      </div>
      {legalDocument && <LegalModal document={legalDocument} onClose={() => setLegalDocument(null)} />}
    </>,
    document.body,
  );
}
