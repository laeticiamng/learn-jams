
-- 1. Remove user INSERT on security_audit_events (service_role only)
DROP POLICY IF EXISTS "audit_events_insert_own" ON public.security_audit_events;

-- 2. Fix storage INSERT policies: restrict to authenticated only
DROP POLICY IF EXISTS "Users can upload their own courses" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to source-raw" ON storage.objects;

CREATE POLICY "Authenticated users can upload courses"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'course-uploads' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users can upload source-raw"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'source-raw' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 3. Margin reports: admin can read all (including null user_id rows)
CREATE POLICY "margin_reports_admin_read" ON public.margin_reports
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
