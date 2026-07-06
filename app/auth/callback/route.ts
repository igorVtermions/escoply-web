import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedDestinations = new Set(["/dashboard", "/auth/reset-password"]);

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedDestination = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  const destination = allowedDestinations.has(requestedDestination) ? requestedDestination : "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(destination, request.url), {
        headers: { "Cache-Control": "no-store" },
      });
    }
  }

  const errorUrl = new URL("/", request.url);
  errorUrl.searchParams.set("auth", "login");
  errorUrl.searchParams.set("error", "invalid_auth_link");
  return NextResponse.redirect(errorUrl, { headers: { "Cache-Control": "no-store" } });
}
