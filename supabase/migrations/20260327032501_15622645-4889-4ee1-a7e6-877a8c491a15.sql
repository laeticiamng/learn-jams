
-- ============================================================
-- FIX: Remaining security issues post-audit
-- ============================================================

-- 1. recall_tests: Add fallback policy for null mission_run_id
CREATE POLICY "recall_tests_owner_direct"
    ON public.recall_tests
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "recall_tests_insert_direct"
    ON public.recall_tests
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- 2. guardians INSERT: Scope to prevent arbitrary guardian creation
-- Users should only create guardians they'll link to themselves
DROP POLICY IF EXISTS "guardians_insert_own" ON public.guardians;
-- Keep open insert but the user_guardians link is what matters for access
-- Service role handles guardian creation via edge functions
-- No user-facing INSERT policy = only service role can create guardians

-- 3. ops_events INSERT: Scope to own user_id
DROP POLICY IF EXISTS "ops_events_service_insert" ON public.ops_events;
CREATE POLICY "ops_events_insert_own"
    ON public.ops_events
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- 4. product_events INSERT: These are analytics events, user_id can be null
-- Keep permissive for anonymous tracking (intentional design)

-- 5. profiles public read: Restrict to authenticated only
-- (public profiles are needed for league/hall of fame display)
-- Keep as-is — this is intentional for the social features
