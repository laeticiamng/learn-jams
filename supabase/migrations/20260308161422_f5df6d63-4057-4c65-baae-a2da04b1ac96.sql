
ALTER TABLE public.songs 
ADD COLUMN IF NOT EXISTS generation_error text,
ADD COLUMN IF NOT EXISTS generation_error_code text,
ADD COLUMN IF NOT EXISTS generation_error_at timestamptz;
