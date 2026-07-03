import { BellRing, ClipboardCheck, FileStack, FolderKanban, ReceiptText, UserRound } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { features } from "@/constants/landing";

const icons = [UserRound, FolderKanban, ClipboardCheck, ReceiptText, FileStack, BellRing];

export function FeaturesSection() {
  return (
    <section id="funcionalidades" className="section-space bg-white">
      <div className="container-page">
        <SectionHeading eyebrow="Funcionalidades" title="Tudo que um freelancer precisa para não perder o controle." description="Uma base simples para organizar a operação sem transformar seu trabalho em mais uma planilha complicada." />
        <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
          {features.map(([title, description], index) => { const Icon = icons[index]; return (
            <article key={title} className="group bg-white p-7 transition hover:bg-slate-50 sm:p-8">
              <span className="mb-6 grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-50 to-violet-50 text-primary transition group-hover:scale-105"><Icon size={23} aria-hidden="true" /></span>
              <h3 className="text-lg font-bold">{title}</h3><p className="mt-3 text-sm leading-6 text-muted">{description}</p>
            </article>
          ); })}
        </div>
      </div>
    </section>
  );
}
