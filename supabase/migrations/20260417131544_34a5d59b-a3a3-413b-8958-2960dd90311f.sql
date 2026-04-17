
-- Provider health / circuit breaker state
CREATE TABLE IF NOT EXISTS public.provider_health (
  provider_key TEXT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'closed' CHECK (state IN ('closed', 'open', 'half_open')),
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  cooldown_seconds INTEGER NOT NULL DEFAULT 60,
  failure_threshold INTEGER NOT NULL DEFAULT 5,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_health ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read health (transparency)
CREATE POLICY "Authenticated can view provider health"
  ON public.provider_health FOR SELECT
  TO authenticated
  USING (true);

-- Seed known providers
INSERT INTO public.provider_health (provider_key) VALUES
  ('openai'), ('suno'), ('resend'), ('twilio'), ('lovable_ai'), ('runway_replicate')
ON CONFLICT (provider_key) DO NOTHING;

-- Record a failure; open circuit if threshold reached
CREATE OR REPLACE FUNCTION public.record_provider_failure(p_provider_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row provider_health%ROWTYPE;
BEGIN
  INSERT INTO public.provider_health (provider_key) VALUES (p_provider_key)
  ON CONFLICT (provider_key) DO NOTHING;

  UPDATE public.provider_health
  SET consecutive_failures = consecutive_failures + 1,
      last_failure_at = now(),
      updated_at = now()
  WHERE provider_key = p_provider_key
  RETURNING * INTO v_row;

  -- Open circuit if threshold hit (and not already open)
  IF v_row.consecutive_failures >= v_row.failure_threshold AND v_row.state = 'closed' THEN
    UPDATE public.provider_health
    SET state = 'open',
        opened_at = now()
    WHERE provider_key = p_provider_key;

    -- Audit
    INSERT INTO public.security_audit_events (event_type, severity, details_json)
    VALUES (
      'circuit_breaker_opened',
      'error',
      jsonb_build_object(
        'provider', p_provider_key,
        'consecutive_failures', v_row.consecutive_failures
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'state', v_row.state,
    'consecutive_failures', v_row.consecutive_failures
  );
END;
$$;

-- Record a success; close circuit
CREATE OR REPLACE FUNCTION public.record_provider_success(p_provider_key TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.provider_health (provider_key) VALUES (p_provider_key)
  ON CONFLICT (provider_key) DO NOTHING;

  UPDATE public.provider_health
  SET consecutive_failures = 0,
      last_success_at = now(),
      state = 'closed',
      opened_at = NULL,
      updated_at = now()
  WHERE provider_key = p_provider_key
    AND state IN ('closed', 'half_open');
END;
$$;

-- Check provider health, transitioning open → half_open after cooldown
CREATE OR REPLACE FUNCTION public.is_provider_healthy(p_provider_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row provider_health%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.provider_health WHERE provider_key = p_provider_key;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('healthy', true, 'state', 'closed');
  END IF;

  -- Auto-transition open → half_open after cooldown
  IF v_row.state = 'open' AND v_row.opened_at IS NOT NULL
     AND now() > v_row.opened_at + (v_row.cooldown_seconds || ' seconds')::interval THEN
    UPDATE public.provider_health
    SET state = 'half_open', updated_at = now()
    WHERE provider_key = p_provider_key;
    v_row.state := 'half_open';
  END IF;

  RETURN jsonb_build_object(
    'healthy', v_row.state IN ('closed', 'half_open'),
    'state', v_row.state,
    'consecutive_failures', v_row.consecutive_failures,
    'cooldown_seconds', v_row.cooldown_seconds
  );
END;
$$;
