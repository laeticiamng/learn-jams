
-- 1. Create a secure function to read guardians WITHOUT invite_token
-- Instead of modifying the SELECT policy (which can't exclude columns),
-- we'll ensure invite_token is always NULL for non-service reads
-- by using a trigger that nullifies it on the guardians_safe view.
-- Actually, the guardians_safe view already excludes invite_token.
-- The base table guardians_read_own policy does expose invite_token.
-- We need to update the guardians_read_own to only allow reading 
-- through the safe view. But RLS can't restrict columns.
-- The proper fix: nullify invite_token in the trigger when invite_used_at is set
-- (already done), and for pending invites, the token is needed only by the system.
-- Let's just ensure the view is used everywhere and document this.

-- Better approach: Replace the direct SELECT policy with one that 
-- only allows reading if invite_token is already null (used/expired)
-- For active invites, only service_role should read them.

-- Actually simplest: just DROP guardians_read_own and recreate it
-- to force all user reads through guardians_safe view which excludes invite_token.
-- But that breaks the view since security_invoker needs the policy.
-- 
-- Real fix: The nullify trigger already clears used tokens.
-- For unused tokens, we should add a column-level security approach.
-- Since Postgres doesn't have column-level RLS, the best approach is:
-- revoke SELECT on guardians.invite_token from authenticated role.

REVOKE ALL ON public.guardians FROM authenticated;
GRANT SELECT (id, email, display_name, created_at, invite_expires_at, invite_used_at) ON public.guardians TO authenticated;
GRANT UPDATE (display_name, invite_used_at) ON public.guardians TO authenticated;
