
-- Add missing columns to generated_contents for transformation-level data
ALTER TABLE public.generated_contents ADD COLUMN IF NOT EXISTS content_json jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.generated_contents ADD COLUMN IF NOT EXISTS source_disclaimer_json jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.generated_contents ADD COLUMN IF NOT EXISTS coverage_json jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.generated_contents ADD COLUMN IF NOT EXISTS generation_flags_json jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.generated_contents ADD COLUMN IF NOT EXISTS internal_summary_json jsonb DEFAULT '{}'::jsonb;

-- qa_reports
CREATE TABLE IF NOT EXISTS public.qa_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transformation_id uuid REFERENCES public.transformations(id) ON DELETE CASCADE,
  qa_score numeric DEFAULT 0,
  checklist_json jsonb DEFAULT '[]'::jsonb,
  violations_json jsonb DEFAULT '[]'::jsonb,
  recommendations_json jsonb DEFAULT '[]'::jsonb,
  publish_blocked boolean DEFAULT false,
  block_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.qa_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa_reports_via_t" ON public.qa_reports FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.transformations t WHERE t.id = transformation_id AND t.user_id = auth.uid()));
CREATE POLICY "qa_reports_insert" ON public.qa_reports FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.transformations t WHERE t.id = transformation_id AND t.user_id = auth.uid()));

-- publish_decisions
CREATE TABLE IF NOT EXISTS public.publish_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transformation_id uuid REFERENCES public.transformations(id) ON DELETE CASCADE,
  decision_status text DEFAULT 'pending',
  qa_report_id uuid REFERENCES public.qa_reports(id) ON DELETE SET NULL,
  reason text DEFAULT '',
  decided_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.publish_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pd_via_t" ON public.publish_decisions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.transformations t WHERE t.id = transformation_id AND t.user_id = auth.uid()));
CREATE POLICY "pd_insert" ON public.publish_decisions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.transformations t WHERE t.id = transformation_id AND t.user_id = auth.uid()));

-- consent_events
CREATE TABLE IF NOT EXISTS public.consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  consent_type text NOT NULL,
  granted boolean DEFAULT false,
  ip_address text,
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.consent_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ce_owner" ON public.consent_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ce_insert" ON public.consent_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- user_minor_profiles
CREATE TABLE IF NOT EXISTS public.user_minor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  is_minor boolean DEFAULT false,
  birth_year integer,
  guardian_verified boolean DEFAULT false,
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_minor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ump_owner" ON public.user_minor_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ump_insert" ON public.user_minor_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ump_update" ON public.user_minor_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
