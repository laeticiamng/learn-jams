
CREATE TABLE public.daily_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own streak"
ON public.daily_streaks FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streak"
ON public.daily_streaks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streak"
ON public.daily_streaks FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_daily_streaks_updated_at
BEFORE UPDATE ON public.daily_streaks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
