
-- ============================================================
-- Cognitio & Platform Missing Tables Migration
-- ============================================================

-- 1. source_documents
CREATE TABLE IF NOT EXISTS public.source_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  original_filename text,
  content_type text NOT NULL DEFAULT 'text/plain',
  source_type text NOT NULL DEFAULT 'unknown',
  detailed_source_type text DEFAULT 'unknown',
  source_language text,
  detected_language text,
  source_reliability_score numeric NOT NULL DEFAULT 0.5,
  quality_score numeric NOT NULL DEFAULT 0.5,
  word_count integer DEFAULT 0,
  ingestion_status text NOT NULL DEFAULT 'pending',
  detected_structure text DEFAULT 'minimal',
  warnings_json jsonb DEFAULT '[]'::jsonb,
  raw_storage_path text,
  parsed_text_storage_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.source_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "source_documents_owner_select" ON public.source_documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "source_documents_owner_insert" ON public.source_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "source_documents_owner_update" ON public.source_documents FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "source_documents_owner_delete" ON public.source_documents FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. document_segments
CREATE TABLE IF NOT EXISTS public.document_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.source_documents(id) ON DELETE CASCADE,
  segment_index integer NOT NULL DEFAULT 0,
  title text,
  content text NOT NULL DEFAULT '',
  hierarchy_level integer NOT NULL DEFAULT 1,
  confidence_score numeric NOT NULL DEFAULT 0.5,
  page_ref integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.document_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "document_segments_via_doc" ON public.document_segments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.source_documents sd WHERE sd.id = document_id AND sd.user_id = auth.uid()));
CREATE POLICY "document_segments_insert" ON public.document_segments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.source_documents sd WHERE sd.id = document_id AND sd.user_id = auth.uid()));

-- 3. course_profiles
CREATE TABLE IF NOT EXISTS public.course_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.source_documents(id) ON DELETE CASCADE,
  main_topic text NOT NULL DEFAULT '',
  learning_objectives_json jsonb DEFAULT '[]'::jsonb,
  reasoning_type text DEFAULT 'declaratif',
  density text DEFAULT 'medium',
  recommended_template text DEFAULT 'fiche_dynamique',
  concepts_confidence numeric DEFAULT 0,
  logic_confidence numeric DEFAULT 0,
  traps_confidence numeric DEFAULT 0,
  structure_confidence numeric DEFAULT 0,
  ambiguous_zones_json jsonb DEFAULT '[]'::jsonb,
  traps_json jsonb DEFAULT '[]'::jsonb,
  prerequis_json jsonb DEFAULT '[]'::jsonb,
  structure_type text DEFAULT 'minimal',
  source_issues_json jsonb DEFAULT '[]'::jsonb,
  total_concepts integer DEFAULT 0,
  critical_count integer DEFAULT 0,
  estimated_complexity integer DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.course_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course_profiles_via_doc" ON public.course_profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.source_documents sd WHERE sd.id = document_id AND sd.user_id = auth.uid()));
CREATE POLICY "course_profiles_insert" ON public.course_profiles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.source_documents sd WHERE sd.id = document_id AND sd.user_id = auth.uid()));

-- 4. concepts
CREATE TABLE IF NOT EXISTS public.concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_profile_id uuid NOT NULL REFERENCES public.course_profiles(id) ON DELETE CASCADE,
  stable_key text NOT NULL DEFAULT '',
  label text NOT NULL DEFAULT '',
  definition text DEFAULT '',
  criticality integer NOT NULL DEFAULT 3,
  criticality_score numeric DEFAULT 0.5,
  bloom_target text DEFAULT 'remember',
  category text DEFAULT 'general',
  relations_json jsonb DEFAULT '[]'::jsonb,
  prerequisites_json jsonb DEFAULT '[]'::jsonb,
  source_confidence numeric DEFAULT 0.5,
  source_trace_json jsonb DEFAULT '[]'::jsonb,
  uncertain boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "concepts_via_profile" ON public.concepts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.course_profiles cp
    JOIN public.source_documents sd ON sd.id = cp.document_id
    WHERE cp.id = course_profile_id AND sd.user_id = auth.uid()
  ));
