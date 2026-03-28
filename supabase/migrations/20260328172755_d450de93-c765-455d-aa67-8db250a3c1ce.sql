
-- ============================================================
-- FIX: guardians_safe view security + league_leaderboard access
-- ============================================================

-- 1. guardians_safe is a VIEW (not a table), so RLS doesn't apply directly.
-- The underlying guardians table already has RLS. But security_invoker=true
-- means the calling user's permissions apply. The scan flags it because
-- views don't have their own RLS policies. We need to ensure the underlying
-- table policies are sufficient. The guardians table already has "guardians_read_own"
-- policy. This is correct. Let's add a COMMENT to document the intent.
COMMENT ON VIEW public.guardians_safe IS 'Secure view over guardians table — excludes invite_token. Access controlled by RLS on underlying guardians table via security_invoker=true.';

-- 2. league_leaderboard is also a VIEW with security_invoker=true.
-- The underlying league_points and profiles tables have RLS.
-- But the leaderboard should be readable by all authenticated users.
-- We need to add a SELECT policy on league_points for the leaderboard context.
-- Actually, the issue is that league_points only allows own-read, so the view
-- can't aggregate other users' points. Let's create a function-based approach instead.

-- Drop the security_invoker view and recreate as SECURITY DEFINER with explicit grant
DROP VIEW IF EXISTS public.league_leaderboard;

-- Create a SECURITY DEFINER function that returns leaderboard data
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_week text DEFAULT NULL)
RETURNS TABLE(display_name text, avatar_url text, week text, total_points bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.display_name,
    p.avatar_url,
    lp.week,
    SUM(lp.points)::bigint AS total_points
  FROM public.league_points lp
  JOIN public.profiles p ON p.user_id = lp.user_id
  WHERE (p_week IS NULL OR lp.week = p_week)
  GROUP BY p.display_name, p.avatar_url, lp.week
  ORDER BY total_points DESC
  LIMIT 100;
$$;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard(text) FROM anon;
