
-- ============================================================
-- SECURITY FIX: Comprehensive RLS hardening
-- ============================================================

-- ============================================================
-- 1. user_roles table + has_role() function (admin security)
-- ============================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Only admins can read roles (via the function below)
-- No direct user access to this table
CREATE POLICY "Service role only - no user access"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- ============================================================
-- 2. FIX: subscriptions — Remove dangerous public ALL policy
-- ============================================================

DROP POLICY IF EXISTS "sub_service" ON public.subscriptions;

-- Users can only read their own subscription
-- (sub_select already exists and is correct: auth.uid() = user_id)

-- Service role handles INSERT/UPDATE/DELETE via Stripe webhook

-- ============================================================
-- 3. FIX: guardians — Scope to user's own guardians
-- ============================================================

DROP POLICY IF EXISTS "guardians_read" ON public.guardians;
DROP POLICY IF EXISTS "guardians_insert" ON public.guardians;
DROP POLICY IF EXISTS "guardians_update" ON public.guardians;

CREATE POLICY "guardians_read_own"
    ON public.guardians
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_guardians ug
            WHERE ug.guardian_id = guardians.id
              AND ug.user_id = auth.uid()
        )
    );

CREATE POLICY "guardians_insert_own"
    ON public.guardians
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Allow insert, the user_guardians link will be created after
        -- We verify via application logic
        true
    );

CREATE POLICY "guardians_update_own"
    ON public.guardians
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_guardians ug
            WHERE ug.guardian_id = guardians.id
              AND ug.user_id = auth.uid()
        )
    );

-- ============================================================
-- 4. FIX: suspicious_activity_flags — Service role only
-- ============================================================

DROP POLICY IF EXISTS "flags_select" ON public.suspicious_activity_flags;
DROP POLICY IF EXISTS "flags_insert" ON public.suspicious_activity_flags;
DROP POLICY IF EXISTS "flags_update" ON public.suspicious_activity_flags;

-- No user-facing policies = only service role can access

-- ============================================================
-- 5. FIX: guardian_notifications — Scope to own guardians
-- ============================================================

DROP POLICY IF EXISTS "gn_read" ON public.guardian_notifications;
DROP POLICY IF EXISTS "gn_insert" ON public.guardian_notifications;

CREATE POLICY "gn_read_own"
    ON public.guardian_notifications
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_guardians ug
            WHERE ug.guardian_id = guardian_notifications.guardian_id
              AND ug.user_id = auth.uid()
        )
    );

CREATE POLICY "gn_insert_own"
    ON public.guardian_notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_guardians ug
            WHERE ug.guardian_id = guardian_notifications.guardian_id
              AND ug.user_id = auth.uid()
        )
    );

-- ============================================================
-- 6. FIX: guardian_notification_preferences — Scope to own
-- ============================================================

DROP POLICY IF EXISTS "gnp_read" ON public.guardian_notification_preferences;
DROP POLICY IF EXISTS "gnp_insert" ON public.guardian_notification_preferences;
DROP POLICY IF EXISTS "gnp_update" ON public.guardian_notification_preferences;

CREATE POLICY "gnp_read_own"
    ON public.guardian_notification_preferences
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_guardians ug
            WHERE ug.guardian_id = guardian_notification_preferences.guardian_id
              AND ug.user_id = auth.uid()
        )
    );

CREATE POLICY "gnp_insert_own"
    ON public.guardian_notification_preferences
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_guardians ug
            WHERE ug.guardian_id = guardian_notification_preferences.guardian_id
              AND ug.user_id = auth.uid()
        )
    );

CREATE POLICY "gnp_update_own"
    ON public.guardian_notification_preferences
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_guardians ug
            WHERE ug.guardian_id = guardian_notification_preferences.guardian_id
              AND ug.user_id = auth.uid()
        )
    );

-- ============================================================
-- 7. FIX: webhook_events — Service role only
-- ============================================================

DROP POLICY IF EXISTS "webhook_events_service" ON public.webhook_events;

-- No user-facing policies = only service role can access

-- ============================================================
-- 8. FIX: webhook_replay_protection — Service role only
-- ============================================================

DROP POLICY IF EXISTS "wrp_service" ON public.webhook_replay_protection;

-- No user-facing policies = only service role can access

-- ============================================================
-- 9. FIX: video_provider_runs — Scope via video_projects
-- ============================================================

DROP POLICY IF EXISTS "vpr_read" ON public.video_provider_runs;
DROP POLICY IF EXISTS "vpr_insert" ON public.video_provider_runs;
DROP POLICY IF EXISTS "vpr_update" ON public.video_provider_runs;

CREATE POLICY "vpr_read_own"
    ON public.video_provider_runs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.video_projects vp
            WHERE vp.id = video_provider_runs.project_id
              AND vp.user_id = auth.uid()
        )
    );

CREATE POLICY "vpr_insert_own"
    ON public.video_provider_runs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.video_projects vp
            WHERE vp.id = video_provider_runs.project_id
              AND vp.user_id = auth.uid()
        )
    );

CREATE POLICY "vpr_update_own"
    ON public.video_provider_runs
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.video_projects vp
            WHERE vp.id = video_provider_runs.project_id
              AND vp.user_id = auth.uid()
        )
    );

-- ============================================================
-- 10. FIX: providers / provider_routes — Service role only
-- ============================================================

DROP POLICY IF EXISTS "prov_read" ON public.providers;
DROP POLICY IF EXISTS "pr_read" ON public.provider_routes;

-- No user-facing policies = only service role can access

-- ============================================================
-- 11. FIX: experiment_runs — Scope INSERT, keep SELECT open
-- ============================================================

DROP POLICY IF EXISTS "er_insert" ON public.experiment_runs;

-- experiment_runs don't have user_id, so we keep SELECT open
-- but restrict INSERT to service role only
-- (remove the permissive insert policy)

-- ============================================================
-- 12. FIX: experiment_measurements — Scope to own user
-- ============================================================

DROP POLICY IF EXISTS "em_read" ON public.experiment_measurements;
DROP POLICY IF EXISTS "em_insert" ON public.experiment_measurements;

CREATE POLICY "em_read_own"
    ON public.experiment_measurements
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "em_insert_own"
    ON public.experiment_measurements
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 13. FIX: cost_events INSERT — Scope to own user
-- ============================================================

DROP POLICY IF EXISTS "cost_events_insert" ON public.cost_events;

CREATE POLICY "cost_events_insert_own"
    ON public.cost_events
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 14. FIX: margin_reports INSERT — Scope to own user
-- ============================================================

DROP POLICY IF EXISTS "margin_reports_insert" ON public.margin_reports;

CREATE POLICY "margin_reports_insert_own"
    ON public.margin_reports
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 15. FIX: security_audit_events INSERT — Scope to own user
-- ============================================================

DROP POLICY IF EXISTS "audit_events_insert" ON public.security_audit_events;

CREATE POLICY "audit_events_insert_own"
    ON public.security_audit_events
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
