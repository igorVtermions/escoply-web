import "server-only";
import { randomUUID } from "node:crypto";
import { checked, googleContext, seal, tokenRequest, unseal } from "./server";
import { driveFileUrl, validateDriveSelection, type DriveFile, type DriveSelection } from "./drive-model";

type Context = Awaited<ReturnType<typeof googleContext>>;
export type DriveConnection = { owner_id: string; google_sub: string; email: string; refresh_cipher: string | null; status: string; version: string };
export async function driveConnection(ctx: Context) {
  return checked(await ctx.db.from("google_drive_connections").select("*").eq("owner_id", ctx.owner).maybeSingle()) as DriveConnection | null;
}
export async function saveDriveConnection(ctx: Context, old: DriveConnection | null, info: { sub: string; email: string }, refreshToken?: string) {
  if (old && old.google_sub !== info.sub) throw new Error("Reconecte a mesma conta do Drive para preservar os vínculos.");
  const refresh = refreshToken ? seal(refreshToken, ctx.owner) : old?.refresh_cipher;
  if (!refresh) throw new Error("O Google não concedeu acesso offline. Conecte novamente.");
  const values = { google_sub: info.sub, email: info.email, refresh_cipher: refresh, status: "connected", version: randomUUID() };
  if (old) {
    const rows = checked(await ctx.db.from("google_drive_connections").update(values).eq("owner_id", ctx.owner).eq("version", old.version).select("owner_id"));
    if (!rows?.length) throw new Error("A conexão mudou. Tente conectar novamente.");
  } else {
    checked(await ctx.db.from("google_drive_connections").insert({ owner_id: ctx.owner, ...values }));
  }
}
export async function reserveDriveRequest(ctx: Context) {
  if (!checked(await ctx.db.rpc("reserve_drive_request", { p_owner: ctx.owner }))) {
    throw new Error("Limite diário de operações do Drive atingido. Tente novamente amanhã.");
  }
}
export async function driveAccess(ctx: Context) {
  const connection = await driveConnection(ctx);
  if (!connection?.refresh_cipher || connection.status !== "connected") throw new Error("Conecte o Google Drive nas configurações.");
  await reserveDriveRequest(ctx);
  try {
    const tokens = await tokenRequest({ grant_type: "refresh_token", refresh_token: unseal(connection.refresh_cipher, ctx.owner) });
    return { token: tokens.access_token!, connection };
  } catch {
    checked(await ctx.db.from("google_drive_connections").update({ status: "reconnect" }).eq("owner_id", ctx.owner).eq("version", connection.version));
    throw new Error("Não foi possível acessar o Drive. Tente novamente ou renove a autorização.");
  }
}
export async function requireDriveProject(ctx: Context, projectId: string) {
  if (typeof projectId !== "string" || !/^[0-9a-f-]{36}$/i.test(projectId)) throw new Error("Projeto inválido.");
  const row = checked(await ctx.db.from("projects").select("id").eq("owner_id", ctx.owner).eq("id", projectId).maybeSingle());
  if (!row) throw new Error("Projeto não encontrado.");
}
export async function readDriveFile(token: string, selected: DriveSelection) {
  validateDriveSelection(selected);
  const query = new URLSearchParams({ fields: "id,name,mimeType,trashed,resourceKey", supportsAllDrives: "true" });
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(selected.id)}?${query}`, {
    headers: { Authorization: `Bearer ${token}`, ...(selected.resourceKey ? { "X-Goog-Drive-Resource-Keys": `${selected.id}/${selected.resourceKey}` } : {}) },
    cache: "no-store", signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(response.status === 429 ? "O Google limitou as consultas. Aguarde e tente novamente." : "Arquivo indisponível. Confira o acesso e selecione novamente no Drive.");
  const file = await response.json() as DriveFile;
  if (file.id !== selected.id) throw new Error("Arquivo inválido.");
  return { file, url: driveFileUrl(file, file.resourceKey || selected.resourceKey) };
}
