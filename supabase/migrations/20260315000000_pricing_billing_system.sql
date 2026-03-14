-- ============================================================
-- Ticket 14 — Pricing / Billing / Quotas / Top-ups / Cost Tracking
-- ============================================================

-- 1) pricing_plans
create table if not exists public.pricing_plans (
  id uuid primary key default gen_random_uuid(),
  plan_key text unique not null,
  name text not null,
  segment text not null check (segment in ('b2c', 'family', 'b2b')),
  active boolean not null default true,
  features_json jsonb not null default '{}',
  quotas_json jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pricing_plans enable row level security;
create policy "pricing_plans_read" on public.pricing_plans for select using (true);
create policy "pricing_plans_admin" on public.pricing_plans for all using (auth.role() = 'service_role');

-- 2) pricing_zones
create table if not exists public.pricing_zones (
  id uuid primary key default gen_random_uuid(),
  zone_key text unique not null,
  label text not null,
  countries_json jsonb not null default '[]',
  multiplier numeric not null default 1.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pricing_zones enable row level security;
create policy "pricing_zones_read" on public.pricing_zones for select using (true);
create policy "pricing_zones_admin" on public.pricing_zones for all using (auth.role() = 'service_role');

-- 3) pricing_plan_prices
create table if not exists public.pricing_plan_prices (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.pricing_plans(id),
  zone_id uuid not null references public.pricing_zones(id),
  currency text not null default 'EUR',
  monthly_price numeric not null,
  annual_price numeric not null,
  stripe_price_id_monthly text,
  stripe_price_id_annual text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(plan_id, zone_id)
);

alter table public.pricing_plan_prices enable row level security;
create policy "pricing_plan_prices_read" on public.pricing_plan_prices for select using (true);
create policy "pricing_plan_prices_admin" on public.pricing_plan_prices for all using (auth.role() = 'service_role');

-- 4) usage_quotas (v2 — replaces old month-based quota)
create table if not exists public.usage_quotas_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  billing_period_start timestamptz not null,
  billing_period_end timestamptz not null,
  counters_json jsonb not null default '{}',
  plan_snapshot_json jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, billing_period_start)
);

alter table public.usage_quotas_v2 enable row level security;
create policy "usage_quotas_v2_own" on public.usage_quotas_v2 for select using (auth.uid() = user_id);
create policy "usage_quotas_v2_admin" on public.usage_quotas_v2 for all using (auth.role() = 'service_role');

-- 5) credit_packs
create table if not exists public.credit_packs (
  id uuid primary key default gen_random_uuid(),
  pack_key text unique not null,
  label text not null,
  price numeric not null,
  currency text not null default 'EUR',
  credits_json jsonb not null default '{}',
  stripe_price_id text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.credit_packs enable row level security;
create policy "credit_packs_read" on public.credit_packs for select using (true);
create policy "credit_packs_admin" on public.credit_packs for all using (auth.role() = 'service_role');

-- 6) user_credit_balances (tracks purchased top-ups)
create table if not exists public.user_credit_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  credit_type text not null,
  remaining integer not null default 0,
  expires_at timestamptz,
  purchase_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_credit_balances enable row level security;
create policy "user_credits_own" on public.user_credit_balances for select using (auth.uid() = user_id);
create policy "user_credits_admin" on public.user_credit_balances for all using (auth.role() = 'service_role');

-- 7) cost_events
create table if not exists public.cost_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  transformation_id uuid,
  feature_key text not null,
  provider_key text not null,
  estimated_cost_usd numeric,
  actual_cost_usd numeric,
  metadata_json jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.cost_events enable row level security;
create policy "cost_events_admin" on public.cost_events for all using (auth.role() = 'service_role');

create index if not exists idx_cost_events_user on public.cost_events(user_id);
create index if not exists idx_cost_events_feature on public.cost_events(feature_key);
create index if not exists idx_cost_events_created on public.cost_events(created_at);

-- 8) margin_reports
create table if not exists public.margin_reports (
  id uuid primary key default gen_random_uuid(),
  period_key text not null,
  plan_key text not null,
  revenue_total_usd numeric not null default 0,
  provider_cost_total_usd numeric not null default 0,
  gross_margin_usd numeric not null default 0,
  gross_margin_pct numeric not null default 0,
  created_at timestamptz not null default now(),
  unique(period_key, plan_key)
);

alter table public.margin_reports enable row level security;
create policy "margin_reports_admin" on public.margin_reports for all using (auth.role() = 'service_role');

-- ============================================================
-- SEED DATA
-- ============================================================

