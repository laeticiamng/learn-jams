-- ============================================================
-- COGNITIO M6+M7: Recall Tests, Grading, Debrief, QA, Publish
-- ============================================================

-- 1. recall_tests — generated recall tests (final, j1, j7, inline)
CREATE TABLE IF NOT EXISTS public.recall_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transformation_id UUID NOT NULL REFERENCES public.transformations(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL CHECK (test_type IN ('inline', 'final', 'j1', 'j7')),
  questions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_from_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recall_tests_user ON public.recall_tests(user_id);
CREATE INDEX idx_recall_tests_transformation ON public.recall_tests(transformation_id);

-- 2. recall_attempts — graded attempts of a recall test
CREATE TABLE IF NOT EXISTS public.recall_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recall_test_id UUID NOT NULL REFERENCES public.recall_tests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  confidence_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  calibration_gap DOUBLE PRECISION NOT NULL DEFAULT 0,
  composite_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recall_attempts_test ON public.recall_attempts(recall_test_id);
CREATE INDEX idx_recall_attempts_user ON public.recall_attempts(user_id);

-- 3. debrief_reports — post-test debrief with recommendations
CREATE TABLE IF NOT EXISTS public.debrief_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transformation_id UUID NOT NULL REFERENCES public.transformations(id) ON DELETE CASCADE,
  recall_attempt_id UUID NOT NULL REFERENCES public.recall_attempts(id) ON DELETE CASCADE,
  report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_debrief_reports_user ON public.debrief_reports(user_id);
CREATE INDEX idx_debrief_reports_transformation ON public.debrief_reports(transformation_id);

-- 4. qa_reports — M7 quality assurance reports
CREATE TABLE IF NOT EXISTS public.qa_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transformation_id UUID NOT NULL REFERENCES public.transformations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('pass', 'warn', 'block')) DEFAULT 'block',
  report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qa_reports_transformation ON public.qa_reports(transformation_id);

-- 5. publish_decisions — publication decision log
CREATE TABLE IF NOT EXISTS public.publish_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transformation_id UUID NOT NULL REFERENCES public.transformations(id) ON DELETE CASCADE,
  qa_report_id UUID NOT NULL REFERENCES public.qa_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('draft', 'review_needed', 'published', 'blocked')) DEFAULT 'draft',
  reason TEXT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_publish_decisions_transformation ON public.publish_decisions(transformation_id);

-- 6. Add qa_status column to transformations if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transformations' AND column_name = 'qa_status'
  ) THEN
    ALTER TABLE public.transformations ADD COLUMN qa_status TEXT CHECK (qa_status IN ('pass', 'warn', 'block'));
  END IF;
END $$;

-- 7. RLS policies
ALTER TABLE public.recall_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recall_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debrief_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publish_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own recall_tests" ON public.recall_tests
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own recall_attempts" ON public.recall_attempts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own debrief_reports" ON public.debrief_reports
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own qa_reports" ON public.qa_reports
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own publish_decisions" ON public.publish_decisions
  FOR ALL USING (auth.uid() = user_id);
