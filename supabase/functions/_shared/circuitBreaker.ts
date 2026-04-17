// ============================================================
// Shared circuit breaker helper for edge functions
// Wraps external provider calls (OpenAI, Suno, Resend, Twilio…).
// ============================================================

export type ProviderKey = "openai" | "suno" | "resend" | "twilio" | "lovable_ai" | "runway_replicate";

export interface CircuitOpenError extends Error {
  readonly isCircuitOpen: true;
  readonly provider: ProviderKey;
  readonly cooldownSeconds: number;
}

export function isCircuitOpenError(err: unknown): err is CircuitOpenError {
  return typeof err === "object" && err !== null && (err as any).isCircuitOpen === true;
}

/**
 * Execute a provider call protected by a circuit breaker.
 * - Pre-flight: refuse if circuit is open.
 * - Records success/failure in provider_health.
 * - Re-throws the original error so callers can fallback.
 */
export async function withCircuitBreaker<T>(
  supabaseAdmin: any,
  provider: ProviderKey,
  fn: () => Promise<T>,
): Promise<T> {
  // Pre-check
  try {
    const { data } = await supabaseAdmin.rpc("is_provider_healthy", {
      p_provider_key: provider,
    });
    if (data && data.healthy === false) {
      const err = new Error(`Circuit open for ${provider} (cooldown ${data.cooldown_seconds}s)`) as CircuitOpenError;
      (err as any).isCircuitOpen = true;
      (err as any).provider = provider;
      (err as any).cooldownSeconds = data.cooldown_seconds;
      throw err;
    }
  } catch (err) {
    if (isCircuitOpenError(err)) throw err;
    // Health-check failure → fail-open (allow the call)
    console.warn(`[circuit:${provider}] health-check failed, fail-open:`, err);
  }

  // Execute
  try {
    const result = await fn();
    // Record success (fire-and-forget)
    supabaseAdmin.rpc("record_provider_success", { p_provider_key: provider })
      .then(() => undefined)
      .catch((e: unknown) => console.warn(`[circuit:${provider}] success record error:`, e));
    return result;
  } catch (err) {
    // Record failure (fire-and-forget)
    supabaseAdmin.rpc("record_provider_failure", { p_provider_key: provider })
      .then(() => undefined)
      .catch((e: unknown) => console.warn(`[circuit:${provider}] failure record error:`, e));
    throw err;
  }
}
