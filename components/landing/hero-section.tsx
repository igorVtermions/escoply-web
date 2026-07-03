import { ArrowRight, CalendarClock, CircleDollarSign, Clock3, FolderKanban, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { CountUp } from "@/components/ui/count-up";

const stats = [
  { label: "Clientes ativos", value: 12, digits: 1, prefix: "", icon: Users, tone: "bg-blue-50 text-blue-700" },
  { label: "Em andamento", value: 8, digits: 2, prefix: "", icon: FolderKanban, tone: "bg-violet-50 text-violet-700" },
  { label: "Prazos próximos", value: 4, digits: 2, prefix: "", icon: CalendarClock, tone: "bg-amber-50 text-amber-700" },
  { label: "A receber", value: 8450, digits: 1, prefix: "R$ ", icon: CircleDollarSign, tone: "bg-emerald-50 text-emerald-700" },
];

export function HeroSection() {
  return (
    <section id="inicio" className="relative overflow-hidden border-b border-border bg-white">
      <div className="absolute inset-0 dot-grid opacity-65" aria-hidden="true" />
      <div className="absolute -left-40 top-10 size-96 rounded-full bg-blue-200/40 blur-3xl" aria-hidden="true" />
      <div className="absolute -right-32 top-24 size-96 rounded-full bg-violet-200/45 blur-3xl" aria-hidden="true" />
      <div className="container-page relative grid min-h-[calc(100vh-4.5rem)] items-center gap-14 py-20 lg:grid-cols-[.92fr_1.08fr] lg:py-24">
        <div>
          <span className="inline-flex rounded-full border border-secondary/20 bg-violet-50 px-3.5 py-1.5 text-sm font-semibold text-secondary-dark">Sua rotina freelance, sob controle</span>
          <h1 className="mt-6 max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-[-0.045em] text-ink sm:text-5xl lg:text-6xl">Organize clientes, projetos e prazos <span className="bg-gradient-to-r from-primary-light to-secondary bg-clip-text text-transparent">sem depender da memória.</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted">O Escoply centraliza escopos, orçamentos, aprovações, materiais, lembretes e obrigações em um fluxo simples para freelancers.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="#cta" className="gap-2">Começar gratuitamente <ArrowRight size={17} aria-hidden="true" /></ButtonLink>
            <ButtonLink href="#fluxo" variant="secondary">Ver como funciona</ButtonLink>
          </div>
          <p className="mt-5 text-sm text-muted">Sem cartão de crédito · Configure em poucos minutos</p>
        </div>

        <div className="relative mx-auto w-full max-w-2xl lg:mx-0">
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary/12 to-secondary/15 blur-2xl" aria-hidden="true" />
          <div className="surface-card relative overflow-hidden rounded-[1.75rem] p-3 sm:p-5">
            <div className="mb-4 flex items-center justify-between px-2 py-1">
              <div><p className="font-bold text-ink">Visão geral</p><p className="text-xs text-muted">Quinta-feira, 3 de julho</p></div>
              <div className="flex gap-1.5" aria-hidden="true"><span className="size-2.5 rounded-full bg-red-300" /><span className="size-2.5 rounded-full bg-amber-300" /><span className="size-2.5 rounded-full bg-emerald-300" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {stats.map(({ label, value, digits, prefix, icon: Icon, tone }, index) => (
                <article key={label} className="rounded-2xl border border-border bg-white p-4">
                  <span className={`mb-4 grid size-9 place-items-center rounded-xl ${tone}`}><Icon size={18} aria-hidden="true" /></span>
                  <p className="text-xl font-bold tabular-nums text-ink sm:text-2xl"><CountUp value={value} prefix={prefix} minimumIntegerDigits={digits} delay={350 + index * 140} /></p><p className="mt-1 text-xs text-muted sm:text-sm">{label}</p>
                </article>
              ))}
            </div>
            <div className="mt-3 rounded-2xl bg-primary p-4 text-white sm:p-5">
              <div className="mb-4 flex items-center justify-between"><p className="flex items-center gap-2 text-sm font-semibold"><Clock3 size={17} /> Lembretes de hoje</p><span className="rounded-full bg-white/10 px-2.5 py-1 text-xs">3 pendências</span></div>
              <div className="space-y-2 text-xs sm:text-sm">
                <p className="flex justify-between gap-3 rounded-lg bg-white/8 px-3 py-2.5"><span>Enviar proposta · Studio Lume</span><span className="text-blue-200">10:00</span></p>
                <p className="flex justify-between gap-3 rounded-lg bg-white/8 px-3 py-2.5"><span>Follow-up · Marcelo</span><span className="text-blue-200">14:30</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
