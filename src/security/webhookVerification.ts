// ============================================================
// Webhook Verification — Signature validation for all providers
// ============================================================

/**
 * Verify Stripe webhook signature.
 * Already handled by stripe.webhooks.constructEvent(), but this provides
 * a standalone helper for custom flows.
 */
export function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string,
  stripe: any,
): { valid: boolean; event?: any; error?: string } {
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    return { valid: true, event };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return { valid: false, error: message };
  }
}

/**
 * Verify HMAC-SHA256 webhook signature (Suno, internal webhooks).
 */
export async function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!secret || !signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verify Twilio webhook signature.
 * Twilio uses X-Twilio-Signature header with HMAC-SHA1 of URL + sorted params.
 */
export async function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
  authToken: string,
): Promise<boolean> {
  if (!authToken || !signature) return false;

  // Build the data string: URL + sorted key-value pairs
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));

  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verify Resend webhook signature (Svix).
 * Resend uses Svix with headers: svix-id, svix-timestamp, svix-signature.
 */
export async function verifyResendSignature(
  payload: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string,
): Promise<boolean> {
  if (!secret || !svixId || !svixTimestamp || !svixSignature) return false;

  // Check timestamp freshness (5 minute tolerance)
  const ts = parseInt(svixTimestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) return false;

  // Svix signing: base64(HMAC-SHA256(secret, "{svixId}.{svixTimestamp}.{payload}"))
  const toSign = `${svixId}.${svixTimestamp}.${payload}`;

  // Svix secret is base64-encoded with "whsec_" prefix
  const secretBytes = Uint8Array.from(atob(secret.replace("whsec_", "")), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(toSign));
  const expected = `v1,${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;

  // Svix sends multiple signatures separated by space
  const signatures = svixSignature.split(" ");
  return signatures.some((s) => {
    if (s.length !== expected.length) return false;
    let result = 0;
    for (let i = 0; i < expected.length; i++) {
      result |= expected.charCodeAt(i) ^ s.charCodeAt(i);
    }
    return result === 0;
  });
}

/**
 * Check webhook replay protection.
 * Returns true if this event was already processed.
 */
export async function isReplayedWebhook(
  supabase: any,
  providerKey: string,
  externalEventId: string,
): Promise<boolean> {
  if (!externalEventId) return false;

  const { data } = await supabase
    .from("webhook_replay_protection")
    .select("id")
    .eq("provider_key", providerKey)
    .eq("external_event_id", externalEventId)
    .maybeSingle();

  return !!data;
}

/**
 * Mark a webhook event as processed for replay protection.
 */
export async function markWebhookProcessed(
  supabase: any,
  providerKey: string,
  externalEventId: string,
): Promise<void> {
  if (!externalEventId) return;

  await supabase.from("webhook_replay_protection").insert([{
    provider_key: providerKey,
    external_event_id: externalEventId,
  }]).onConflict("provider_key,external_event_id").ignore();
}
