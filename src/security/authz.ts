// ============================================================
// Authorization Guards — Edge function auth helpers
// ============================================================

/**
 * Result of an auth check on an edge function request.
 */
export interface AuthResult {
  authenticated: boolean;
  userId: string | null;
  email: string | null;
  role: string | null;
  error: string | null;
}

/**
 * Extract and validate the JWT from an edge function request.
 * Uses Supabase client to verify the token.
 */
export async function authenticateRequest(
  req: Request,
  supabaseClient: any,
): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authenticated: false, userId: null, email: null, role: null, error: "missing_auth_header" };
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token || token.length < 10) {
    return { authenticated: false, userId: null, email: null, role: null, error: "invalid_token_format" };
  }

  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    if (error || !user) {
      return { authenticated: false, userId: null, email: null, role: null, error: "invalid_token" };
    }

    return {
      authenticated: true,
      userId: user.id,
      email: user.email ?? null,
      role: user.user_metadata?.role ?? "user",
      error: null,
    };
  } catch {
    return { authenticated: false, userId: null, email: null, role: null, error: "auth_error" };
  }
}

/**
 * Quick guard — returns 401 Response if not authenticated.
 */
export async function requireAuth(
  req: Request,
  supabaseClient: any,
  corsHeaders: Record<string, string>,
): Promise<{ user: AuthResult } | Response> {
  const auth = await authenticateRequest(req, supabaseClient);
  if (!auth.authenticated) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  return { user: auth };
}

/**
 * Require admin role — returns 403 if not admin.
 */
export async function requireAdmin(
  req: Request,
  supabaseClient: any,
  corsHeaders: Record<string, string>,
): Promise<{ user: AuthResult } | Response> {
  const result = await requireAuth(req, supabaseClient, corsHeaders);
  if (result instanceof Response) return result;

  if (result.user.role !== "admin") {
    return new Response(
      JSON.stringify({ error: "Forbidden" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  return result;
}
