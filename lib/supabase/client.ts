import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parse, serialize, type SerializeOptions } from "cookie";
import { AUTH_PERSISTENCE_COOKIE, AUTH_PERSISTENT_MODE, AUTH_SESSION_MODE } from "@/lib/auth/persistence";

let browserClient: SupabaseClient | null = null;

function isSessionOnly() {
  if (typeof document === "undefined") return false;
  return parse(document.cookie)[AUTH_PERSISTENCE_COOKIE] === AUTH_SESSION_MODE;
}

function getCookieOptions(options: SerializeOptions, value: string): SerializeOptions {
  const isRemoval = value === "" || options.maxAge === 0 || (options.expires?.getTime() ?? Number.POSITIVE_INFINITY) <= Date.now();
  if (!isSessionOnly() || isRemoval) return options;

  const sessionOptions = { ...options };
  delete sessionOptions.maxAge;
  delete sessionOptions.expires;
  return sessionOptions;
}

export function setAuthPersistence(remember: boolean) {
  if (typeof document === "undefined") return;

  const secure = window.location.protocol === "https:";
  const mode = remember ? AUTH_PERSISTENT_MODE : AUTH_SESSION_MODE;
  document.cookie = serialize(AUTH_PERSISTENCE_COOKIE, mode, {
    path: "/",
    sameSite: "lax",
    secure,
    maxAge: remember ? 60 * 60 * 24 * 400 : undefined,
  });

  const cookies = parse(document.cookie);
  Object.entries(cookies).forEach(([name, value]) => {
    if (!name.startsWith("sb-") || !name.includes("-auth-token") || value === undefined) return;
    document.cookie = serialize(name, value, {
      path: "/",
      sameSite: "lax",
      secure,
      maxAge: remember ? 60 * 60 * 24 * 400 : undefined,
    });
  });
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    return null;
  }

  browserClient ??= createBrowserClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return Object.entries(parse(document.cookie)).flatMap(([name, value]) => value === undefined ? [] : [{ name, value }]);
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          document.cookie = serialize(name, value, getCookieOptions(options, value));
        });
      },
    },
  });

  return browserClient;
}
