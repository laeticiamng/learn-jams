-- ============================================================
-- COGNITIO MVP — Database Schema Migration
-- ============================================================

-- 1. source_documents
CREATE TABLE IF NOT EXISTS public.source_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_filename text,
  content_type text NOT NULL DEFAULT 'text/plain',
  source_type text NOT NULL DEFAULT 'unknown',
  source_language text,
  source_reliability_score real NOT NULL DEFAULT 0,
  quality_score real NOT NULL DEFAULT 0,
  ingestion_status text NOT NULL DEFAULT 'pending',
  warnings_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_storage_path text,
  parsed_text_storage_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.source_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own source_documents"
  ON public.source_documents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_source_documents_user ON public.source_documents(user_id);
CREATE INDEX idx_source_documents_status ON public.source_documents(ingestion_status);

-- 2. document_segments
CREATE TABLE IF NOT EXISTS public.document_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.source_documents(id) ON DELETE CASCADE,
  segment_index integer NOT NULL DEFAULT 0,
  title text,
  content text NOT NULL DEFAULT '',
  hierarchy_level integer NOT NULL DEFAULT 0,
  confidence_score real NOT NULL DEFAULT 1.0,
  page_ref integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own document_segments"
  ON public.document_segments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.source_documents sd
      WHERE sd.id = document_segments.document_id AND sd.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.source_documents sd
      WHERE sd.id = document_segments.document_id AND sd.user_id = auth.uid()
    )
  );

CREATE INDEX idx_document_segments_doc ON public.document_segments(document_id);

-- 3. course_profiles
CREATE TABLE IF NOT EXISTS public.course_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.source_documents(id) ON DELETE CASCADE,
  main_topic text NOT NULL DEFAULT '',
  learning_objectives_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  reasoning_type text NOT NULL DEFAULT 'factual',
  density real NOT NULL DEFAULT 0,
  recommended_template text NOT NULL DEFAULT 'fiche_dynamique',
  concepts_confidence real NOT NULL DEFAULT 0,
  logic_confidence real NOT NULL DEFAULT 0,
  traps_confidence real NOT NULL DEFAULT 0,
  structure_confidence real NOT NULL DEFAULT 0,
  ambiguous_zones_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own course_profiles"
  ON public.course_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.source_documents sd
      WHERE sd.id = course_profiles.document_id AND sd.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.source_documents sd
      WHERE sd.id = course_profiles.document_id AND sd.user_id = auth.uid()
    )
  );

CREATE INDEX idx_course_profiles_doc ON public.course_profiles(document_id);

-- 4. concepts
CREATE TABLE IF NOT EXISTS public.concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_profile_id uuid NOT NULL REFERENCES public.course_profiles(id) ON DELETE CASCADE,
  stable_key text NOT NULL,
  label text NOT NULL,
  definition text NOT NULL DEFAULT '',
  criticality integer NOT NULL DEFAULT 3,
  bloom_target text NOT NULL DEFAULT 'remember',
  category text NOT NULL DEFAULT '',
  prerequisites_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_confidence real NOT NULL DEFAULT 1.0,
  source_trace_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own concepts"
  ON public.concepts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.course_profiles cp
      JOIN public.source_documents sd ON sd.id = cp.document_id
      WHERE cp.id = concepts.course_profile_id AND sd.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_profiles cp
      JOIN public.source_documents sd ON sd.id = cp.document_id
      WHERE cp.id = concepts.course_profile_id AND sd.user_id = auth.uid()
    )
  );

CREATE INDEX idx_concepts_profile ON public.concepts(course_profile_id);
CREATE INDEX idx_concepts_stable_key ON public.concepts(stable_key);

-- 5. confusion_pairs
CREATE TABLE IF NOT EXISTS public.confusion_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_profile_id uuid NOT NULL REFERENCES public.course_profiles(id) ON DELETE CASCADE,
  concept_a_id uuid NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  concept_b_id uuid NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  distinction_key text NOT NULL DEFAULT '',
  frequency integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.confusion_pairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own confusion_pairs"
  ON public.confusion_pairs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.course_profiles cp
      JOIN public.source_documents sd ON sd.id = cp.document_id
      WHERE cp.id = confusion_pairs.course_profile_id AND sd.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_profiles cp
      JOIN public.source_documents sd ON sd.id = cp.document_id
      WHERE cp.id = confusion_pairs.course_profile_id AND sd.user_id = auth.uid()
    )
  );

CREATE INDEX idx_confusion_pairs_profile ON public.confusion_pairs(course_profile_id);

