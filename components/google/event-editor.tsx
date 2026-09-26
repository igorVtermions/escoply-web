"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { saveCalendarEventAction, deleteCalendarEventAction } from "@/app/dashboard/agenda/event-actions";
import { showToast } from "@/components/ui/toast-provider";
import { saoDate, saoTime, type CalendarEventRow } from "@/lib/google/model";
export function EventEditor({ event, date, onClose }: {
    event?: CalendarEventRow;
    date: string;
    onClose: () => void;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    const [allDay, setAllDay] = useState(event?.all_day ?? false);
    const [pending, start] = useTransition();
    const router = useRouter();
    useEffect(() => { const current = dialog.current; const focus = document.activeElement as HTMLElement | null; const overflow = document.body.style.overflow; document.body.style.overflow = "hidden"; current?.showModal(); return () => { current?.close(); document.body.style.overflow = overflow; focus?.focus(); }; }, []);
    const startValue = event ? (allDay ? event.start_date ?? saoDate(event.starts_at) : `${saoDate(event.starts_at)}T${saoTime(event.starts_at)}`) : allDay ? date : `${date}T09:00`;
    const nextDay = new Date(`${date}T12:00:00Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const endValue = event ? (allDay ? event.end_date ?? saoDate(event.ends_at) : `${saoDate(event.ends_at)}T${saoTime(event.ends_at)}`) : allDay ? nextDay.toISOString().slice(0, 10) : `${date}T10:00`;
    function run(action: () => Promise<{
        success: boolean;
        message: string;
    }>) { start(async () => { try {
        const result = await action();
        showToast({ type: result.success ? "success" : "error", title: result.message });
        if (result.success) {
            router.refresh();
            onClose();
        }
    }
    catch {
        showToast({ type: "error", title: "Não foi possível salvar. Tente novamente." });
    } }); }
    return createPortal(<dialog ref={dialog} className="google-dialog" aria-labelledby="google-event-title" onCancel={e => { e.preventDefault(); if (!pending)
        onClose(); }}>
    <div className="google-panel-heading"><h2 id="google-event-title">{event ? "Editar compromisso" : "Novo compromisso"}</h2><button aria-label="Fechar" disabled={pending} onClick={onClose}><X /></button></div>
    <form onSubmit={e => { e.preventDefault(); const form = new FormData(e.currentTarget); run(() => saveCalendarEventAction(form)); }}>
      <input type="hidden" name="id" value={event?.id ?? ""}/><input type="hidden" name="version" value={event?.updated_at ?? ""}/>
      <label>Título<input autoFocus name="title" required minLength={2} maxLength={180} defaultValue={event?.title}/></label>
      <label>Descrição<textarea name="description" maxLength={8000} defaultValue={event?.description}/></label>
      <label className="google-checkbox"><input type="checkbox" name="all_day" checked={allDay} onChange={e => setAllDay(e.target.checked)}/>Dia inteiro</label>
      <div className="google-form-grid" key={String(allDay)}><label>Início (São Paulo)<input name="start" type={allDay ? "date" : "datetime-local"} required defaultValue={startValue}/></label><label>{allDay ? "Primeiro dia após o compromisso" : "Término (São Paulo)"}<input name="end" type={allDay ? "date" : "datetime-local"} required defaultValue={endValue}/></label></div>
      <label>Lembrete no Google<select name="reminder" defaultValue={event ? "keep" : "15"}>{event && <option value="keep">Manter lembretes atuais</option>}<option value="none">Sem lembrete</option><option value="default">Padrão da agenda Google</option>{[0, 5, 10, 15, 30, 60, 1440].map(m => <option key={m} value={m}>{m === 0 ? "No horário" : m === 1440 ? "Um dia antes" : `${m} minutos antes`}</option>)}</select></label>
      <p>Com o Google conectado, o compromisso entra no envio automático após salvar. Se houver uma alteração nos dois lados, a integração pedirá sua revisão.</p>
      <div className="google-actions"><button disabled={pending} type="submit">{pending ? "Salvando…" : "Salvar compromisso"}</button><button disabled={pending} type="button" onClick={onClose}>Cancelar</button>{event && <button disabled={pending} type="button" onClick={() => { if (window.confirm("Excluir este compromisso no Escoply?"))
        run(() => deleteCalendarEventAction(event.id, event.updated_at)); }}>Excluir</button>}</div>
    </form>
  </dialog>, document.body);
}
