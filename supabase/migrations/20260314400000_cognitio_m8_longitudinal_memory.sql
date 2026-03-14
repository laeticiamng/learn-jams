-- ============================================================
-- COGNITIO M8: Longitudinal Memory — Extended tables
-- ============================================================

-- 1. Extend learner_profiles with new columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'learner_profiles' AND column_name = 'dominant_learning_pattern') THEN
    ALTER TABLE public.learner_profiles ADD COLUMN dominant_learning_pattern TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'learner_profiles' AND column_name = 'best_format') THEN
    ALTER TABLE public.learner_profiles ADD COLUMN best_format TEXT DEFAULT 'unknown';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'learner_profiles' AND column_name = 'guidance_need') THEN
    ALTER TABLE public.learner_profiles ADD COLUMN guidance_need TEXT DEFAULT 'unknown';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'learner_profiles' AND column_name = 'confidence_calibration_quality') THEN
    ALTER TABLE public.learner_profiles ADD COLUMN confidence_calibration_quality TEXT DEFAULT 'unknown';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'learner_profiles' AND column_name = 'revision_consistency_score') THEN
    ALTER TABLE public.learner_profiles ADD COLUMN revision_consistency_score NUMERIC;
  END IF;
END $$;

-- 2. Extend learner_knowledge_graph with new columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'learner_knowledge_graph' AND column_name = 'last_correct_at') THEN
    ALTER TABLE public.learner_knowledge_graph ADD COLUMN last_correct_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'learner_knowledge_graph' AND column_name = 'last_incorrect_at') THEN
    ALTER TABLE public.learner_knowledge_graph ADD COLUMN last_incorrect_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'learner_knowledge_graph' AND column_name = 'correct_count') THEN
    ALTER TABLE public.learner_knowledge_graph ADD COLUMN correct_count INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'learner_knowledge_graph' AND column_name = 'incorrect_count') THEN
    ALTER TABLE public.learner_knowledge_graph ADD COLUMN incorrect_count INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'learner_knowledge_graph' AND column_name = 'confidence_mean') THEN
    ALTER TABLE public.learner_knowledge_graph ADD COLUMN confidence_mean NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'learner_knowledge_graph' AND column_name = 'calibration_gap_mean') THEN
    ALTER TABLE public.learner_knowledge_graph ADD COLUMN calibration_gap_mean NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'learner_knowledge_graph' AND column_name = 'format_efficacy_json') THEN
    ALTER TABLE public.learner_knowledge_graph ADD COLUMN format_efficacy_json JSONB NOT NULL DEFAULT '{"fiche_dynamique":null,"histoire_animee":null,"music":null}'::jsonb;
  END IF;
END $$;

-- 3. learner_confusion_edges
CREATE TABLE IF NOT EXISTS public.learner_confusion_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_a_key TEXT NOT NULL,
  concept_b_key TEXT NOT NULL,
  hits_count INTEGER NOT NULL DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  severity_score NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_confusion_edges_unique
  ON public.learner_confusion_edges(user_id, concept_a_key, concept_b_key);

-- 4. learner_format_effectiveness
CREATE TABLE IF NOT EXISTS public.learner_format_effectiveness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  format TEXT NOT NULL,
  objective TEXT NOT NULL,
  audience_level TEXT,
  attempts_count INTEGER NOT NULL DEFAULT 0,
  avg_raw_score NUMERIC,
  avg_composite_score NUMERIC,
  avg_calibration_gap NUMERIC,
  retention_signal NUMERIC,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_format_effectiveness_unique
  ON public.learner_format_effectiveness(user_id, format, objective, COALESCE(audience_level, ''));

-- 5. review_queue
CREATE TABLE IF NOT EXISTS public.review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_stable_key TEXT NOT NULL,
  priority_score NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  recommended_format TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_queue_user_due ON public.review_queue(user_id, due_at)
  WHERE status = 'pending';

-- 6. learner_progress_snapshots
CREATE TABLE IF NOT EXISTS public.learner_progress_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  concepts_known INTEGER NOT NULL DEFAULT 0,
  concepts_fragile INTEGER NOT NULL DEFAULT 0,
  concepts_aging INTEGER NOT NULL DEFAULT 0,
  avg_mastery_score NUMERIC,
  avg_calibration_gap NUMERIC,
  weekly_activity_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_snapshots_user_date
  ON public.learner_progress_snapshots(user_id, snapshot_date);

-- 7. RLS
ALTER TABLE public.learner_confusion_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_format_effectiveness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_progress_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own confusion_edges" ON public.learner_confusion_edges
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own format_effectiveness" ON public.learner_format_effectiveness
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own review_queue" ON public.review_queue
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own progress_snapshots" ON public.learner_progress_snapshots
  FOR ALL USING (auth.uid() = user_id);
