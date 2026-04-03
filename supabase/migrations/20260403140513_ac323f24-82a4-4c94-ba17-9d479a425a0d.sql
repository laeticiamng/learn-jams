
-- ============================================================
-- GOVERNANCE OPTIMIZATION — Full security hardening
-- ============================================================

-- 1. CONSENT EVENTS — Block UPDATE and DELETE to preserve audit trail
-- (RLS is enabled, no UPDATE/DELETE policies exist = already blocked by default)
-- We add explicit DENY-style policies for clarity and defense-in-depth
-- Actually, since no policies exist for UPDATE/DELETE and RLS is enabled,
-- those ops are already blocked. The scanner flagged this as a concern but
-- the current state is correct. No action needed.

-- 2. SECURITY AUDIT EVENTS — Same situation: no UPDATE/DELETE policies = blocked
-- Already secure. No action needed.

-- 3. GUARDIANS — Add INSERT policy so only authenticated users can create
-- guardians linked to themselves via user_guardians
-- The guardians table has no INSERT policy, which means INSERT is blocked by RLS.
-- This is actually correct since guardian creation should be done via edge functions
-- with service_role. Let's keep it blocked for regular users.

-- 4. STORAGE — Add DELETE and UPDATE policies for both buckets
CREATE POLICY "Users can delete own course uploads"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'course-uploads' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own course uploads"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'course-uploads' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own source-raw files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'source-raw' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own source-raw files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'source-raw' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 5. CONTACT MESSAGES — Replace public INSERT with anon+authenticated only
DROP POLICY IF EXISTS "contact_insert" ON public.contact_messages;
CREATE POLICY "contact_insert_anon" ON public.contact_messages
FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "contact_insert_auth" ON public.contact_messages
FOR INSERT TO authenticated WITH CHECK (true);

-- 6. MARGIN REPORTS — Ensure no regular user can INSERT/UPDATE/DELETE
-- Currently no policies for these ops = already blocked by RLS. Correct.

-- 7. OPS_EVENTS — Add admin read policy so null user_id rows are visible to admins
CREATE POLICY "ops_events_admin_select" ON public.ops_events
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
