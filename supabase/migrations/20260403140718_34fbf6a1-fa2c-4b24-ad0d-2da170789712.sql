
-- 1. Admin can read all security audit events
CREATE POLICY "audit_events_admin_select" ON public.security_audit_events
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Admin can read all consent events for compliance
CREATE POLICY "consent_events_admin_select" ON public.consent_events
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Recreate guardians_safe view WITHOUT invite_token
DROP VIEW IF EXISTS public.guardians_safe;
CREATE VIEW public.guardians_safe WITH (security_invoker = true) AS
  SELECT id, email, display_name, created_at, invite_expires_at, invite_used_at
  FROM public.guardians;

COMMENT ON VIEW public.guardians_safe IS 'Secure view over guardians — excludes invite_token. Access controlled by RLS on underlying guardians table via security_invoker=true.';
