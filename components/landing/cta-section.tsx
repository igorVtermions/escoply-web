import { ArrowRight, CheckCircle2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";

export function CtaSection() {
  return (
    <section id="cta" className="bg-white pb-20 pt-4 md:pb-28">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary-dark via-primary to-secondary-dark px-6 py-14 text-center text-white shadow-2xl shadow-primary/20 sm:px-12 md:py-20">
          <div className="absolute -left-20 -top-24 size-72 rounded-full border-[50px] border-white/5" aria-hidden="true" /><div className="absolute -bottom-32 -right-16 size-80 rounded-full bg-secondary-light/20 blur-2xl" aria-hidden="true" />
          <div className="relative mx-auto max-w-2xl">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm"><CheckCircle2 size={15} /> Menos improviso, mais clareza</span>
            <h2 className="text-3xl font-bold tracking-[-0.04em] sm:text-4xl md:text-5xl">Pronto para organizar seus projetos com mais clareza?</h2>
            <p className="mx-auto mt-5 max-w-xl leading-7 text-blue-100">Comece criando uma rotina onde cada cliente, escopo, orçamento e prazo tem seu lugar.</p>
            <ButtonLink href="#inicio" variant="secondary" className="mt-8 gap-2 border-0 px-6">Começar agora <ArrowRight size={17} /></ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
