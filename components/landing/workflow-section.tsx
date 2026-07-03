import { ArrowRight, BadgeCheck, Banknote, Briefcase, ClipboardList, FileSignature, PackageCheck, UserRound } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { workflow } from "@/constants/landing";

const icons = [UserRound, Briefcase, ClipboardList, FileSignature, BadgeCheck, PackageCheck, Banknote];

export function WorkflowSection() {
  return (
    <section id="fluxo" className="section-space">
      <div className="container-page">
        <SectionHeading eyebrow="Fluxo de trabalho" title="Do briefing à entrega, siga um fluxo simples." description="Visualize a próxima etapa de cada trabalho e avance sem perder decisões importantes pelo caminho." />
        <ol className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {workflow.map(([title, description], index) => { const Icon = icons[index]; return (
            <li key={title} className="relative flex lg:block">
              <article className="surface-card flex w-full items-center gap-4 rounded-2xl p-4 lg:min-h-44 lg:flex-col lg:items-start lg:p-5">
                <div className="flex shrink-0 items-center gap-2 lg:w-full lg:justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary text-white"><Icon size={18} aria-hidden="true" /></span>
                  <span className="text-xs font-bold text-slate-300">0{index + 1}</span>
                </div>
                <div><h3 className="text-sm font-bold">{title}</h3><p className="mt-1 text-xs leading-5 text-muted">{description}</p></div>
              </article>
              {index < workflow.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden size-5 -translate-y-1/2 rounded-full bg-background p-1 text-secondary lg:block" aria-hidden="true" />}
            </li>
          ); })}
        </ol>
      </div>
    </section>
  );
}
