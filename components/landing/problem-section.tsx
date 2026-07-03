import { BellRing, CircleDollarSign, FileQuestion, FolderSearch, MessageSquareWarning, Repeat2 } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { painPoints } from "@/constants/landing";

const icons = [BellRing, CircleDollarSign, FileQuestion, FolderSearch, MessageSquareWarning, Repeat2];

export function ProblemSection() {
  return (
    <section id="problema" className="section-space">
      <div className="container-page">
        <SectionHeading eyebrow="O problema" title="Freela não falha por falta de talento. Falha por falta de organização." description="Quando WhatsApp, Drive, bloco de notas, planilhas e memória viram o sistema de gestão, informações importantes inevitavelmente escapam." />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {painPoints.map(([title, description], index) => { const Icon = icons[index]; return (
            <article key={title} className="surface-card rounded-2xl p-6 transition hover:-translate-y-1 hover:border-red-200">
              <span className="mb-5 grid size-11 place-items-center rounded-xl bg-red-50 text-red-500"><Icon className="size-5" aria-hidden="true" /></span>
              <h3 className="text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted">{description}</p>
            </article>
          ); })}
        </div>
      </div>
    </section>
  );
}
