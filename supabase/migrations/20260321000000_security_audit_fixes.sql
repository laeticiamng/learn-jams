-- ============================================================
-- Security Audit Fixes — RLS hardening
-- Fixes: education_profiles missing RLS, overly permissive
--        policies on 5 tables
-- ============================================================

-- ── 1. education_profiles — Enable RLS (was completely missing) ─────
ALTER TABLE IF EXISTS public.education_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_education_profile" ON public.education_profiles
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "service_manage_education_profiles" ON public.education_profiles
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 2. video_provider_runs — Restrict to project owner ──────────────
-- Drop overly permissive policies
DROP POLICY IF EXISTS "vpr_read" ON public.video_provider_runs;
DROP POLICY IF EXISTS "vpr_insert" ON public.video_provider_runs;
DROP POLICY IF EXISTS "vpr_update" ON public.video_provider_runs;

-- Re-create scoped to project owner via video_projects join
CREATE POLICY "vpr_read_own" ON public.video_provider_runs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.video_projects vp
      WHERE vp.id = video_provider_runs.project_id
        AND vp.user_id = auth.uid()
    )
  );

CREATE POLICY "vpr_insert_own" ON public.video_provider_runs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.video_projects vp
      WHERE vp.id = video_provider_runs.project_id
        AND vp.user_id = auth.uid()
    )
  );

CREATE POLICY "vpr_update_own" ON public.video_provider_runs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.video_projects vp
      WHERE vp.id = video_provider_runs.project_id
        AND vp.user_id = auth.uid()
    )
  );

CREATE POLICY "vpr_service" ON public.video_provider_runs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 3. mission_qa_results — Restrict to mission owner ───────────────
DROP POLICY IF EXISTS "mission_qa_results_read" ON public.mission_qa_results;
DROP POLICY IF EXISTS "mission_qa_results_insert" ON public.mission_qa_results;
DROP POLICY IF EXISTS "mission_qa_results_update" ON public.mission_qa_results;

CREATE POLICY "mission_qa_own_read" ON public.mission_qa_results
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.generated_missions gm
      JOIN public.source_documents sd ON sd.id = gm.document_id
      WHERE gm.id = mission_qa_results.mission_id
        AND sd.user_id = auth.uid()
    )
  );

CREATE POLICY "mission_qa_service" ON public.mission_qa_results
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 4. guardian_notification_preferences — Restrict to guardian owner ─
DROP POLICY IF EXISTS "gnp_read" ON public.guardian_notification_preferences;
DROP POLICY IF EXISTS "gnp_insert" ON public.guardian_notification_preferences;
DROP POLICY IF EXISTS "gnp_update" ON public.guardian_notification_preferences;
-- Try alternate policy names too
DROP POLICY IF EXISTS "guardian_notification_preferences_read" ON public.guardian_notification_preferences;
DROP POLICY IF EXISTS "guardian_notification_preferences_insert" ON public.guardian_notification_preferences;
DROP POLICY IF EXISTS "guardian_notification_preferences_update" ON public.guardian_notification_preferences;

CREATE POLICY "gnp_own_read" ON public.guardian_notification_preferences
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guardians g
      WHERE g.id = guardian_notification_preferences.guardian_id
        AND g.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "gnp_own_update" ON public.guardian_notification_preferences
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guardians g
      WHERE g.id = guardian_notification_preferences.guardian_id
        AND g.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "gnp_service" ON public.guardian_notification_preferences
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 5. guardian_notifications — Restrict to guardian owner ───────────
DROP POLICY IF EXISTS "gn_read" ON public.guardian_notifications;
DROP POLICY IF EXISTS "gn_insert" ON public.guardian_notifications;
DROP POLICY IF EXISTS "guardian_notifications_read" ON public.guardian_notifications;
DROP POLICY IF EXISTS "guardian_notifications_insert" ON public.guardian_notifications;

CREATE POLICY "gn_own_read" ON public.guardian_notifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guardians g
      WHERE g.id = guardian_notifications.guardian_id
        AND g.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "gn_service" ON public.guardian_notifications
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 6. experiment_measurements — Restrict to own experiments ────────
DROP POLICY IF EXISTS "em_read" ON public.experiment_measurements;
DROP POLICY IF EXISTS "em_insert" ON public.experiment_measurements;
DROP POLICY IF EXISTS "experiment_measurements_read" ON public.experiment_measurements;
DROP POLICY IF EXISTS "experiment_measurements_insert" ON public.experiment_measurements;

CREATE POLICY "em_own_read" ON public.experiment_measurements
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.experiment_runs er
      JOIN public.experiment_assignments ea ON ea.id = er.assignment_id
      WHERE er.id = experiment_measurements.run_id
        AND ea.user_id = auth.uid()
    )
  );

CREATE POLICY "em_service" ON public.experiment_measurements
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
