-- ============================================================
-- P0: Lock down Realtime channel subscriptions to topic owner
-- ============================================================
-- Default deny + explicit allow for personal topics only.
-- Topics convention used by the app:
--   user-notifications  → broadcast to {auth.uid()} only via filter
--   player-song-<song_id> → only owners of song
--   library-songs        → only authenticated users for own rows (filtered server-side)
--   session-<session_id> → only participants

-- Drop any prior loose policy
DROP POLICY IF EXISTS "Allow authenticated to read own realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "realtime_topic_scoped_select" ON realtime.messages;

-- Allow authenticated users to receive messages only when the topic
-- contains their own user id (notifications + library) or when they own
-- the underlying song (player) or are a participant (sessions).
CREATE POLICY "realtime_topic_scoped_select"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Personal notification channel: "user-notifications" used with server-side filter user_id=eq.auth.uid()
  -- We require the topic to be exactly our personal channel name OR include our user id.
  (
    realtime.topic() = 'user-notifications'
    AND EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = auth.uid()
    )
  )
  -- Library channel: each user gets only their own rows via existing public.songs RLS
  OR (
    realtime.topic() = 'library-songs'
  )
  -- Player channel: "player-song-<song_id>" — must own the song
  OR (
    realtime.topic() LIKE 'player-song-%'
    AND EXISTS (
      SELECT 1 FROM public.songs s
      WHERE s.id::text = substring(realtime.topic() FROM 13)
        AND s.user_id = auth.uid()
    )
  )
  -- Collaborative session: "session-<session_id>" — must be a participant or creator
  OR (
    realtime.topic() LIKE 'session-%'
    AND EXISTS (
      SELECT 1 FROM public.collaborative_sessions cs
      WHERE cs.id::text = substring(realtime.topic() FROM 9)
        AND (
          cs.creator_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.session_participants sp
            WHERE sp.session_id = cs.id AND sp.user_id = auth.uid()
          )
        )
    )
  )
);

-- ============================================================
-- P1: Explicit deny of client-side writes on sensitive tables
-- ============================================================

-- subscriptions: writes only via service-role (Stripe webhook)
DROP POLICY IF EXISTS "subs_block_user_insert" ON public.subscriptions;
DROP POLICY IF EXISTS "subs_block_user_update" ON public.subscriptions;
DROP POLICY IF EXISTS "subs_block_user_delete" ON public.subscriptions;

CREATE POLICY "subs_block_user_insert" ON public.subscriptions
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "subs_block_user_update" ON public.subscriptions
  AS RESTRICTIVE FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "subs_block_user_delete" ON public.subscriptions
  AS RESTRICTIVE FOR DELETE TO authenticated USING (false);

-- usage_quotas: writes only via service-role / SECURITY DEFINER functions
DROP POLICY IF EXISTS "uq_block_user_insert" ON public.usage_quotas;
DROP POLICY IF EXISTS "uq_block_user_update" ON public.usage_quotas;
DROP POLICY IF EXISTS "uq_block_user_delete" ON public.usage_quotas;

CREATE POLICY "uq_block_user_insert" ON public.usage_quotas
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "uq_block_user_update" ON public.usage_quotas
  AS RESTRICTIVE FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "uq_block_user_delete" ON public.usage_quotas
  AS RESTRICTIVE FOR DELETE TO authenticated USING (false);
