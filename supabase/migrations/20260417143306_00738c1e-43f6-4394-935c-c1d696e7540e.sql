-- 1) Soft-delete table
CREATE TABLE IF NOT EXISTS public.account_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  requested_at timestamptz NOT NULL DEFAULT now(),
  scheduled_purge_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','cancelled','purged')),
  cancelled_at timestamptz,
  purged_at timestamptz,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own deletion request"
  ON public.account_deletions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own deletion request"
  ON public.account_deletions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users cancel own deletion request"
  ON public.account_deletions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all deletion requests"
  ON public.account_deletions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_account_deletions_updated_at
  BEFORE UPDATE ON public.account_deletions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_account_deletions_purge
  ON public.account_deletions(scheduled_purge_at) WHERE status = 'pending';

-- 2) Restrict provider_health to admins only
DROP POLICY IF EXISTS "Authenticated can view provider health" ON public.provider_health;

CREATE POLICY "Admins view provider health"
  ON public.provider_health FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Fix mutable search_path on touch_incidents_updated_at
CREATE OR REPLACE FUNCTION public.touch_incidents_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'resolved' AND OLD.status <> 'resolved' THEN
    NEW.resolved_at = now();
  END IF;
  RETURN NEW;
END;
$function$;

-- 4) Enable extensions for scheduled purge
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;