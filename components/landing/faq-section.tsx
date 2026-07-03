import { SectionHeading } from "@/components/ui/section-heading";

const faqs = [
  ["O Escoply é para qualquer freelancer?", "Sim. A estrutura foi pensada para profissionais independentes de diferentes áreas que precisam organizar clientes, entregas e cobranças."],
  ["Vai funcionar no celular?", "Sim. A versão web será responsiva e poderá ser acessada pelo navegador do celular."],
  ["Os dados ficam online?", "Sim. Quando a plataforma for lançada, os dados serão armazenados online com práticas adequadas de segurança e privacidade."],
  ["Vai ter versão mobile?", "Uma experiência mobile dedicada está no roadmap. Primeiro, o foco será tornar a versão web responsiva sólida e completa."],
  ["O Escoply já usa IA?", "Não. IA e RAG estão no roadmap futuro e serão adicionados depois que o core de gestão estiver sólido."],
  ["O app será gratuito?", "Está previsto um plano gratuito para começar. Limites e recursos dos planos ainda estão em definição."],
] as const;

export function FaqSection() {
  return (
    <section className="section-space bg-white">
      <div className="container-page grid gap-12 lg:grid-cols-[.65fr_1.35fr]">
        <SectionHeading align="left" eyebrow="FAQ" title="Perguntas frequentes" description="O que já está definido sobre os primeiros passos do Escoply." />
        <div className="divide-y divide-border border-y border-border">
          {faqs.map(([question, answer]) => <details key={question} className="group py-1"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 font-semibold text-ink marker:content-none"><span>{question}</span><span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-lg text-primary transition group-open:rotate-45">+</span></summary><p className="max-w-2xl pb-5 pr-10 text-sm leading-6 text-muted">{answer}</p></details>)}
        </div>
      </div>
    </section>
  );
}
