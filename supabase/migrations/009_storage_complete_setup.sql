-- Complete storage setup for job photos

-- Step 1: Create the media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'];

-- Step 2: Drop all existing policies
DROP POLICY IF EXISTS "Users can upload media for their business jobs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;
DROP POLICY IF EXISTS "Techs and admins can upload job photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete business media" ON storage.objects;

-- Step 3: Create simple, permissive policies for authenticated users

-- Allow any authenticated user to upload to media bucket
CREATE POLICY "Authenticated users can upload media"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'media');

-- Allow anyone to view media (public bucket)
CREATE POLICY "Anyone can view media"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'media');

-- Allow users to update their own files
CREATE POLICY "Users can update own media"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'media' AND auth.uid() = owner)
    WITH CHECK (bucket_id = 'media' AND auth.uid() = owner);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own media"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'media' AND auth.uid() = owner);
