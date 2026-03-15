
-- Add missing columns to transformations
ALTER TABLE public.transformations ADD COLUMN IF NOT EXISTS course_profile_id uuid REFERENCES public.course_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.transformations ADD COLUMN IF NOT EXISTS memory_architecture_id uuid REFERENCES public.memory_architectures(id) ON DELETE SET NULL;
ALTER TABLE public.transformations ADD COLUMN IF NOT EXISTS format_decision_id uuid REFERENCES public.format_decisions(id) ON DELETE SET NULL;
ALTER TABLE public.transformations ADD COLUMN IF NOT EXISTS estimated_duration_sec integer DEFAULT 0;
ALTER TABLE public.transformations ADD COLUMN IF NOT EXISTS generation_flags_json jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.transformations ADD COLUMN IF NOT EXISTS coverage_json jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.transformations ADD COLUMN IF NOT EXISTS internal_summary_json jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.transformations ADD COLUMN IF NOT EXISTS content_json jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.transformations ADD COLUMN IF NOT EXISTS source_disclaimer_json jsonb DEFAULT '{}'::jsonb;

-- Rename column in user_usage_profiles if needed
ALTER TABLE public.user_usage_profiles RENAME COLUMN rolling_30d_json TO rolling_30d_usage_json;

-- generated_contents
CREATE TABLE IF NOT EXISTS public.generated_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transformation_id uuid REFERENCES public.transformations(id) ON DELETE CASCADE,
  block_type text NOT NULL DEFAULT '',
  block_id text DEFAULT '',
  title text DEFAULT '',
  content text DEFAULT '',
  position integer DEFAULT 0,
  concepts_covered_json jsonb DEFAULT '[]'::jsonb,
  visual_anchor_json jsonb,
  contrast_box_json jsonb,
  mnemonic_json jsonb,
  recall_event_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.generated_contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gc_via_transformation" ON public.generated_contents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.transformations t WHERE t.id = transformation_id AND t.user_id = auth.uid()));
CREATE POLICY "gc_insert" ON public.generated_contents FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.transformations t WHERE t.id = transformation_id AND t.user_id = auth.uid()));

-- final_tests
CREATE TABLE IF NOT EXISTS public.final_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transformation_id uuid REFERENCES public.transformations(id) ON DELETE CASCADE,
  test_item_id text DEFAULT '',
  item_type text DEFAULT 'qcm',
  prompt text DEFAULT '',
  choices_json jsonb DEFAULT '[]'::jsonb,
  expected_answer_json jsonb DEFAULT '""'::jsonb,
  concepts_tested_json jsonb DEFAULT '[]'::jsonb,
  bloom_level integer DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.final_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ft_via_transformation" ON public.final_tests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.transformations t WHERE t.id = transformation_id AND t.user_id = auth.uid()));
CREATE POLICY "ft_insert" ON public.final_tests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.transformations t WHERE t.id = transformation_id AND t.user_id = auth.uid()));
