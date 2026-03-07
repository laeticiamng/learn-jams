
-- Step 1: Change the column type from enum to text
ALTER TABLE public.songs ALTER COLUMN style TYPE text USING style::text;

-- Step 2: Set default to 'pop'
ALTER TABLE public.songs ALTER COLUMN style SET DEFAULT 'pop';

-- Step 3: Drop the old enum type
DROP TYPE IF EXISTS public.music_style;
