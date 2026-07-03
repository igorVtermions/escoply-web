import { Bot, Search, Send, Sparkles } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";

const prompts = ["Resuma o projeto da Studio Lume.", "O que falta entregar esta semana?", "Crie uma mensagem para cobrar aprovação do orçamento.", "Quais clientes precisam de follow-up?"];

export function AiSection() {
  return (
    <section id="roadmap" className="section-space overflow-hidden bg-white">
      <div className="container-page grid items-center gap-12 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3.5 py-1.5 text-sm font-bold text-secondary-dark"><Sparkles size={15} /> Roadmap futuro</span>
          <div className="mt-5"><SectionHeading align="left" title="Preparado para uma camada inteligente no futuro." description="No roadmap do Escoply, uma camada de IA poderá ajudar freelancers a resumir projetos, gerar mensagens para clientes, encontrar informações em briefings e identificar pendências." /></div>
          <p className="mt-5 rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm leading-6 text-secondary-dark"><strong>Importante:</strong> esta funcionalidade representa a visão futura do produto e ainda não está disponível.</p>
        </div>
        <div className="relative">
          <div className="absolute -inset-10 rounded-full bg-violet-200/30 blur-3xl" aria-hidden="true" />
          <div className="surface-card relative rounded-3xl p-5 sm:p-7">
            <div className="flex items-center gap-3 border-b border-border pb-5"><span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-white"><Bot size={22} /></span><div><p className="font-bold">Assistente Escoply</p><p className="text-xs text-muted">Conectado ao contexto dos seus projetos</p></div></div>
            <div className="mt-5 space-y-3">
              {prompts.map((prompt, index) => <div key={prompt} className="flex items-center gap-3 rounded-xl border border-border bg-slate-50 p-3.5 text-sm text-ink"><Search size={16} className="shrink-0 text-secondary" /><span className="flex-1">{prompt}</span>{index === 0 && <Send size={15} className="text-muted" />}</div>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
