
-- Create the source-raw storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('source-raw', 'source-raw', false, 209715200)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for source-raw bucket
CREATE POLICY "Users can upload to source-raw"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'source-raw' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read own source-raw files"
ON storage.objects FOR SELECT
USING (bucket_id = 'source-raw' AND auth.uid()::text = (storage.foldername(name))[1]);
