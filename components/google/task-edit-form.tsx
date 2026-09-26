"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { editTaskAction } from "@/app/dashboard/tarefas/edit-action";
import { saoDate, saoTime } from "@/lib/google/model";
import type { TaskItem } from "@/lib/tasks/data";
import { showToast } from "@/components/ui/toast-provider";
export function TaskEditForm({ task, onSaved }: {
    task: TaskItem;
    onSaved: () => void;
}) {
    const [pending, start] = useTransition();
    const router = useRouter();
    if (!task.updatedAt)
        return null;
    return <details className="google-task-edit"><summary>Editar título, data e notas</summary><form onSubmit={e => { e.preventDefault(); const form = new FormData(e.currentTarget); start(async () => { try {
        const result = await editTaskAction(form);
        showToast({ type: result.success ? "success" : "error", title: result.message });
        if (result.success) {
            router.refresh();
            onSaved();
        }
    }
    catch {
        showToast({ type: "error", title: "Não foi possível editar. Tente novamente." });
    } }); }}>
    <input type="hidden" name="id" value={task.id}/><input type="hidden" name="version" value={task.updatedAt}/>
    <label>Título<input name="title" required minLength={2} maxLength={180} defaultValue={task.title}/></label>
    <label>Data (opcional)<input name="date" type="date" defaultValue={task.undated ? "" : saoDate(task.scheduledAt)}/></label>
    <label>Horário no Escoply<input name="time" type="time" defaultValue={task.undated ? "09:00" : saoTime(task.scheduledAt)}/></label>
    <label>Notas<textarea name="notes" maxLength={7000} defaultValue={task.notes}/></label>
    <button disabled={pending}>{pending ? "Salvando…" : "Salvar alterações"}</button>
  </form></details>;
}