-- Pricing Zones
insert into public.pricing_zones (zone_key, label, countries_json, multiplier) values
  ('zone_a', 'Zone A — Full Price', '["FR","DE","GB","US","CA","AU","JP","KR","CH","AT","BE","NL","LU","IE","IT","ES","PT","FI","SE","NO","DK","IS"]', 1.00),
  ('zone_b', 'Zone B — Reduced', '["PL","CZ","SK","HU","RO","BG","HR","SI","LT","LV","EE","TR","SA","AE","QA","KW","BH","OM","MX","BR","AR","CL","CO"]', 0.75),
  ('zone_c', 'Zone C — Emerging', '["IN","BD","PK","LK","NP","NG","KE","GH","TZ","UG","ET","EG","MA","TN","DZ","PH","VN","ID","TH","MM"]', 0.55)
on conflict (zone_key) do nothing;

-- Pricing Plans
insert into public.pricing_plans (plan_key, name, segment, features_json, quotas_json) values
  ('free', 'Free', 'b2c', '{
    "dynamic_sheet_generation": true,
    "animated_story_generation": false,
    "escape_game_generation": "demo_only",
    "music_generation": true,
    "video_generation_ai_seconds": false,
    "video_template_render": false,
    "guardian_sms": false,
    "guardian_email": false,
    "premium_export": false,
    "priority_generation": false
  }', '{
    "music_generation": 2,
    "escape_game_generation": 0,
    "dynamic_sheet_generation": 3,
    "animated_story_generation": 0,
    "video_template_render": 0,
    "video_generation_ai_seconds": 0,
    "guardian_sms": 0,
    "guardian_email": 0,
    "premium_export": 0
  }'),
  ('core', 'Core', 'b2c', '{
    "dynamic_sheet_generation": true,
    "animated_story_generation": true,
    "escape_game_generation": true,
    "music_generation": true,
    "video_generation_ai_seconds": true,
    "video_template_render": true,
    "guardian_sms": false,
    "guardian_email": false,
    "premium_export": false,
    "priority_generation": false
  }', '{
    "music_generation": 25,
    "escape_game_generation": 10,
    "dynamic_sheet_generation": -1,
    "animated_story_generation": -1,
    "video_template_render": 5,
    "video_generation_ai_seconds": 15,
    "guardian_sms": 0,
    "guardian_email": 0,
    "premium_export": 0
  }'),
  ('plus', 'Plus', 'b2c', '{
    "dynamic_sheet_generation": true,
    "animated_story_generation": true,
    "escape_game_generation": true,
    "music_generation": true,
    "video_generation_ai_seconds": true,
    "video_template_render": true,
    "guardian_sms": false,
    "guardian_email": true,
    "premium_export": true,
    "priority_generation": true
  }', '{
    "music_generation": 60,
    "escape_game_generation": 30,
    "dynamic_sheet_generation": -1,
    "animated_story_generation": -1,
    "video_template_render": 15,
    "video_generation_ai_seconds": 60,
    "guardian_sms": 0,
    "guardian_email": 10,
    "premium_export": -1
  }'),
  ('premium_family', 'Premium / Family', 'family', '{
    "dynamic_sheet_generation": true,
    "animated_story_generation": true,
    "escape_game_generation": true,
    "music_generation": true,
    "video_generation_ai_seconds": true,
    "video_template_render": true,
    "guardian_sms": true,
    "guardian_email": true,
    "premium_export": true,
    "priority_generation": true,
    "multi_profile": true,
    "parent_dashboard": true
  }', '{
    "music_generation": 100,
    "escape_game_generation": 80,
    "dynamic_sheet_generation": -1,
    "animated_story_generation": -1,
    "video_template_render": 30,
    "video_generation_ai_seconds": 120,
    "guardian_sms": 10,
    "guardian_email": 30,
    "premium_export": -1
  }'),
  ('family_plus', 'Family Plus', 'family', '{
    "dynamic_sheet_generation": true,
    "animated_story_generation": true,
    "escape_game_generation": true,
    "music_generation": true,
    "video_generation_ai_seconds": true,
    "video_template_render": true,
    "guardian_sms": true,
    "guardian_email": true,
    "premium_export": true,
    "priority_generation": true,
    "multi_profile": true,
    "multi_profile_extended": true,
    "parent_dashboard": true,
    "multi_guardian": true,
    "premium_support": true
  }', '{
    "music_generation": 250,
    "escape_game_generation": 200,
    "dynamic_sheet_generation": -1,
    "animated_story_generation": -1,
    "video_template_render": 80,
    "video_generation_ai_seconds": 300,
    "guardian_sms": 30,
    "guardian_email": 100,
    "premium_export": -1
  }'),
  ('school', 'School / Institution', 'b2b', '{
    "dynamic_sheet_generation": true,
    "animated_story_generation": true,
    "escape_game_generation": true,
    "music_generation": true,
    "video_generation_ai_seconds": true,
    "video_template_render": true,
    "guardian_sms": true,
    "guardian_email": true,
    "premium_export": true,
    "priority_generation": true,
    "multi_profile": true,
    "admin_dashboard": true,
    "custom_branding": false
  }', '{
    "music_generation": 500,
    "escape_game_generation": 500,
    "dynamic_sheet_generation": -1,
    "animated_story_generation": -1,
    "video_template_render": 100,
    "video_generation_ai_seconds": 600,
    "guardian_sms": 100,
    "guardian_email": 500,
    "premium_export": -1
  }')
