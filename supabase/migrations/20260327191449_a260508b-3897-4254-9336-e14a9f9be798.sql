-- ============================================================
-- AUDIT FIX: 4 remaining security findings
-- ============================================================

-- 1. SONG_RATINGS: restrict SELECT to own ratings only
DROP POLICY IF EXISTS "rating_select_auth" ON public.song_ratings;
CREATE POLICY "rating_select_own"
  ON public.song_ratings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Allow admin to see all ratings
CREATE POLICY "rating_select_admin"
  ON public.song_ratings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. LEAGUE_POINTS: restrict SELECT to own points (leaderboard via a view)
DROP POLICY IF EXISTS "league_select_auth" ON public.league_points;
CREATE POLICY "league_select_own"
  ON public.league_points FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admin can read all
CREATE POLICY "league_select_admin"
  ON public.league_points FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create a secure leaderboard view that hides raw user_id
CREATE OR REPLACE VIEW public.league_leaderboard AS
  SELECT
    p.display_name,
    p.avatar_url,
    lp.week,
    SUM(lp.points) AS total_points
  FROM public.league_points lp
  JOIN public.profiles p ON p.user_id = lp.user_id
  GROUP BY p.display_name, p.avatar_url, lp.week
  ORDER BY total_points DESC;

-- 3. MARGIN_REPORTS: remove user INSERT — only service_role should write
DROP POLICY IF EXISTS "margin_reports_insert_own" ON public.margin_reports;

-- 4. LEAGUE_POINTS: remove user INSERT — points should be granted by backend only
DROP POLICY IF EXISTS "league_insert" ON public.league_points;