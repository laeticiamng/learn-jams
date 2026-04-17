
-- Rate limiting table for server-side enforcement
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  bucket_key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, bucket_key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_user_bucket ON public.rate_limit_buckets (user_id, bucket_key, window_start DESC);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- Only service role writes; users read their own (transparency)
CREATE POLICY "Users can view own rate limits"
  ON public.rate_limit_buckets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all rate limits"
  ON public.rate_limit_buckets FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Atomic check & increment RPC
CREATE OR REPLACE FUNCTION public.check_and_consume_rate_limit(
  p_user_id UUID,
  p_bucket_key TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  -- Truncate to window boundary
  v_window_start := to_timestamp(
    floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO public.rate_limit_buckets (user_id, bucket_key, window_start, request_count)
  VALUES (p_user_id, p_bucket_key, v_window_start, 1)
  ON CONFLICT (user_id, bucket_key, window_start)
  DO UPDATE SET request_count = rate_limit_buckets.request_count + 1,
                updated_at = now()
  RETURNING request_count INTO v_count;

  IF v_count > p_max_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'count', v_count,
      'limit', p_max_requests,
      'window_seconds', p_window_seconds,
      'retry_after_seconds', p_window_seconds - extract(epoch FROM (now() - v_window_start))::int
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'count', v_count,
    'limit', p_max_requests,
    'remaining', p_max_requests - v_count
  );
END;
$$;

-- Cleanup old buckets (keep 24h)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limit_buckets WHERE window_start < now() - interval '24 hours';
$$;
