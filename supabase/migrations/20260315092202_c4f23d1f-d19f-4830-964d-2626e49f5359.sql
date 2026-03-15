
-- Additional billing tables

-- cost_events
CREATE TABLE IF NOT EXISTS public.cost_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  feature_key text NOT NULL,
  provider_key text NOT NULL DEFAULT '',
  estimated_cost_usd numeric DEFAULT 0,
  actual_cost_usd numeric DEFAULT 0,
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cost_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cost_events_insert" ON public.cost_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cost_events_owner_select" ON public.cost_events FOR SELECT TO authenticated USING (user_id = auth.uid());

-- margin_reports
CREATE TABLE IF NOT EXISTS public.margin_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  period_start timestamptz,
  period_end timestamptz,
  total_revenue_usd numeric DEFAULT 0,
  total_cost_usd numeric DEFAULT 0,
  margin_pct numeric DEFAULT 0,
  details_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.margin_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "margin_reports_insert" ON public.margin_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "margin_reports_select" ON public.margin_reports FOR SELECT TO authenticated USING (user_id = auth.uid());

-- adaptive_credit_balances
CREATE TABLE IF NOT EXISTS public.adaptive_credit_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  consumed_flex_credits_json jsonb DEFAULT '{}'::jsonb,
  reallocation_log_json jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.adaptive_credit_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acb_owner" ON public.adaptive_credit_balances FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "acb_insert" ON public.adaptive_credit_balances FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "acb_update" ON public.adaptive_credit_balances FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- user_usage_profiles
CREATE TABLE IF NOT EXISTS public.user_usage_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  dominant_usage_profile text DEFAULT 'explorer',
  rolling_30d_json jsonb DEFAULT '{}'::jsonb,
  feature_distribution_json jsonb DEFAULT '{}'::jsonb,
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_usage_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uup_owner" ON public.user_usage_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "uup_insert" ON public.user_usage_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "uup_update" ON public.user_usage_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Add missing columns to user_credit_balances
ALTER TABLE public.user_credit_balances ADD COLUMN IF NOT EXISTS remaining numeric DEFAULT 0;
ALTER TABLE public.user_credit_balances ADD COLUMN IF NOT EXISTS credit_type text DEFAULT 'standard';
