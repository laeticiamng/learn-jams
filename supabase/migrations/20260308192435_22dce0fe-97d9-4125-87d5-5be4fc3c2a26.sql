-- Create notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  song_id uuid REFERENCES public.songs(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can insert (from trigger via SECURITY DEFINER)
-- No INSERT policy needed for authenticated users since trigger runs as SECURITY DEFINER

-- Index for fast lookups
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, is_read) WHERE is_read = false;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger function: when a song status changes to 'ready', create a notification
CREATE OR REPLACE FUNCTION public.notify_song_ready()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'ready' AND (OLD.status IS DISTINCT FROM 'ready') THEN
    INSERT INTO public.notifications (user_id, song_id, title, message)
    VALUES (
      NEW.user_id,
      NEW.id,
      NEW.title,
      'Your song "' || NEW.title || '" is ready to play!'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to songs table
CREATE TRIGGER on_song_ready
  AFTER UPDATE ON public.songs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_song_ready();