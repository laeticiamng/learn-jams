
-- Drop triggers first (they reference the column)
DROP TRIGGER IF EXISTS trg_security_audit_hash_ip ON public.security_audit_events;
DROP TRIGGER IF EXISTS trg_consent_events_hash_ip ON public.consent_events;
DROP FUNCTION IF EXISTS public.security_audit_hash_ip();
DROP FUNCTION IF EXISTS public.consent_events_hash_ip();

-- Drop the raw IP columns entirely (only ip_hash remains)
ALTER TABLE public.security_audit_events DROP COLUMN IF EXISTS ip_address;
ALTER TABLE public.consent_events DROP COLUMN IF EXISTS ip_address;
