"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldAlert, X } from "lucide-react";
import { AuthModal, type AuthMode } from "@/components/landing/auth-modal";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ButtonLink } from "@/components/ui/button-link";
import { navigation } from "@/constants/landing";

export function LandingHeader() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isBlockedNoticeOpen, setIsBlockedNoticeOpen] = useState(false);
  const closeAuth = useCallback(() => setIsAuthOpen(false), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") !== "login") return;
    const isBlocked = params.get("reason") === "blocked";

    const timer = window.setTimeout(() => {
      setAuthMode("login");
      setIsAuthOpen(true);
      if (isBlocked) setIsBlockedNoticeOpen(true);
    }, 0);
    params.delete("auth");
    params.delete("reason");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    return () => window.clearTimeout(timer);
  }, []);

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-border/80 bg-white/90 backdrop-blur-xl">
      <div className="container-page flex h-18 items-center justify-between gap-6">
        <a href="#inicio" aria-label="Escoply — início"><BrandLogo /></a>
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Navegação principal">
          {navigation.map((item) => <a key={item.href} href={item.href} className="text-sm font-medium text-muted transition hover:text-primary">{item.label}</a>)}
        </nav>
        <div className="flex items-center gap-2">
          <ButtonLink href="#" variant="ghost" className="header-action hidden sm:inline-flex" onClick={(event) => { event.preventDefault(); openAuth("login"); }}>Entrar</ButtonLink>
          <ButtonLink href="#cta" className="header-action px-4 sm:px-5">Começar agora</ButtonLink>
        </div>
      </div>
    </header>
    <AuthModal isOpen={isAuthOpen} mode={authMode} onClose={closeAuth} onModeChange={setAuthMode} />
    {isBlockedNoticeOpen ? (
      <div className="auth-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsBlockedNoticeOpen(false); }}>
        <section className="banned-account-modal" role="dialog" aria-modal="true" aria-labelledby="banned-account-title">
          <button type="button" aria-label="Fechar aviso" onClick={() => setIsBlockedNoticeOpen(false)}>
            <X size={20} />
          </button>
          <span><ShieldAlert size={22} /></span>
          <small>Usuário banido</small>
          <h2 id="banned-account-title">Seu acesso ao Escoply foi bloqueado.</h2>
          <p>Entre em contato com o suporte para contestar o bloqueio ou solicitar uma revisão do acesso à sua conta.</p>
          <a href="mailto:igorviniciusf10@gmail.com?subject=Contesta%C3%A7%C3%A3o%20de%20bloqueio%20Escoply">Contestar bloqueio</a>
        </section>
      </div>
    ) : null}
    </>
  );
}
