
-- Make mission_run_id nullable on recall_tests (tests can be linked to transformations instead)
ALTER TABLE public.recall_tests ALTER COLUMN mission_run_id DROP NOT NULL;

-- video_generation_plans
CREATE TABLE IF NOT EXISTS public.video_generation_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,
  user_id uuid,
  plan_json jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.video_generation_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vgp_owner" ON public.video_generation_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "vgp_insert" ON public.video_generation_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vgp_update" ON public.video_generation_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- video_projects
CREATE TABLE IF NOT EXISTS public.video_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text DEFAULT '',
  description text DEFAULT '',
  status text DEFAULT 'draft',
  config_json jsonb DEFAULT '{}'::jsonb,
  output_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.video_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vp_owner" ON public.video_projects FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "vp_insert" ON public.video_projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vp_update" ON public.video_projects FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "vp_delete" ON public.video_projects FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- video_provider_runs
CREATE TABLE IF NOT EXISTS public.video_provider_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,
  provider_key text DEFAULT '',
  status text DEFAULT 'pending',
  input_json jsonb DEFAULT '{}'::jsonb,
  output_json jsonb,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.video_provider_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vpr_read" ON public.video_provider_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "vpr_insert" ON public.video_provider_runs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "vpr_update" ON public.video_provider_runs FOR UPDATE TO authenticated USING (true);
