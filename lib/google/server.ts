import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
export const scopes = ["openid", "email", "https://www.googleapis.com/auth/calendar.app.created", "https://www.googleapis.com/auth/calendar.calendarlist.readonly", "https://www.googleapis.com/auth/tasks"];
export function googleConfig() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const secret = process.env.GOOGLE_CLIENT_SECRET;
    const redirect = process.env.GOOGLE_REDIRECT_URI;
    const key = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
    if (!clientId || !secret || !redirect || !key || !/^[a-f0-9]{64}$/i.test(key))
        throw new Error("Configure as variáveis Google e a chave de criptografia no servidor.");
    const url = new URL(redirect);
    if (url.pathname !== "/api/integrations/google/callback" || (url.protocol !== "https:" && !(url.hostname === "localhost" && url.protocol === "http:")))
        throw new Error("Retorno Google inválido.");
    return { clientId, secret, redirect, key: Buffer.from(key, "hex") };
}
export function seal(value: string, owner: string) {
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", googleConfig().key, nonce);
    cipher.setAAD(Buffer.from(owner));
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return [nonce, cipher.getAuthTag(), encrypted].map(b => b.toString("base64url")).join(".");
}
export function unseal(value: string, owner: string) {
    const [nonce, tag, encrypted] = value.split(".").map(p => Buffer.from(p, "base64url"));
    const cipher = createDecipheriv("aes-256-gcm", googleConfig().key, nonce);
    cipher.setAAD(Buffer.from(owner));
    cipher.setAuthTag(tag);
    return Buffer.concat([cipher.update(encrypted), cipher.final()]).toString("utf8");
}
export async function googleContext() {
    const session = await createSupabaseServerClient();
    const { data, error } = await session.auth.getUser();
    if (error || !data.user)
        throw new Error("Entre na sua conta para continuar.");
    const profile = await session.from("profiles").select("status").eq("id", data.user.id).single();
    if (profile.error || profile.data.status !== "active")
        throw new Error("Sua conta precisa estar ativa.");
    return { owner: data.user.id, db: createSupabaseAdminClient() };
}
export function checked<T>(result: {
    data: T;
    error: unknown;
}): T {
    if (result.error)
        throw new Error("Não foi possível persistir a integração. Confira a migration e tente novamente.");
    return result.data;
}
export type Connection = {
    owner_id: string;
    google_sub: string;
    email: string;
    refresh_cipher: string | null;
    calendar_id: string | null;
    tasklist_id: string | null;
    status: string;
    last_sync_at: string | null;
    last_message: string | null;
    cursor_event: string | null;
    cursor_task: string | null;
};
export async function tokenRequest(params: Record<string, string>) {
    const c = googleConfig();
    const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ client_id: c.clientId, client_secret: c.secret, ...params }), cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok)
        throw new Error("Não foi possível autorizar o Google. Confira a credencial ou reconecte sua conta.");
    const data = await response.json() as {
        access_token?: string;
        refresh_token?: string;
        scope?: string;
    };
    if (!data.access_token)
        throw new Error("O Google não retornou uma autorização válida.");
    return data;
}
export async function accessToken(ctx: Awaited<ReturnType<typeof googleContext>>, connection: Connection) {
    if (!connection.refresh_cipher || connection.status !== "connected")
        throw new Error("Reconecte sua conta Google.");
    try {
        const result = await tokenRequest({ grant_type: "refresh_token", refresh_token: unseal(connection.refresh_cipher, ctx.owner) });
        return result.access_token!;
    }
    catch (error) {
        checked(await ctx.db.from("google_connections").update({ status: "reconnect" }).eq("owner_id", ctx.owner));
        throw error;
    }
}
export class GoogleApiError extends Error {
    constructor(public status: number) { super(status === 412 ? "O item mudou no Google. Sincronize novamente." : status === 429 || status === 403 ? "O Google limitou ou não autorizou a operação. Aguarde ou confira as permissões." : "Falha na comunicação com o Google. Tente sincronizar novamente."); }
}
export async function googleFetch<T>(token: string, path: string, method = "GET", body?: unknown, etag?: string): Promise<T> {
    const base = path.startsWith("/tasks/") ? "https://tasks.googleapis.com" : "https://www.googleapis.com";
    const response = await fetch(base + path, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(etag ? { "If-Match": etag } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), cache: "no-store", signal: AbortSignal.timeout(6000) });
    if (!response.ok)
        throw new GoogleApiError(response.status);
    return (response.status === 204 ? undefined : await response.json()) as T;
}
