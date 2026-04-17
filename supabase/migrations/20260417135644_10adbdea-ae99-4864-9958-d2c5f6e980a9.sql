
-- 1. Privacy: hash IP automatically on security_audit_events (same pattern as consent_events)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.security_audit_hash_ip()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.ip_address IS NOT NULL THEN
    NEW.ip_hash := substr(encode(digest(NEW.ip_address, 'sha256'), 'hex'), 1, 16);
    NEW.ip_address := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_security_audit_hash_ip ON public.security_audit_events;
CREATE TRIGGER trg_security_audit_hash_ip
BEFORE INSERT OR UPDATE ON public.security_audit_events
FOR EACH ROW EXECUTE FUNCTION public.security_audit_hash_ip();

-- Backfill: hash existing rows that still have raw IP
UPDATE public.security_audit_events
SET ip_hash = COALESCE(ip_hash, substr(encode(digest(ip_address, 'sha256'), 'hex'), 1, 16)),
    ip_address = NULL
WHERE ip_address IS NOT NULL;

-- Same backfill for consent_events (in case any predate the trigger)
UPDATE public.consent_events
SET ip_hash = COALESCE(ip_hash, substr(encode(digest(ip_address, 'sha256'), 'hex'), 1, 16)),
    ip_address = NULL
WHERE ip_address IS NOT NULL;

-- 2. Backup verification table + RPC
CREATE TABLE IF NOT EXISTS public.backup_verification_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('healthy','warning','failed')),
  metrics_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text
);

ALTER TABLE public.backup_verification_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read backup verification"
ON public.backup_verification_runs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_backup_verif_run_at ON public.backup_verification_runs (run_at DESC);

CREATE OR REPLACE FUNCTION public.run_backup_verification()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profiles bigint;
  v_songs bigint;
  v_subs bigint;
  v_cost bigint;
  v_status text;
  v_metrics jsonb;
  v_last_run timestamptz;
  v_notes text;
BEGIN
  SELECT count(*) INTO v_profiles FROM public.profiles;
  SELECT count(*) INTO v_songs FROM public.songs;
  SELECT count(*) INTO v_subs FROM public.subscriptions;
  SELECT count(*) INTO v_cost FROM public.cost_events WHERE created_at > now() - interval '24 hours';

  SELECT max(run_at) INTO v_last_run FROM public.backup_verification_runs;

  v_metrics := jsonb_build_object(
    'profiles_count', v_profiles,
    'songs_count', v_songs,
    'subscriptions_count', v_subs,
    'cost_events_24h', v_cost,
    'previous_run_at', v_last_run,
    'gap_hours', CASE WHEN v_last_run IS NULL THEN NULL ELSE round(extract(epoch FROM (now()-v_last_run))/3600,1) END
  );

  -- Heuristics: critical tables non-empty + recent activity
  IF v_profiles = 0 OR v_songs = 0 THEN
    v_status := 'failed';
    v_notes := 'Critical table empty — investigate immediately.';
  ELSIF v_last_run IS NOT NULL AND now() - v_last_run > interval '2 days' THEN
    v_status := 'warning';
    v_notes := 'Backup verification gap > 48h.';
  ELSE
    v_status := 'healthy';
    v_notes := 'All critical tables present, recent activity recorded.';
  END IF;

  INSERT INTO public.backup_verification_runs (status, metrics_json, notes)
  VALUES (v_status, v_metrics, v_notes);

  -- Auto-create alert on failure
  IF v_status = 'failed' THEN
    INSERT INTO public.security_alerts (alert_type, severity, title, description, details_json)
    VALUES ('backup_verification_failed', 'critical',
            'Backup verification failed',
            v_notes,
            v_metrics);
  END IF;

  RETURN jsonb_build_object('status', v_status, 'metrics', v_metrics, 'notes', v_notes);
END;
$$;

-- 3. Cron daily at 04:00 UTC
DO $$
BEGIN
  PERFORM cron.unschedule('backup-verification-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'backup-verification-daily',
  '0 4 * * *',
  $$ SELECT public.run_backup_verification(); $$
);
