"use client";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Link2, Unplug } from "lucide-react";
import { connectGoogleAction, disconnectGoogleAction, resolveGoogleIssueAction, retryGoogleQueueAction } from "@/app/dashboard/configuracoes/google-actions";
import { GoogleSyncControls } from "./sync-controls";
import { showToast } from "@/components/ui/toast-provider";
import type { GoogleStatus, SyncValue } from "@/lib/google/model";
function summary(value: SyncValue | null) { return value ? `${value.title} · ${value.start || "Sem data"}${value.completed ? " · Concluída" : ""}` : "Excluído / ausente"; }
export function GooglePanel({ status, compact = false }: {
    status: GoogleStatus;
    compact?: boolean;
}) {
    const [pending, startTransition] = useTransition();
    const [confirm, setConfirm] = useState(false);
    const router = useRouter();
    const query = useSearchParams();
    function run(action: () => Promise<{
        success: boolean;
        message: string;
        url?: string;
    }>) { startTransition(async () => { try {
        const result = await action();
        if (result.url) {
            window.location.assign(result.url);
            return;
        }
        showToast({ type: result.success ? "success" : "error", title: result.message });
        if (result.success)
            setConfirm(false);
        router.refresh();
    }
    catch {
        showToast({ type: "error", title: "A operação foi interrompida. Atualize e tente novamente." });
    } }); }
    return <section className="google-panel" aria-label="Integração Google" aria-busy={pending}>
    <div className="google-panel-heading"><CalendarDays size={22}/><div><strong>Google Agenda e Tasks</strong><p>{status.email || "Conecte sua conta para sincronizar compromissos e tarefas."}</p></div><span>{status.connected ? "Conectado" : status.email ? "Reconectar" : "Não conectado"}</span></div>
    {query.get("google") === "connected" && <p role="status">Autorização recebida. Clique em Sincronizar para atualizar os registros.</p>}
    {query.get("google") === "error" && <p role="alert">{query.get("message") || "Não foi possível conectar. Tente novamente."}</p>}
    {!compact && <p>Escolha o que enviar para a agenda e lista Escoply. Tarefas e compromissos sincronizam nos dois sentidos. Prazos de negócio são enviados como eventos gerenciados pelo Escoply.</p>}
    {status.message && <p role="status">{status.message}</p>}
    {status.lastSync && <small>Última execução concluída de tarefas/compromissos (categorias selecionadas): {new Date(status.lastSync).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</small>}
    <div className="google-actions">
      <button disabled={pending || !status.ready} onClick={() => run(connectGoogleAction)}><Link2 size={16}/>{status.connected ? "Renovar autorização" : "Conectar Google"}</button>
      {status.email && <button disabled={pending || !status.ready} onClick={() => setConfirm(!confirm)}><Unplug size={16}/>Desconectar</button>}
    </div>
    {status.connected && <><p className="google-automatic-notice">Envio automático ativo para novas tarefas e compromissos. {status.automation?.pending ?? 0} alteração(ões) na fila.{!!status.automation?.failed && ` ${status.automation.failed} envio(s) precisam de uma nova tentativa.`}</p>{!!status.automation?.pending && <button disabled={pending} onClick={() => run(retryGoogleQueueAction)}>Tentar enviar pendências agora</button>}<GoogleSyncControls automation={status.automation}/></>}
    {confirm && <div className="google-issue"><p>Desconectar Agenda e Tasks do Escoply? O Drive continua conectado. Registros e vínculos serão preservados. Para revogar todas as permissões do Escoply, use as configurações da sua conta Google.</p><button disabled={pending} onClick={() => run(disconnectGoogleAction)}>Confirmar desconexão</button><button disabled={pending} onClick={() => setConfirm(false)}>Cancelar</button></div>}
    {status.issues.length > 0 && <details open={!compact}><summary>{status.issues.length} item(ns) para revisar</summary>{status.issues.map(issue => <article className="google-issue" key={issue.id}><strong>{issue.title}</strong><p>{issue.message}</p><p>Escoply: {summary(issue.local)}</p><p>Google: {summary(issue.remote)}</p>{!issue.message.startsWith("Não suportado") && <div className="google-actions"><button disabled={pending || !status.connected || !issue.local} onClick={() => run(() => resolveGoogleIssueAction(issue.id, "local"))}>Manter Escoply</button><button disabled={pending || !status.connected || !issue.remote} onClick={() => run(() => resolveGoogleIssueAction(issue.id, "remote"))}>Manter Google</button>{(!issue.local || !issue.remote) && <button disabled={pending || !status.connected} onClick={() => { if (window.confirm("Excluir também a versão restante deste registro?"))
        run(() => resolveGoogleIssueAction(issue.id, "delete")); }}>Confirmar exclusão</button>}</div>}</article>)}</details>}
  </section>;
}
