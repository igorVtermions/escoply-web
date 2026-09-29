"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { connectGoogleAction } from "@/app/dashboard/configuracoes/google-actions";
import { disconnectDriveAction, getDriveStatusAction } from "@/app/dashboard/configuracoes/drive-actions";
import { showToast } from "@/components/ui/toast-provider";
import type { DriveStatus } from "@/lib/google/drive-model";
import { DriveLogo } from "./drive-logo";

export function DrivePanel() {
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const query = useSearchParams();
  const load = useCallback(async () => {
    try {
      const result = await getDriveStatusAction();
      if (result.success) { setStatus(result.status); setError(""); }
      else setError(result.message);
    } catch { setError("Não foi possível consultar a conexão do Drive."); }
  }, []);
  useEffect(() => {
    let active = true;
    getDriveStatusAction().then(result => {
      if (!active) return;
      if (result.success) { setStatus(result.status); setError(""); }
      else setError(result.message);
    }).catch(() => { if (active) setError("Não foi possível consultar a conexão do Drive."); });
    return () => { active = false; };
  }, []);
  function run(disconnect: boolean) {
    startTransition(async () => {
      try {
        const result = disconnect ? await disconnectDriveAction() : await connectGoogleAction("drive");
        if ("url" in result && result.url) { window.location.assign(result.url); return; }
        showToast({ type: result.success ? "success" : "error", title: result.message });
        if (result.success) setConfirm(false);
        await load();
      } catch { showToast({ type: "error", title: "Não foi possível concluir. Tente novamente." }); }
    });
  }
  return <details className="google-settings-disclosure">
    <summary>
      <DriveLogo />
      <span className="google-settings-name"><strong>Google Drive</strong><small>{status?.email || "Arquivos e pastas dos seus projetos"}</small></span>
      <span className={`google-settings-status ${status?.connected ? "is-connected" : "is-disconnected"}`}><i aria-hidden="true" />{error ? "Indisponível" : !status ? "Consultando…" : status.connected ? "Conectado" : status.reconnect ? "Reconectar" : "Desconectado"}</span>
      <span className="google-settings-toggle"><span className="google-settings-expand">Expandir</span><span className="google-settings-collapse">Recolher</span><ChevronDown size={18} /></span>
    </summary>
    <section className="google-panel" aria-label="Conexão Google Drive" aria-busy={pending}>
      <p>Selecione arquivos e vincule uma pasta nos materiais de cada projeto. Os originais continuam no seu Drive, com as permissões existentes.</p>
      {query.get("drive") === "connected" && <p role="status">Autorização recebida. Abra um projeto para adicionar arquivos do Drive.</p>}
      {query.get("drive") === "error" && <p role="alert">{query.get("message") || "Não foi possível conectar o Drive."}</p>}
      {error && <p role="alert">{error}</p>}
      <div className="google-actions">
        <button disabled={pending || !status} onClick={() => run(false)}>{status?.connected || status?.reconnect ? "Renovar autorização" : "Conectar Google Drive"}</button>
        {status?.connected && <button disabled={pending} onClick={() => setConfirm(!confirm)}>Desconectar</button>}
        {error && <button disabled={pending} onClick={() => { void load(); }}>Tentar novamente</button>}
      </div>
      {confirm && <div className="google-issue"><p>Desconectar o Drive do Escoply? Os arquivos e a Agenda serão preservados.</p><div className="google-actions"><button disabled={pending} onClick={() => run(true)}>Confirmar desconexão</button><button disabled={pending} onClick={() => setConfirm(false)}>Cancelar</button></div></div>}
      <p>Para remover todas as permissões do Escoply no Google, acesse <a href="https://myaccount.google.com/connections" target="_blank" rel="noreferrer">as conexões da sua conta Google</a>. Isso também pode desconectar a Agenda.</p>
    </section>
  </details>;
}
