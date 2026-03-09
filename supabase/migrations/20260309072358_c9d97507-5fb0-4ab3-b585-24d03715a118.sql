
-- Fix all RESTRICTIVE policies to PERMISSIVE

-- profiles: Add permissive public read for leaderboard (display_name, avatar_url, university, country)
CREATE POLICY "profiles_public_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- Drop and recreate prof_select as PERMISSIVE (the new public read replaces it)
DROP POLICY IF EXISTS "prof_select" ON public.profiles;

-- Fix collaborative_sessions policies to PERMISSIVE
DROP POLICY IF EXISTS "session_select" ON public.collaborative_sessions;
CREATE POLICY "session_select" ON public.collaborative_sessions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "session_insert" ON public.collaborative_sessions;
CREATE POLICY "session_insert" ON public.collaborative_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "session_update" ON public.collaborative_sessions;
CREATE POLICY "session_update" ON public.collaborative_sessions FOR UPDATE TO authenticated USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "session_delete" ON public.collaborative_sessions;
CREATE POLICY "session_delete" ON public.collaborative_sessions FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- Fix session_participants policies to PERMISSIVE
DROP POLICY IF EXISTS "participant_select" ON public.session_participants;
CREATE POLICY "participant_select" ON public.session_participants FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "participant_insert" ON public.session_participants;
CREATE POLICY "participant_insert" ON public.session_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "participant_update" ON public.session_participants;
CREATE POLICY "participant_update" ON public.session_participants FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "participant_delete" ON public.session_participants;
CREATE POLICY "participant_delete" ON public.session_participants FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix league_points policies to PERMISSIVE
DROP POLICY IF EXISTS "league_select" ON public.league_points;
CREATE POLICY "league_select" ON public.league_points FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "league_insert" ON public.league_points;
CREATE POLICY "league_insert" ON public.league_points FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Fix song_ratings policies to PERMISSIVE
DROP POLICY IF EXISTS "rating_select" ON public.song_ratings;
CREATE POLICY "rating_select" ON public.song_ratings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rating_insert" ON public.song_ratings;
CREATE POLICY "rating_insert" ON public.song_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "rating_update" ON public.song_ratings;
CREATE POLICY "rating_update" ON public.song_ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "rating_delete" ON public.song_ratings;
CREATE POLICY "rating_delete" ON public.song_ratings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix favorites policies to PERMISSIVE
DROP POLICY IF EXISTS "fav_select" ON public.favorites;
CREATE POLICY "fav_select" ON public.favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "fav_insert" ON public.favorites;
CREATE POLICY "fav_insert" ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "fav_delete" ON public.favorites;
CREATE POLICY "fav_delete" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix notifications policies to PERMISSIVE
DROP POLICY IF EXISTS "notif_select" ON public.notifications;
CREATE POLICY "notif_select" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_update" ON public.notifications;
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_delete" ON public.notifications;
CREATE POLICY "notif_delete" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix songs policies to PERMISSIVE
DROP POLICY IF EXISTS "songs_select" ON public.songs;
CREATE POLICY "songs_select" ON public.songs FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "songs_public_read" ON public.songs;
CREATE POLICY "songs_public_read" ON public.songs FOR SELECT TO authenticated USING (is_public = true);

DROP POLICY IF EXISTS "songs_insert" ON public.songs;
CREATE POLICY "songs_insert" ON public.songs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "songs_update" ON public.songs;
CREATE POLICY "songs_update" ON public.songs FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "songs_delete" ON public.songs;
CREATE POLICY "songs_delete" ON public.songs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix profiles remaining policies to PERMISSIVE
DROP POLICY IF EXISTS "prof_insert" ON public.profiles;
CREATE POLICY "prof_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "prof_update" ON public.profiles;
CREATE POLICY "prof_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "prof_delete" ON public.profiles;
CREATE POLICY "prof_delete" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix subscriptions policies to PERMISSIVE
DROP POLICY IF EXISTS "sub_select" ON public.subscriptions;
CREATE POLICY "sub_select" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sub_service" ON public.subscriptions;
CREATE POLICY "sub_service" ON public.subscriptions FOR ALL USING (true) WITH CHECK (true);

-- Fix usage_quotas policies to PERMISSIVE
DROP POLICY IF EXISTS "quota_select" ON public.usage_quotas;
CREATE POLICY "quota_select" ON public.usage_quotas FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Fix contact_messages policies to PERMISSIVE
DROP POLICY IF EXISTS "contact_insert" ON public.contact_messages;
CREATE POLICY "contact_insert" ON public.contact_messages FOR INSERT WITH CHECK (true);

-- Add length validation trigger for contact_messages
CREATE OR REPLACE FUNCTION public.validate_contact_message()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF length(NEW.name) > 200 THEN
    RAISE EXCEPTION 'Name too long (max 200 characters)';
  END IF;
  IF length(NEW.email) > 320 THEN
    RAISE EXCEPTION 'Email too long (max 320 characters)';
  END IF;
  IF length(NEW.message) > 5000 THEN
    RAISE EXCEPTION 'Message too long (max 5000 characters)';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_contact_message_trigger
  BEFORE INSERT ON public.contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_contact_message();
