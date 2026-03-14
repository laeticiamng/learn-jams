// ============================================================
// Environment Validator — Boot-time secret validation
// ============================================================

export interface EnvRequirement {
  key: string;
  required: boolean;
  context: "server" | "client" | "edge";
  description: string;
}

export const ENV_REQUIREMENTS: EnvRequirement[] = [
  // Server / Edge function secrets — NEVER exposed to client
  { key: "STRIPE_SECRET_KEY", required: true, context: "edge", description: "Stripe API secret key" },
  { key: "STRIPE_WEBHOOK_SECRET", required: true, context: "edge", description: "Stripe webhook signing secret" },
  { key: "OPENAI_API_KEY", required: true, context: "edge", description: "OpenAI API key" },
  { key: "SUNO_API_KEY", required: true, context: "edge", description: "Suno music generation API key" },
  { key: "SUNO_CALLBACK_SECRET", required: true, context: "edge", description: "Suno webhook HMAC secret" },
  { key: "RESEND_API_KEY", required: true, context: "edge", description: "Resend email API key" },
  { key: "RESEND_WEBHOOK_SECRET", required: true, context: "edge", description: "Resend webhook signing secret (Svix)" },
  { key: "TWILIO_ACCOUNT_SID", required: true, context: "edge", description: "Twilio account SID" },
  { key: "TWILIO_AUTH_TOKEN", required: true, context: "edge", description: "Twilio auth token" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", required: true, context: "edge", description: "Supabase service role key" },
  { key: "INTERNAL_WEBHOOK_SECRET", required: false, context: "edge", description: "Internal webhook signing secret" },

  // Client-safe keys (public, expected in front)
  { key: "VITE_SUPABASE_URL", required: true, context: "client", description: "Supabase project URL" },
  { key: "VITE_SUPABASE_PUBLISHABLE_KEY", required: true, context: "client", description: "Supabase publishable/anon key" },
];

// Keys that must NEVER appear in client-side code
export const SERVER_ONLY_KEYS = ENV_REQUIREMENTS
  .filter((r) => r.context === "edge" || r.context === "server")
  .map((r) => r.key);

export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Validate that required environment variables are set.
 * Call at edge function boot time.
 */
export function validateEdgeEnv(env: Record<string, string | undefined>): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const req of ENV_REQUIREMENTS) {
    if (req.context !== "edge") continue;
    const value = env[req.key];
    if (!value || value.trim() === "") {
      if (req.required) {
        missing.push(`${req.key} (${req.description})`);
      } else {
        warnings.push(`${req.key} not set (optional: ${req.description})`);
      }
    }
  }

  return { valid: missing.length === 0, missing, warnings };
}

/**
 * Validate client environment variables (Vite import.meta.env).
 * Call at app boot.
 */
export function validateClientEnv(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const req of ENV_REQUIREMENTS) {
    if (req.context !== "client") continue;
    const value = (import.meta as any).env?.[req.key];
    if (!value || value.trim() === "") {
      if (req.required) {
        missing.push(`${req.key} (${req.description})`);
      } else {
        warnings.push(`${req.key} not set (optional: ${req.description})`);
      }
    }
  }

  return { valid: missing.length === 0, missing, warnings };
}

/**
 * Check if a key is server-only and should never be in the client bundle.
 */
export function isServerOnlyKey(key: string): boolean {
  return SERVER_ONLY_KEYS.includes(key);
}
