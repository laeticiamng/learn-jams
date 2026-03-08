
-- =============================================
-- P0: Fix all RLS policies from RESTRICTIVE to PERMISSIVE
-- =============================================

-- FAVORITES table
DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.favorites;

CREATE POLICY "Users can view own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- PROFILES table
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE USING (auth.uid() = user_id);

-- SONGS table
DROP POLICY IF EXISTS "Users can delete their own songs" ON public.songs;
DROP POLICY IF EXISTS "Users can insert their own songs" ON public.songs;
DROP POLICY IF EXISTS "Users can update their own songs" ON public.songs;
DROP POLICY IF EXISTS "Users can view their own songs" ON public.songs;

CREATE POLICY "Users can view own songs" ON public.songs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own songs" ON public.songs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own songs" ON public.songs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own songs" ON public.songs FOR DELETE USING (auth.uid() = user_id);

-- SUBSCRIPTIONS table
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can read own subscription" ON public.subscriptions;

CREATE POLICY "Users can read own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all subscriptions" ON public.subscriptions FOR ALL USING (true) WITH CHECK (true);

-- USAGE_QUOTAS table
DROP POLICY IF EXISTS "Users can view their own quota" ON public.usage_quotas;

CREATE POLICY "Users can view own quota" ON public.usage_quotas FOR SELECT USING (auth.uid() = user_id);

-- P1: Create atomic quota increment function to prevent race conditions
CREATE OR REPLACE FUNCTION public.increment_quota_atomic(p_user_id uuid, p_month text, p_limit integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used integer;
BEGIN
  -- Try to insert or get existing
  INSERT INTO usage_quotas (user_id, month, songs_generated)
  VALUES (p_user_id, p_month, 0)
  ON CONFLICT (user_id, month) DO NOTHING;

  -- Atomic increment with check
  UPDATE usage_quotas
  SET songs_generated = songs_generated + 1, updated_at = now()
  WHERE user_id = p_user_id AND month = p_month AND songs_generated < p_limit
  RETURNING songs_generated INTO v_used;

  IF v_used IS NULL THEN
    SELECT songs_generated INTO v_used FROM usage_quotas WHERE user_id = p_user_id AND month = p_month;
    RETURN jsonb_build_object('allowed', false, 'used', v_used, 'limit', p_limit);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'used', v_used, 'limit', p_limit);
END;
$$;

-- Add unique constraint for atomic upsert if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'usage_quotas_user_id_month_key'
  ) THEN
    ALTER TABLE usage_quotas ADD CONSTRAINT usage_quotas_user_id_month_key UNIQUE (user_id, month);
  END IF;
END $$;
