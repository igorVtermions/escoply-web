import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

function json(request: Request, body: Record<string, unknown>, status: number): Response {
  return Response.json(body, { status, headers: corsHeaders(request) });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (request.method !== "DELETE") {
    return json(request, { error: "Method not allowed" }, 405);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json(request, { error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return json(request, { error: "Server configuration error" }, 500);
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return json(request, { error: "Unauthorized" }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profile } = await adminClient
    .from("profiles")
    .select("avatar_path")
    .eq("id", userData.user.id)
    .maybeSingle<{ avatar_path: string | null }>();

  if (profile?.avatar_path) {
    const { error: storageError } = await adminClient.storage
      .from("avatars")
      .remove([profile.avatar_path]);

    if (storageError) {
      return json(request, { error: "Unable to remove account files" }, 500);
    }
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userData.user.id);
  if (deleteError) {
    return json(request, { error: "Unable to delete account" }, 500);
  }

  return json(request, { success: true }, 200);
});
