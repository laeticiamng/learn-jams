// ============================================================
// Secret Redaction — Prevent secrets from leaking into logs
// ============================================================

const SECRET_PATTERNS: RegExp[] = [
  // API keys
  /sk[-_]live[-_][a-zA-Z0-9]{20,}/g,
  /sk[-_]test[-_][a-zA-Z0-9]{20,}/g,
  /whsec_[a-zA-Z0-9]{20,}/g,
  /re_[a-zA-Z0-9]{20,}/g,
  // Generic long tokens
  /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/g, // JWTs
  // Supabase service role keys
  /sbp_[a-zA-Z0-9]{20,}/g,
  // OpenAI keys
  /sk-[a-zA-Z0-9]{20,}/g,
];

const SENSITIVE_FIELD_NAMES = new Set([
  "password", "secret", "token", "api_key", "apikey", "api_secret",
  "auth_token", "access_token", "refresh_token", "private_key",
  "stripe_secret_key", "webhook_secret", "service_role_key",
  "twilio_auth_token", "suno_api_key", "openai_api_key", "resend_api_key",
]);

/**
 * Redact secret patterns from a string.
 */
export function redactSecrets(input: string): string {
  let result = input;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, "[REDACTED]");
  }
  return result;
}

/**
 * Deep-redact an object, removing sensitive field values.
 */
export function redactObject<T extends Record<string, unknown>>(obj: T): T {
  const clone = { ...obj } as Record<string, unknown>;

  for (const [key, value] of Object.entries(clone)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELD_NAMES.has(lowerKey) || lowerKey.includes("secret") || lowerKey.includes("token") || lowerKey.includes("key")) {
      clone[key] = "[REDACTED]";
    } else if (typeof value === "string") {
      clone[key] = redactSecrets(value);
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      clone[key] = redactObject(value as Record<string, unknown>);
    }
  }

  return clone as T;
}

/**
 * Safe JSON.stringify that redacts secrets.
 */
export function safeStringify(obj: unknown): string {
  if (typeof obj === "string") return redactSecrets(obj);
  if (typeof obj === "object" && obj !== null) {
    return JSON.stringify(redactObject(obj as Record<string, unknown>));
  }
  return String(obj);
}
