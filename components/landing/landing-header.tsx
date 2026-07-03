"use client";

import { useCallback, useState } from "react";
import { AuthModal, type AuthMode } from "@/components/landing/auth-modal";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ButtonLink } from "@/components/ui/button-link";
import { navigation } from "@/constants/landing";

export function LandingHeader() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const closeAuth = useCallback(() => setIsAuthOpen(false), []);

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
    </>
  );
}
