
-- Create a public stats function that returns aggregate counts (no user data exposed)
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'total_songs', (SELECT count(*) FROM songs WHERE status = 'ready'),
    'total_users', (SELECT count(*) FROM profiles),
    'total_styles', 30
  );
$$;
