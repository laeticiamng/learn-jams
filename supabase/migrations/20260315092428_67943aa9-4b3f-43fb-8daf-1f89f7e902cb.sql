
-- guardian_notification_preferences
CREATE TABLE IF NOT EXISTS public.guardian_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  channel text DEFAULT 'email',
  enabled boolean DEFAULT true,
  frequency text DEFAULT 'weekly',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.guardian_notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gnp_read" ON public.guardian_notification_preferences FOR SELECT TO authenticated USING (true);
CREATE POLICY "gnp_insert" ON public.guardian_notification_preferences FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "gnp_update" ON public.guardian_notification_preferences FOR UPDATE TO authenticated USING (true);

-- guardian_notifications
CREATE TABLE IF NOT EXISTS public.guardian_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  user_id uuid,
  notification_type text NOT NULL DEFAULT 'info',
  title text DEFAULT '',
  message text DEFAULT '',
  is_read boolean DEFAULT false,
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.guardian_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gn_read" ON public.guardian_notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "gn_insert" ON public.guardian_notifications FOR INSERT TO authenticated WITH CHECK (true);

-- experiment_assignments
CREATE TABLE IF NOT EXISTS public.experiment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  experiment_key text NOT NULL,
  variant text NOT NULL DEFAULT 'control',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, experiment_key)
);
ALTER TABLE public.experiment_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ea_owner" ON public.experiment_assignments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ea_insert" ON public.experiment_assignments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- experiment_runs
CREATE TABLE IF NOT EXISTS public.experiment_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_key text NOT NULL,
  status text DEFAULT 'active',
  config_json jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.experiment_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "er_read" ON public.experiment_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "er_insert" ON public.experiment_runs FOR INSERT TO authenticated WITH CHECK (true);

-- experiment_measurements
CREATE TABLE IF NOT EXISTS public.experiment_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_key text NOT NULL,
  user_id uuid,
  metric_key text NOT NULL,
  metric_value numeric DEFAULT 0,
  variant text DEFAULT 'control',
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.experiment_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "em_insert" ON public.experiment_measurements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "em_read" ON public.experiment_measurements FOR SELECT TO authenticated USING (true);

-- Add retention_signal to learner_format_effectiveness
ALTER TABLE public.learner_format_effectiveness ADD COLUMN IF NOT EXISTS retention_signal numeric DEFAULT 0;
