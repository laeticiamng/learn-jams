-- Drop existing restrictive policies
DROP POLICY IF EXISTS "product_events_insert_auth" ON public.product_events;
DROP POLICY IF EXISTS "product_events_owner_select" ON public.product_events;

-- Allow authenticated users to insert (their own user_id or null for anon tracking)
CREATE POLICY "product_events_insert_auth"
ON public.product_events FOR INSERT TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Allow anon role to insert (user_id must be null)
CREATE POLICY "product_events_insert_anon"
ON public.product_events FOR INSERT TO anon
WITH CHECK (user_id IS NULL);

-- Authenticated users can read their own events
CREATE POLICY "product_events_select_own"
ON public.product_events FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Admins can read all events
CREATE POLICY "product_events_select_admin"
ON public.product_events FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));