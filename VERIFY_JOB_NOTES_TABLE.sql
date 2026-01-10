-- =====================================================
-- VERIFICATION QUERY: Check job_notes table structure
-- Run this in Supabase SQL Editor to diagnose the issue
-- =====================================================

-- 1. Check if table exists
SELECT
    'Table exists' as check_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'job_notes'
    ) as result;

-- 2. Check table columns
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'job_notes'
ORDER BY ordinal_position;

-- 3. Check foreign key constraints (THIS IS IMPORTANT!)
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'job_notes';

-- 4. Check RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'job_notes';

-- 5. Check if RLS is enabled
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'job_notes';

-- 6. Try to select from the table (will show if there are permission issues)
SELECT COUNT(*) as total_notes FROM job_notes;
