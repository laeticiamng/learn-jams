-- ============================================================
-- Migration: Provider Abstraction + Video Kernel + Job Queue
-- 10 tables: providers, provider_routes, generation_jobs,
--            generation_artifacts, webhook_events, worker_nodes,
--            video_projects, video_assets, video_generation_plans,
--            video_provider_runs
-- ============================================================

-- 1. providers — registry of all external/internal providers
CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  provider_key TEXT NOT NULL UNIQUE,
  provider_type TEXT NOT NULL
    CHECK (provider_type IN ('managed', 'external_api', 'self_hosted')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  config_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. provider_routes — routing rules per domain
CREATE TABLE IF NOT EXISTS provider_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  preferred_provider_key TEXT NOT NULL,
  fallback_provider_key TEXT,
  rules_json JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. generation_jobs — unified job queue across all domains
CREATE TABLE IF NOT EXISTS generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  domain TEXT NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'queued', 'running', 'completed', 'failed', 'cancelled')),
  preferred_provider_key TEXT,
  actual_provider_key TEXT,
  input_json JSONB NOT NULL DEFAULT '{}',
  output_json JSONB NOT NULL DEFAULT '{}',
  error_json JSONB NOT NULL DEFAULT '{}',
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. generation_artifacts — output files from jobs
CREATE TABLE IF NOT EXISTS generation_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES generation_jobs(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. webhook_events — inbound webhook event log
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}',
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. worker_nodes — compute plane node registry
CREATE TABLE IF NOT EXISTS worker_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_key TEXT NOT NULL UNIQUE,
  node_type TEXT NOT NULL CHECK (node_type IN ('cpu', 'gpu')),
  capabilities_json JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'draining', 'offline')),
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. video_projects — video generation projects
CREATE TABLE IF NOT EXISTS video_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_type TEXT NOT NULL
    CHECK (project_type IN ('clip', 'film', 'pedagogical_video', 'music_video')),
  title TEXT NOT NULL,
  synopsis TEXT,
  enriched_synopsis_json JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'planning', 'estimating', 'ready', 'generating', 'rendering', 'completed', 'failed', 'cancelled')),
  provider_requested TEXT,
  provider_used TEXT,
  mode TEXT NOT NULL DEFAULT 'pedagogical_template_video'
    CHECK (mode IN ('pedagogical_template_video', 'ai_generated_video', 'hybrid_video')),
  estimated_duration_sec INT,
  estimated_shots INT,
  estimated_credits NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. video_assets — assets linked to video projects