-- 6. generated_missions
CREATE TABLE IF NOT EXISTS public.generated_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.source_documents(id) ON DELETE CASCADE,
  course_profile_id uuid NOT NULL REFERENCES public.course_profiles(id) ON DELETE CASCADE,
  generation_mode text NOT NULL DEFAULT 'discovery',
  chosen_format text NOT NULL DEFAULT 'fiche_dynamique',
  narrative_template text NOT NULL DEFAULT 'hospital',
  room_count integer NOT NULL DEFAULT 0,
  includes_boss boolean NOT NULL DEFAULT false,
  fallback_mode text NOT NULL DEFAULT 'full',
  quality_band text NOT NULL DEFAULT 'medium',
  qa_score real NOT NULL DEFAULT 0,
  mission_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own generated_missions"
  ON public.generated_missions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_generated_missions_user ON public.generated_missions(user_id);
CREATE INDEX idx_generated_missions_doc ON public.generated_missions(document_id);
CREATE INDEX idx_generated_missions_status ON public.generated_missions(published_status);

-- 7. mission_runs
CREATE TABLE IF NOT EXISTS public.mission_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.generated_missions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  completion_status text NOT NULL DEFAULT 'in_progress',
  room_events_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  difficulty_snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  score_composite_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  debrief_json jsonb
);

ALTER TABLE public.mission_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own mission_runs"
  ON public.mission_runs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_mission_runs_mission ON public.mission_runs(mission_id);
CREATE INDEX idx_mission_runs_user ON public.mission_runs(user_id);

-- 8. recall_tests
CREATE TABLE IF NOT EXISTS public.recall_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_run_id uuid NOT NULL REFERENCES public.mission_runs(id) ON DELETE CASCADE,
  test_type text NOT NULL DEFAULT 'final',
  questions_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_score real NOT NULL DEFAULT 0,
  confidence_score real NOT NULL DEFAULT 0,
  calibration_gap real NOT NULL DEFAULT 0,
  results_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recall_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own recall_tests"
  ON public.recall_tests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.mission_runs mr
      WHERE mr.id = recall_tests.mission_run_id AND mr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mission_runs mr
      WHERE mr.id = recall_tests.mission_run_id AND mr.user_id = auth.uid()
    )
  );

CREATE INDEX idx_recall_tests_run ON public.recall_tests(mission_run_id);
CREATE INDEX idx_recall_tests_type ON public.recall_tests(test_type);

-- 9. learner_profiles
CREATE TABLE IF NOT EXISTS public.learner_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_status text NOT NULL DEFAULT 'estimated',
  level_declared text,
  cognitive_profile_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  session_count integer NOT NULL DEFAULT 0,
  calibration_sessions_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.learner_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own learner_profiles"
  ON public.learner_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 10. learner_knowledge_graph
CREATE TABLE IF NOT EXISTS public.learner_knowledge_graph (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_stable_key text NOT NULL,
  mastery_score real NOT NULL DEFAULT 0,
  mastery_status text NOT NULL DEFAULT 'unknown',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  next_review_at timestamptz,
  observations_count integer NOT NULL DEFAULT 0,
  confusion_hits integer NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.learner_knowledge_graph ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own learner_knowledge_graph"
  ON public.learner_knowledge_graph FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_lkg_user ON public.learner_knowledge_graph(user_id);
CREATE INDEX idx_lkg_concept ON public.learner_knowledge_graph(concept_stable_key);
CREATE INDEX idx_lkg_review ON public.learner_knowledge_graph(next_review_at) WHERE NOT archived;
CREATE UNIQUE INDEX idx_lkg_user_concept ON public.learner_knowledge_graph(user_id, concept_stable_key);

-- 11. ops_events
CREATE TABLE IF NOT EXISTS public.ops_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  mission_id uuid REFERENCES public.generated_missions(id) ON DELETE SET NULL,
  document_id uuid REFERENCES public.source_documents(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ops_events ENABLE ROW LEVEL SECURITY;
-- Ops events: users can see their own, admin-level queries handled server-side
CREATE POLICY "Users can read own ops_events"
  ON public.ops_events FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage ops_events"
  ON public.ops_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_ops_events_type ON public.ops_events(event_type);
CREATE INDEX idx_ops_events_severity ON public.ops_events(severity);
CREATE INDEX idx_ops_events_created ON public.ops_events(created_at);

-- 12. prompt_versions
CREATE TABLE IF NOT EXISTS public.prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_name text NOT NULL,
  semantic_version text NOT NULL DEFAULT '1.0.0',
  changelog text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prompt_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read prompt_versions"
  ON public.prompt_versions FOR SELECT
  USING (true);
CREATE POLICY "Service role can manage prompt_versions"
  ON public.prompt_versions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 13. golden_dataset_runs
CREATE TABLE IF NOT EXISTS public.golden_dataset_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_version_id uuid NOT NULL REFERENCES public.prompt_versions(id) ON DELETE CASCADE,
  dataset_name text NOT NULL,
  pass boolean NOT NULL DEFAULT false,
  metrics_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.golden_dataset_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage golden_dataset_runs"
  ON public.golden_dataset_runs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Storage bucket for uploaded course documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-documents',
  'course-documents',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for course-documents
CREATE POLICY "Users can upload own course documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'course-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own course documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'course-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own course documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'course-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
