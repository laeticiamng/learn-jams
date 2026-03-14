// ============================================================
// Rate Limiting — In-memory + DB-backed rate limiting
// ============================================================

/**
 * Rate limit configuration per feature.
 */
export interface RateLimitConfig {
  key: string;
  maxRequests: number;
  windowMs: number;
  description: string;
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Generation — expensive API calls
  "generate:song": { key: "generate:song", maxRequests: 10, windowMs: 3600_000, description: "10 songs/hour" },
  "generate:sheet": { key: "generate:sheet", maxRequests: 20, windowMs: 3600_000, description: "20 sheets/hour" },
  "generate:story": { key: "generate:story", maxRequests: 10, windowMs: 3600_000, description: "10 stories/hour" },
  "generate:escape": { key: "generate:escape", maxRequests: 5, windowMs: 3600_000, description: "5 escape games/hour" },
  "generate:video": { key: "generate:video", maxRequests: 5, windowMs: 3600_000, description: "5 videos/hour" },

  // Messaging
  "send:sms": { key: "send:sms", maxRequests: 20, windowMs: 86400_000, description: "20 SMS/day" },
  "send:email": { key: "send:email", maxRequests: 50, windowMs: 86400_000, description: "50 emails/day" },

  // Guardian
  "guardian:invite": { key: "guardian:invite", maxRequests: 5, windowMs: 86400_000, description: "5 invites/day" },

  // Auth
  "auth:login": { key: "auth:login", maxRequests: 10, windowMs: 900_000, description: "10 login attempts/15min" },
  "auth:signup": { key: "auth:signup", maxRequests: 5, windowMs: 3600_000, description: "5 signups/hour" },

  // Billing
  "billing:checkout": { key: "billing:checkout", maxRequests: 5, windowMs: 3600_000, description: "5 checkout attempts/hour" },
  "billing:topup": { key: "billing:topup", maxRequests: 10, windowMs: 3600_000, description: "10 top-up attempts/hour" },

  // Uploads
  "upload:file": { key: "upload:file", maxRequests: 30, windowMs: 3600_000, description: "30 uploads/hour" },

  // General API
  "api:general": { key: "api:general", maxRequests: 300, windowMs: 60_000, description: "300 requests/minute" },
};

/**
 * In-memory sliding window rate limiter.
 * For edge functions, use the DB-backed version.
 */
const windowStore = new Map<string, { timestamps: number[] }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
  limit: number;
}

export function checkRateLimit(userId: string, limitKey: string): RateLimitResult {
  const config = RATE_LIMITS[limitKey];
  if (!config) {
    return { allowed: true, remaining: -1, retryAfterMs: 0, limit: -1 };
  }

  const storeKey = `${userId}:${limitKey}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let entry = windowStore.get(storeKey);
  if (!entry) {
    entry = { timestamps: [] };
    windowStore.set(storeKey, entry);
  }

  // Prune old entries
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= config.maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + config.windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, retryAfterMs),
      limit: config.maxRequests,
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: config.maxRequests - entry.timestamps.length,
    retryAfterMs: 0,
    limit: config.maxRequests,
  };
}

/**
 * Reset rate limit for a user+key (for testing or admin override).
 */
export function resetRateLimit(userId: string, limitKey: string): void {
  windowStore.delete(`${userId}:${limitKey}`);
}

/**
 * Clear all rate limit entries (for testing).
 */
export function clearAllRateLimits(): void {
  windowStore.clear();
}

/**
 * Format rate limit headers for HTTP response.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    ...(result.retryAfterMs > 0
      ? { "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)) }
      : {}),
  };
}
