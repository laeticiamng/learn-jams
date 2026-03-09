
-- Fix ALL RLS policies to be PERMISSIVE instead of RESTRICTIVE
-- This is critical: RESTRICTIVE policies require ALL to pass, PERMISSIVE requires ANY to pass

-- ==================== collaborative_sessions ====================
DROP POLICY IF EXISTS "session_select" ON public.collaborative_sessions;
DROP POLICY IF EXISTS "session_insert" ON public.collaborative_sessions;
DROP POLICY IF EXISTS "session_update" ON public.collaborative_sessions;
DROP POLICY IF EXISTS "session_delete" ON public.collaborative_sessions;

CREATE POLICY "session_select" ON public.collaborative_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "session_insert" ON public.collaborative_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "session_update" ON public.collaborative_sessions FOR UPDATE TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "session_delete" ON public.collaborative_sessions FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- ==================== contact_messages ====================
DROP POLICY IF EXISTS "contact_insert" ON public.contact_messages;

CREATE POLICY "contact_insert" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ==================== favorites ====================
DROP POLICY IF EXISTS "fav_select" ON public.favorites;
DROP POLICY IF EXISTS "fav_insert" ON public.favorites;
DROP POLICY IF EXISTS "fav_delete" ON public.favorites;

CREATE POLICY "fav_select" ON public.favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "fav_insert" ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fav_delete" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ==================== league_points ====================
DROP POLICY IF EXISTS "league_select" ON public.league_points;
DROP POLICY IF EXISTS "league_insert" ON public.league_points;

CREATE POLICY "league_select" ON public.league_points FOR SELECT TO authenticated USING (true);
CREATE POLICY "league_insert" ON public.league_points FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ==================== notifications ====================
DROP POLICY IF EXISTS "notif_select" ON public.notifications;
DROP POLICY IF EXISTS "notif_update" ON public.notifications;
DROP POLICY IF EXISTS "notif_delete" ON public.notifications;

CREATE POLICY "notif_select" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notif_delete" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ==================== profiles ====================
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "prof_insert" ON public.profiles;
DROP POLICY IF EXISTS "prof_update" ON public.profiles;
DROP POLICY IF EXISTS "prof_delete" ON public.profiles;

CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "prof_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prof_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "prof_delete" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ==================== session_participants ====================
DROP POLICY IF EXISTS "participant_select" ON public.session_participants;
DROP POLICY IF EXISTS "participant_insert" ON public.session_participants;
DROP POLICY IF EXISTS "participant_update" ON public.session_participants;
DROP POLICY IF EXISTS "participant_delete" ON public.session_participants;

CREATE POLICY "participant_select" ON public.session_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "participant_insert" ON public.session_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "participant_update" ON public.session_participants FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "participant_delete" ON public.session_participants FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ==================== song_ratings ====================
DROP POLICY IF EXISTS "rating_select" ON public.song_ratings;
DROP POLICY IF EXISTS "rating_insert" ON public.song_ratings;
DROP POLICY IF EXISTS "rating_update" ON public.song_ratings;
DROP POLICY IF EXISTS "rating_delete" ON public.song_ratings;

CREATE POLICY "rating_select" ON public.song_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "rating_insert" ON public.song_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rating_update" ON public.song_ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "rating_delete" ON public.song_ratings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ==================== songs ====================
DROP POLICY IF EXISTS "songs_select" ON public.songs;
DROP POLICY IF EXISTS "songs_public_read" ON public.songs;
DROP POLICY IF EXISTS "songs_insert" ON public.songs;
DROP POLICY IF EXISTS "songs_update" ON public.songs;
DROP POLICY IF EXISTS "songs_delete" ON public.songs;

CREATE POLICY "songs_owner_select" ON public.songs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "songs_public_read" ON public.songs FOR SELECT TO authenticated USING (is_public = true);
CREATE POLICY "songs_insert" ON public.songs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "songs_update" ON public.songs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "songs_delete" ON public.songs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ==================== subscriptions ====================
DROP POLICY IF EXISTS "sub_select" ON public.subscriptions;
DROP POLICY IF EXISTS "sub_service" ON public.subscriptions;

CREATE POLICY "sub_select" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sub_service" ON public.subscriptions FOR ALL USING (true) WITH CHECK (true);

-- ==================== usage_quotas ====================
DROP POLICY IF EXISTS "quota_select" ON public.usage_quotas;

CREATE POLICY "quota_select" ON public.usage_quotas FOR SELECT TO authenticated USING (auth.uid() = user_id);
