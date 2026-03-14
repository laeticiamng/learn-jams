-- ============================================================
-- M5 Transformations, Generated Contents, Final Tests
-- ============================================================

-- ---------- transformations ----------

CREATE TABLE IF NOT EXISTS transformations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  course_profile_id UUID NOT NULL REFERENCES course_profiles(id) ON DELETE CASCADE,
  memory_architecture_id UUID NOT NULL REFERENCES memory_architectures(id) ON DELETE CASCADE,
  format_decision_id UUID NOT NULL REFERENCES format_decisions(id) ON DELETE CASCADE,
  format TEXT NOT NULL DEFAULT 'fiche_dynamique',
  strategy TEXT NOT NULL DEFAULT 'dynamic_sheet_v1',
  published_status TEXT NOT NULL DEFAULT 'draft',
  qa_status TEXT NOT NULL DEFAULT 'pending',
  estimated_duration_sec INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE transformations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transformations"
  ON transformations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transformations"
  ON transformations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transformations"
  ON transformations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_transformations_user ON transformations(user_id);
CREATE INDEX IF NOT EXISTS idx_transformations_document ON transformations(document_id);

-- ---------- generated_contents ----------

CREATE TABLE IF NOT EXISTS generated_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transformation_id UUID NOT NULL REFERENCES transformations(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_disclaimer_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  coverage_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  generation_flags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  internal_summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE generated_contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generated contents"
  ON generated_contents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transformations t
      WHERE t.id = generated_contents.transformation_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own generated contents"
  ON generated_contents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transformations t
      WHERE t.id = generated_contents.transformation_id AND t.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_generated_contents_transformation ON generated_contents(transformation_id);

-- ---------- final_tests ----------

CREATE TABLE IF NOT EXISTS final_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transformation_id UUID NOT NULL REFERENCES transformations(id) ON DELETE CASCADE,
  questions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  bloom_levels_count INTEGER NOT NULL DEFAULT 0,
  question_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE final_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own final tests"
  ON final_tests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transformations t
      WHERE t.id = final_tests.transformation_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own final tests"
  ON final_tests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transformations t
      WHERE t.id = final_tests.transformation_id AND t.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_final_tests_transformation ON final_tests(transformation_id);
