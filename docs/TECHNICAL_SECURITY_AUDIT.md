# Technical & Security Audit — Learn Jams (StudyBeats)

**Date:** 2026-03-21
**Scope:** Full-stack security audit of the Learn Jams codebase
**Stack:** React + TypeScript (Vite) / Supabase (Auth, DB, Edge Functions, Storage) / Stripe / OpenAI / Twilio / Resend

---

## Executive Summary

The codebase shows solid security foundations — CSP headers, DOMPurify, file validation, RLS on most tables, and webhook signature verification. However, several **critical vulnerabilities** exist, primarily around unauthenticated edge functions that expose expensive third-party APIs to abuse, a missing auth check on the guardian-invite function, and duplicate webhook handlers that create confusion and potential race conditions.

### Severity Legend
- **CRITICAL** — Exploitable now, financial or data risk
- **HIGH** — Significant risk requiring prompt action
- **MEDIUM** — Defense-in-depth gap
- **LOW** — Best-practice improvement

---

## 1. CRITICAL: Unauthenticated Provider Edge Functions

### Finding
The following edge functions have **zero authentication** — anyone who knows the function URL can call them directly, consuming paid API credits:

| Function | Service | Risk |
|---|---|---|
| `provider-openai-llm` | OpenAI GPT-4o | Unlimited AI generation at your cost |
| `provider-openai-image` | OpenAI DALL-E | Image generation abuse |
| `provider-openai-tts` | OpenAI TTS | Text-to-speech abuse |
| `provider-openai-video` | OpenAI Video | Video generation abuse |
| `provider-resend-email` | Resend | Email sending abuse / spam relay |
| `provider-twilio-sms` | Twilio | SMS sending abuse / financial drain |

**Impact:** Any attacker who discovers these URLs (easily guessable: `https://<project>.supabase.co/functions/v1/provider-openai-llm`) can generate unlimited AI content, send emails/SMS, all billed to your accounts.

### Recommendation
Add JWT authentication to ALL provider functions:
```typescript
const authHeader = req.headers.get("Authorization");
if (!authHeader?.startsWith("Bearer ")) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
}
const { data: { user }, error } = await supabaseClient.auth.getUser(
  authHeader.replace("Bearer ", "")
);
if (error || !user) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
}
```

---

## 2. CRITICAL: Guardian Invite — No Auth, IDOR Risk

### Finding
`supabase/functions/guardian-invite/index.ts` uses the **service role key** directly and has **no authentication check**. It accepts a `minor_user_id` from the request body without verifying that the caller is authorized to add a guardian for that minor.

**Impact:** Any unauthenticated caller can:
- Create guardian records for any user
- Trigger consent events for arbitrary minor accounts
- Receive valid invite tokens

### Recommendation
1. Add JWT authentication
2. Verify the caller IS the minor user or an authorized guardian
3. Rate-limit invite creation

---

## 3. HIGH: Duplicate Stripe Webhook Handlers

### Finding
Two separate edge functions handle Stripe webhooks:

1. **`stripe-webhook/index.ts`** — Uses `SUPABASE_SERVICE_ROLE_KEY`, has email-based user lookup with pagination, handles `invoice.payment_failed`
2. **`webhook-stripe/index.ts`** — Uses `SUPABASE_SERVICE_ROLE_KEY`, has webhook replay protection table, handles `invoice.paid`, logs to `webhook_events` table

**Issues:**
- Both handle `checkout.session.completed` and `customer.subscription.updated/deleted` with **different logic**
- `webhook-stripe` uses `Access-Control-Allow-Origin: "*"` (wildcard CORS) — though this is acceptable for webhook endpoints since Stripe sends server-to-server
- If both are registered in Stripe, the same event processes twice with potentially conflicting upserts
- The replay protection in `webhook-stripe` doesn't protect against `stripe-webhook` processing the same event

### Recommendation
- **Delete one handler** — consolidate into a single canonical handler
- Merge the best features: replay protection + robust user lookup + proper event logging

---

## 4. HIGH: Admin Role Check Bypassable via user_metadata

### Finding
`src/security/roles.ts:64-67`:
```typescript
export function isAdmin(userMetadata: Record<string, unknown> | null | undefined): boolean {
  if (!userMetadata) return false;
  return userMetadata.role === "admin" || userMetadata.is_admin === true;
}
```

By default, Supabase allows users to update their own `user_metadata` via `supabase.auth.updateUser({ data: { role: "admin" } })`. If this is not explicitly blocked, **any authenticated user can grant themselves admin access**.

**Impact:** Full admin panel access, margin reports, cost events, feature flags, webhook logs, user management.

### Recommendation
1. Verify in the Supabase dashboard that `user_metadata` updates are restricted (Auth > Settings > Security)
2. Alternatively, move the admin flag to `app_metadata` which users cannot self-modify
3. Or use a separate `admin_users` table with RLS restricted to service_role

---

## 5. HIGH: No Server-Side Rate Limiting on Edge Functions

### Finding
While `src/security/rateLimit.ts` defines rate limit configurations, this is an **in-memory, client-side only** rate limiter (the `windowStore` Map resets on every page refresh). Edge functions have **zero server-side rate limiting**.

**Impact:** An authenticated user (or unauthenticated for provider functions) can call expensive AI endpoints indefinitely, running up costs. The free-tier quota check in `generate-lyrics` is per-feature, but no global rate limit exists.

### Recommendation
- Implement DB-backed rate limiting in edge functions using the `usage_quotas` or a dedicated `rate_limit_tokens` table
- For provider functions: add authentication first, then rate-limit per user
- Consider Supabase's built-in rate limiting headers

