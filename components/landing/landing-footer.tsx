import { BrandLogo } from "@/components/ui/brand-logo";
import { brand } from "@/constants/brand";

const links = [{ label: "Produto", href: "#funcionalidades" }, { label: "Roadmap", href: "#roadmap" }, { label: "GitHub", href: "#" }, { label: "Contato", href: "mailto:contato@escoply.com" }];

export function LandingFooter() {
  return (
    <footer className="bg-primary-dark text-white">
      <div className="container-page flex flex-col gap-8 py-12 md:flex-row md:items-end md:justify-between">
        <div><a href="#inicio" aria-label="Escoply — início"><BrandLogo inverse /></a><p className="mt-4 text-sm text-blue-200">{brand.slogan}</p><p className="mt-2 text-xs text-blue-300/70">Desenvolvido por Igor Franco.</p></div>
        <nav className="flex flex-wrap gap-x-6 gap-y-3" aria-label="Navegação do rodapé">{links.map((link) => <a key={link.label} href={link.href} className="text-sm text-blue-100 transition hover:text-white">{link.label}</a>)}</nav>
      </div>
      <div className="border-t border-white/10"><p className="container-page py-5 text-xs text-blue-300/60">© {new Date().getFullYear()} Escoply. Todos os direitos reservados.</p></div>
    </footer>
  );
}
