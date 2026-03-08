
-- Add university and country to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS university text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country text;

-- Add is_public to songs for league feature
ALTER TABLE songs ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Collaborative sessions
CREATE TABLE IF NOT EXISTS collaborative_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  title text NOT NULL,
  topic text NOT NULL,
  style text NOT NULL DEFAULT 'pop',
  status text NOT NULL DEFAULT 'open',
  max_participants int NOT NULL DEFAULT 8,
  invite_code text NOT NULL DEFAULT substr(gen_random_uuid()::text, 1, 8),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  final_song_id uuid REFERENCES songs(id)
);

CREATE TABLE IF NOT EXISTS session_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES collaborative_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  subtopic text,
  verse_text text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- League points
CREATE TABLE IF NOT EXISTS league_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  points int NOT NULL DEFAULT 0,
  week text NOT NULL,
  reason text NOT NULL,
  song_id uuid REFERENCES songs(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Song ratings
CREATE TABLE IF NOT EXISTS song_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id uuid NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating int NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(song_id, user_id)
);

-- Rating validation trigger
CREATE OR REPLACE FUNCTION validate_rating()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_rating_range
  BEFORE INSERT OR UPDATE ON song_ratings
  FOR EACH ROW EXECUTE FUNCTION validate_rating();

-- Enable realtime for collaborative sessions
ALTER PUBLICATION supabase_realtime ADD TABLE collaborative_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE session_participants;

-- RLS
ALTER TABLE collaborative_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_ratings ENABLE ROW LEVEL SECURITY;

-- Collaborative sessions policies (PERMISSIVE)
CREATE POLICY "session_select" ON collaborative_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "session_insert" ON collaborative_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "session_update" ON collaborative_sessions FOR UPDATE TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "session_delete" ON collaborative_sessions FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- Session participants policies
CREATE POLICY "participant_select" ON session_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "participant_insert" ON session_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "participant_update" ON session_participants FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "participant_delete" ON session_participants FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- League points policies
CREATE POLICY "league_select" ON league_points FOR SELECT TO authenticated USING (true);
CREATE POLICY "league_insert" ON league_points FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Song ratings policies
CREATE POLICY "rating_select" ON song_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "rating_insert" ON song_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rating_update" ON song_ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "rating_delete" ON song_ratings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Allow reading public songs for league
CREATE POLICY "songs_public_read" ON songs FOR SELECT TO authenticated USING (is_public = true);

-- Update updated_at triggers
CREATE TRIGGER update_collaborative_sessions_updated_at
  BEFORE UPDATE ON collaborative_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
