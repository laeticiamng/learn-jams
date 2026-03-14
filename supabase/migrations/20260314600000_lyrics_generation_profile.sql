-- ============================================================
-- Lyrics Generation Profile — Audience-adapted lyrics system
-- ============================================================

-- 1. Add new columns to songs table
ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS learner_lyrics_profile_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS canonical_lyrics text,
  ADD COLUMN IF NOT EXISTS audio_safe_lyrics text,
  ADD COLUMN IF NOT EXISTS lyrics_version integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS audience_level text,
  ADD COLUMN IF NOT EXISTS vocabulary_level text,
  ADD COLUMN IF NOT EXISTS density_level text,
  ADD COLUMN IF NOT EXISTS sanitizer_report_json jsonb DEFAULT '{}'::jsonb;

-- 2. Create lyrics_generations table for versioned history
CREATE TABLE IF NOT EXISTS public.lyrics_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id uuid NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  learner_lyrics_profile_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  canonical_lyrics text NOT NULL,
  audio_safe_lyrics text,
  lyrics_metadata_text text,
  lyrics_metadata_json jsonb DEFAULT '{}'::jsonb,
  audience_level text,
  vocabulary_level text,
  density_level text,
  generation_flags_json jsonb DEFAULT '[]'::jsonb,
  sanitizer_report_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lyrics_generations_song ON public.lyrics_generations(song_id);
CREATE INDEX idx_lyrics_generations_version ON public.lyrics_generations(song_id, version);

-- 3. RLS for lyrics_generations
ALTER TABLE public.lyrics_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lyrics_generations_select_own" ON public.lyrics_generations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.songs s
      WHERE s.id = lyrics_generations.song_id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "lyrics_generations_insert_own" ON public.lyrics_generations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.songs s
      WHERE s.id = lyrics_generations.song_id
      AND s.user_id = auth.uid()
    )
  );
