
-- Fix: Restrict the "manage all" policy to service_role only
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON public.subscriptions;
CREATE POLICY "Service role can manage all subscriptions" ON public.subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
