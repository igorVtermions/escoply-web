import { Check, Rocket, Sprout } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionHeading } from "@/components/ui/section-heading";

const plans = [
  { name: "Free", description: "Para organizar os primeiros projetos", features: ["Clientes e projetos básicos", "Lembretes essenciais"], icon: Sprout, featured: false },
  { name: "Pro", description: "Para freelancers com mais volume", features: ["Materiais e PDFs", "Automações e recursos avançados futuramente"], icon: Rocket, featured: true },
];

export function PricingPreviewSection() {
  return (
    <section className="section-space">
      <div className="container-page">
        <SectionHeading eyebrow="Planos" title="Comece simples. Evolua conforme sua rotina crescer." description="Os planos ainda estão em definição. A prioridade é construir uma base de gestão útil e confiável." />
        <div className="mx-auto mt-12 grid max-w-3xl gap-5 md:grid-cols-2">
          {plans.map(({ name, description, features, icon: Icon, featured }) => (
            <article key={name} className={`relative rounded-3xl p-7 sm:p-8 ${featured ? "bg-primary text-white shadow-2xl shadow-primary/20" : "surface-card"}`}>
              <span className={`absolute right-5 top-5 rounded-full px-3 py-1 text-xs font-bold ${featured ? "bg-white/10 text-blue-100" : "bg-slate-100 text-muted"}`}>{featured ? "Planejado" : "Em definição"}</span>
              <span className={`grid size-11 place-items-center rounded-2xl ${featured ? "bg-secondary text-white" : "bg-blue-50 text-primary"}`}><Icon size={21} /></span>
              <h3 className="mt-6 text-2xl font-bold">{name}</h3><p className={`mt-2 text-sm ${featured ? "text-blue-100" : "text-muted"}`}>{description}</p>
              <ul className="mt-6 space-y-3">{features.map((feature) => <li key={feature} className="flex items-start gap-2 text-sm"><Check size={17} className={featured ? "text-secondary-light" : "text-emerald-500"} />{feature}</li>)}</ul>
              <ButtonLink href="#cta" variant={featured ? "secondary" : "primary"} className="mt-8 w-full">Tenho interesse</ButtonLink>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