CREATE POLICY "concepts_insert" ON public.concepts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.course_profiles cp
    JOIN public.source_documents sd ON sd.id = cp.document_id
    WHERE cp.id = course_profile_id AND sd.user_id = auth.uid()
  ));

-- 5. confusion_pairs
CREATE TABLE IF NOT EXISTS public.confusion_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_profile_id uuid NOT NULL REFERENCES public.course_profiles(id) ON DELETE CASCADE,
  concept_a_id uuid REFERENCES public.concepts(id) ON DELETE SET NULL,
  concept_b_id uuid REFERENCES public.concepts(id) ON DELETE SET NULL,
  distinction_key text DEFAULT '',
  frequency integer DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.confusion_pairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "confusion_pairs_via_profile" ON public.confusion_pairs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.course_profiles cp
    JOIN public.source_documents sd ON sd.id = cp.document_id
    WHERE cp.id = course_profile_id AND sd.user_id = auth.uid()
  ));
CREATE POLICY "confusion_pairs_insert" ON public.confusion_pairs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.course_profiles cp
    JOIN public.source_documents sd ON sd.id = cp.document_id
    WHERE cp.id = course_profile_id AND sd.user_id = auth.uid()
  ));

-- 6. generated_missions
CREATE TABLE IF NOT EXISTS public.generated_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_id uuid REFERENCES public.source_documents(id) ON DELETE SET NULL,
  course_profile_id uuid REFERENCES public.course_profiles(id) ON DELETE SET NULL,
  generation_mode text DEFAULT 'discovery',
  chosen_format text DEFAULT 'fiche_dynamique',
  narrative_template text DEFAULT '',
  room_count integer DEFAULT 0,
  includes_boss boolean DEFAULT false,
  fallback_mode text DEFAULT 'full',
  quality_band text DEFAULT 'medium',
  qa_score numeric DEFAULT 0,
  mission_json jsonb DEFAULT '{}'::jsonb,
  published_status text DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.generated_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "missions_owner_select" ON public.generated_missions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "missions_owner_insert" ON public.generated_missions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "missions_owner_update" ON public.generated_missions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 7. mission_runs
CREATE TABLE IF NOT EXISTS public.mission_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.generated_missions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  completion_status text NOT NULL DEFAULT 'in_progress',
  room_events_json jsonb DEFAULT '[]'::jsonb,
  difficulty_snapshot_json jsonb DEFAULT '{}'::jsonb,
  score_composite_json jsonb DEFAULT '{}'::jsonb,
  debrief_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mission_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "runs_owner_select" ON public.mission_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "runs_owner_insert" ON public.mission_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "runs_owner_update" ON public.mission_runs FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 8. recall_tests
CREATE TABLE IF NOT EXISTS public.recall_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_run_id uuid NOT NULL REFERENCES public.mission_runs(id) ON DELETE CASCADE,
  test_type text NOT NULL DEFAULT 'inline',
  questions_json jsonb DEFAULT '[]'::jsonb,
  raw_score numeric DEFAULT 0,
  confidence_score numeric DEFAULT 0,
  calibration_gap numeric DEFAULT 0,
  results_json jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recall_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recall_tests_via_run" ON public.recall_tests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mission_runs mr WHERE mr.id = mission_run_id AND mr.user_id = auth.uid()));
CREATE POLICY "recall_tests_insert" ON public.recall_tests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.mission_runs mr WHERE mr.id = mission_run_id AND mr.user_id = auth.uid()));

-- 9. recall_attempts
CREATE TABLE IF NOT EXISTS public.recall_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recall_test_id uuid REFERENCES public.recall_tests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  answers_json jsonb DEFAULT '[]'::jsonb,
  score numeric DEFAULT 0,
  confidence_calibration numeric DEFAULT 0,
  grading_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recall_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recall_attempts_owner" ON public.recall_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "recall_attempts_insert" ON public.recall_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 10. learner_profiles
