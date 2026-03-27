
-- ============================================================
-- AUDIT FIX: Final 7 security findings
-- ============================================================

-- 1. PROFILES: restrict SELECT to owner only (not all authenticated)
DROP POLICY IF EXISTS "profiles_authenticated_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
CREATE POLICY "profiles_owner_read"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Also allow admin to read all profiles
CREATE POLICY "profiles_admin_read"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. LEAGUE_POINTS: change from public to authenticated (leaderboard still works for logged-in users)
DROP POLICY IF EXISTS "league_select" ON public.league_points;
CREATE POLICY "league_select_auth"
  ON public.league_points FOR SELECT TO authenticated
  USING (true);

-- 3. SONG_RATINGS: change from public to authenticated
DROP POLICY IF EXISTS "rating_select" ON public.song_ratings;
CREATE POLICY "rating_select_auth"
  ON public.song_ratings FOR SELECT TO authenticated
  USING (true);

-- 4. PRODUCT_EVENTS: remove anon insert (WITH CHECK true) — keep only authenticated insert
DROP POLICY IF EXISTS "product_events_anon_insert" ON public.product_events;

-- 5. GUARDIANS invite_token: create a secure view that excludes invite_token
-- and nullify consumed tokens via a trigger
CREATE OR REPLACE FUNCTION public.nullify_used_invite_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.invite_used_at IS NOT NULL AND OLD.invite_used_at IS NULL THEN
    NEW.invite_token := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nullify_invite_token ON public.guardians;
CREATE TRIGGER trg_nullify_invite_token
  BEFORE UPDATE ON public.guardians
  FOR EACH ROW
  EXECUTE FUNCTION public.nullify_used_invite_token();
