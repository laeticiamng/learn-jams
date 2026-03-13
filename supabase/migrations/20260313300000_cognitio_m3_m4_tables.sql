-- ============================================================
-- M3 Memory Architectures + M4 Format Decisions
-- ============================================================

-- ---------- memory_architectures ----------

CREATE TABLE IF NOT EXISTS memory_architectures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  course_profile_id UUID NOT NULL REFERENCES course_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core architecture
  segments_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  concept_order_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  repetition_plan_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  mnemonics_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  visual_anchors_json JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Budget & contract
  cognitive_budget_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  pedagogical_contract_json JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Duration & splitting
  total_duration_sec INTEGER NOT NULL DEFAULT 0,
  needs_splitting BOOLEAN NOT NULL DEFAULT false,
  split_modules_json JSONB,

  -- Context
  reasoning_type TEXT NOT NULL DEFAULT 'declaratif',
  objective TEXT NOT NULL DEFAULT 'discovery',

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE memory_architectures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memory architectures"
  ON memory_architectures FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memory architectures"
  ON memory_architectures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memory architectures"
  ON memory_architectures FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_memory_arch_document ON memory_architectures(document_id);
CREATE INDEX IF NOT EXISTS idx_memory_arch_profile ON memory_architectures(course_profile_id);
CREATE INDEX IF NOT EXISTS idx_memory_arch_user ON memory_architectures(user_id);

-- ---------- format_decisions ----------

CREATE TABLE IF NOT EXISTS format_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  architecture_id UUID NOT NULL REFERENCES memory_architectures(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  course_profile_id UUID NOT NULL REFERENCES course_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Decision
  chosen_format TEXT NOT NULL DEFAULT 'fiche_dynamique',
  justification TEXT NOT NULL DEFAULT '',
  matrix_reasoning TEXT NOT NULL DEFAULT '',

  -- Duration & splitting
  estimated_duration_sec INTEGER NOT NULL DEFAULT 0,
  needs_split BOOLEAN NOT NULL DEFAULT false,
  split_count INTEGER,
  modules_json JSONB,

  -- Overrides
  overrides_applied_json JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Cost
  cost_level TEXT NOT NULL DEFAULT 'low',

  -- Decision trace (for auditability)
  decision_trace_json JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE format_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own format decisions"
  ON format_decisions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own format decisions"
  ON format_decisions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_format_dec_architecture ON format_decisions(architecture_id);
CREATE INDEX IF NOT EXISTS idx_format_dec_document ON format_decisions(document_id);
CREATE INDEX IF NOT EXISTS idx_format_dec_user ON format_decisions(user_id);