---

## 6. MEDIUM: Hardcoded Stripe Price ID

### Finding
`supabase/functions/create-checkout/index.ts:85`:
```typescript
price: "price_1T8JRhDFa5Y9NR1IkeJEEVmT",
```

A Stripe price ID is hardcoded. This breaks if the price changes or differs between test/prod environments.

### Recommendation
- Move to an environment variable: `Deno.env.get("STRIPE_PRICE_ID")`
- Or look up the price dynamically from the `pricing_plan_prices` table which already has `stripe_price_id_monthly` / `stripe_price_id_annual` columns

---

## 7. MEDIUM: Webhook CORS Wildcard

### Finding
Four webhook functions use `Access-Control-Allow-Origin: "*"`:
- `webhook-stripe`
- `webhook-suno`
- `webhook-twilio`
- `webhook-resend`

While webhooks are server-to-server (CORS doesn't apply), the wildcard means the browser can make cross-origin requests to these endpoints. Combined with the fact that webhook-stripe has signature verification, this is low risk for Stripe but could be problematic for others.

### Recommendation
Remove CORS headers entirely from webhook endpoints (they're not needed for server-to-server calls) or restrict to the ALLOWED_ORIGIN pattern used elsewhere.

---

## 8. MEDIUM: extract-document Accepts 200MB Files

### Finding
`supabase/functions/extract-document/index.ts:81`:
```typescript
if (file.size > 200 * 1024 * 1024) {
```

The edge function accepts files up to 200MB and converts the entire file to base64 in memory, then sends it to the AI gateway. This is a denial-of-service vector — large files will exhaust the function's memory and timeout.

The frontend `fileValidation.ts` limits documents to 20MB, but the edge function doesn't enforce the same limit.

### Recommendation
- Align the server-side limit with the frontend: 20MB for documents
- Add a check on the actual file content, not just declared size

---

## 9. MEDIUM: guardian-accept-link Has No Auth Requirement

### Finding
`supabase/functions/guardian-accept-link/index.ts` accepts an invite token and activates the guardian link. Authentication is **optional** — if an `Authorization` header is present, it links the guardian to the auth user, but it works without auth too.

This means anyone who intercepts or guesses an invite token (UUID, not cryptographically strong in some implementations) can accept it.

### Recommendation
- Require authentication for accepting guardian invites
- Add rate limiting on token verification attempts
- Consider using a longer, cryptographically random token

---

## 10. LOW: CSP Allows unsafe-inline for Scripts

### Finding
`src/security/csp.ts:10`:
```typescript
"script-src": ["'self'", "'unsafe-inline'"],
```

`unsafe-inline` in production weakens XSS protection. The comment says "Needed for Vite HMR in dev" but this directive is used for all environments.

### Recommendation
- Use `unsafe-inline` only in development
- In production, use nonces or hashes for inline scripts
- The dev server config already has a separate CSP, so the production one can be stricter

---

## 11. LOW: Missing Rate Limit on delete-account

### Finding
`supabase/functions/delete-account/index.ts` deletes all user data across 10+ tables. While it requires authentication, there's no rate limiting or confirmation step.

### Recommendation
- Add a confirmation mechanism (e.g., require the user to re-enter their password)
- Add rate limiting to prevent accidental double-invocations

---

## Positive Findings (What's Done Well)

| Area | Status |
|---|---|
| **DOMPurify** | All `dangerouslySetInnerHTML` uses go through `sanitizeHtml()` with strict allowlists |
| **File validation** | Frontend has thorough MIME type, extension, and size checks |
| **Stripe webhook signature verification** | Both webhook handlers verify signatures |
| **RLS enabled** | Most tables have RLS with proper policies (security_hardening migration) |
| **CORS on user-facing functions** | Most use `ALLOWED_ORIGIN` env var pattern |
| **Env validation** | `EnvValidationGuard` prevents the app from running with misconfigured Supabase |
| **Auth on key endpoints** | `create-checkout`, `customer-portal`, `check-subscription`, `generate-lyrics`, `extract-document` all verify JWT |
| **Security headers** | CSP, HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff |
| **File sanitization** | `sanitizeFilename()` removes path traversal, null bytes, special chars |
| **Webhook replay protection** | `webhook-stripe` has an idempotency table |
| **Structured logging** | Webhook handlers use structured JSON logging |
| **Secret redaction** | `secretRedaction.ts` exists for log safety |
| **Open redirect protection** | `create-checkout` validates returnUrl against ALLOWED_ORIGIN |
| **Zod validation** | Available in dependencies for form validation |
| **Cookie consent** | GDPR-aware cookie consent component |

---

## Priority Action Items

### Immediate (Do Now)
1. **Add authentication to ALL provider edge functions** (openai-llm, openai-image, openai-tts, openai-video, resend-email, twilio-sms)
2. **Add authentication to guardian-invite** and verify caller authorization
3. **Consolidate duplicate Stripe webhook handlers** into one
4. **Verify admin role cannot be self-assigned** via user_metadata in Supabase Auth settings

### Short-Term (This Sprint)
5. Implement server-side rate limiting on edge functions
6. Move hardcoded Stripe price ID to environment variable
7. Reduce extract-document file size limit to match frontend (20MB)
8. Require auth for guardian-accept-link
9. Remove `unsafe-inline` from production CSP

### Medium-Term
10. Add confirmation step for account deletion
11. Clean up webhook CORS headers
12. Set up monitoring/alerts for unusual edge function invocation patterns
13. Add automated security scanning to CI pipeline
