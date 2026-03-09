
-- P0: Recreate ALL RLS policies as PERMISSIVE
-- P1: Update handle_new_user to read field_of_study from user_metadata

-- 1. songs policies
DROP POLICY IF EXISTS "songs_owner_select" ON public.songs;
DROP POLICY IF EXISTS "songs_public_read" ON public.songs;
DROP POLICY IF EXISTS "songs_insert" ON public.songs;
DROP POLICY IF EXISTS "songs_update" ON public.songs;
DROP POLICY IF EXISTS "songs_delete" ON public.songs;

CREATE POLICY "songs_owner_select" ON public.songs AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "songs_public_read" ON public.songs AS PERMISSIVE FOR SELECT TO authenticated USING (is_public = true);
CREATE POLICY "songs_insert" ON public.songs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "songs_update" ON public.songs AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "songs_delete" ON public.songs AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. profiles policies
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "prof_insert" ON public.profiles;
DROP POLICY IF EXISTS "prof_update" ON public.profiles;
DROP POLICY IF EXISTS "prof_delete" ON public.profiles;

CREATE POLICY "profiles_public_read" ON public.profiles AS PERMISSIVE FOR SELECT USING (true);
CREATE POLICY "prof_insert" ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prof_update" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "prof_delete" ON public.profiles AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. favorites policies
DROP POLICY IF EXISTS "fav_select" ON public.favorites;
DROP POLICY IF EXISTS "fav_insert" ON public.favorites;
DROP POLICY IF EXISTS "fav_delete" ON public.favorites;

CREATE POLICY "fav_select" ON public.favorites AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "fav_insert" ON public.favorites AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fav_delete" ON public.favorites AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. notifications policies
DROP POLICY IF EXISTS "notif_select" ON public.notifications;
DROP POLICY IF EXISTS "notif_update" ON public.notifications;
DROP POLICY IF EXISTS "notif_delete" ON public.notifications;

CREATE POLICY "notif_select" ON public.notifications AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notif_update" ON public.notifications AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notif_delete" ON public.notifications AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. league_points policies
DROP POLICY IF EXISTS "league_select" ON public.league_points;
DROP POLICY IF EXISTS "league_insert" ON public.league_points;

CREATE POLICY "league_select" ON public.league_points AS PERMISSIVE FOR SELECT USING (true);
CREATE POLICY "league_insert" ON public.league_points AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 6. song_ratings policies
DROP POLICY IF EXISTS "rating_select" ON public.song_ratings;
DROP POLICY IF EXISTS "rating_insert" ON public.song_ratings;
DROP POLICY IF EXISTS "rating_update" ON public.song_ratings;
DROP POLICY IF EXISTS "rating_delete" ON public.song_ratings;

CREATE POLICY "rating_select" ON public.song_ratings AS PERMISSIVE FOR SELECT USING (true);
CREATE POLICY "rating_insert" ON public.song_ratings AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rating_update" ON public.song_ratings AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "rating_delete" ON public.song_ratings AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 7. subscriptions policies
DROP POLICY IF EXISTS "sub_select" ON public.subscriptions;
DROP POLICY IF EXISTS "sub_service" ON public.subscriptions;

CREATE POLICY "sub_select" ON public.subscriptions AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sub_service" ON public.subscriptions AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

-- 8. usage_quotas policies
DROP POLICY IF EXISTS "quota_select" ON public.usage_quotas;

CREATE POLICY "quota_select" ON public.usage_quotas AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 9. collaborative_sessions policies
DROP POLICY IF EXISTS "session_select" ON public.collaborative_sessions;
DROP POLICY IF EXISTS "session_insert" ON public.collaborative_sessions;
DROP POLICY IF EXISTS "session_update" ON public.collaborative_sessions;
DROP POLICY IF EXISTS "session_delete" ON public.collaborative_sessions;

CREATE POLICY "session_select" ON public.collaborative_sessions AS PERMISSIVE FOR SELECT USING (true);
CREATE POLICY "session_insert" ON public.collaborative_sessions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "session_update" ON public.collaborative_sessions AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "session_delete" ON public.collaborative_sessions AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- 10. session_participants policies
DROP POLICY IF EXISTS "participant_select" ON public.session_participants;
DROP POLICY IF EXISTS "participant_insert" ON public.session_participants;
DROP POLICY IF EXISTS "participant_update" ON public.session_participants;
DROP POLICY IF EXISTS "participant_delete" ON public.session_participants;

CREATE POLICY "participant_select" ON public.session_participants AS PERMISSIVE FOR SELECT USING (true);
CREATE POLICY "participant_insert" ON public.session_participants AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "participant_update" ON public.session_participants AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "participant_delete" ON public.session_participants AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 11. contact_messages policies
DROP POLICY IF EXISTS "contact_insert" ON public.contact_messages;

CREATE POLICY "contact_insert" ON public.contact_messages AS PERMISSIVE FOR INSERT WITH CHECK (true);

-- P1: Update handle_new_user to persist field_of_study from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, field_of_study)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'field_of_study'
  );
  RETURN NEW;
END;
$$;
