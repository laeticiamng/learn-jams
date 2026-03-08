
CREATE TABLE public.usage_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month text NOT NULL,
  songs_generated integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

ALTER TABLE public.usage_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quota"
  ON public.usage_quotas FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_usage_quotas_updated_at
  BEFORE UPDATE ON public.usage_quotas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
