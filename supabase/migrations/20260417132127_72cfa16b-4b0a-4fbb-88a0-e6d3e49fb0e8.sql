-- ============================================================
-- Governance: security_alerts + cost aggregates + anomaly detection
-- ============================================================

-- Enable required extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── security_alerts ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved')),
  title TEXT NOT NULL,
  description TEXT,
  details_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  acknowledged_by UUID
);
CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON public.security_alerts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_user ON public.security_alerts (user_id);

ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all alerts" ON public.security_alerts;
CREATE POLICY "Admins can view all alerts"
  ON public.security_alerts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update alerts" ON public.security_alerts;
CREATE POLICY "Admins can update alerts"
  ON public.security_alerts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- INSERT only via service_role (no policy = denied for authenticated)

-- ── cost_daily_aggregates ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cost_daily_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  day DATE NOT NULL,
  total_cost_usd NUMERIC NOT NULL DEFAULT 0,
  event_count INTEGER NOT NULL DEFAULT 0,
  by_feature_json JSONB DEFAULT '{}'::jsonb,
  by_provider_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);
CREATE INDEX IF NOT EXISTS idx_cost_daily_day ON public.cost_daily_aggregates (day DESC);
CREATE INDEX IF NOT EXISTS idx_cost_daily_user ON public.cost_daily_aggregates (user_id, day DESC);

ALTER TABLE public.cost_daily_aggregates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own daily costs" ON public.cost_daily_aggregates;
CREATE POLICY "Users see own daily costs"
  ON public.cost_daily_aggregates FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- ── RPC: aggregate_daily_costs ─────────────────────────────
