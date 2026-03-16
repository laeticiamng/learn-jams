-- ============================================================
-- Unlock ALL admin features for m.laeticia@hotmail.fr
-- ============================================================

-- 1. Grant admin role + school plan via user_metadata
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
  || '{"role": "admin", "is_admin": true, "plan_key": "school"}'::jsonb
WHERE email = 'm.laeticia@hotmail.fr';

-- 2. Upsert an active subscription on the "school" plan (highest tier, all features included)
INSERT INTO public.subscriptions (user_id, status, current_period_start, current_period_end)
SELECT id, 'active', now(), now() + interval '1 year'
FROM auth.users
WHERE email = 'm.laeticia@hotmail.fr'
ON CONFLICT (user_id) DO UPDATE
SET status = 'active',
    current_period_start = now(),
    current_period_end = now() + interval '1 year',
    updated_at = now();

-- 3. Enable all feature flags globally
UPDATE public.feature_flags
SET enabled = true, updated_at = now();

-- 4. Add admin user to allowlist of every feature flag
UPDATE public.feature_flags
SET rules_json = jsonb_set(
  COALESCE(rules_json, '{}'::jsonb),
  '{allowlist}',
  COALESCE(rules_json->'allowlist', '[]'::jsonb) || to_jsonb((
    SELECT id::text FROM auth.users WHERE email = 'm.laeticia@hotmail.fr'
  ))
)
WHERE NOT (
  COALESCE(rules_json->'allowlist', '[]'::jsonb) @> to_jsonb((
    SELECT id::text FROM auth.users WHERE email = 'm.laeticia@hotmail.fr'
  ))
);

-- 5. Remove any previous entitlement snapshots for this admin (idempotent)
DELETE FROM public.user_entitlement_snapshots
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'm.laeticia@hotmail.fr');

-- 6. Create entitlement snapshot for admin with school plan (unlimited access, all features)
INSERT INTO public.user_entitlement_snapshots (user_id, plan_key, entitlements_json, flex_credits_json)
SELECT
  id,
  'school',
  '[
    {"feature_key": "dynamic_sheet_generation", "availability": "included", "quota_total": -1, "quota_used": 0, "quota_remaining": -1},
    {"feature_key": "animated_story_generation", "availability": "included", "quota_total": -1, "quota_used": 0, "quota_remaining": -1},
    {"feature_key": "escape_game_generation", "availability": "included", "quota_total": -1, "quota_used": 0, "quota_remaining": -1},
    {"feature_key": "music_generation", "availability": "included", "quota_total": -1, "quota_used": 0, "quota_remaining": -1},
    {"feature_key": "video_generation_ai_seconds", "availability": "included", "quota_total": -1, "quota_used": 0, "quota_remaining": -1},
    {"feature_key": "video_template_render", "availability": "included", "quota_total": -1, "quota_used": 0, "quota_remaining": -1},
    {"feature_key": "guardian_sms", "availability": "included", "quota_total": -1, "quota_used": 0, "quota_remaining": -1},
    {"feature_key": "guardian_email", "availability": "included", "quota_total": -1, "quota_used": 0, "quota_remaining": -1},
    {"feature_key": "premium_export", "availability": "included", "quota_total": -1, "quota_used": 0, "quota_remaining": -1}
  ]'::jsonb,
  '{}'::jsonb
FROM auth.users
WHERE email = 'm.laeticia@hotmail.fr';
