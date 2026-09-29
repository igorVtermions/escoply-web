"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FolderOpen, Plus, Unplug } from "lucide-react";
import { attachDriveFileAction, getDrivePickerConfigAction, getDriveStatusAction, unlinkDriveFolderAction } from "@/app/dashboard/configuracoes/drive-actions";
import { showToast } from "@/components/ui/toast-provider";
import type { DriveFolder, DriveStatus } from "@/lib/google/drive-model";
import { openDrivePicker, prepareDrivePicker, type PickerConfig } from "@/lib/google/drive-picker";
import { DriveLogo } from "./drive-logo";

export function ProjectDrive({ projectId, onAttached }: { projectId: string; onAttached(): void }) {
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [folder, setFolder] = useState<DriveFolder | null>(null);
  const [config, setConfig] = useState<PickerConfig | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const router = useRouter();
  const load = useCallback(async () => {
    setError(""); setConfig(null);
    try {
      const result = await getDriveStatusAction(projectId);
      if (!result.success) { setError(result.message); return; }
      setStatus(result.status); setFolder(result.folder);
      if (result.status.connected) {
        const configured = await getDrivePickerConfigAction(projectId);
        if (!configured.success) { setError(configured.message); return; }
        await prepareDrivePicker();
        setConfig(configured.config);
      }
    } catch { setError("Não foi possível preparar o Drive. Tente novamente."); }
  }, [projectId]);
  useEffect(() => {
    let active = true;
    getDriveStatusAction(projectId).then(async result => {
      if (!active) return;
      if (!result.success) { setError(result.message); return; }
      setStatus(result.status); setFolder(result.folder);
      if (!result.status.connected) return;
      const configured = await getDrivePickerConfigAction(projectId);
      if (!active) return;
      if (!configured.success) { setError(configured.message); return; }
      await prepareDrivePicker();
      if (active) setConfig(configured.config);
    }).catch(() => { if (active) setError("Não foi possível preparar o Drive. Tente novamente."); });
    return () => { active = false; controller.current?.abort(); };
  }, [projectId]);
  async function pick(target: "material" | "folder") {
    if (!config || pending) return;
    setPending(true);
    const operation = new AbortController(); controller.current = operation;
    try {
      const selected = await openDrivePicker(config, target === "folder", operation.signal);
      if (!selected || operation.signal.aborted) return;
      const result = await attachDriveFileAction(projectId, selected, target);
      showToast({ type: result.success ? "success" : "error", title: result.message });
      if (result.success) {
        if (target === "material") onAttached();
        router.refresh(); await load();
      }
    } catch (e) { showToast({ type: "error", title: e instanceof Error ? e.message : "Não foi possível vincular o arquivo." }); }
    finally { setPending(false); controller.current = null; }
  }
  async function unlink() {
    setPending(true);
    try {
      const result = await unlinkDriveFolderAction(projectId);
      showToast({ type: result.success ? "success" : "error", title: result.message });
      if (result.success) { setConfirm(false); setFolder(null); router.refresh(); }
    } catch { showToast({ type: "error", title: "Não foi possível remover o vínculo." }); }
    finally { setPending(false); }
  }
  return <div className="google-drive-project" aria-busy={pending}>
    <div className="google-drive-project-heading"><DriveLogo /><strong>Google Drive</strong><span className={`google-settings-status ${status?.connected ? "is-connected" : "is-disconnected"}`}><i aria-hidden="true" />{error && !status ? "Indisponível" : !status ? "Consultando…" : status.connected ? "Conectado" : status.reconnect ? "Reconectar" : "Desconectado"}</span></div>
    {status?.connected && status.email && <p>Na janela do Google, escolha a conta conectada: <strong>{status.email}</strong>.</p>}
    {error && <p role="alert">{error} <button type="button" disabled={pending} onClick={() => { void load(); }}>Tentar novamente</button></p>}
    {status?.connected ? <div className="google-drive-project-actions">
      <button type="button" disabled={pending || !config} onClick={() => { void pick("material"); }}><Plus size={15} />Adicionar do Drive</button>
      <button type="button" disabled={pending || !config} onClick={() => { void pick("folder"); }}><FolderOpen size={15} />{folder ? "Trocar pasta" : "Vincular pasta"}</button>
      {!config && !error && <small role="status">Preparando seletor…</small>}
    </div> : status && <Link href="/dashboard/configuracoes?tab=integrations">{status.reconnect ? "Renovar autorização do Drive" : "Conectar Google Drive"}</Link>}
    {folder && <div className="google-drive-folder"><a href={folder.url} target="_blank" rel="noreferrer"><FolderOpen size={16} /><span>{folder.name}</span><ExternalLink size={14} /></a><button type="button" disabled={pending} onClick={() => setConfirm(!confirm)} aria-label="Desvincular pasta do projeto"><Unplug size={16} /></button></div>}
    {confirm && <div className="google-drive-confirm"><p>Remover o vínculo? A pasta e seus arquivos continuam no Drive.</p><button type="button" disabled={pending} onClick={() => { void unlink(); }}>Remover vínculo</button><button type="button" disabled={pending} onClick={() => setConfirm(false)}>Cancelar</button></div>}
    <small>Os arquivos selecionados aparecem em Links. Vincular uma pasta não importa seu conteúdo nem altera o compartilhamento.</small>
  </div>;
}
