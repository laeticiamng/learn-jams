// ============================================================
// Shared rate-limit helper for edge functions
// Uses the public.check_and_consume_rate_limit RPC for atomic enforcement.
// ============================================================

export interface RateLimitConfig {
  bucketKey: string;        // e.g. "cognitio-analyze"
  maxRequests: number;      // e.g. 10
  windowSeconds: number;    // e.g. 3600 (1h)
}

export interface RateLimitResult {
  allowed: boolean;
  count?: number;
  limit?: number;
  remaining?: number;
  retryAfterSeconds?: number;
}

/**
 * Enforce a per-user rate limit. Returns a 429 Response when exceeded.
 * Fail-open on internal errors to avoid blocking legitimate traffic.
 */
export async function enforceRateLimit(
  supabaseAdmin: any,
  userId: string,
  config: RateLimitConfig,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc("check_and_consume_rate_limit", {
      p_user_id: userId,
      p_bucket_key: config.bucketKey,
      p_max_requests: config.maxRequests,
      p_window_seconds: config.windowSeconds,
    });

    if (error) {
      console.warn(`[rateLimit:${config.bucketKey}] RPC error, fail-open:`, error.message);
      return null;
    }

    if (data && data.allowed === false) {
      const retryAfter = data.retry_after_seconds ?? config.windowSeconds;
      return new Response(
        JSON.stringify({
          error: "rate_limit_exceeded",
          message: `Too many requests. Try again in ${retryAfter}s.`,
          limit: data.limit,
          window_seconds: config.windowSeconds,
          retry_after_seconds: retryAfter,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(data.limit),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }

    return null;
  } catch (err) {
    console.warn(`[rateLimit:${config.bucketKey}] exception, fail-open:`, err);
    return null;
  }
}
