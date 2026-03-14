-- ============================================================
-- Security Hardening Migration
-- Tables: security_audit_events, suspicious_activity_flags,
--         webhook_replay_protection
-- ============================================================

-- ── 1. Security Audit Events ──────────────────────────────────

CREATE TABLE IF NOT EXISTS security_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  ip_hash text,
  metadata_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_audit_type ON security_audit_events(event_type);
CREATE INDEX idx_security_audit_severity ON security_audit_events(severity);
CREATE INDEX idx_security_audit_user ON security_audit_events(user_id);
CREATE INDEX idx_security_audit_created ON security_audit_events(created_at DESC);

ALTER TABLE security_audit_events ENABLE ROW LEVEL SECURITY;

-- Only service role can insert/read audit events
CREATE POLICY "service_insert_audit" ON security_audit_events
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "service_select_audit" ON security_audit_events
  FOR SELECT TO service_role USING (true);

-- ── 2. Suspicious Activity Flags ──────────────────────────────

CREATE TABLE IF NOT EXISTS suspicious_activity_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  flag_type text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  details_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_suspicious_flags_status ON suspicious_activity_flags(status);
CREATE INDEX idx_suspicious_flags_user ON suspicious_activity_flags(user_id);
CREATE INDEX idx_suspicious_flags_type ON suspicious_activity_flags(flag_type);

ALTER TABLE suspicious_activity_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_manage_flags" ON suspicious_activity_flags
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 3. Webhook Replay Protection ──────────────────────────────

CREATE TABLE IF NOT EXISTS webhook_replay_protection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL,
  external_event_id text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider_key, external_event_id)
);

CREATE INDEX idx_webhook_replay_provider ON webhook_replay_protection(provider_key);
CREATE INDEX idx_webhook_replay_processed ON webhook_replay_protection(processed_at);

ALTER TABLE webhook_replay_protection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_manage_replay" ON webhook_replay_protection
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 4. Additional RLS policies for existing tables ────────────

-- Ensure songs table has proper RLS
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'songs' AND policyname = 'users_own_songs'
  ) THEN
    ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "users_own_songs" ON songs
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Ensure subscriptions table has proper RLS
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'users_own_subscriptions'
  ) THEN
    ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "users_own_subscriptions" ON subscriptions
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
    CREATE POLICY "service_manage_subscriptions" ON subscriptions
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Ensure webhook_events is service-only
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'webhook_events' AND policyname = 'service_manage_webhooks'
  ) THEN
    ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "service_manage_webhooks" ON webhook_events
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Ensure guardian tables have proper RLS
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'guardians' AND policyname = 'service_manage_guardians'
  ) THEN
    ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "service_manage_guardians" ON guardians
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_guardians' AND policyname = 'users_own_guardian_links'
  ) THEN
    ALTER TABLE user_guardians ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "users_own_guardian_links" ON user_guardians
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
    CREATE POLICY "service_manage_guardian_links" ON user_guardians
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Ensure generation_jobs is user-scoped
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'generation_jobs' AND policyname = 'users_own_jobs'
  ) THEN
    ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "users_own_jobs" ON generation_jobs
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
    CREATE POLICY "service_manage_jobs" ON generation_jobs
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Ensure cost_events is service-only
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cost_events' AND policyname = 'service_manage_costs'
  ) THEN
    ALTER TABLE cost_events ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "service_manage_costs" ON cost_events
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Ensure margin_reports is service-only
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'margin_reports' AND policyname = 'service_manage_margins'
  ) THEN
    ALTER TABLE margin_reports ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "service_manage_margins" ON margin_reports
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 5. Auto-cleanup old audit events (90 days) ───────────────

-- This can be triggered by a cron job or Supabase scheduled function
CREATE OR REPLACE FUNCTION cleanup_old_audit_events()
RETURNS void AS $$
BEGIN
  DELETE FROM security_audit_events
  WHERE created_at < now() - interval '90 days';

  DELETE FROM webhook_replay_protection
  WHERE processed_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
