-- ============================================================
-- Ticket 14 — Adaptive Credits, Usage Profiles, Escape Game QA
-- ============================================================

-- 1) adaptive_credit_policies
create table if not exists public.adaptive_credit_policies (
  id uuid primary key default gen_random_uuid(),
  policy_key text unique not null,
  plan_key text not null,
  conversion_rules_json jsonb not null default '[]',
  monthly_flex_budget_json jsonb not null default '{}',
  caps_json jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.adaptive_credit_policies enable row level security;
create policy "adaptive_credit_policies_read" on public.adaptive_credit_policies for select using (true);
create policy "adaptive_credit_policies_admin" on public.adaptive_credit_policies for all using (auth.role() = 'service_role');

-- 2) user_usage_profiles
create table if not exists public.user_usage_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id),
  dominant_usage_profile text not null default 'mixed',
  rolling_30d_usage_json jsonb not null default '{}',
  last_detected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_usage_profiles enable row level security;
create policy "user_usage_profiles_own" on public.user_usage_profiles for select using (auth.uid() = user_id);
create policy "user_usage_profiles_admin" on public.user_usage_profiles for all using (auth.role() = 'service_role');

create index if not exists idx_user_usage_profiles_user on public.user_usage_profiles(user_id);

-- 3) adaptive_credit_balances
create table if not exists public.adaptive_credit_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  billing_period_start timestamptz not null,
  billing_period_end timestamptz not null,
  available_flex_credits_json jsonb not null default '{}',
  consumed_flex_credits_json jsonb not null default '{}',
  reallocation_log_json jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, billing_period_start)
);

alter table public.adaptive_credit_balances enable row level security;
create policy "adaptive_credit_balances_own" on public.adaptive_credit_balances for select using (auth.uid() = user_id);
create policy "adaptive_credit_balances_admin" on public.adaptive_credit_balances for all using (auth.role() = 'service_role');

create index if not exists idx_adaptive_credit_balances_user on public.adaptive_credit_balances(user_id);
create index if not exists idx_adaptive_credit_balances_period on public.adaptive_credit_balances(billing_period_start, billing_period_end);

-- 4) mission_qa_results (escape game QA audit trail)
create table if not exists public.mission_qa_results (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null,
  overall_score integer not null default 0,
  checks_json jsonb not null default '[]',
  publish_blocked boolean not null default false,
  blocking_violations_json jsonb not null default '[]',
  warnings_json jsonb not null default '[]',
  retention_report_json jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.mission_qa_results enable row level security;
create policy "mission_qa_results_admin" on public.mission_qa_results for all using (auth.role() = 'service_role');
create policy "mission_qa_results_read" on public.mission_qa_results for select using (true);

create index if not exists idx_mission_qa_results_mission on public.mission_qa_results(mission_id);

-- 5) Seed adaptive credit policies
insert into public.adaptive_credit_policies (policy_key, plan_key, conversion_rules_json, monthly_flex_budget_json, caps_json) values
  ('core_default', 'core',
    '[
      {"from": "video_template_render", "to": "music_generation", "ratio": 2, "max_convertible_pct": 60},
      {"from": "video_template_render", "to": "escape_game_generation", "ratio": 1.5, "max_convertible_pct": 60},
      {"from": "video_generation_ai_seconds", "to": "music_generation", "ratio": 3, "max_convertible_pct": 40},
      {"from": "music_generation", "to": "escape_game_generation", "ratio": 0.8, "max_convertible_pct": 30},
      {"from": "escape_game_generation", "to": "music_generation", "ratio": 1.2, "max_convertible_pct": 30}
    ]',
    '{"total_flex_units": 15, "allocatable_to": {"music_generation": 8, "escape_game_generation": 5, "dynamic_sheet_generation": 10, "animated_story_generation": 8}}',
    '{"max_reallocation_pct": 30, "video_ai_never_reallocatable": true, "per_feature_caps": {"music_generation": 8, "escape_game_generation": 5}}'
  ),
  ('plus_default', 'plus',
    '[
      {"from": "video_template_render", "to": "music_generation", "ratio": 2, "max_convertible_pct": 60},
      {"from": "video_template_render", "to": "escape_game_generation", "ratio": 1.5, "max_convertible_pct": 60},
      {"from": "video_generation_ai_seconds", "to": "music_generation", "ratio": 3, "max_convertible_pct": 50},
      {"from": "video_generation_ai_seconds", "to": "escape_game_generation", "ratio": 2, "max_convertible_pct": 50},
      {"from": "music_generation", "to": "escape_game_generation", "ratio": 0.8, "max_convertible_pct": 40},
      {"from": "escape_game_generation", "to": "music_generation", "ratio": 1.2, "max_convertible_pct": 40}
    ]',
    '{"total_flex_units": 30, "allocatable_to": {"music_generation": 15, "escape_game_generation": 10, "dynamic_sheet_generation": 20, "animated_story_generation": 15, "video_template_render": 5}}',
    '{"max_reallocation_pct": 40, "video_ai_never_reallocatable": true, "per_feature_caps": {"music_generation": 15, "escape_game_generation": 10, "video_template_render": 5}}'
  ),
  ('premium_family_default', 'premium_family',
    '[
      {"from": "video_template_render", "to": "music_generation", "ratio": 2, "max_convertible_pct": 70},
      {"from": "video_template_render", "to": "escape_game_generation", "ratio": 1.5, "max_convertible_pct": 70},
      {"from": "video_generation_ai_seconds", "to": "music_generation", "ratio": 3, "max_convertible_pct": 50},
      {"from": "video_generation_ai_seconds", "to": "escape_game_generation", "ratio": 2, "max_convertible_pct": 50},
      {"from": "music_generation", "to": "escape_game_generation", "ratio": 0.8, "max_convertible_pct": 50},
      {"from": "escape_game_generation", "to": "music_generation", "ratio": 1.2, "max_convertible_pct": 50}
    ]',
    '{"total_flex_units": 50, "allocatable_to": {"music_generation": 25, "escape_game_generation": 20, "dynamic_sheet_generation": 30, "animated_story_generation": 25, "video_template_render": 10}}',
    '{"max_reallocation_pct": 50, "video_ai_never_reallocatable": true, "per_feature_caps": {"music_generation": 25, "escape_game_generation": 20, "video_template_render": 10}}'
  ),
  ('family_plus_default', 'family_plus',
    '[
      {"from": "video_template_render", "to": "music_generation", "ratio": 2, "max_convertible_pct": 70},
      {"from": "video_template_render", "to": "escape_game_generation", "ratio": 1.5, "max_convertible_pct": 70},
      {"from": "video_generation_ai_seconds", "to": "music_generation", "ratio": 3, "max_convertible_pct": 50},
      {"from": "video_generation_ai_seconds", "to": "escape_game_generation", "ratio": 2, "max_convertible_pct": 50},
      {"from": "music_generation", "to": "escape_game_generation", "ratio": 0.8, "max_convertible_pct": 50},
      {"from": "escape_game_generation", "to": "music_generation", "ratio": 1.2, "max_convertible_pct": 50}
    ]',
    '{"total_flex_units": 80, "allocatable_to": {"music_generation": 40, "escape_game_generation": 30, "dynamic_sheet_generation": 50, "animated_story_generation": 40, "video_template_render": 20}}',
    '{"max_reallocation_pct": 60, "video_ai_never_reallocatable": true, "per_feature_caps": {"music_generation": 40, "escape_game_generation": 30, "video_template_render": 20}}'
  )
on conflict (policy_key) do nothing;
