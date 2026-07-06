import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const isPrivateRoute = request.nextUrl.pathname === "/dashboard" || request.nextUrl.pathname.startsWith("/dashboard/");
  const hasAuthCookie = request.cookies.getAll().some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));

  if (isPrivateRoute && !hasAuthCookie) {
    return redirectToLogin(request);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (isPrivateRoute && (error || !data.user)) {
    return redirectToLogin(request);
  }

  return response;
}

function redirectToLogin(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/";
  redirectUrl.search = "";
  redirectUrl.searchParams.set("auth", "login");
  redirectUrl.searchParams.set("reason", "required");
  return NextResponse.redirect(redirectUrl);
}
