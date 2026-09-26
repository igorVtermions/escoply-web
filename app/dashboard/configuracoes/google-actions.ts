"use server";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { checked, googleConfig, googleContext, scopes, seal, unseal, type Connection } from "@/lib/google/server";
import { syncGoogle, resolveGoogleIssue } from "@/lib/google/sync";
import { previewGoogle } from "@/lib/google/preview";
import { defaultSelection, type SyncSelection } from "@/lib/google/selection";
import { businessPreview, resolveBusinessIssue, syncBusiness } from "@/lib/google/business";
import type { BusinessSelection } from "@/lib/google/business-model";
import { validateBusinessSelection } from "@/lib/google/business-model";
import { flushGoogleQueue } from "@/lib/google/automatic";
function refresh() { revalidatePath("/dashboard", "layout"); revalidatePath("/dashboard/agenda"); revalidatePath("/dashboard/configuracoes"); }
export async function processGoogleQueueAction() {
    try { return await flushGoogleQueue(); }
    catch { return { enabled: true, processed: 0, message: "Envio automático indisponível. Confira a conexão Google." }; }
}
export async function retryGoogleQueueAction() {
    try {
        const ctx = await googleContext();
        checked(await ctx.db.from("google_outbox").update({ attempts: 0, retry_at: new Date().toISOString(), last_error: null }).eq("owner_id", ctx.owner));
        const result = await flushGoogleQueue(); refresh();
        return { success: true, message: result.message || "Fila liberada para nova tentativa automática." };
    } catch { return { success: false, message: "Não foi possível retomar a fila. Confira a conexão." }; }
}
export async function saveGoogleAutomationAction(selection: BusinessSelection) {
    try {
        validateBusinessSelection(selection); const ctx = await googleContext();
        const rows = checked(await ctx.db.from("google_connections").update({ auto_business: selection.kinds, auto_reminder_minutes: selection.minutes }).eq("owner_id", ctx.owner).eq("status", "connected").select("owner_id"));
        if (!rows?.length) throw new Error("Conecte o Google antes de salvar as preferências.");
        refresh(); return { success: true, message: "Preferências salvas. Novas alterações das categorias escolhidas serão enviadas automaticamente. Histórico continua sob sua escolha." };
    } catch (e) { return { success: false, message: e instanceof Error ? e.message : "Não foi possível salvar." }; }
}
export async function connectGoogleAction() {
    try {
        const config = googleConfig();
        const ctx = await googleContext();
        const state = randomBytes(32).toString("base64url");
        const verifier = randomBytes(32).toString("base64url");
        checked(await ctx.db.from("google_oauth_states").delete().eq("owner_id", ctx.owner));
        checked(await ctx.db.from("google_oauth_states").insert({ owner_id: ctx.owner, state_hash: createHash("sha256").update(state).digest("hex"), verifier_cipher: seal(verifier, ctx.owner), expires_at: new Date(Date.now() + 600000).toISOString() }));
        (await cookies()).set("escoply-google-state", state, { httpOnly: true, secure: config.redirect.startsWith("https:"), sameSite: "lax", path: "/", maxAge: 600 });
        const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirect, response_type: "code", scope: scopes.join(" "), access_type: "offline", prompt: "consent", state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" }).toString();
        return { success: true, message: "", url: url.toString() };
    }
    catch {
        return { success: false, message: "Não foi possível iniciar a conexão. Confira as variáveis e a migration Google." };
    }
}
export async function disconnectGoogleAction() {
    try {
        const ctx = await googleContext();
        const lease = randomUUID();
        if (!checked(await ctx.db.rpc("acquire_google_lock", { p_owner: ctx.owner, p_lock: lease })))
            throw new Error("Aguarde alguns segundos e tente novamente.");
        try {
            const row = checked(await ctx.db.from("google_connections").select("*").eq("owner_id", ctx.owner).single()) as Connection;
            if (row.refresh_cipher) {
                const revoked = await fetch("https://oauth2.googleapis.com/revoke", { method: "POST", body: new URLSearchParams({ token: unseal(row.refresh_cipher, ctx.owner) }), signal: AbortSignal.timeout(8000) });
                if (!revoked.ok && revoked.status !== 400)
                    throw new Error("Não foi possível revogar o acesso. Tente novamente.");
            }
            checked(await ctx.db.from("google_connections").update({ refresh_cipher: null, status: "disconnected", last_message: "Desconectado. Registros e vínculos preservados para reconexão à mesma conta." }).eq("owner_id", ctx.owner));
            checked(await ctx.db.from("google_oauth_states").delete().eq("owner_id", ctx.owner));
        }
        finally {
            await ctx.db.from("google_connections").update({ lock_id: null, lock_until: null }).eq("owner_id", ctx.owner).eq("lock_id", lease);
        }
        refresh();
        return { success: true, message: "Conta desconectada. Os registros foram preservados." };
    }
    catch (e) {
        return { success: false, message: e instanceof Error ? e.message : "Não foi possível desconectar." };
    }
}
export async function syncGoogleAction(selection: SyncSelection = defaultSelection()) {
    try {
        const message = await syncGoogle(selection);
        refresh();
        return { success: true, message };
    }
    catch (e) {
        refresh();
        return { success: false, message: e instanceof Error ? e.message : "Não foi possível sincronizar." };
    }
}
export async function previewGoogleAction(selection: SyncSelection) {
    try { return { success: true as const, data: await previewGoogle(selection) }; }
    catch (e) { return { success: false as const, message: e instanceof Error ? e.message : "Falha ao carregar prévia." }; }
}
export async function previewBusinessAction(selection: BusinessSelection) {
    try { return { success: true as const, data: await businessPreview(selection) }; }
    catch (e) { return { success: false as const, message: e instanceof Error ? e.message : "Confira a migration de prazos." }; }
}
export async function syncBusinessAction(selection: BusinessSelection) {
    try { const message = await syncBusiness(selection); refresh(); return { success: true, message }; }
    catch (e) { refresh(); return { success: false, message: e instanceof Error ? e.message : "Falha ao sincronizar prazos." }; }
}
export async function resolveBusinessAction(id: string, restore: boolean, selection: BusinessSelection) {
    try { await resolveBusinessIssue(id, restore, selection); refresh(); return { success: true, message: restore ? "Escolha salva. Sincronize os prazos para aplicar." : "Prazo pausado. Evento Google e registro de origem preservados." }; }
    catch (e) { return { success: false, message: e instanceof Error ? e.message : "Não foi possível salvar." }; }
}
export async function resolveGoogleIssueAction(id: string, choice: "local" | "remote" | "delete") {
    try {
        await resolveGoogleIssue(id, choice);
        refresh();
        return { success: true, message: "Escolha registrada. Clique em Sincronizar para aplicar." };
    }
    catch (e) {
        return { success: false, message: e instanceof Error ? e.message : "Não foi possível resolver." };
    }
}
