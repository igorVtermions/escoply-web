"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { GooglePanel } from "./google-panel";
import type { GoogleStatus } from "@/lib/google/model";
function CalendarLogo() {
    return <svg width="28" height="28" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285f4" d="M6 6h36v28l-8 8H6z"/><path fill="#fff" d="M13 13h22v22H13z"/><path fill="#34a853" d="M13 35h22v7H13z"/><path fill="#fbbc04" d="M35 13h7v21l-7 1z"/><path fill="#ea4335" d="M35 35h7l-7 7z"/><path fill="#188038" d="M6 35h7v7H6z"/><text x="24" y="29" textAnchor="middle" fill="#4285f4" fontSize="16" fontWeight="600" fontFamily="Arial,sans-serif">31</text></svg>;
}
function IntegrationDialog({ status, close }: { status: GoogleStatus; close: () => void }) {
    const dialog = useRef<HTMLDialogElement>(null);
    const closeIfIdle = () => { if (!dialog.current?.querySelector('[aria-busy="true"]')) close(); };
    useEffect(() => {
        const current = dialog.current; const focus = document.activeElement as HTMLElement | null;
        const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
        current?.showModal();
        return () => { current?.close(); document.body.style.overflow = overflow; focus?.focus(); };
    }, []);
    return createPortal(<dialog ref={dialog} className="google-integration-dialog" aria-labelledby="google-integration-title" onCancel={e => { e.preventDefault(); closeIfIdle(); }}>
      <header className="google-integration-header"><CalendarLogo/><div><h2 id="google-integration-title">Google Agenda</h2><p>Conexão, envio automático e importação do histórico</p></div><button autoFocus type="button" aria-label="Fechar configurações Google" onClick={closeIfIdle}><X size={20}/></button></header>
      <GooglePanel status={status}/>
    </dialog>, document.body);
}
export function GoogleAgendaButton({ status }: { status: GoogleStatus }) {
    const [open, setOpen] = useState(false);
    return <><button type="button" className="google-agenda-trigger" aria-haspopup="dialog" onClick={() => setOpen(true)}><CalendarLogo/><span>Google Agenda<small className={status.connected ? "is-connected" : "is-disconnected"}><i aria-hidden="true"/>{status.connected ? "Conectado" : "Desconectado"}</small></span></button>{open && <IntegrationDialog status={status} close={() => setOpen(false)}/>}</>;
}
