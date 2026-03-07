ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS is_final_quality boolean NOT NULL DEFAULT false;

-- Enable realtime for songs table
ALTER PUBLICATION supabase_realtime ADD TABLE public.songs;