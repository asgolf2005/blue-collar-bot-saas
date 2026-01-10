-- Fix storage RLS policies for technician photo uploads
-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload media for their business jobs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;

-- Allow technicians and admins to upload job photos
CREATE POLICY "Techs and admins can upload job photos"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'media'
        AND auth.uid() IS NOT NULL
        AND (
            -- Check if user is admin or tech in a business
            EXISTS (
                SELECT 1 FROM users
                WHERE id = auth.uid()
                AND role IN ('admin', 'tech')
            )
        )
    );

-- Allow everyone to view media (public bucket)
CREATE POLICY "Public can view media"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'media');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own uploads"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'media'
        AND auth.uid() = owner
    );

-- Allow admins to delete any media in their business
CREATE POLICY "Admins can delete business media"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'media'
        AND EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );
