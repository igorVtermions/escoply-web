import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { checked, googleConfig, googleContext, scopes, seal, tokenRequest, unseal, type Connection } from "@/lib/google/server";
import { driveScope } from "@/lib/google/drive-model";
import { driveConnection, saveDriveConnection } from "@/lib/google/drive";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
    const config = googleConfig();
    const destination = new URL("/dashboard/configuracoes?tab=integrations", new URL(config.redirect).origin);
    const jar = await cookies();
    const state = request.nextUrl.searchParams.get("state");
    const browserState = jar.get("escoply-google-state")?.value;
    let purpose = "calendar";
    jar.delete("escoply-google-state");
    try {
        if (!state || !browserState || state !== browserState)
            throw new Error("Autorização expirada. Tente conectar novamente.");
        const ctx = await googleContext();
        const consumed = checked(await ctx.db.from("google_oauth_states").delete().eq("owner_id", ctx.owner).eq("state_hash", createHash("sha256").update(state).digest("hex")).gt("expires_at", new Date().toISOString()).select("verifier_cipher,purpose").maybeSingle());
        if (consumed?.purpose === "drive") purpose = "drive";
        if (!consumed || request.nextUrl.searchParams.has("error"))
            throw new Error("Autorização não concluída. Tente conectar novamente.");
        const code = request.nextUrl.searchParams.get("code");
        if (!code)
            throw new Error("Código de autorização ausente.");
        const tokens = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: config.redirect, code_verifier: unseal(consumed.verifier_cipher, ctx.owner) });
        const granted = new Set(tokens.scope?.split(" "));
        const required = purpose === "drive" ? [driveScope] : scopes.filter(s => s.startsWith("https://www.googleapis.com/auth/"));
        if (required.some(s => !granted.has(s)))
            throw new Error(purpose === "drive" ? "Autorize o acesso aos arquivos selecionados do Drive." : "Autorize Agenda e Tasks para conectar.");
        const infoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` }, cache: "no-store", signal: AbortSignal.timeout(8000) });
        if (!infoResponse.ok)
            throw new Error("Não foi possível identificar a conta Google.");
        const info = await infoResponse.json() as {
            sub?: string;
            email?: string;
            email_verified?: boolean;
        };
        if (!info.sub || !info.email || !info.email_verified)
            throw new Error("Conta Google sem e-mail verificado.");
        if (purpose === "drive") {
            await saveDriveConnection(ctx, await driveConnection(ctx), { sub: info.sub, email: info.email }, tokens.refresh_token);
            destination.searchParams.set("drive", "connected");
            return NextResponse.redirect(destination, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
        }
        const old = checked(await ctx.db.from("google_connections").select("*").eq("owner_id", ctx.owner).maybeSingle()) as Connection | null;
        if (old && old.google_sub !== info.sub)
            throw new Error("Reconecte a mesma conta Google para preservar os vínculos existentes.");
        const refresh = tokens.refresh_token ? seal(tokens.refresh_token, ctx.owner) : old?.refresh_cipher;
        if (!refresh)
            throw new Error("O Google não concedeu acesso offline. Tente conectar novamente.");
        if (old) {
            const lease = randomUUID();
            if (!checked(await ctx.db.rpc("acquire_google_lock", { p_owner: ctx.owner, p_lock: lease })))
                throw new Error("Há uma operação em andamento. Aguarde e conecte novamente.");
            try {
                checked(await ctx.db.from("google_connections").update({ refresh_cipher: refresh, status: "connected", email: info.email, last_message: "Conta reconectada. Clique em Sincronizar." }).eq("owner_id", ctx.owner).eq("lock_id", lease));
            }
            finally {
                await ctx.db.from("google_connections").update({ lock_id: null, lock_until: null }).eq("owner_id", ctx.owner).eq("lock_id", lease);
            }
        }
        else {
            checked(await ctx.db.from("google_connections").insert({ owner_id: ctx.owner, google_sub: info.sub, email: info.email, refresh_cipher: refresh }));
        }
        destination.searchParams.set("google", "connected");
    }
    catch (error) {
        destination.searchParams.set(purpose === "drive" ? "drive" : "google", "error");
        // Only controlled messages; never return provider bodies, tokens or authorization codes.
        destination.searchParams.set("message", error instanceof Error && !error.message.includes("fetch") ? error.message.slice(0, 180) : "Não foi possível conectar. Tente novamente.");
    }
    return NextResponse.redirect(destination, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
