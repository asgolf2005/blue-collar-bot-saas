-- =====================================================
-- ADD FOREIGN KEY CONSTRAINTS TO job_notes
-- This is what's causing the schema cache error
-- =====================================================

-- Add foreign key to jobs table
ALTER TABLE job_notes
ADD CONSTRAINT job_notes_job_id_fkey
FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;

-- Add foreign key to users table (THIS IS THE CRITICAL ONE!)
ALTER TABLE job_notes
ADD CONSTRAINT job_notes_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Verify
SELECT 'Foreign keys added successfully!' as status;

SELECT
    constraint_name,
    column_name,
    'job_notes' as from_table
FROM information_schema.key_column_usage
WHERE table_name = 'job_notes'
    AND constraint_name LIKE '%fkey';
