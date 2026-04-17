
-- =========================================
-- IDEMPOTENCY KEYS
-- =========================================
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key text NOT NULL,
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | completed | failed
  response_json jsonb,
  http_status int DEFAULT 200,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  PRIMARY KEY (key, user_id)
);

CREATE INDEX IF NOT EXISTS idx_idem_user_endpoint ON public.idempotency_keys(user_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_idem_expires ON public.idempotency_keys(expires_at);

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "idem_owner_select" ON public.idempotency_keys
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Inserts/updates done by edge functions via service role; no client write policy.

-- =========================================
-- SLO DEFINITIONS & MEASUREMENTS
-- =========================================
CREATE TABLE IF NOT EXISTS public.slo_definitions (
  slo_key text PRIMARY KEY,
  display_name text NOT NULL,
  description text,
  target_pct numeric NOT NULL, -- e.g. 95.0 means 95%
  comparator text NOT NULL DEFAULT 'gte', -- gte | lte
  unit text NOT NULL DEFAULT 'percent', -- percent | ms
  window_days int NOT NULL DEFAULT 7,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.slo_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slo_def_read_all" ON public.slo_definitions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "slo_def_admin_manage" ON public.slo_definitions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.slo_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slo_key text NOT NULL REFERENCES public.slo_definitions(slo_key) ON DELETE CASCADE,
  measured_at timestamptz NOT NULL DEFAULT now(),
  value numeric NOT NULL,
  met boolean NOT NULL,
  sample_size int DEFAULT 0,
  metadata_json jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_slo_meas_key_time ON public.slo_measurements(slo_key, measured_at DESC);

ALTER TABLE public.slo_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slo_meas_admin_read" ON public.slo_measurements
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed initial SLOs
INSERT INTO public.slo_definitions (slo_key, display_name, description, target_pct, comparator, unit, window_days)
VALUES
  ('music_generation_success', 'Succès génération musique', 'Taux de succès des générations musique sur 7 jours', 95.0, 'gte', 'percent', 7),
  ('api_latency_p95_ms', 'Latence API P95', 'Latence p95 des edge functions sous 3000 ms', 3000, 'lte', 'ms', 7),
  ('webhook_delivery_success', 'Livraison webhooks', 'Taux de livraison des webhooks externes', 99.0, 'gte', 'percent', 7)
ON CONFLICT (slo_key) DO NOTHING;

-- =========================================
-- INCIDENTS
-- =========================================
CREATE TABLE IF NOT EXISTS public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'minor', -- minor | major | critical
  status text NOT NULL DEFAULT 'investigating', -- investigating | identified | monitoring | resolved
  affected_components text[] DEFAULT ARRAY[]::text[],
  started_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status, started_at DESC);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Public can read incidents (status page transparency)
CREATE POLICY "incidents_public_read" ON public.incidents
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "incidents_admin_manage" ON public.incidents
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.incident_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  message text NOT NULL,
  status_at_post text NOT NULL,
  posted_at timestamptz NOT NULL DEFAULT now(),
  posted_by uuid
);

CREATE INDEX IF NOT EXISTS idx_incident_updates ON public.incident_updates(incident_id, posted_at DESC);

ALTER TABLE public.incident_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "incident_updates_public_read" ON public.incident_updates
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "incident_updates_admin_manage" ON public.incident_updates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Auto update incidents.updated_at
CREATE OR REPLACE FUNCTION public.touch_incidents_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'resolved' AND OLD.status <> 'resolved' THEN
    NEW.resolved_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_incidents_touch ON public.incidents;
CREATE TRIGGER trg_incidents_touch
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.touch_incidents_updated_at();