CREATE TABLE IF NOT EXISTS public.learner_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  profile_status text NOT NULL DEFAULT 'estimated',
  level_declared text,
  cognitive_profile_json jsonb DEFAULT '{}'::jsonb,
  session_count integer DEFAULT 0,
  calibration_sessions_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.learner_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "learner_profiles_owner" ON public.learner_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "learner_profiles_insert" ON public.learner_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "learner_profiles_update" ON public.learner_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 11. learner_knowledge_graph
CREATE TABLE IF NOT EXISTS public.learner_knowledge_graph (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  concept_stable_key text NOT NULL,
  mastery_score numeric DEFAULT 0,
  mastery_status text DEFAULT 'unknown',
  last_seen_at timestamptz DEFAULT now(),
  next_review_at timestamptz,
  observations_count integer DEFAULT 0,
  confusion_hits integer DEFAULT 0,
  archived boolean DEFAULT false,
  metadata_json jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, concept_stable_key)
);
ALTER TABLE public.learner_knowledge_graph ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lkg_owner" ON public.learner_knowledge_graph FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "lkg_insert" ON public.learner_knowledge_graph FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lkg_update" ON public.learner_knowledge_graph FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 12. learner_confusion_edges
CREATE TABLE IF NOT EXISTS public.learner_confusion_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  concept_a_key text NOT NULL,
  concept_b_key text NOT NULL,
  hits_count integer DEFAULT 1,
  resolved boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.learner_confusion_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lce_owner" ON public.learner_confusion_edges FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "lce_insert" ON public.learner_confusion_edges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lce_update" ON public.learner_confusion_edges FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 13. learner_format_effectiveness
CREATE TABLE IF NOT EXISTS public.learner_format_effectiveness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  format text NOT NULL DEFAULT 'fiche_dynamique',
  retention_rate numeric DEFAULT 0,
  engagement_score numeric DEFAULT 0,
  sessions_count integer DEFAULT 0,
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.learner_format_effectiveness ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lfe_owner" ON public.learner_format_effectiveness FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "lfe_insert" ON public.learner_format_effectiveness FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lfe_update" ON public.learner_format_effectiveness FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 14. ops_events
CREATE TABLE IF NOT EXISTS public.ops_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  mission_id uuid,
  document_id uuid,
  user_id uuid,
  payload_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ops_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ops_events_service_insert" ON public.ops_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ops_events_owner_select" ON public.ops_events FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 15. prompt_versions
CREATE TABLE IF NOT EXISTS public.prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_name text NOT NULL,
  semantic_version text NOT NULL DEFAULT '1.0.0',
  changelog text DEFAULT '',
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prompt_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prompt_versions_read" ON public.prompt_versions FOR SELECT TO authenticated USING (true);

-- 16. golden_dataset_runs
CREATE TABLE IF NOT EXISTS public.golden_dataset_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_version_id uuid REFERENCES public.prompt_versions(id) ON DELETE CASCADE,
  dataset_name text NOT NULL DEFAULT '',
  pass boolean DEFAULT false,
  metrics_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.golden_dataset_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gdr_read" ON public.golden_dataset_runs FOR SELECT TO authenticated USING (true);

-- 17. transformations (for CognitioLibrary)
CREATE TABLE IF NOT EXISTS public.transformations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_id uuid REFERENCES public.source_documents(id) ON DELETE SET NULL,
  format text DEFAULT 'fiche_dynamique',
  published_status text DEFAULT 'draft',
  qa_status text DEFAULT 'pending',
  transformation_json jsonb DEFAULT '{}'::jsonb,
  recall_tests_json jsonb DEFAULT '[]'::jsonb,
  title text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transformations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transformations_owner_select" ON public.transformations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "transformations_owner_insert" ON public.transformations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transformations_owner_update" ON public.transformations FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 18. debrief_reports
