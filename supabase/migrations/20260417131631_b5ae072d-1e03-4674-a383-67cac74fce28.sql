
-- Universal feature quota consumer
CREATE OR REPLACE FUNCTION public.consume_feature_quota(
  p_user_id UUID,
  p_feature_key TEXT,
  p_limit INTEGER,
  p_period_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row usage_quotas_v2%ROWTYPE;
  v_current_count INTEGER;
  v_counters JSONB;
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
BEGIN
  -- Get or create row
  INSERT INTO public.usage_quotas_v2 (user_id, billing_period_start, billing_period_end, counters_json)
  VALUES (p_user_id, now(), now() + (p_period_days || ' days')::interval, '{}'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_row FROM public.usage_quotas_v2 WHERE user_id = p_user_id;

  -- Reset counters if period expired
  IF v_row.billing_period_end IS NULL OR v_row.billing_period_end < now() THEN
    v_period_start := now();
    v_period_end := now() + (p_period_days || ' days')::interval;
    UPDATE public.usage_quotas_v2
    SET billing_period_start = v_period_start,
        billing_period_end = v_period_end,
        counters_json = '{}'::jsonb,
        updated_at = now()
    WHERE user_id = p_user_id
    RETURNING * INTO v_row;
  END IF;

  v_counters := COALESCE(v_row.counters_json, '{}'::jsonb);
  v_current_count := COALESCE((v_counters->>p_feature_key)::int, 0);

  IF v_current_count >= p_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'used', v_current_count,
      'limit', p_limit,
      'remaining', 0,
      'period_end', v_row.billing_period_end,
      'reason', 'quota_exceeded'
    );
  END IF;

  -- Atomic increment
  UPDATE public.usage_quotas_v2
  SET counters_json = jsonb_set(
        COALESCE(counters_json, '{}'::jsonb),
        ARRAY[p_feature_key],
        to_jsonb(COALESCE((counters_json->>p_feature_key)::int, 0) + 1)
      ),
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING (counters_json->>p_feature_key)::int INTO v_current_count;

  RETURN jsonb_build_object(
    'allowed', true,
    'used', v_current_count,
    'limit', p_limit,
    'remaining', p_limit - v_current_count,
    'period_end', v_row.billing_period_end
  );
END;
$$;

-- Read-only quota lookup (no increment)
CREATE OR REPLACE FUNCTION public.get_feature_quota_usage(
  p_user_id UUID,
  p_feature_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row usage_quotas_v2%ROWTYPE;
  v_count INTEGER;
BEGIN
  SELECT * INTO v_row FROM public.usage_quotas_v2 WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('used', 0, 'period_end', NULL);
  END IF;
  v_count := COALESCE((v_row.counters_json->>p_feature_key)::int, 0);
  RETURN jsonb_build_object(
    'used', v_count,
    'period_start', v_row.billing_period_start,
    'period_end', v_row.billing_period_end
  );
END;
$$;
