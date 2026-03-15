
-- Fix consent_events missing columns
ALTER TABLE public.consent_events ADD COLUMN IF NOT EXISTS guardian_id uuid;
ALTER TABLE public.consent_events ADD COLUMN IF NOT EXISTS event_type text DEFAULT '';
ALTER TABLE public.consent_events ADD COLUMN IF NOT EXISTS user_agent text;

-- Fix experiment_runs missing columns
ALTER TABLE public.experiment_runs ADD COLUMN IF NOT EXISTS assignment_id uuid;
ALTER TABLE public.experiment_runs ADD COLUMN IF NOT EXISTS transformation_id uuid;
ALTER TABLE public.experiment_runs ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Fix experiment_measurements missing columns
ALTER TABLE public.experiment_measurements ADD COLUMN IF NOT EXISTS experiment_run_id uuid;
ALTER TABLE public.experiment_measurements ADD COLUMN IF NOT EXISTS measure_key text;
ALTER TABLE public.experiment_measurements ADD COLUMN IF NOT EXISTS measure_value_numeric numeric;
ALTER TABLE public.experiment_measurements ADD COLUMN IF NOT EXISTS measure_value_text text;

-- Fix experiment_assignments missing columns  
ALTER TABLE public.experiment_assignments ADD COLUMN IF NOT EXISTS anonymous_id text;

-- Fix learner_format_effectiveness missing columns
ALTER TABLE public.learner_format_effectiveness ADD COLUMN IF NOT EXISTS attempts_count integer DEFAULT 0;

-- Fix security tables missing columns
ALTER TABLE public.security_audit_events ADD COLUMN IF NOT EXISTS ip_hash text;
ALTER TABLE public.security_audit_events ADD COLUMN IF NOT EXISTS metadata_json jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.suspicious_activity_flags ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- seed_transformations
CREATE TABLE IF NOT EXISTS public.seed_transformations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text DEFAULT '',
  format text DEFAULT 'fiche_dynamique',
  subject text DEFAULT '',
  difficulty text DEFAULT 'intermediate',
  transformation_json jsonb DEFAULT '{}'::jsonb,
  recall_tests_json jsonb DEFAULT '[]'::jsonb,
  is_featured boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seed_transformations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "st_read" ON public.seed_transformations FOR SELECT TO authenticated USING (true);
CREATE POLICY "st_anon_read" ON public.seed_transformations FOR SELECT TO anon USING (true);

-- provider_routes
CREATE TABLE IF NOT EXISTS public.provider_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  capability text NOT NULL,
  provider_key text NOT NULL,
  priority integer DEFAULT 1,
  enabled boolean DEFAULT true,
  config_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.provider_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pr_read" ON public.provider_routes FOR SELECT TO authenticated USING (true);

-- providers
CREATE TABLE IF NOT EXISTS public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL UNIQUE,
  display_name text DEFAULT '',
  provider_type text DEFAULT '',
  enabled boolean DEFAULT true,
  config_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prov_read" ON public.providers FOR SELECT TO authenticated USING (true);

-- video_assets
CREATE TABLE IF NOT EXISTS public.video_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,
  user_id uuid,
  asset_type text DEFAULT 'video',
  storage_path text,
  status text DEFAULT 'pending',
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.video_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "va_owner" ON public.video_assets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "va_insert" ON public.video_assets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "va_update" ON public.video_assets FOR UPDATE TO authenticated USING (auth.uid() = user_id);
