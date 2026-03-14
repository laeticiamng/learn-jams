-- ============================================================
-- COGNITIO Final Integration — Seed Library, Product Events,
-- Experiments, Feature Flags
-- ============================================================

-- 1. Seed Transformations
CREATE TABLE IF NOT EXISTS public.seed_transformations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subject text NOT NULL,
  audience_level text NOT NULL,
  format text NOT NULL,
  transformation_json jsonb NOT NULL,
  recall_tests_json jsonb NOT NULL,
  debrief_demo_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  feature_flags_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_seed_transformations_status ON public.seed_transformations(status);
CREATE INDEX idx_seed_transformations_format ON public.seed_transformations(format);

-- 2. Product Events
CREATE TABLE IF NOT EXISTS public.product_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id text,
  transformation_id uuid,
  event_name text NOT NULL,
  audience_level text,
  format text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_events_name ON public.product_events(event_name);
CREATE INDEX idx_product_events_user ON public.product_events(user_id);
CREATE INDEX idx_product_events_created ON public.product_events(created_at);

-- 3. Experiment Assignments
CREATE TABLE IF NOT EXISTS public.experiment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id text,
  experiment_key text NOT NULL,
  variant text NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_experiment_assignments_key ON public.experiment_assignments(experiment_key);
CREATE INDEX idx_experiment_assignments_user ON public.experiment_assignments(user_id);

-- 4. Experiment Runs
CREATE TABLE IF NOT EXISTS public.experiment_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.experiment_assignments(id) ON DELETE CASCADE,
  transformation_id uuid,
  status text NOT NULL DEFAULT 'started',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_experiment_runs_assignment ON public.experiment_runs(assignment_id);
CREATE INDEX idx_experiment_runs_status ON public.experiment_runs(status);

-- 5. Experiment Measurements
CREATE TABLE IF NOT EXISTS public.experiment_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_run_id uuid NOT NULL REFERENCES public.experiment_runs(id) ON DELETE CASCADE,
  measure_key text NOT NULL,
  measure_value_numeric numeric,
  measure_value_text text,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_experiment_measurements_run ON public.experiment_measurements(experiment_run_id);
CREATE INDEX idx_experiment_measurements_key ON public.experiment_measurements(measure_key);

-- 6. Feature Flags
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  rules_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default feature flags
INSERT INTO public.feature_flags (flag_key, enabled, rules_json) VALUES
  ('ff_dynamic_sheet_enabled', true, '{}'),
  ('ff_animated_story_enabled', true, '{}'),
  ('ff_seed_library_enabled', true, '{}'),
  ('ff_guardian_loop_enabled', false, '{}'),
  ('ff_institution_mode_enabled', false, '{}'),
  ('ff_lyrics_adaptive_enabled', false, '{}'),
  ('ff_audio_safe_lyrics_split_enabled', false, '{}'),
  ('ff_experiments_enabled', false, '{}'),
  ('ff_admin_dashboards_enabled', false, '{}'),
  ('ff_extended_disclaimers_enabled', true, '{}')
ON CONFLICT (flag_key) DO NOTHING;

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE public.seed_transformations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Seed transformations: public read
CREATE POLICY "seed_transformations_select_all" ON public.seed_transformations
  FOR SELECT USING (true);

-- Product events: users can insert their own, read their own
CREATE POLICY "product_events_insert_own" ON public.product_events
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "product_events_select_own" ON public.product_events
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Experiment assignments: users can read their own
CREATE POLICY "experiment_assignments_select_own" ON public.experiment_assignments
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "experiment_assignments_insert_own" ON public.experiment_assignments
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Experiment runs: users can manage via their assignments
CREATE POLICY "experiment_runs_select" ON public.experiment_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.experiment_assignments ea
      WHERE ea.id = experiment_runs.assignment_id
      AND (ea.user_id = auth.uid() OR ea.user_id IS NULL)
    )
  );
CREATE POLICY "experiment_runs_insert" ON public.experiment_runs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.experiment_assignments ea
      WHERE ea.id = experiment_runs.assignment_id
      AND (ea.user_id = auth.uid() OR ea.user_id IS NULL)
    )
  );

-- Experiment measurements: via runs
CREATE POLICY "experiment_measurements_select" ON public.experiment_measurements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.experiment_runs er
      JOIN public.experiment_assignments ea ON ea.id = er.assignment_id
      WHERE er.id = experiment_measurements.experiment_run_id
      AND (ea.user_id = auth.uid() OR ea.user_id IS NULL)
    )
  );
CREATE POLICY "experiment_measurements_insert" ON public.experiment_measurements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.experiment_runs er
      JOIN public.experiment_assignments ea ON ea.id = er.assignment_id
      WHERE er.id = experiment_measurements.experiment_run_id
      AND (ea.user_id = auth.uid() OR ea.user_id IS NULL)
    )
  );

-- Feature flags: public read
CREATE POLICY "feature_flags_select_all" ON public.feature_flags
  FOR SELECT USING (true);
