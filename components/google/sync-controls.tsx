"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/ui/toast-provider";
import { defaultSelection } from "@/lib/google/selection";
import { businessLabels, type BusinessKind, type BusinessSelection } from "@/lib/google/business-model";
import { previewGoogleAction, syncGoogleAction, previewBusinessAction, syncBusinessAction, resolveBusinessAction, saveGoogleAutomationAction } from "@/app/dashboard/configuracoes/google-actions";
import type { GoogleStatus } from "@/lib/google/model";
type TaskPreview = Extract<Awaited<ReturnType<typeof previewGoogleAction>>, { success: true }>["data"];
type BusinessPreview = Extract<Awaited<ReturnType<typeof previewBusinessAction>>, { success: true }>["data"];
function dateLabel(value: string) {
    if (!value) return "Sem data";
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split("-").reverse().join("/");
    return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}
export function GoogleSyncControls({ automation }: { automation?: GoogleStatus["automation"] }) {
    const router = useRouter(); const [pending, start] = useTransition();
    const [selection, setSelection] = useState(defaultSelection);
    const [business, setBusiness] = useState<BusinessSelection>({ kinds: automation?.kinds ?? [], from: defaultSelection().from, minutes: automation?.minutes ?? null });
    const [preview, setPreview] = useState<TaskPreview>();
    const [businessPreview, setBusinessPreview] = useState<BusinessPreview>();
    const [previewKey, setPreviewKey] = useState(""); const [businessKey, setBusinessKey] = useState("");
    const [message, setMessage] = useState("");
    const taskKey = JSON.stringify(selection); const currentBusinessKey = JSON.stringify(business);
    function execute(action: () => Promise<{ success: boolean; message: string }>) {
        start(async () => {
            try { const result = await action(); setMessage(result.message); showToast({ type: result.success ? "success" : "error", title: result.message }); router.refresh(); }
            catch { setMessage("Operação interrompida. Atualize a prévia antes de continuar."); setPreviewKey(""); setBusinessKey(""); }
        });
    }
    function loadPreview(prices = false) {
        start(async () => {
            try {
                if (prices) { const result = await previewBusinessAction(business); if (result.success) { setBusinessPreview(result.data); setBusinessKey(currentBusinessKey); } else { setBusinessKey(""); setMessage(result.message); } }
                else { const result = await previewGoogleAction(selection); if (result.success) { setPreview(result.data); setPreviewKey(taskKey); } else { setPreviewKey(""); setMessage(result.message); } }
            } catch { setMessage("Não foi possível carregar a prévia. Tente novamente."); }
        });
    }
    return <div className="google-sync-controls" aria-busy={pending}>
      <p>Ao salvar no Escoply, novas tarefas e compromissos entram na fila automática. Falhas temporárias são retomadas enquanto o app estiver aberto. Alterações feitas diretamente no Google chegam pelo botão de sincronização abaixo.</p>
      <details><summary>Importar histórico e revisar tarefas e compromissos</summary>
        <fieldset disabled={pending}><legend>Categorias desta sincronização</legend>
          <label><input type="checkbox" checked={selection.tasks} onChange={e => setSelection({ ...selection, tasks: e.target.checked })}/>Tarefas e lembretes cadastrados como tarefas → Google Tasks</label>
          <label><input type="checkbox" checked={selection.events} onChange={e => setSelection({ ...selection, events: e.target.checked })}/>Compromissos → Google Agenda</label>
          <label>Novos itens a partir de <input type="date" value={selection.from} onChange={e => setSelection({ ...selection, from: e.target.value })}/></label>
          <label><input type="checkbox" checked={selection.includeCompleted} onChange={e => setSelection({ ...selection, includeCompleted: e.target.checked })}/>Incluir novas tarefas já concluídas</label>
          <label><input type="checkbox" checked={selection.includeUndated} onChange={e => setSelection({ ...selection, includeUndated: e.target.checked })}/>Incluir novas tarefas sem data (não aparecem em um dia da agenda)</label>
        </fieldset>
        <p>O período filtra novos envios e importações. Vínculos existentes continuam sincronizando na categoria selecionada. Desmarcar uma categoria pausa sua sincronização, sem apagar registros. Deixe a data vazia para incluir todo o histórico.</p>
        <p>O Google agrupa tarefas antigas no painel “Tarefas pendentes”. Horários de tarefas ficam somente no Escoply. Para um alarme com horário, crie um compromisso com aviso.</p>
        <div className="google-actions"><button disabled={pending || (!selection.tasks && !selection.events)} onClick={() => loadPreview()}>Ver prévia e datas</button><button disabled={pending || previewKey !== taskKey} onClick={() => execute(() => syncGoogleAction(selection))}>{pending ? "Processando…" : "Sincronizar / continuar lote"}</button></div>
        {preview && previewKey === taskKey && <><p>{preview.counts.newItems} novos envios · {preview.counts.linked} vínculos existentes · {preview.counts.skipped} ignorados. Prévia local; itens novos no Google serão verificados durante a sincronização.</p><div className="google-preview-scroll"><table><caption>Até 200 itens locais. Última data Google corresponde ao retorno salvo, não a uma consulta ao vivo.</caption><thead><tr><th>Item / destino</th><th>Data Escoply</th><th>Última data Google</th><th>Situação</th></tr></thead><tbody>{preview.rows.map(r => <tr key={r.id}><td>{r.title}<small>{r.destination}</small></td><td>{dateLabel(r.date)}</td><td>{r.lastGoogleDate === undefined ? "Ainda não confirmado" : dateLabel(r.lastGoogleDate)}</td><td>{r.reason}</td></tr>)}</tbody></table></div></>}
      </details>
      <details><summary>Enviar prazos de projetos, orçamentos, recebimentos e obrigações</summary>
        <p>Eventos de dia inteiro gerenciados pelo Escoply. Não alteram projetos, valores, pagamentos ou aprovações a partir do Google. Ao encerrar o registro de origem, o evento gerenciado é removido na próxima sincronização; alterações feitas no Google exigem revisão.</p>
        <fieldset disabled={pending}><legend>Prazos desta sincronização (opcional)</legend>
          {(Object.keys(businessLabels) as BusinessKind[]).map(kind => <label key={kind}><input type="checkbox" checked={business.kinds.includes(kind)} onChange={e => setBusiness({ ...business, kinds: e.target.checked ? [...business.kinds, kind] : business.kinds.filter(k => k !== kind) })}/>{businessLabels[kind]}</label>)}
          <label>Novos prazos a partir de <input type="date" value={business.from} onChange={e => setBusiness({ ...business, from: e.target.value })}/></label>
          <label>Aviso Google para os eventos selecionados <select value={business.minutes ?? "none"} onChange={e => setBusiness({ ...business, minutes: e.target.value === "none" ? null : Number(e.target.value) })}><option value="none">Sem aviso</option><option value="900">Dia anterior às 09h</option><option value="2340">Dois dias antes às 09h</option></select></label>
        </fieldset>
        <p>Avisos calculados em America/Sao_Paulo, sujeitos às configurações do Google/dispositivo. Categorias desmarcadas e eventos já enviados ficam preservados. A escolha do aviso também atualiza vínculos existentes das categorias selecionadas. Obrigações exportam somente ocorrências já cadastradas.</p>
        <div className="google-actions"><button disabled={pending} onClick={() => execute(() => saveGoogleAutomationAction(business))}>Salvar envio automático destas categorias</button><button disabled={pending || !business.kinds.length} onClick={() => loadPreview(true)}>Ver prévia do histórico</button><button disabled={pending || businessKey !== currentBusinessKey || !business.kinds.length} onClick={() => execute(() => syncBusinessAction(business))}>Sincronizar / continuar prazos</button></div>
        {businessPreview && businessKey === currentBusinessKey && <><p>{businessPreview.total} registros de origem; até 200 exibidos.</p><div className="google-preview-scroll"><table><thead><tr><th>Prazo</th><th>Data</th><th>Situação</th></tr></thead><tbody>{businessPreview.rows.map(r => <tr key={r.id}><td>{r.title}</td><td>{dateLabel(r.date)}</td><td>{r.reason}</td></tr>)}</tbody></table></div>{businessPreview.issues.map(issue => <article className="google-issue" key={issue.id}><strong>{issue.title}</strong><p>{issue.message}</p><p>Escoply: {issue.local ? `${issue.local.title} · ${dateLabel(issue.local.start)}` : "Encerrado ou ausente"}</p><p>Google: {issue.remote ? `${issue.remote.title} · ${dateLabel(issue.remote.start)}` : "Ausente"}</p><p>{issue.paused ? "Sincronização deste prazo pausada." : "Revisão necessária."}</p><div className="google-actions"><button disabled={pending} onClick={() => execute(() => resolveBusinessAction(issue.id, true, business))}>Usar origem Escoply</button><button disabled={pending} onClick={() => execute(() => resolveBusinessAction(issue.id, false, business))}>Preservar Google e pausar</button></div></article>)}</>}
      </details>
      <p role="status">{message || (pending ? "Carregando…" : "O período vale para importar o histórico. Salve as categorias para personalizar os próximos envios automáticos.")}</p>
    </div>;
}