CREATE OR REPLACE FUNCTION public.aggregate_daily_costs(p_day DATE DEFAULT (CURRENT_DATE - INTERVAL '1 day')::date)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  WITH agg AS (
    SELECT
      user_id,
      p_day AS day,
      SUM(COALESCE(actual_cost_usd, estimated_cost_usd, 0))::numeric AS total_cost_usd,
      COUNT(*)::int AS event_count,
      jsonb_object_agg(feature_key, feature_total) FILTER (WHERE feature_key IS NOT NULL) AS by_feature_json,
      jsonb_object_agg(provider_key, provider_total) FILTER (WHERE provider_key IS NOT NULL) AS by_provider_json
    FROM (
      SELECT
        user_id,
        feature_key,
        provider_key,
        SUM(COALESCE(actual_cost_usd, estimated_cost_usd, 0)) OVER (PARTITION BY user_id, feature_key) AS feature_total,
        SUM(COALESCE(actual_cost_usd, estimated_cost_usd, 0)) OVER (PARTITION BY user_id, provider_key) AS provider_total,
        actual_cost_usd,
        estimated_cost_usd
      FROM public.cost_events
      WHERE created_at >= p_day::timestamptz
        AND created_at < (p_day + INTERVAL '1 day')::timestamptz
        AND user_id IS NOT NULL
    ) sub
    GROUP BY user_id
  )
  INSERT INTO public.cost_daily_aggregates (user_id, day, total_cost_usd, event_count, by_feature_json, by_provider_json)
  SELECT user_id, day, total_cost_usd, event_count, COALESCE(by_feature_json, '{}'::jsonb), COALESCE(by_provider_json, '{}'::jsonb)
  FROM agg
  ON CONFLICT (user_id, day) DO UPDATE
    SET total_cost_usd = EXCLUDED.total_cost_usd,
        event_count = EXCLUDED.event_count,
        by_feature_json = EXCLUDED.by_feature_json,
        by_provider_json = EXCLUDED.by_provider_json;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.aggregate_daily_costs(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aggregate_daily_costs(DATE) TO authenticated, service_role;

-- ── RPC: detect_cost_anomalies ─────────────────────────────
CREATE OR REPLACE FUNCTION public.detect_cost_anomalies(p_threshold_usd NUMERIC DEFAULT 5.0)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alerts_created INTEGER := 0;
  r RECORD;
BEGIN
  FOR r IN
    WITH yday AS (
      SELECT user_id, total_cost_usd
      FROM public.cost_daily_aggregates
      WHERE day = (CURRENT_DATE - INTERVAL '1 day')::date
    ),
    avg7 AS (
      SELECT user_id, AVG(total_cost_usd) AS avg_cost
      FROM public.cost_daily_aggregates
      WHERE day BETWEEN (CURRENT_DATE - INTERVAL '8 days')::date
                    AND (CURRENT_DATE - INTERVAL '2 days')::date
      GROUP BY user_id
    )
    SELECT y.user_id, y.total_cost_usd, COALESCE(a.avg_cost, 0) AS avg_cost
    FROM yday y
    LEFT JOIN avg7 a USING (user_id)
    WHERE y.total_cost_usd > p_threshold_usd
       OR (a.avg_cost > 0.10 AND y.total_cost_usd > a.avg_cost * 3)
  LOOP
    -- Skip if an open alert already exists for this user today
    IF NOT EXISTS (
      SELECT 1 FROM public.security_alerts
      WHERE user_id = r.user_id
        AND alert_type = 'cost_anomaly'
        AND status = 'open'
        AND created_at > (CURRENT_DATE - INTERVAL '1 day')::timestamptz
    ) THEN
      INSERT INTO public.security_alerts (alert_type, severity, user_id, title, description, details_json)
      VALUES (
        'cost_anomaly',
        CASE WHEN r.total_cost_usd > p_threshold_usd * 4 THEN 'critical' ELSE 'warning' END,
        r.user_id,
        'Coût quotidien anormal détecté',
        format('Dépense de %s USD hier (moyenne 7j : %s USD).', round(r.total_cost_usd, 2), round(r.avg_cost, 2)),
        jsonb_build_object(
          'cost_yesterday_usd', r.total_cost_usd,
          'avg_7d_usd', r.avg_cost,
          'threshold_usd', p_threshold_usd,
          'detected_at', now()
        )
      );
      v_alerts_created := v_alerts_created + 1;
    END IF;
  END LOOP;

  RETURN v_alerts_created;
END;
$$;

REVOKE ALL ON FUNCTION public.detect_cost_anomalies(NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.detect_cost_anomalies(NUMERIC) TO authenticated, service_role;

-- ── RPC: get_observability_summary (admin only) ────────────
CREATE OR REPLACE FUNCTION public.get_observability_summary()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'providers_open', (
      SELECT COUNT(*) FROM public.provider_health WHERE state = 'open'
    ),
    'providers_total', (
      SELECT COUNT(*) FROM public.provider_health
    ),
    'alerts_open', (
      SELECT COUNT(*) FROM public.security_alerts WHERE status = 'open'
    ),
    'alerts_critical_open', (
      SELECT COUNT(*) FROM public.security_alerts WHERE status = 'open' AND severity = 'critical'
    ),
    'cost_24h_usd', COALESCE((
      SELECT SUM(COALESCE(actual_cost_usd, estimated_cost_usd, 0))
      FROM public.cost_events
      WHERE created_at > now() - INTERVAL '24 hours'
    ), 0),
    'cost_events_24h', COALESCE((
      SELECT COUNT(*) FROM public.cost_events
      WHERE created_at > now() - INTERVAL '24 hours'
    ), 0),
    'rate_limit_hits_24h', COALESCE((
      SELECT COUNT(*) FROM public.security_audit_events
      WHERE event_type = 'rate_limit_hit'
        AND created_at > now() - INTERVAL '24 hours'
    ), 0),
    'top_consumers_24h', COALESCE((
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT user_id::text,
               SUM(COALESCE(actual_cost_usd, estimated_cost_usd, 0))::numeric AS cost_usd,
               COUNT(*)::int AS events
        FROM public.cost_events
        WHERE created_at > now() - INTERVAL '24 hours'
          AND user_id IS NOT NULL
        GROUP BY user_id
        ORDER BY cost_usd DESC
        LIMIT 10
      ) t
    ), '[]'::jsonb),
    'generated_at', now()
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_observability_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_observability_summary() TO authenticated;

-- ── Schedule cron jobs (idempotent) ────────────────────────
DO $$
BEGIN
  -- Remove any previously scheduled versions
  PERFORM cron.unschedule(jobname) FROM cron.job WHERE jobname IN (
    'governance-cleanup-rate-limits',
    'governance-aggregate-daily-costs',
    'governance-detect-anomalies'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'governance-cleanup-rate-limits',
  '15 3 * * *',  -- daily at 03:15 UTC
  $$ SELECT public.cleanup_old_rate_limits(); $$
);

SELECT cron.schedule(
  'governance-aggregate-daily-costs',
  '30 3 * * *',  -- daily at 03:30 UTC
  $$ SELECT public.aggregate_daily_costs((CURRENT_DATE - INTERVAL '1 day')::date); $$
);

SELECT cron.schedule(
  'governance-detect-anomalies',
  '45 3 * * *',  -- daily at 03:45 UTC
  $$ SELECT public.detect_cost_anomalies(5.0); $$
);