CREATE TABLE IF NOT EXISTS public.debrief_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_run_id uuid REFERENCES public.mission_runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  report_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.debrief_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "debrief_owner" ON public.debrief_reports FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "debrief_insert" ON public.debrief_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 19. product_events
CREATE TABLE IF NOT EXISTS public.product_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  user_id uuid,
  anonymous_id text,
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_events_insert" ON public.product_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "product_events_anon_insert" ON public.product_events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "product_events_owner_select" ON public.product_events FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 20. usage_quotas_v2
CREATE TABLE IF NOT EXISTS public.usage_quotas_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  billing_period_start timestamptz NOT NULL DEFAULT now(),
  billing_period_end timestamptz,
  counters_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.usage_quotas_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotas_v2_owner" ON public.usage_quotas_v2 FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "quotas_v2_insert" ON public.usage_quotas_v2 FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quotas_v2_update" ON public.usage_quotas_v2 FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 21. user_credit_balances
CREATE TABLE IF NOT EXISTS public.user_credit_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  lifetime_earned numeric DEFAULT 0,
  lifetime_spent numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_credit_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credits_owner" ON public.user_credit_balances FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "credits_insert" ON public.user_credit_balances FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "credits_update" ON public.user_credit_balances FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 22. feature_flags
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL UNIQUE,
  enabled boolean DEFAULT false,
  description text DEFAULT '',
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feature_flags_read" ON public.feature_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "feature_flags_anon_read" ON public.feature_flags FOR SELECT TO anon USING (true);

-- 23. generation_jobs
CREATE TABLE IF NOT EXISTS public.generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  domain text DEFAULT 'cognitio',
  status text NOT NULL DEFAULT 'pending',
  input_json jsonb DEFAULT '{}'::jsonb,
  output_json jsonb,
  error_message text,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_owner" ON public.generation_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "jobs_insert" ON public.generation_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "jobs_update" ON public.generation_jobs FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 24. generation_artifacts
CREATE TABLE IF NOT EXISTS public.generation_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.generation_jobs(id) ON DELETE CASCADE,
  artifact_type text NOT NULL DEFAULT 'output',
  storage_path text,
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.generation_artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "artifacts_via_job" ON public.generation_artifacts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.generation_jobs j WHERE j.id = job_id AND j.user_id = auth.uid()));
CREATE POLICY "artifacts_insert" ON public.generation_artifacts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.generation_jobs j WHERE j.id = job_id AND j.user_id = auth.uid()));

-- 25. webhook_events
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL,
  external_event_id text,
  payload_json jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'received',
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhook_events_service" ON public.webhook_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 26. webhook_replay_protection
CREATE TABLE IF NOT EXISTS public.webhook_replay_protection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL,
  external_event_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider_key, external_event_id)
);
ALTER TABLE public.webhook_replay_protection ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wrp_service" ON public.webhook_replay_protection FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 27. security_audit_events
CREATE TABLE IF NOT EXISTS public.security_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  user_id uuid,
  ip_address text,
  details_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.security_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_events_insert" ON public.security_audit_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "audit_events_select" ON public.security_audit_events FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 28. suspicious_activity_flags
CREATE TABLE IF NOT EXISTS public.suspicious_activity_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  flag_type text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  details_json jsonb DEFAULT '{}'::jsonb,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.suspicious_activity_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags_insert" ON public.suspicious_activity_flags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "flags_select" ON public.suspicious_activity_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "flags_update" ON public.suspicious_activity_flags FOR UPDATE TO authenticated USING (true);

-- 29. guardians
CREATE TABLE IF NOT EXISTS public.guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  display_name text,
  invite_token text UNIQUE,
  invite_expires_at timestamptz,
  invite_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guardians_read" ON public.guardians FOR SELECT TO authenticated USING (true);
CREATE POLICY "guardians_insert" ON public.guardians FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "guardians_update" ON public.guardians FOR UPDATE TO authenticated USING (true);

-- 30. user_guardians
CREATE TABLE IF NOT EXISTS public.user_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  guardian_id uuid NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  relationship text DEFAULT 'parent',
  status text DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, guardian_id)
);
ALTER TABLE public.user_guardians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ug_owner" ON public.user_guardians FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ug_insert" ON public.user_guardians FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
