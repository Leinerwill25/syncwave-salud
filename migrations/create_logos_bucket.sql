DO $$
DECLARE
    v_bucket_name TEXT := 'logos';
BEGIN
    -- Create a new private bucket 'logos' for storing medical report logos
    INSERT INTO storage.buckets (id, name, public)
    VALUES (v_bucket_name, v_bucket_name, true)
    ON CONFLICT (id) DO NOTHING;

    -- Set up security policies for the 'logos' bucket

    -- 1. Allow authenticated users (doctors) to upload their own logos
    EXECUTE format('CREATE POLICY "Authenticated users can upload logos" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = %L AND auth.role() = %L )', v_bucket_name, 'authenticated');

    -- 2. Allow public access to view/download the logos (since they are for reports)
    EXECUTE format('CREATE POLICY "Public can view logos" ON storage.objects FOR SELECT USING ( bucket_id = %L )', v_bucket_name);

    -- 3. Allow users to update/delete their own files
    EXECUTE format('CREATE POLICY "Users can update their own logos" ON storage.objects FOR UPDATE USING ( bucket_id = %L AND auth.uid() = owner ) WITH CHECK ( bucket_id = %L AND auth.uid() = owner )', v_bucket_name, v_bucket_name);

    EXECUTE format('CREATE POLICY "Users can delete their own logos" ON storage.objects FOR DELETE USING ( bucket_id = %L AND auth.uid() = owner )', v_bucket_name);
END $$;
