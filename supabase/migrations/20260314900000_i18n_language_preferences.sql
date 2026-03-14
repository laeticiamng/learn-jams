-- ============================================================
-- Migration: i18n Language Preferences
-- Adds language preference columns to support full i18n
-- ============================================================

-- 1. User language preferences (on profiles table if exists, otherwise on auth metadata)
-- Add columns to store user language preferences
DO $$
BEGIN
  -- Add preferred_ui_language to profiles if the column doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferred_ui_language'
  ) THEN
    ALTER TABLE profiles ADD COLUMN preferred_ui_language text DEFAULT 'fr';
  END IF;

  -- Add preferred_generation_language
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferred_generation_language'
  ) THEN
    ALTER TABLE profiles ADD COLUMN preferred_generation_language text DEFAULT 'fr';
  END IF;

  -- Add preferred_guardian_language (for minors whose guardian may speak a different language)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferred_guardian_language'
  ) THEN
    ALTER TABLE profiles ADD COLUMN preferred_guardian_language text;
  END IF;
END $$;

-- 2. Guardian preferred language
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'guardians'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardians' AND column_name = 'preferred_language'
  ) THEN
    ALTER TABLE guardians ADD COLUMN preferred_language text DEFAULT 'fr';
  END IF;
END $$;

-- 3. Song / lyrics generation language tracking
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'songs'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'songs' AND column_name = 'generation_language'
  ) THEN
    ALTER TABLE songs ADD COLUMN generation_language text DEFAULT 'fr';
  END IF;
END $$;

-- 4. Transformation language tracking
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'transformations'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'transformations' AND column_name = 'generation_language'
    ) THEN
      ALTER TABLE transformations ADD COLUMN generation_language text DEFAULT 'fr';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'transformations' AND column_name = 'ui_language_snapshot'
    ) THEN
      ALTER TABLE transformations ADD COLUMN ui_language_snapshot text DEFAULT 'fr';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'transformations' AND column_name = 'source_language'
    ) THEN
      ALTER TABLE transformations ADD COLUMN source_language text;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'transformations' AND column_name = 'target_language'
    ) THEN
      ALTER TABLE transformations ADD COLUMN target_language text;
    END IF;
  END IF;
END $$;

-- 5. Email / SMS notification language tracking
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'guardian_notifications'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardian_notifications' AND column_name = 'language'
  ) THEN
    ALTER TABLE guardian_notifications ADD COLUMN language text DEFAULT 'fr';
  END IF;
END $$;

-- 6. Supported locales reference table
CREATE TABLE IF NOT EXISTS supported_locales (
  code text PRIMARY KEY,
  label text NOT NULL,
  dir text NOT NULL DEFAULT 'ltr' CHECK (dir IN ('ltr', 'rtl')),
  html_lang text NOT NULL,
  tts_locale text NOT NULL,
  fallback text NOT NULL REFERENCES supported_locales(code) DEFERRABLE INITIALLY DEFERRED,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed supported locales
INSERT INTO supported_locales (code, label, dir, html_lang, tts_locale, fallback) VALUES
  ('en', 'English', 'ltr', 'en', 'en-US', 'fr'),
  ('fr', 'Français', 'ltr', 'fr', 'fr-FR', 'en'),
  ('de', 'Deutsch', 'ltr', 'de', 'de-DE', 'en'),
  ('es', 'Español', 'ltr', 'es', 'es-ES', 'en'),
  ('ar', 'العربية', 'rtl', 'ar', 'ar-SA', 'en'),
  ('hi', 'हिन्दी', 'ltr', 'hi', 'hi-IN', 'en'),
  ('zh', '中文', 'ltr', 'zh-Hans', 'zh-CN', 'en')
ON CONFLICT (code) DO NOTHING;

-- RLS
ALTER TABLE supported_locales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supported_locales_read_all"
  ON supported_locales FOR SELECT
  USING (true);
