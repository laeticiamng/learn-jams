
-- 1) Add ip_hash column to consent_events
ALTER TABLE public.consent_events
  ADD COLUMN IF NOT EXISTS ip_hash text;

-- 2) Backfill: hash existing IPs (first 16 hex of SHA-256) then null out ip_address
UPDATE public.consent_events
SET ip_hash = substr(encode(digest(ip_address, 'sha256'), 'hex'), 1, 16),
    ip_address = NULL
WHERE ip_address IS NOT NULL;

-- 3) Trigger: auto-hash any new ip_address insert
CREATE OR REPLACE FUNCTION public.consent_events_hash_ip()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.ip_address IS NOT NULL THEN
    NEW.ip_hash := substr(encode(digest(NEW.ip_address, 'sha256'), 'hex'), 1, 16);
    NEW.ip_address := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_consent_events_hash_ip ON public.consent_events;
CREATE TRIGGER trg_consent_events_hash_ip
  BEFORE INSERT OR UPDATE ON public.consent_events
  FOR EACH ROW EXECUTE FUNCTION public.consent_events_hash_ip();

-- 4) Funnel RPC: signups → first song → first ready song → pro conversion (30d window)
CREATE OR REPLACE FUNCTION public.get_product_funnel_metrics(p_window_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signups int;
  v_onboarded int;
  v_first_song int;
  v_song_ready int;
  v_pro_users int;
  v_since timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_since := now() - (p_window_days || ' days')::interval;

  -- Signups (profiles created in window)
  SELECT count(*) INTO v_signups
  FROM public.profiles
  WHERE created_at >= v_since;

  -- Completed onboarding (has field_of_study set)
  SELECT count(*) INTO v_onboarded
  FROM public.profiles
  WHERE created_at >= v_since AND field_of_study IS NOT NULL AND field_of_study <> '';

  -- Created at least one song
  SELECT count(DISTINCT s.user_id) INTO v_first_song
  FROM public.songs s
  JOIN public.profiles p ON p.user_id = s.user_id
  WHERE p.created_at >= v_since;

  -- Got at least one ready song
  SELECT count(DISTINCT s.user_id) INTO v_song_ready
  FROM public.songs s
  JOIN public.profiles p ON p.user_id = s.user_id
  WHERE p.created_at >= v_since AND s.status = 'ready';

  -- Converted to Pro
  SELECT count(DISTINCT sub.user_id) INTO v_pro_users
  FROM public.subscriptions sub
  JOIN public.profiles p ON p.user_id = sub.user_id
  WHERE p.created_at >= v_since AND sub.subscribed = true;

  RETURN jsonb_build_object(
    'window_days', p_window_days,
    'since', v_since,
    'steps', jsonb_build_array(
      jsonb_build_object('key', 'signup', 'label', 'Inscriptions', 'count', v_signups, 'pct', 100),
      jsonb_build_object('key', 'onboarded', 'label', 'Onboarding complété', 'count', v_onboarded, 'pct', CASE WHEN v_signups > 0 THEN round((v_onboarded::numeric / v_signups) * 100, 1) ELSE 0 END),
      jsonb_build_object('key', 'first_song', 'label', '1ère chanson créée', 'count', v_first_song, 'pct', CASE WHEN v_signups > 0 THEN round((v_first_song::numeric / v_signups) * 100, 1) ELSE 0 END),
      jsonb_build_object('key', 'song_ready', 'label', '1ère chanson prête', 'count', v_song_ready, 'pct', CASE WHEN v_signups > 0 THEN round((v_song_ready::numeric / v_signups) * 100, 1) ELSE 0 END),
      jsonb_build_object('key', 'pro', 'label', 'Conversion Pro', 'count', v_pro_users, 'pct', CASE WHEN v_signups > 0 THEN round((v_pro_users::numeric / v_signups) * 100, 1) ELSE 0 END)
    ),
    'generated_at', now()
  );
END;
$$;