-- =========================================
-- RPC: compute_slo_status
-- =========================================
CREATE OR REPLACE FUNCTION public.compute_slo_status(p_slo_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_def record;
  v_avg numeric;
  v_met_count int;
  v_total_count int;
  v_compliance numeric;
  v_error_budget numeric;
  v_recent jsonb;
BEGIN
  SELECT * INTO v_def FROM public.slo_definitions WHERE slo_key = p_slo_key;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT
    COALESCE(AVG(value), 0),
    COUNT(*) FILTER (WHERE met),
    COUNT(*)
  INTO v_avg, v_met_count, v_total_count
  FROM public.slo_measurements
  WHERE slo_key = p_slo_key
    AND measured_at > now() - (v_def.window_days || ' days')::interval;

  v_compliance := CASE WHEN v_total_count = 0 THEN 100 ELSE (v_met_count::numeric / v_total_count) * 100 END;
  -- Error budget = how much margin remains before breaching target compliance (assume 99% allowed downtime budget)
  v_error_budget := GREATEST(0, v_compliance - (CASE WHEN v_def.comparator = 'gte' THEN 95 ELSE 95 END));

  SELECT jsonb_agg(jsonb_build_object('t', measured_at, 'v', value, 'met', met) ORDER BY measured_at)
  INTO v_recent
  FROM (
    SELECT measured_at, value, met
    FROM public.slo_measurements
    WHERE slo_key = p_slo_key
      AND measured_at > now() - (v_def.window_days || ' days')::interval
    ORDER BY measured_at DESC
    LIMIT 168
  ) sub;

  RETURN jsonb_build_object(
    'slo_key', v_def.slo_key,
    'display_name', v_def.display_name,
    'target_pct', v_def.target_pct,
    'comparator', v_def.comparator,
    'unit', v_def.unit,
    'window_days', v_def.window_days,
    'avg_value', v_avg,
    'compliance_pct', v_compliance,
    'error_budget_pct', v_error_budget,
    'sample_count', v_total_count,
    'status', CASE
      WHEN v_total_count = 0 THEN 'unknown'
      WHEN v_compliance >= 99 THEN 'healthy'
      WHEN v_compliance >= 95 THEN 'warning'
      ELSE 'breached'
    END,
    'recent', COALESCE(v_recent, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_slo_status(text) TO authenticated;

-- =========================================
-- RPC: get_or_create_idempotency
-- =========================================
CREATE OR REPLACE FUNCTION public.get_or_create_idempotency(
  p_key text,
  p_user_id uuid,
  p_endpoint text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing record;
BEGIN
  SELECT * INTO v_existing
  FROM public.idempotency_keys
  WHERE key = p_key AND user_id = p_user_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'cached', true,
      'status', v_existing.status,
      'response_json', v_existing.response_json,
      'http_status', v_existing.http_status
    );
  END IF;

  INSERT INTO public.idempotency_keys (key, user_id, endpoint, status)
  VALUES (p_key, p_user_id, p_endpoint, 'pending');

  RETURN jsonb_build_object('cached', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_idempotency(text, uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_idempotency(
  p_key text,
  p_user_id uuid,
  p_response jsonb,
  p_http_status int,
  p_status text DEFAULT 'completed'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.idempotency_keys
  SET status = p_status,
      response_json = p_response,
      http_status = p_http_status,
      completed_at = now()
  WHERE key = p_key AND user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_idempotency(text, uuid, jsonb, int, text) TO service_role;

-- =========================================
-- Extend cleanup TTL job to purge idempotency keys
-- =========================================
CREATE OR REPLACE FUNCTION public.cleanup_observability_tables()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost int := 0;
  v_audit int := 0;
  v_rl int := 0;
  v_idem int := 0;
  v_slo int := 0;
BEGIN
  DELETE FROM public.cost_events WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_cost = ROW_COUNT;

  DELETE FROM public.security_audit_events WHERE created_at < now() - interval '180 days';
  GET DIAGNOSTICS v_audit = ROW_COUNT;

  DELETE FROM public.rate_limit_buckets WHERE updated_at < now() - interval '24 hours';
  GET DIAGNOSTICS v_rl = ROW_COUNT;

  DELETE FROM public.idempotency_keys WHERE expires_at < now();
  GET DIAGNOSTICS v_idem = ROW_COUNT;

  DELETE FROM public.slo_measurements WHERE measured_at < now() - interval '90 days';
  GET DIAGNOSTICS v_slo = ROW_COUNT;

  RETURN jsonb_build_object(
    'cost_events_deleted', v_cost,
    'audit_events_deleted', v_audit,
    'rate_limit_deleted', v_rl,
    'idempotency_deleted', v_idem,
    'slo_measurements_deleted', v_slo,
    'ran_at', now()
  );
END;
$$;
