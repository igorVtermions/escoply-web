"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Building2, Check, Eye, EyeOff, ImagePlus, LockKeyhole, Mail, UserRound, X } from "lucide-react";
import styles from "./auth-modal.module.css";

export type AuthMode = "login" | "signup";
type LegalDocument = "terms" | "privacy";

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
  pattern?: string;
  title?: string;
  describedBy?: string;
  onFocus?: () => void;
  onBlur?: () => void;
};

function PasswordField({ id, label, autoComplete, placeholder, value, onChange, pattern, title, describedBy, onFocus, onBlur }: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="auth-label">{label}</label>
      <div className="auth-input-wrap">
        <LockKeyhole size={18} aria-hidden="true" />
        <input id={id} name={id} type={isVisible ? "text" : "password"} autoComplete={autoComplete} placeholder={placeholder} required minLength={8} value={value} onChange={onChange} pattern={pattern} title={title} aria-describedby={describedBy} onFocus={onFocus} onBlur={onBlur} />
        <button type="button" className="auth-password-toggle" onClick={() => setIsVisible((current) => !current)} aria-label={isVisible ? "Ocultar senha" : "Mostrar senha"}>
          {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

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

function LegalModal({ document, onClose }: { document: LegalDocument; onClose: () => void }) {
  const content = legalContent[document];

  return (
    <div className="legal-overlay" style={{ position: "fixed", inset: 0, zIndex: 200, display: "grid", placeItems: "center", padding: "1rem", background: "rgba(4, 19, 66, .78)", backdropFilter: "blur(12px)" }} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="legal-modal" style={{ display: "flex", width: "min(100%, 42rem)", maxHeight: "calc(100dvh - 2rem)", flexDirection: "column", overflow: "hidden", borderRadius: "1.5rem", background: "white", boxShadow: "0 32px 90px -24px rgba(4,19,66,.65)" }} role="dialog" aria-modal="true" aria-labelledby="legal-title">
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", padding: "1.4rem 1.5rem 1.1rem", borderBottom: "1px solid #e2e8f0" }}><div><span style={{ color: "#6d28d9", fontSize: ".68rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".12em" }}>Versão preliminar</span><h2 id="legal-title" style={{ marginTop: ".35rem", color: "#0f172a", fontSize: "1.45rem", fontWeight: 800 }}>{content.title}</h2><p style={{ marginTop: ".2rem", color: "#94a3b8", fontSize: ".7rem" }}>Última atualização: julho de 2026</p></div><button type="button" style={{ display: "grid", width: "2.3rem", height: "2.3rem", flexShrink: 0, placeItems: "center", borderRadius: ".7rem", color: "#64748b", background: "#f1f5f9" }} onClick={onClose} aria-label={`Fechar ${content.title}`}><X size={20} /></button></header>
        <div className="legal-body" style={{ overflowY: "auto", padding: "1.25rem 1.5rem" }}><p className="legal-intro" style={{ padding: ".9rem 1rem", border: "1px solid #ddd6fe", borderRadius: ".8rem", color: "#4c1d95", background: "#f5f3ff", fontSize: ".78rem", lineHeight: 1.55 }}>{content.intro}</p>{content.sections.map(([title, text]) => <section key={title} style={{ marginTop: "1.15rem" }}><h3 style={{ color: "#0f172a", fontSize: ".82rem", fontWeight: 750 }}>{title}</h3><p style={{ marginTop: ".35rem", color: "#64748b", fontSize: ".76rem", lineHeight: 1.65 }}>{text}</p></section>)}</div>
        <footer style={{ padding: "1rem 1.5rem", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}><button type="button" style={{ width: "100%", minHeight: "2.7rem", borderRadius: ".75rem", color: "white", background: "#071e63", fontSize: ".8rem", fontWeight: 750 }} onClick={onClose}>Entendi</button></footer>
      </section>
    </div>
  );
}

export function AuthModal({ isOpen, mode, onClose, onModeChange }: AuthModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [message, setMessage] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [legalDocument, setLegalDocument] = useState<LegalDocument | null>(null);
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
      else onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, legalDocument, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "signup" && signupPassword !== passwordConfirmation) {
      setMessage("As senhas informadas não são iguais.");
      return;
    }
    setMessage("A autenticação será conectada na próxima etapa do produto.");
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") setProfileImage(reader.result);
    });
    reader.readAsDataURL(file);
  };

  const changeMode = (nextMode: AuthMode) => {
    setMessage("");
    onModeChange(nextMode);
  };

  return createPortal(
    <>
    <div className={`auth-overlay ${styles.overlay}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section
        className={`auth-modal ${styles.modal}`}
        style={{ display: "block", gridTemplateColumns: "none" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        <div className={`auth-content ${styles.content}`}>
          <button ref={closeButtonRef} type="button" className="auth-close" onClick={onClose} aria-label="Fechar modal"><X size={20} /></button>

          <div className="auth-tabs" role="tablist" aria-label="Acesso à conta">
            <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "is-active" : ""} onClick={() => changeMode("login")}>Entrar</button>
            <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "is-active" : ""} onClick={() => changeMode("signup")}>Criar conta</button>
          </div>

          <div style={{ marginTop: "1.25rem" }}>
            <p className="text-sm font-semibold text-secondary-dark">{mode === "login" ? "Bem-vindo de volta" : "Comece gratuitamente"}</p>
            <h2 id="auth-title" className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{mode === "login" ? "Acesse sua conta" : "Crie sua conta Escoply"}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{mode === "login" ? "Continue de onde parou e mantenha sua rotina sob controle." : "Organize seus primeiros clientes e projetos em poucos minutos."}</p>
          </div>

          <form style={{ display: "grid", gap: ".75rem", marginTop: "1rem" }} onSubmit={handleSubmit}>
            {mode === "signup" && (
              <>
                <div className="auth-profile-upload">
                  <div className="auth-profile-preview" style={profileImage ? { backgroundImage: `url(${profileImage})` } : undefined}>{!profileImage && <ImagePlus size={22} aria-hidden="true" />}</div>
                  <div><label htmlFor="auth-profile-image" className="auth-upload-button">Adicionar foto ou logo</label><input id="auth-profile-image" name="profileImage" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={handleImageChange} /><p>Opcional · PNG, JPG ou WebP</p></div>
                </div>
                <div>
                  <label htmlFor="auth-name" className="auth-label">Nome completo</label>
                  <div className="auth-input-wrap"><UserRound size={18} aria-hidden="true" /><input id="auth-name" name="name" type="text" autoComplete="name" placeholder="Como podemos chamar você?" required /></div>
                </div>
                <div>
                  <label htmlFor="auth-company" className="auth-label">Nome da empresa <span className="font-normal text-muted">(opcional)</span></label>
                  <div className="auth-input-wrap"><Building2 size={18} aria-hidden="true" /><input id="auth-company" name="company" type="text" autoComplete="organization" placeholder="Sua marca ou nome profissional" /></div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="auth-email" className="auth-label">E-mail</label>
              <div className="auth-input-wrap"><Mail size={18} aria-hidden="true" /><input id="auth-email" name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" required /></div>
            </div>

            <div className={mode === "signup" ? "auth-password-group" : ""}>
              <PasswordField
                key={mode}
                id="auth-password"
                label="Senha"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="Mínimo de 8 caracteres"
                value={mode === "signup" ? signupPassword : undefined}
                onChange={mode === "signup" ? (event) => { setSignupPassword(event.target.value); setMessage(""); } : undefined}
                pattern={mode === "signup" ? "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}" : undefined}
                title={mode === "signup" ? "Use pelo menos 8 caracteres, incluindo letra maiúscula, minúscula, número e caractere especial." : undefined}
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
                <PasswordField id="auth-password-confirm" label="Confirme sua senha" autoComplete="new-password" placeholder="Digite a senha novamente" value={passwordConfirmation} onChange={(event) => { setPasswordConfirmation(event.target.value); setMessage(""); }} />
                {passwordConfirmation && <p className={`-mt-2 text-xs font-medium ${signupPassword === passwordConfirmation ? "text-emerald-700" : "text-red-500"}`}>{signupPassword === passwordConfirmation ? "As senhas são iguais." : "As senhas ainda não coincidem."}</p>}
              </>
            )}

            {mode === "login" ? (
              <div className="flex items-center justify-between gap-4 text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-muted"><input type="checkbox" name="remember" className="auth-checkbox" /> Lembrar de mim</label>
                <button type="button" className="font-semibold text-primary transition hover:text-secondary-dark">Esqueci minha senha</button>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-xs leading-5 text-muted"><input id="auth-terms" type="checkbox" name="terms" className="auth-checkbox mt-0.5" required /><p><label htmlFor="auth-terms" className="cursor-pointer">Concordo com os </label><button type="button" className="auth-legal-link" onClick={() => setLegalDocument("terms")}>Termos de Uso</button> e a <button type="button" className="auth-legal-link" onClick={() => setLegalDocument("privacy")}>Política de Privacidade</button>.</p></div>
            )}

            <button type="submit" className="auth-submit">{mode === "login" ? "Entrar na minha conta" : "Criar minha conta"}<ArrowRight size={18} /></button>
            {message && <p className="rounded-xl bg-blue-50 px-3 py-2.5 text-center text-xs font-medium text-primary" role="status">{message}</p>}
          </form>

        </div>
      </section>
    </div>
    {legalDocument && <LegalModal document={legalDocument} onClose={() => setLegalDocument(null)} />}
    </>,
    document.body,
  );
}
