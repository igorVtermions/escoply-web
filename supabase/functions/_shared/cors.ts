export function corsHeaders(request: Request): Record<string, string> {
  const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "http://localhost:3000";
  const requestOrigin = request.headers.get("origin");

  return {
    "Access-Control-Allow-Origin": requestOrigin === allowedOrigin ? requestOrigin : allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "DELETE, OPTIONS",
    "Vary": "Origin",
  };
}
