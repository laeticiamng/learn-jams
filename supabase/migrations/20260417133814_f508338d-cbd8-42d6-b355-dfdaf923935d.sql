
-- ============================================================
-- 1. USER COST CAPS (financial blast-radius limit)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_cost_caps (
  user_id UUID PRIMARY KEY,
  monthly_cap_usd NUMERIC NOT NULL DEFAULT 5.00,
  alert_threshold_pct INTEGER NOT NULL DEFAULT 80,
  alerted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_cost_caps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_cap"
  ON public.user_cost_caps FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins_manage_caps"
  ON public.user_cost_caps FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER user_cost_caps_updated_at
  BEFORE UPDATE ON public.user_cost_caps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: check user cost cap for current month
CREATE OR REPLACE FUNCTION public.check_user_cost_cap(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cap NUMERIC;
  v_threshold_pct INTEGER;
  v_used NUMERIC;
  v_month_start TIMESTAMPTZ;
BEGIN
  v_month_start := date_trunc('month', now());

  SELECT monthly_cap_usd, alert_threshold_pct
    INTO v_cap, v_threshold_pct
    FROM public.user_cost_caps
    WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_cost_caps (user_id, monthly_cap_usd)
      VALUES (p_user_id, 5.00)
      ON CONFLICT DO NOTHING;
    v_cap := 5.00;
    v_threshold_pct := 80;
  END IF;

  SELECT COALESCE(SUM(COALESCE(actual_cost_usd, estimated_cost_usd, 0)), 0)
    INTO v_used
    FROM public.cost_events
    WHERE user_id = p_user_id
      AND created_at >= v_month_start;

  RETURN jsonb_build_object(
    'allowed', v_used < v_cap,
    'used_usd', v_used,
    'cap_usd', v_cap,
    'remaining_usd', GREATEST(v_cap - v_used, 0),
    'percent_used', CASE WHEN v_cap > 0 THEN round((v_used / v_cap) * 100, 1) ELSE 0 END,
    'threshold_pct', v_threshold_pct,
    'period_start', v_month_start
  );
END;
$$;

-- ============================================================
-- 2. FEATURE FLAGS (already exists — extend with rollout + RPC)
-- ============================================================
ALTER TABLE public.feature_flags
  ADD COLUMN IF NOT EXISTS rollout_percent INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS message TEXT;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_flags_read_all" ON public.feature_flags;
DROP POLICY IF EXISTS "feature_flags_admin_manage" ON public.feature_flags;

CREATE POLICY "feature_flags_read_all"
  ON public.feature_flags FOR SELECT
  USING (true);

CREATE POLICY "feature_flags_admin_manage"
  ON public.feature_flags FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.is_feature_enabled(p_key TEXT, p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled BOOLEAN;
  v_rollout INTEGER;
  v_hash INTEGER;
BEGIN
  SELECT enabled, COALESCE(rollout_percent, 100)
    INTO v_enabled, v_rollout
    FROM public.feature_flags
    WHERE flag_key = p_key;

  IF NOT FOUND THEN RETURN true; END IF;
  IF NOT v_enabled THEN RETURN false; END IF;
  IF v_rollout >= 100 THEN RETURN true; END IF;
  IF p_user_id IS NULL THEN RETURN false; END IF;

  v_hash := abs(hashtext(p_user_id::text || ':' || p_key)) % 100;
  RETURN v_hash < v_rollout;
END;
$$;

-- ============================================================
-- 3. USER AUDIT VIEW (RGPD transparency)
-- ============================================================
CREATE OR REPLACE VIEW public.user_audit_view
WITH (security_invoker = true)
AS
SELECT
  id,
  event_type,
  severity,
  created_at,
  CASE
    WHEN event_type LIKE '%cost%' THEN jsonb_build_object('feature', details_json->>'feature_key')
    WHEN event_type LIKE '%rate_limit%' THEN jsonb_build_object('bucket', details_json->>'bucket_key')
    ELSE '{}'::jsonb
  END AS public_details
FROM public.security_audit_events
WHERE user_id = auth.uid()
  AND created_at > now() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 200;

GRANT SELECT ON public.user_audit_view TO authenticated;

-- ============================================================
-- 4. OBSERVABILITY TTL CLEANUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_observability_tables()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost_deleted INTEGER;
  v_audit_deleted INTEGER;
  v_rate_deleted INTEGER;
BEGIN
  DELETE FROM public.cost_events WHERE created_at < now() - INTERVAL '90 days';
  GET DIAGNOSTICS v_cost_deleted = ROW_COUNT;

  DELETE FROM public.security_audit_events WHERE created_at < now() - INTERVAL '180 days';
  GET DIAGNOSTICS v_audit_deleted = ROW_COUNT;

  DELETE FROM public.rate_limit_buckets WHERE window_start < now() - INTERVAL '24 hours';
  GET DIAGNOSTICS v_rate_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'cost_events_deleted', v_cost_deleted,
    'audit_events_deleted', v_audit_deleted,
    'rate_buckets_deleted', v_rate_deleted,
    'ran_at', now()
  );
END;
$$;

-- ============================================================
-- 5. SEED initial feature flags
-- ============================================================
INSERT INTO public.feature_flags (flag_key, enabled, description, rollout_percent)
VALUES
  ('suno_generation', true, 'Génération musicale Suno', 100),
  ('image_generation', true, 'Génération d''images IA', 100),
  ('tts_generation', true, 'Synthèse vocale', 100),
  ('quiz_ai', true, 'Génération de quiz IA', 100),
  ('cognitio_pipeline', true, 'Pipeline complet d''analyse Cognitio', 100)
ON CONFLICT (flag_key) DO NOTHING;
