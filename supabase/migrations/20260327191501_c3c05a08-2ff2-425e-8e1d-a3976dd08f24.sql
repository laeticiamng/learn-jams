-- Fix SECURITY DEFINER view: use SECURITY INVOKER instead
DROP VIEW IF EXISTS public.league_leaderboard;
CREATE VIEW public.league_leaderboard
WITH (security_invoker = true)
AS
  SELECT
    p.display_name,
    p.avatar_url,
    lp.week,
    SUM(lp.points) AS total_points
  FROM public.league_points lp
  JOIN public.profiles p ON p.user_id = lp.user_id
  GROUP BY p.display_name, p.avatar_url, lp.week
  ORDER BY total_points DESC;