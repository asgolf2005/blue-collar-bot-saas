-- =================================================================
-- QUICK FIX FOR JOB NOTES BUG
-- =================================================================
-- Just copy this entire file and run it in Supabase SQL Editor
-- This will create the missing job_notes table and fix the 500 errors
-- =================================================================

-- Create ENUM for note types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_note_type') THEN
        CREATE TYPE job_note_type AS ENUM ('note', 'status_change', 'photo_added', 'system');
    END IF;
END$$;

-- Create job_notes table
CREATE TABLE IF NOT EXISTS job_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_type job_note_type NOT NULL DEFAULT 'note',
    content TEXT NOT NULL,
    is_visible_to_customer BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_notes_job_id ON job_notes(job_id);
CREATE INDEX IF NOT EXISTS idx_job_notes_user_id ON job_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_job_notes_created_at ON job_notes(job_id, created_at DESC);

-- Create trigger function for auto-updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_job_notes_updated_at ON job_notes;
CREATE TRIGGER update_job_notes_updated_at
    BEFORE UPDATE ON job_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE job_notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (in case of re-run)
DROP POLICY IF EXISTS "Users can view job notes from their business" ON job_notes;
DROP POLICY IF EXISTS "Users can create job notes for their business jobs" ON job_notes;
DROP POLICY IF EXISTS "Users can update their own job notes" ON job_notes;
DROP POLICY IF EXISTS "Users can delete their own job notes" ON job_notes;

-- RLS Policy: View notes from your business's jobs
CREATE POLICY "Users can view job notes from their business"
    ON job_notes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM jobs j
            INNER JOIN users u ON u.business_id = j.business_id
            WHERE j.id = job_notes.job_id
            AND u.id = auth.uid()
        )
    );

-- RLS Policy: Create notes for your business's jobs
CREATE POLICY "Users can create job notes for their business jobs"
    ON job_notes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM jobs j
            INNER JOIN users u ON u.business_id = j.business_id
            WHERE j.id = job_notes.job_id
            AND u.id = auth.uid()
        )
        AND user_id = auth.uid()
    );

-- RLS Policy: Update your own notes only
CREATE POLICY "Users can update their own job notes"
    ON job_notes FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- RLS Policy: Delete your own notes only
CREATE POLICY "Users can delete their own job notes"
    ON job_notes FOR DELETE
    USING (user_id = auth.uid());

-- Verification
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_notes') THEN
        RAISE NOTICE '✅ SUCCESS! job_notes table created and configured';
        RAISE NOTICE '✅ 4 RLS policies created';
        RAISE NOTICE '✅ Indexes created for performance';
        RAISE NOTICE '✅ Auto-update trigger configured';
        RAISE NOTICE '';
        RAISE NOTICE '🎉 Job notes bug is now FIXED!';
        RAISE NOTICE '';
        RAISE NOTICE 'Next steps:';
        RAISE NOTICE '1. Restart your dev server';
        RAISE NOTICE '2. Navigate to a job details page';
        RAISE NOTICE '3. Test adding a note';
    ELSE
        RAISE EXCEPTION '❌ FAILED: job_notes table was not created';
    END IF;
END$$;
