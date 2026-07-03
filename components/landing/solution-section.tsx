import { Bell, BriefcaseBusiness, CheckCircle2, ClipboardList, FileText, FolderOpen, ReceiptText, Users } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";

const items = [
  ["Clientes", Users], ["Projetos", BriefcaseBusiness], ["Escopos", ClipboardList], ["Orçamentos", ReceiptText],
  ["Aprovações", CheckCircle2], ["Materiais", FolderOpen], ["Lembretes", Bell], ["Obrigações", FileText],
] as const;

export function SolutionSection() {
  return (
    <section id="solucao" className="section-space overflow-hidden bg-primary-dark text-white">
      <div className="container-page grid items-center gap-14 lg:grid-cols-[.8fr_1.2fr]">
        <SectionHeading inverse align="left" eyebrow="A solução" title="Um único lugar para controlar todo o fluxo do seu projeto." description="Da primeira conversa ao pagamento, cada informação fica conectada ao contexto certo — fácil de encontrar, atualizar e acompanhar." />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map(([label, Icon], index) => (
            <article key={label} className={`rounded-2xl border border-white/10 bg-white/[.06] p-4 transition hover:bg-white/10 sm:p-5 ${index % 2 ? "sm:translate-y-5" : ""}`}>
              <span className="mb-5 grid size-10 place-items-center rounded-xl bg-secondary/20 text-secondary-light"><Icon size={20} aria-hidden="true" /></span>
              <p className="font-semibold text-white">{label}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
