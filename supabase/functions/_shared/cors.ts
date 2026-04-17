// ============================================================
// Shared CORS + security headers helper for edge functions
// ============================================================

const ALLOWED_ORIGINS = [
  Deno.env.get("ALLOWED_ORIGIN") || "https://learn-jams.lovable.app",
  "https://learn-jams.lovable.app",
  "https://id-preview--7a1c08c2-6c36-4c23-92df-66f76346cf59.lovable.app",
];

/**
 * Build CORS headers for a request, reflecting the Origin only when whitelisted.
 * Falls back to the primary allowed origin.
 */
export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

/**
 * Standard security response headers (HSTS, X-Content-Type-Options, etc.).
 * Do not include Content-Type — set per response.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

/**
 * Convenience wrapper combining CORS + security headers.
 */
export function buildResponseHeaders(req: Request, extra: Record<string, string> = {}): Record<string, string> {
  return {
    ...buildCorsHeaders(req),
    ...SECURITY_HEADERS,
    ...extra,
  };
}