on conflict (plan_key) do nothing;

-- Pricing Plan Prices (Zone A, B, C)
-- Free plan = 0 in all zones
insert into public.pricing_plan_prices (plan_id, zone_id, currency, monthly_price, annual_price)
select p.id, z.id, 'EUR', 0, 0
from public.pricing_plans p, public.pricing_zones z
where p.plan_key = 'free'
on conflict (plan_id, zone_id) do nothing;

-- Core
insert into public.pricing_plan_prices (plan_id, zone_id, currency, monthly_price, annual_price)
select p.id, z.id, 'EUR',
  case z.zone_key when 'zone_a' then 34 when 'zone_b' then 26 when 'zone_c' then 19 end,
  case z.zone_key when 'zone_a' then 348 when 'zone_b' then 264 when 'zone_c' then 192 end
from public.pricing_plans p, public.pricing_zones z
where p.plan_key = 'core'
on conflict (plan_id, zone_id) do nothing;

-- Plus
insert into public.pricing_plan_prices (plan_id, zone_id, currency, monthly_price, annual_price)
select p.id, z.id, 'EUR',
  case z.zone_key when 'zone_a' then 69 when 'zone_b' then 52 when 'zone_c' then 39 end,
  case z.zone_key when 'zone_a' then 708 when 'zone_b' then 528 when 'zone_c' then 396 end
from public.pricing_plans p, public.pricing_zones z
where p.plan_key = 'plus'
on conflict (plan_id, zone_id) do nothing;

-- Premium / Family
insert into public.pricing_plan_prices (plan_id, zone_id, currency, monthly_price, annual_price)
select p.id, z.id, 'EUR',
  case z.zone_key when 'zone_a' then 99 when 'zone_b' then 74 when 'zone_c' then 54 end,
  case z.zone_key when 'zone_a' then 1008 when 'zone_b' then 756 when 'zone_c' then 552 end
from public.pricing_plans p, public.pricing_zones z
where p.plan_key = 'premium_family'
on conflict (plan_id, zone_id) do nothing;

-- Family Plus
insert into public.pricing_plan_prices (plan_id, zone_id, currency, monthly_price, annual_price)
select p.id, z.id, 'EUR',
  case z.zone_key when 'zone_a' then 229 when 'zone_b' then 169 when 'zone_c' then 119 end,
  case z.zone_key when 'zone_a' then 2388 when 'zone_b' then 1788 when 'zone_c' then 1188 end
from public.pricing_plans p, public.pricing_zones z
where p.plan_key = 'family_plus'
on conflict (plan_id, zone_id) do nothing;

-- Credit Packs (Top-ups)
insert into public.credit_packs (pack_key, label, price, currency, credits_json) values
  ('songs_5', '5 Extra Songs', 6.90, 'EUR', '{"music_generation": 5}'),
  ('songs_15', '15 Extra Songs', 16.90, 'EUR', '{"music_generation": 15}'),
  ('escape_5', '5 Extra Escape Games', 8.90, 'EUR', '{"escape_game_generation": 5}'),
  ('escape_15', '15 Extra Escape Games', 21.90, 'EUR', '{"escape_game_generation": 15}'),
  ('video_ai_30s', '+30s AI Video', 9.90, 'EUR', '{"video_generation_ai_seconds": 30}'),
  ('video_ai_60s', '+60s AI Video', 18.90, 'EUR', '{"video_generation_ai_seconds": 60}'),
  ('video_ai_120s', '+120s AI Video', 34.90, 'EUR', '{"video_generation_ai_seconds": 120}'),
  ('sms_10', '10 Guardian SMS', 3.90, 'EUR', '{"guardian_sms": 10}'),
  ('sms_50', '50 Guardian SMS', 14.90, 'EUR', '{"guardian_sms": 50}'),
  ('family_support_plus', 'Family Support+', 9.90, 'EUR', '{"premium_support": 1}')
on conflict (pack_key) do nothing;

-- Margin guard-rail parameters
insert into public.margin_reports (period_key, plan_key, revenue_total_usd, provider_cost_total_usd, gross_margin_usd, gross_margin_pct) values
  ('config', '_targets', 0, 0, 0, 0)
on conflict (period_key, plan_key) do nothing;
