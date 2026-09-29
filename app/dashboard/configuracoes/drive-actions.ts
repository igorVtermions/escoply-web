"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { checked, googleConfig, googleContext } from "@/lib/google/server";
import { driveAccess, driveConnection, readDriveFile, requireDriveProject } from "@/lib/google/drive";
import { folderMime, validateDriveSelection, type DriveFolder, type DriveSelection, type DriveStatus } from "@/lib/google/drive-model";

function failure(error: unknown) {
  return { success: false as const, message: error instanceof Error && !/fetch|network/i.test(error.message) ? error.message : "Não foi possível acessar o Drive. Tente novamente." };
}
function refresh(projectId?: string) {
  revalidatePath("/dashboard/configuracoes");
  if (projectId) revalidatePath(`/dashboard/projetos/${projectId}`);
}
export async function getDriveStatusAction(projectId?: string) {
  try {
    const ctx = await googleContext();
    if (projectId) await requireDriveProject(ctx, projectId);
    const row = await driveConnection(ctx);
    const status: DriveStatus = { connected: row?.status === "connected", email: row?.email ?? null, reconnect: row?.status === "reconnect" };
    const folder = projectId ? checked(await ctx.db.from("project_drive_folders").select("name,url").eq("owner_id", ctx.owner).eq("project_id", projectId).maybeSingle()) as DriveFolder | null : null;
    return { success: true as const, status, folder };
  } catch (error) { return failure(error); }
}
export async function disconnectDriveAction() {
  try {
    const ctx = await googleContext();
    checked(await ctx.db.from("google_drive_connections").update({ status: "disconnected", refresh_cipher: null, version: randomUUID() }).eq("owner_id", ctx.owner));
    checked(await ctx.db.from("google_oauth_states").delete().eq("owner_id", ctx.owner).eq("purpose", "drive"));
    refresh();
    return { success: true as const, message: "Drive desconectado do Escoply. Arquivos e Agenda preservados." };
  } catch (error) { return failure(error); }
}
export async function getDrivePickerConfigAction(projectId: string) {
  try {
    const ctx = await googleContext();
    await requireDriveProject(ctx, projectId);
    const row = await driveConnection(ctx);
    if (row?.status !== "connected") throw new Error("Conecte o Drive nas configurações.");
    const apiKey = process.env.GOOGLE_PICKER_API_KEY;
    const appId = process.env.GOOGLE_CLOUD_PROJECT_NUMBER;
    if (!apiKey || !appId || !/^\d+$/.test(appId)) throw new Error("O seletor do Drive ainda precisa ser configurado no servidor.");
    // Only public credentials. Picker obtains its own short-lived drive.file token in the browser.
    return { success: true as const, config: { apiKey, appId, clientId: googleConfig().clientId, email: row.email } };
  } catch (error) { return failure(error); }
}
export async function attachDriveFileAction(projectId: string, selection: DriveSelection, target: "material" | "folder") {
  try {
    validateDriveSelection(selection);
    if (target !== "material" && target !== "folder") throw new Error("Destino inválido.");
    const ctx = await googleContext();
    await requireDriveProject(ctx, projectId);
    const { token, connection } = await driveAccess(ctx);
    const { file, url } = await readDriveFile(token, selection);
    if ((target === "folder") !== (file.mimeType === folderMime)) throw new Error(target === "folder" ? "Selecione uma pasta do Drive." : "Use Vincular pasta para selecionar pastas.");
    if (file.mimeType === "application/vnd.google-apps.shortcut") throw new Error("Selecione o arquivo original, em vez de um atalho do Drive.");
    // Reject a connection changed while the remote request was in flight.
    const latest = await driveConnection(ctx);
    if (latest?.version !== connection.version || latest.status !== "connected") throw new Error("A conexão mudou. Selecione novamente.");
    if (target === "folder") {
      checked(await ctx.db.from("project_drive_folders").upsert({ project_id: projectId, owner_id: ctx.owner, drive_account: connection.google_sub, file_id: file.id, name: file.name, url }, { onConflict: "project_id" }));
    } else {
      const title = Array.from(file.name).slice(0, 180).join("");
      checked(await ctx.db.from("project_materials").upsert({ project_id: projectId, owner_id: ctx.owner, kind: "link", title: Array.from(title).length < 2 ? `${title} · Drive` : title, url, mime_type: file.mimeType, drive_file_id: file.id, drive_account: connection.google_sub }, { onConflict: "owner_id,project_id,drive_account,drive_file_id", ignoreDuplicates: true }));
    }
    refresh(projectId);
    return { success: true as const, message: target === "folder" ? "Pasta vinculada ao projeto." : "Arquivo disponível na aba Links dos materiais." };
  } catch (error) { return failure(error); }
}
export async function unlinkDriveFolderAction(projectId: string) {
  try {
    const ctx = await googleContext();
    await requireDriveProject(ctx, projectId);
    checked(await ctx.db.from("project_drive_folders").delete().eq("owner_id", ctx.owner).eq("project_id", projectId));
    refresh(projectId);
    return { success: true as const, message: "Vínculo removido. A pasta permanece no Drive." };
  } catch (error) { return failure(error); }
}
