-- 1) user_credit_balances : retirer INSERT/UPDATE côté utilisateur
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT polname FROM pg_policy WHERE polrelid = 'public.user_credit_balances'::regclass
           AND polcmd IN ('a','w') -- INSERT, UPDATE
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_credit_balances', p.polname);
  END LOOP;
END $$;

-- 2) adaptive_credit_balances : retirer INSERT/UPDATE côté utilisateur
DROP POLICY IF EXISTS "acb_insert" ON public.adaptive_credit_balances;
DROP POLICY IF EXISTS "acb_update" ON public.adaptive_credit_balances;

-- 3) usage_quotas_v2 : retirer INSERT/UPDATE côté utilisateur
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT polname FROM pg_policy WHERE polrelid = 'public.usage_quotas_v2'::regclass
           AND polcmd IN ('a','w')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.usage_quotas_v2', p.polname);
  END LOOP;
END $$;

-- 4) guardians : remplacer la policy trop laxiste par une scoped via user_guardians
DROP POLICY IF EXISTS "guardians_self_update_by_email" ON public.guardians;
DROP POLICY IF EXISTS "guardians_update_own" ON public.guardians;

-- Empêche modification des champs sensibles via trigger
CREATE OR REPLACE FUNCTION public.guardians_protect_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email
     OR NEW.invite_token IS DISTINCT FROM OLD.invite_token
     OR NEW.invite_expires_at IS DISTINCT FROM OLD.invite_expires_at
     OR NEW.invite_used_at IS DISTINCT FROM OLD.invite_used_at THEN
    RAISE EXCEPTION 'Modification des champs invitation/email réservée au service role';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS guardians_protect_sensitive_trg ON public.guardians;
CREATE TRIGGER guardians_protect_sensitive_trg
BEFORE UPDATE ON public.guardians
FOR EACH ROW
WHEN (current_setting('role') <> 'service_role')
EXECUTE FUNCTION public.guardians_protect_sensitive_fields();

CREATE POLICY "guardians_update_linked_only"
ON public.guardians
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_guardians ug
    WHERE ug.guardian_id = guardians.id
      AND ug.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_guardians ug
    WHERE ug.guardian_id = guardians.id
      AND ug.user_id = auth.uid()
  )
);