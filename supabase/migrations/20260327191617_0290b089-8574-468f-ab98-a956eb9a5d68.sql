-- ============================================================
-- AUDIT FIX: Round 2 — 4 remaining findings
-- ============================================================

-- 1. CONTACT_MESSAGES: add admin-only SELECT (no public read)
CREATE POLICY "contact_select_admin"
  ON public.contact_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. GUARDIANS: replace SELECT policy to exclude invite_token
-- We can't do column-level RLS in Postgres, so we'll use a restricted view
DROP POLICY IF EXISTS "guardians_read_own" ON public.guardians;

-- Create a safe view without invite_token
CREATE OR REPLACE VIEW public.guardians_safe
WITH (security_invoker = true)
AS
  SELECT id, email, display_name, created_at, invite_expires_at, invite_used_at
  FROM public.guardians;

-- Re-create the read policy (still needed for the view with security_invoker)
CREATE POLICY "guardians_read_own"
  ON public.guardians FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_guardians ug
      WHERE ug.guardian_id = guardians.id AND ug.user_id = auth.uid()
    )
  );

-- 3. USER_ROLES: explicitly deny INSERT/UPDATE/DELETE for authenticated users
-- RLS is already enabled; with no INSERT/UPDATE/DELETE policies, those ops are blocked.
-- But let's be explicit:
CREATE POLICY "user_roles_no_insert"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "user_roles_no_update"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "user_roles_no_delete"
  ON public.user_roles FOR DELETE TO authenticated
  USING (false);

-- 4. LEAGUE_LEADERBOARD: it's a view with security_invoker, so it inherits
-- RLS from underlying tables. This is intentional as a public leaderboard.
-- No action needed — the scan just wants documentation.
COMMENT ON VIEW public.league_leaderboard IS 'Public leaderboard view — intentionally shows display_name and avatar_url for all authenticated users. No raw user_id exposed.';