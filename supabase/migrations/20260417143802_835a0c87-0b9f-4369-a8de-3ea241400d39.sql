-- ============================================================
-- Corrections sécurité finales (v2)
-- ============================================================

-- 1) guardians : supprimer ancienne vue et la recréer
DROP VIEW IF EXISTS public.guardians_safe CASCADE;

DROP POLICY IF EXISTS "guardians_read_own" ON public.guardians;

CREATE POLICY "guardians_admin_read"
ON public.guardians
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE VIEW public.guardians_safe
WITH (security_invoker = true) AS
SELECT 
  g.id,
  g.email,
  g.display_name,
  g.created_at,
  g.invite_used_at
FROM public.guardians g
WHERE EXISTS (
  SELECT 1 FROM public.user_guardians ug
  WHERE ug.guardian_id = g.id AND ug.user_id = auth.uid()
);

GRANT SELECT ON public.guardians_safe TO authenticated;

CREATE POLICY "guardians_self_update_by_email"
ON public.guardians
FOR UPDATE
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 2) Realtime user-notifications : scoper au topic per-user
DROP POLICY IF EXISTS "realtime_topic_scoped_select" ON realtime.messages;

CREATE POLICY "realtime_topic_scoped_select"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() = 'user-notifications-' || auth.uid()::text)
  OR (
    realtime.topic() LIKE 'player-song-%'
    AND EXISTS (
      SELECT 1 FROM public.songs s
      WHERE s.id::text = substring(realtime.topic() FROM 13)
        AND s.user_id = auth.uid()
    )
  )
  OR (
    realtime.topic() LIKE 'session-%'
    AND EXISTS (
      SELECT 1 FROM public.collaborative_sessions cs
      WHERE cs.id::text = substring(realtime.topic() FROM 9)
        AND (
          cs.creator_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.session_participants sp
            WHERE sp.session_id = cs.id AND sp.user_id = auth.uid()
          )
        )
    )
  )
);

-- 3) idempotency_keys : INSERT/UPDATE owner-scoped
CREATE POLICY "idem_owner_insert"
ON public.idempotency_keys
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "idem_owner_update"
ON public.idempotency_keys
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 4) user_guardians : permettre au guardian de voir ses liens
CREATE POLICY "ug_guardian_read"
ON public.user_guardians
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.guardians g
    WHERE g.id = user_guardians.guardian_id
      AND g.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- 5) Cron: purge quotidienne
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
  existing_jobid bigint;
BEGIN
  SELECT jobid INTO existing_jobid FROM cron.job WHERE jobname = 'purge-deleted-accounts-daily';
  IF existing_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(existing_jobid);
  END IF;
END $$;

SELECT cron.schedule(
  'purge-deleted-accounts-daily',
  '15 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pywdwanqlynoatyesegb.supabase.co/functions/v1/purge-deleted-accounts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.purge_cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);