-- ============================================================
-- COGNITIO: Learner Audience Profile — Transversal Adaptation Layer
-- ============================================================

-- 1. Add learner_audience_profile to source_documents
ALTER TABLE source_documents
  ADD COLUMN IF NOT EXISTS learner_audience_profile_json jsonb DEFAULT '{}';

-- 2. Add difficulty/mismatch fields to course_profiles
ALTER TABLE course_profiles
  ADD COLUMN IF NOT EXISTS document_difficulty_level text DEFAULT 'intermediate',
  ADD COLUMN IF NOT EXISTS estimated_audience_level text DEFAULT 'intermediate',
  ADD COLUMN IF NOT EXISTS audience_mismatch_risk numeric DEFAULT 0;

-- 3. Add audience-related fields to learner_profiles (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'learner_profiles') THEN
    ALTER TABLE learner_profiles
      ADD COLUMN IF NOT EXISTS age_band text DEFAULT 'unknown',
      ADD COLUMN IF NOT EXISTS education_stage text DEFAULT 'unknown',
      ADD COLUMN IF NOT EXISTS declared_level text DEFAULT 'unknown',
      ADD COLUMN IF NOT EXISTS explanation_style text DEFAULT 'balanced',
      ADD COLUMN IF NOT EXISTS preferred_density text DEFAULT 'medium';
  END IF;
END $$;

-- 4. Add learner_audience_profile to memory_architectures
ALTER TABLE memory_architectures
  ADD COLUMN IF NOT EXISTS learner_audience_profile_json jsonb DEFAULT '{}';

-- 5. Add learner_audience_profile to transformations
ALTER TABLE transformations
  ADD COLUMN IF NOT EXISTS learner_audience_profile_json jsonb DEFAULT '{}';
