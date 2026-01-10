-- =====================================================
-- Check if users table has required columns
-- =====================================================

-- Check for full_name column (required by API)
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
    AND column_name IN ('id', 'full_name', 'email', 'role', 'business_id')
ORDER BY column_name;

-- If full_name doesn't exist, add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'full_name'
    ) THEN
        ALTER TABLE users ADD COLUMN full_name TEXT;
        -- Copy from name field if it exists
        UPDATE users SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;
        RAISE NOTICE '✓ Added full_name column to users table';
    ELSE
        RAISE NOTICE '✓ full_name column already exists';
    END IF;
END $$;

-- Force reload the schema cache
NOTIFY pgrst, 'reload schema';

-- Wait a moment and reload again (sometimes needs two notifications)
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';

SELECT '✅ Schema cache reloaded!' as status;
