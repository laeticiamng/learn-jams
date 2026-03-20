# Production Audit — Remaining Items Requiring Backend Verification

Items below cannot be verified from frontend code alone and require dashboard/CLI access.

## 1. Row Level Security (RLS) Policies

Verify all tables accessed by the frontend have RLS enabled and correctly scoped:
- `subscriptions` — user can only read/write their own
- `consent_events` — scoped to user_id or guardian_id
- `user_guardians`, `guardians` — scoped to user_id
- `generation_jobs`, `generation_artifacts` — scoped to user_id
- `contact_messages` — insert-only for authenticated users
- `songs`, `favorites`, `profiles`, `usage_quotas` — scoped to user_id

Run: `supabase inspect db policies` or check the Supabase dashboard.

## 2. Edge Function Environment Variables

After the CORS hardening in this PR, verify `ALLOWED_ORIGIN` is set in the Supabase dashboard for all edge functions. If unset, the fallback `https://learn-jams.lovable.app` is used, but an explicit value is preferred.

## 3. Rate Limiting on Edge Functions

Edge functions currently have no server-side rate limiting. Authenticated users could spam AI-heavy endpoints (`cognitio-analyze`, `cognitio-ingest`, `cognitio-generate-dynamic-sheet`) and run up provider API costs.

Recommended: Add Supabase's built-in rate limiting or a Deno-side token bucket per user.

## 4. Storage Bucket Policies

Verify that `source-raw` and `course-uploads` storage buckets have proper RLS policies:
- Only the file owner can read/write their own files
- No public access unless explicitly intended

## 5. Webhook Signature Secrets

Verify these secrets are set and rotated periodically:
- `STRIPE_WEBHOOK_SECRET`
- Suno callback secret (if applicable)
- `RESEND_WEBHOOK_SECRET` (for webhook-resend)
- `TWILIO_AUTH_TOKEN` (for webhook-twilio)

## 6. Admin Role Check

The `AdminRoute` component checks `user_metadata.is_admin || user_metadata.role === "admin"`. Verify that `user_metadata` cannot be set by the user themselves via `supabase.auth.updateUser()`. Admin role should only be settable via service role key or database trigger.
