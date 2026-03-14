-- ============================================================
-- Migration: Guardian Loop / Minor Mode / Consent
-- Tables: user_minor_profiles, guardians, user_guardians,
--          guardian_notification_preferences, guardian_notifications,
--          institution_contacts, consent_events
-- ============================================================

-- 1. user_minor_profiles — tracks minor status for users
CREATE TABLE IF NOT EXISTS user_minor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_minor BOOLEAN NOT NULL DEFAULT false,
  birth_year INT,
  country_code TEXT DEFAULT 'FR',
  minor_mode_enabled BOOLEAN NOT NULL DEFAULT false,
  content_filter_level TEXT NOT NULL DEFAULT 'standard'
    CHECK (content_filter_level IN ('standard', 'strict', 'institution')),
  max_daily_minutes INT DEFAULT 120,
  allowed_hours_start INT DEFAULT 6,
  allowed_hours_end INT DEFAULT 22,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- 2. guardians — guardian contact records
CREATE TABLE IF NOT EXISTS guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  display_name TEXT,
  phone TEXT,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  invite_token TEXT UNIQUE,
  invite_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. user_guardians — many-to-many link between users and guardians
CREATE TABLE IF NOT EXISTS user_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL DEFAULT 'parent'
    CHECK (relationship IN ('parent', 'legal_guardian', 'teacher', 'institution_admin')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'revoked')),
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, guardian_id)
);

-- 4. guardian_notification_preferences — per-guardian notification settings
CREATE TABLE IF NOT EXISTS guardian_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  weekly_summary_enabled BOOLEAN NOT NULL DEFAULT true,
  alert_on_content_flag BOOLEAN NOT NULL DEFAULT true,
  alert_on_usage_spike BOOLEAN NOT NULL DEFAULT false,
  alert_on_new_subject BOOLEAN NOT NULL DEFAULT false,
  preferred_channel TEXT NOT NULL DEFAULT 'email'
    CHECK (preferred_channel IN ('email', 'sms', 'push')),
  preferred_locale TEXT NOT NULL DEFAULT 'fr',
  quiet_hours_start INT DEFAULT 22,
  quiet_hours_end INT DEFAULT 7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (guardian_id)
);

-- 5. guardian_notifications — sent notifications log
CREATE TABLE IF NOT EXISTS guardian_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL
    CHECK (notification_type IN ('weekly_summary', 'content_alert', 'usage_alert', 'service_alert', 'consent_request')),
  channel TEXT NOT NULL DEFAULT 'email'
    CHECK (channel IN ('email', 'sms', 'push')),
  subject TEXT,
  body_json JSONB,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. institution_contacts — institution-level admin contacts
CREATE TABLE IF NOT EXISTS institution_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_name TEXT,
  contact_role TEXT DEFAULT 'admin',
  country_code TEXT DEFAULT 'FR',
  contract_type TEXT DEFAULT 'trial'
    CHECK (contract_type IN ('trial', 'school', 'university', 'enterprise')),
  max_users INT DEFAULT 50,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. consent_events — immutable audit log for consent/GDPR
CREATE TABLE IF NOT EXISTS consent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_id UUID REFERENCES guardians(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'minor_declared', 'guardian_invited', 'guardian_accepted',
      'guardian_revoked', 'consent_granted', 'consent_withdrawn',
      'data_export_requested', 'data_deletion_requested',
      'minor_mode_enabled', 'minor_mode_disabled'
    )),
  metadata_json JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_minor_profiles_user_id ON user_minor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_guardians_user_id ON user_guardians(user_id);
CREATE INDEX IF NOT EXISTS idx_user_guardians_guardian_id ON user_guardians(guardian_id);
CREATE INDEX IF NOT EXISTS idx_guardian_notifications_guardian_id ON guardian_notifications(guardian_id);
CREATE INDEX IF NOT EXISTS idx_guardian_notifications_user_id ON guardian_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_guardian_notifications_status ON guardian_notifications(status);
CREATE INDEX IF NOT EXISTS idx_consent_events_user_id ON consent_events(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_events_event_type ON consent_events(event_type);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE user_minor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_events ENABLE ROW LEVEL SECURITY;

-- user_minor_profiles: user can read/write own
CREATE POLICY "Users can read own minor profile"
  ON user_minor_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own minor profile"
  ON user_minor_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own minor profile"
  ON user_minor_profiles FOR UPDATE USING (auth.uid() = user_id);

-- guardians: guardians can read own record, service role for writes
CREATE POLICY "Guardians can read own record"
  ON guardians FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "Service role manages guardians"
  ON guardians FOR ALL USING (auth.role() = 'service_role');

-- user_guardians: user reads own links, active guardians read their links
CREATE POLICY "Users can read own guardian links"
  ON user_guardians FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Active guardians can read their links"
  ON user_guardians FOR SELECT USING (
    guardian_id IN (SELECT id FROM guardians WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "Service role manages user_guardians"
  ON user_guardians FOR ALL USING (auth.role() = 'service_role');

-- guardian_notification_preferences: guardian reads/writes own
CREATE POLICY "Guardians read own notification prefs"
  ON guardian_notification_preferences FOR SELECT USING (
    guardian_id IN (SELECT id FROM guardians WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "Guardians update own notification prefs"
  ON guardian_notification_preferences FOR UPDATE USING (
    guardian_id IN (SELECT id FROM guardians WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "Service role manages notification prefs"
  ON guardian_notification_preferences FOR ALL USING (auth.role() = 'service_role');

-- guardian_notifications: guardian reads own, user reads own
CREATE POLICY "Guardians read own notifications"
  ON guardian_notifications FOR SELECT USING (
    guardian_id IN (SELECT id FROM guardians WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "Users read own notifications"
  ON guardian_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages notifications"
  ON guardian_notifications FOR ALL USING (auth.role() = 'service_role');

-- institution_contacts: service role only
CREATE POLICY "Service role manages institution contacts"
  ON institution_contacts FOR ALL USING (auth.role() = 'service_role');

-- consent_events: user reads own, immutable (no update/delete by users)
CREATE POLICY "Users read own consent events"
  ON consent_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Guardians read related consent events"
  ON consent_events FOR SELECT USING (
    guardian_id IN (SELECT id FROM guardians WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "Service role manages consent events"
  ON consent_events FOR ALL USING (auth.role() = 'service_role');
