-- ============================================================
-- COGNITIO M1/M2 Schema Enhancements
-- Adds missing columns, storage buckets, and refined RLS
-- ============================================================

-- ---------- source_documents enhancements ----------

ALTER TABLE source_documents
  ADD COLUMN IF NOT EXISTS detailed_source_type text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS detected_structure text DEFAULT 'minimal',
  ADD COLUMN IF NOT EXISTS word_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS detected_language text,
  ADD COLUMN IF NOT EXISTS parsing_latency_ms integer;

-- ---------- course_profiles enhancements ----------

ALTER TABLE course_profiles
  ADD COLUMN IF NOT EXISTS learning_objectives_json jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS prerequis_json jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS traps_json jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS source_issues_json jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS total_concepts integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS critical_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_complexity integer DEFAULT 5;

-- Handle case where main_topic doesn't exist yet
ALTER TABLE course_profiles
  ADD COLUMN IF NOT EXISTS main_topic text DEFAULT '';

ALTER TABLE course_profiles
  ADD COLUMN IF NOT EXISTS reasoning_type text DEFAULT 'declaratif';

ALTER TABLE course_profiles
  ADD COLUMN IF NOT EXISTS density text DEFAULT 'medium';

ALTER TABLE course_profiles
  ADD COLUMN IF NOT EXISTS recommended_template text DEFAULT 'fiche_dynamique';

ALTER TABLE course_profiles
  ADD COLUMN IF NOT EXISTS concepts_confidence numeric DEFAULT 0;

ALTER TABLE course_profiles
  ADD COLUMN IF NOT EXISTS logic_confidence numeric DEFAULT 0;

ALTER TABLE course_profiles
  ADD COLUMN IF NOT EXISTS traps_confidence numeric DEFAULT 0;

ALTER TABLE course_profiles
  ADD COLUMN IF NOT EXISTS structure_confidence numeric DEFAULT 0;

ALTER TABLE course_profiles
  ADD COLUMN IF NOT EXISTS ambiguous_zones_json jsonb NOT NULL DEFAULT '[]';

-- ---------- concepts enhancements ----------

ALTER TABLE concepts
  ADD COLUMN IF NOT EXISTS concept_type text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS criticality_score numeric DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS relations_json jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS uncertain boolean DEFAULT false;

-- ---------- Storage: source-raw and source-parsed ----------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'source-raw',
  'source-raw',
  false,
  52428800,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'source-parsed',
  'source-parsed',
  false,
  52428800,
  ARRAY['text/plain', 'application/json']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for source-raw
CREATE POLICY "Users upload own raw docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'source-raw'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users read own raw docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'source-raw'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users delete own raw docs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'source-raw'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage RLS for source-parsed
CREATE POLICY "Users read own parsed docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'source-parsed'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Service inserts parsed docs"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'source-parsed');

-- ---------- Indexes ----------

CREATE INDEX IF NOT EXISTS idx_source_documents_detailed_type
  ON source_documents(detailed_source_type);

CREATE INDEX IF NOT EXISTS idx_course_profiles_reasoning_type
  ON course_profiles(reasoning_type);

CREATE INDEX IF NOT EXISTS idx_concepts_uncertain
  ON concepts(uncertain) WHERE uncertain = true;

CREATE INDEX IF NOT EXISTS idx_concepts_criticality
  ON concepts(criticality);

-- ---------- Ops events: ensure indexes for M1/M2 event types ----------

CREATE INDEX IF NOT EXISTS idx_ops_events_document_id
  ON ops_events(document_id) WHERE document_id IS NOT NULL;
