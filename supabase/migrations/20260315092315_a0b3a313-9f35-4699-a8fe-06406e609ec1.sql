
-- Add missing columns to recall_tests
ALTER TABLE public.recall_tests ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.recall_tests ADD COLUMN IF NOT EXISTS transformation_id uuid REFERENCES public.transformations(id) ON DELETE SET NULL;
ALTER TABLE public.recall_tests ADD COLUMN IF NOT EXISTS generated_from_version integer DEFAULT 1;

-- Add missing columns to generated_contents
ALTER TABLE public.generated_contents ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;

-- Add missing columns to final_tests
ALTER TABLE public.final_tests ADD COLUMN IF NOT EXISTS questions_json jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.final_tests ADD COLUMN IF NOT EXISTS bloom_levels_count integer DEFAULT 0;
ALTER TABLE public.final_tests ADD COLUMN IF NOT EXISTS question_count integer DEFAULT 0;

-- Add expires_at to user_credit_balances
ALTER TABLE public.user_credit_balances ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- learner_progress_snapshots
CREATE TABLE IF NOT EXISTS public.learner_progress_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  snapshot_type text DEFAULT 'daily',
  metrics_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.learner_progress_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lps_owner" ON public.learner_progress_snapshots FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "lps_insert" ON public.learner_progress_snapshots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- review_queue
CREATE TABLE IF NOT EXISTS public.review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  concept_stable_key text NOT NULL,
  review_type text DEFAULT 'spaced',
  priority integer DEFAULT 5,
  due_at timestamptz,
  completed_at timestamptz,
  status text DEFAULT 'pending',
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.review_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rq_owner" ON public.review_queue FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "rq_insert" ON public.review_queue FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rq_update" ON public.review_queue FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "rq_delete" ON public.review_queue FOR DELETE TO authenticated USING (auth.uid() = user_id);
