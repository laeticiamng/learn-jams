-- ============================================================
-- Unlock admin features for m.laeticia@hotmail.fr
-- ============================================================

-- 1. Grant admin role via user_metadata
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
  || '{"role": "admin", "is_admin": true}'::jsonb
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

-- 3. Enable all feature flags globally (admin access)
UPDATE public.feature_flags
SET enabled = true, updated_at = now();