CREATE TABLE IF NOT EXISTS video_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES video_projects(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL
    CHECK (asset_type IN (
      'source_audio', 'face_ref', 'visual_ref', 'image_asset',
      'subtitle_asset', 'music_asset', 'voice_asset', 'generated_clip',
      'rendered_output'
    )),
  storage_path TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. video_generation_plans — shot/scene plans for video
CREATE TABLE IF NOT EXISTS video_generation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES video_projects(id) ON DELETE CASCADE,
  scenes_json JSONB NOT NULL DEFAULT '[]',
  shot_list_json JSONB NOT NULL DEFAULT '[]',
  visual_direction_json JSONB NOT NULL DEFAULT '{}',
  subtitle_plan_json JSONB NOT NULL DEFAULT '{}',
  fallback_render_plan_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. video_provider_runs — individual provider execution runs
CREATE TABLE IF NOT EXISTS video_provider_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES video_projects(id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL,
  run_type TEXT NOT NULL
    CHECK (run_type IN ('generate_clip', 'generate_image', 'render_template', 'composite', 'tts')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  request_json JSONB NOT NULL DEFAULT '{}',
  response_json JSONB NOT NULL DEFAULT '{}',
  error_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_providers_domain ON providers(domain);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_id ON generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_domain ON generation_jobs(domain);
CREATE INDEX IF NOT EXISTS idx_generation_artifacts_job_id ON generation_artifacts(job_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON webhook_events(provider_key);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_video_projects_user_id ON video_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_video_projects_status ON video_projects(status);
CREATE INDEX IF NOT EXISTS idx_video_assets_project_id ON video_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_video_generation_plans_project_id ON video_generation_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_video_provider_runs_project_id ON video_provider_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_video_provider_runs_status ON video_provider_runs(status);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_generation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_provider_runs ENABLE ROW LEVEL SECURITY;

-- providers / provider_routes / worker_nodes: service role only
CREATE POLICY "Service role manages providers" ON providers FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role manages provider routes" ON provider_routes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role manages worker nodes" ON worker_nodes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role manages webhook events" ON webhook_events FOR ALL USING (auth.role() = 'service_role');

-- generation_jobs: user reads own, service role manages
CREATE POLICY "Users read own jobs" ON generation_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages jobs" ON generation_jobs FOR ALL USING (auth.role() = 'service_role');

-- generation_artifacts: user reads own via job
CREATE POLICY "Users read own artifacts" ON generation_artifacts FOR SELECT USING (
  job_id IN (SELECT id FROM generation_jobs WHERE user_id = auth.uid())
);
CREATE POLICY "Service role manages artifacts" ON generation_artifacts FOR ALL USING (auth.role() = 'service_role');

-- video_projects: user CRUD own
CREATE POLICY "Users read own video projects" ON video_projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own video projects" ON video_projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own video projects" ON video_projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role manages video projects" ON video_projects FOR ALL USING (auth.role() = 'service_role');

-- video_assets: user reads own via project
CREATE POLICY "Users read own video assets" ON video_assets FOR SELECT USING (
  project_id IN (SELECT id FROM video_projects WHERE user_id = auth.uid())
);
CREATE POLICY "Users insert own video assets" ON video_assets FOR INSERT WITH CHECK (
  project_id IN (SELECT id FROM video_projects WHERE user_id = auth.uid())
);
CREATE POLICY "Service role manages video assets" ON video_assets FOR ALL USING (auth.role() = 'service_role');

-- video_generation_plans: user reads own via project
CREATE POLICY "Users read own video plans" ON video_generation_plans FOR SELECT USING (
  project_id IN (SELECT id FROM video_projects WHERE user_id = auth.uid())
);
CREATE POLICY "Service role manages video plans" ON video_generation_plans FOR ALL USING (auth.role() = 'service_role');

-- video_provider_runs: user reads own via project
CREATE POLICY "Users read own provider runs" ON video_provider_runs FOR SELECT USING (
  project_id IN (SELECT id FROM video_projects WHERE user_id = auth.uid())
);
CREATE POLICY "Service role manages provider runs" ON video_provider_runs FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- Seed initial providers and routes
-- ============================================================
INSERT INTO providers (domain, provider_key, provider_type, enabled, config_json) VALUES
  ('auth', 'supabase_auth', 'managed', true, '{"description": "Supabase Auth"}'),
  ('storage', 'supabase_storage', 'managed', true, '{"description": "Supabase Storage"}'),
  ('llm', 'openai_responses', 'external_api', true, '{"description": "OpenAI Responses API", "model": "gpt-4o"}'),
  ('image', 'openai_gpt_image', 'external_api', true, '{"description": "OpenAI GPT Image"}'),
  ('video', 'openai_sora', 'external_api', true, '{"description": "OpenAI Sora Video API"}'),
  ('video', 'internal_ffmpeg', 'self_hosted', true, '{"description": "Internal FFmpeg template renderer"}'),
  ('tts', 'openai_audio', 'external_api', true, '{"description": "OpenAI Audio/Speech API"}'),
  ('music', 'suno', 'external_api', true, '{"description": "Suno Music Generation"}'),
  ('billing', 'stripe', 'external_api', true, '{"description": "Stripe Billing"}'),
  ('email', 'resend', 'external_api', true, '{"description": "Resend Email API"}'),
  ('sms', 'twilio', 'external_api', true, '{"description": "Twilio SMS"}'),
  ('monitoring', 'sentry', 'external_api', true, '{"description": "Sentry Error Monitoring"}'),
  ('analytics', 'posthog', 'external_api', true, '{"description": "PostHog Product Analytics"}')
ON CONFLICT (provider_key) DO NOTHING;

INSERT INTO provider_routes (domain, preferred_provider_key, fallback_provider_key, rules_json) VALUES
  ('auth', 'supabase_auth', NULL, '{}'),
  ('storage', 'supabase_storage', NULL, '{}'),
  ('llm', 'openai_responses', NULL, '{"cost_ceiling_usd": 0.50, "latency_ceiling_ms": 30000}'),
  ('image', 'openai_gpt_image', NULL, '{"cost_ceiling_usd": 0.10}'),
  ('video', 'openai_sora', 'internal_ffmpeg', '{"cost_ceiling_usd": 5.00, "latency_ceiling_ms": 300000, "quality_tier": "premium"}'),
  ('tts', 'openai_audio', NULL, '{"cost_ceiling_usd": 0.05}'),
  ('music', 'suno', NULL, '{"cost_ceiling_usd": 0.30}'),
  ('billing', 'stripe', NULL, '{}'),
  ('email', 'resend', NULL, '{}'),
  ('sms', 'twilio', NULL, '{}'),
  ('monitoring', 'sentry', NULL, '{}'),
  ('analytics', 'posthog', NULL, '{}')
ON CONFLICT (domain) DO NOTHING;
