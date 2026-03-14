-- ============================================================
-- Migration: Entitlements, Format QA, Legacy Migrations
-- Ticket 15 + 16 — Platform restoration & entitlement engine
-- ============================================================

-- ---------- User Entitlement Snapshots ----------
CREATE TABLE IF NOT EXISTS user_entitlement_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_key TEXT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  entitlements_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  flex_credits_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  active_topups_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  restrictions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entitlement_snapshots_user ON user_entitlement_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_snapshots_computed ON user_entitlement_snapshots(computed_at DESC);

-- ---------- Plan Format Matrix ----------
CREATE TABLE IF NOT EXISTS plan_format_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  availability TEXT NOT NULL DEFAULT 'locked',
  monthly_quota INTEGER NOT NULL DEFAULT 0,
  overage_allowed BOOLEAN NOT NULL DEFAULT false,
  topup_eligible BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_key, feature_key)
);

-- ---------- Format Quality Reports ----------
CREATE TABLE IF NOT EXISTS format_quality_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  format TEXT NOT NULL,
  generation_id TEXT NOT NULL,
  overall_score INTEGER NOT NULL DEFAULT 0,
  publish_blocked BOOLEAN NOT NULL DEFAULT false,
  checks_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  blocking_violations_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggestions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_format_qa_generation ON format_quality_reports(generation_id);
CREATE INDEX IF NOT EXISTS idx_format_qa_format ON format_quality_reports(format);

-- ---------- Legacy Plan Migrations ----------
CREATE TABLE IF NOT EXISTS legacy_plan_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  legacy_plan_id TEXT NOT NULL,
  target_plan_key TEXT NOT NULL,
  migrated_at TIMESTAMPTZ,
  rules_applied_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  compensation_granted BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legacy_migrations_user ON legacy_plan_migrations(user_id);
CREATE INDEX IF NOT EXISTS idx_legacy_migrations_status ON legacy_plan_migrations(status);

-- ---------- Education Profiles ----------
CREATE TABLE IF NOT EXISTS education_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  education_stage TEXT NOT NULL DEFAULT 'unknown',
  institution_type TEXT,
  field_category TEXT,
  field_of_study TEXT,
  year_in_program INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_education_profiles_user ON education_profiles(user_id);

-- ---------- RLS Policies ----------
ALTER TABLE user_entitlement_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_format_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE format_quality_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE legacy_plan_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE education_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own entitlement snapshots
CREATE POLICY "Users read own entitlements" ON user_entitlement_snapshots
  FOR SELECT USING (auth.uid() = user_id);

-- Plan format matrix is readable by all authenticated users
CREATE POLICY "Authenticated read plan matrix" ON plan_format_matrix
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can read format QA reports (no user_id — linked via generation)
CREATE POLICY "Authenticated read format QA" ON format_quality_reports
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can read their own migration records
CREATE POLICY "Users read own migrations" ON legacy_plan_migrations
  FOR SELECT USING (auth.uid() = user_id);

-- Users can read/write their own education profile
CREATE POLICY "Users manage own education profile" ON education_profiles
  FOR ALL USING (auth.uid() = user_id);

-- ---------- Seed Plan Format Matrix ----------
INSERT INTO plan_format_matrix (plan_key, feature_key, availability, monthly_quota, overage_allowed, topup_eligible) VALUES
  -- Free plan
  ('free', 'dynamic_sheet_generation', 'limited', 3, false, false),
  ('free', 'animated_story_generation', 'locked', 0, false, false),
  ('free', 'escape_game_generation', 'locked', 0, false, false),
  ('free', 'music_generation', 'limited', 2, false, false),
  ('free', 'video_generation_ai_seconds', 'locked', 0, false, false),
  ('free', 'video_template_render', 'locked', 0, false, false),
  -- Core plan
  ('core', 'dynamic_sheet_generation', 'included', -1, false, false),
  ('core', 'animated_story_generation', 'included', -1, false, false),
  ('core', 'escape_game_generation', 'included', 10, true, true),
  ('core', 'music_generation', 'included', 25, true, true),
  ('core', 'video_generation_ai_seconds', 'included', 15, false, true),
  ('core', 'video_template_render', 'included', 5, false, true),
  -- Plus plan
  ('plus', 'dynamic_sheet_generation', 'included', -1, false, false),
  ('plus', 'animated_story_generation', 'included', -1, false, false),
  ('plus', 'escape_game_generation', 'included', 30, true, true),
  ('plus', 'music_generation', 'included', 60, true, true),
  ('plus', 'video_generation_ai_seconds', 'included', 60, true, true),
  ('plus', 'video_template_render', 'included', 15, true, true),
  -- Premium Family
  ('premium_family', 'dynamic_sheet_generation', 'included', -1, false, false),
  ('premium_family', 'animated_story_generation', 'included', -1, false, false),
  ('premium_family', 'escape_game_generation', 'included', 80, true, true),
  ('premium_family', 'music_generation', 'included', 100, true, true),
  ('premium_family', 'video_generation_ai_seconds', 'included', 120, true, true),
  ('premium_family', 'video_template_render', 'included', 30, true, true),
  -- Family Plus
  ('family_plus', 'dynamic_sheet_generation', 'included', -1, false, false),
  ('family_plus', 'animated_story_generation', 'included', -1, false, false),
  ('family_plus', 'escape_game_generation', 'included', 200, true, true),
  ('family_plus', 'music_generation', 'included', 250, true, true),
  ('family_plus', 'video_generation_ai_seconds', 'included', 300, true, true),
  ('family_plus', 'video_template_render', 'included', 80, true, true),
  -- School
  ('school', 'dynamic_sheet_generation', 'included', -1, false, false),
  ('school', 'animated_story_generation', 'included', -1, false, false),
  ('school', 'escape_game_generation', 'included', 500, true, true),
  ('school', 'music_generation', 'included', 500, true, true),
  ('school', 'video_generation_ai_seconds', 'included', 600, true, true),
  ('school', 'video_template_render', 'included', 100, true, true)
ON CONFLICT (plan_key, feature_key) DO UPDATE SET
  availability = EXCLUDED.availability,
  monthly_quota = EXCLUDED.monthly_quota,
  overage_allowed = EXCLUDED.overage_allowed,
  topup_eligible = EXCLUDED.topup_eligible,
  updated_at = now();
