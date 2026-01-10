-- =====================================================
-- FIX: Add missing foreign key constraints
-- Run this if job_notes table exists but has no foreign keys
-- =====================================================

-- First, check if foreign keys already exist
DO $$
BEGIN
    -- Add foreign key to jobs table if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'job_notes_job_id_fkey'
        AND table_name = 'job_notes'
    ) THEN
        ALTER TABLE job_notes
        ADD CONSTRAINT job_notes_job_id_fkey
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
        RAISE NOTICE '✓ Added foreign key: job_notes -> jobs';
    ELSE
        RAISE NOTICE '✓ Foreign key already exists: job_notes -> jobs';
    END IF;

    -- Add foreign key to users table if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'job_notes_user_id_fkey'
        AND table_name = 'job_notes'
    ) THEN
        ALTER TABLE job_notes
        ADD CONSTRAINT job_notes_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '✓ Added foreign key: job_notes -> users';
    ELSE
        RAISE NOTICE '✓ Foreign key already exists: job_notes -> users';
    END IF;
END $$;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
RAISE NOTICE '✅ Schema cache refreshed!';

-- Verify the fix
SELECT
    'Verification:' as status,
    COUNT(*) as foreign_keys_count
FROM information_schema.table_constraints
WHERE table_name = 'job_notes'
    AND constraint_type = 'FOREIGN KEY';
