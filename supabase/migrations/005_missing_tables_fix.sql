-- ===========================================================
-- MISSING TABLES AND COLUMNS FIX
-- This migration adds tables and columns that are used by the app
-- but were missing from the schema
-- ===========================================================

-- ===========================================================
-- ENUM TYPES
-- ===========================================================

-- Job note types
CREATE TYPE job_note_type AS ENUM ('note', 'status_change', 'photo_added', 'system');

-- ===========================================================
-- TABLE: job_notes
-- Activity log and notes for jobs
-- ===========================================================
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

CREATE INDEX idx_job_notes_job_id ON job_notes(job_id);
CREATE INDEX idx_job_notes_user_id ON job_notes(user_id);
CREATE INDEX idx_job_notes_created_at ON job_notes(job_id, created_at DESC);

-- ===========================================================
-- TABLE: time_entries
-- Clock in/out tracking for technicians
-- ===========================================================
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
    clock_out TIMESTAMP WITH TIME ZONE,
    break_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_time_entries_job_id ON time_entries(job_id);
CREATE INDEX idx_time_entries_technician_id ON time_entries(technician_id);
CREATE INDEX idx_time_entries_active ON time_entries(technician_id, clock_out) WHERE clock_out IS NULL;

-- ===========================================================
-- ALTER: Add missing columns to jobs table
-- ===========================================================

-- Add customer_signature field to jobs (URL to signature image)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'customer_signature'
    ) THEN
        ALTER TABLE jobs ADD COLUMN customer_signature TEXT;
    END IF;
END $$;

-- ===========================================================
-- ALTER: Add full_name to users table (if not exists)
-- This is used by job_notes API
-- ===========================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'full_name'
    ) THEN
        ALTER TABLE users ADD COLUMN full_name TEXT;
        -- Copy name to full_name for existing users
        UPDATE users SET full_name = name WHERE full_name IS NULL;
    END IF;
END $$;

-- ===========================================================
-- TRIGGERS: Auto-update timestamps
-- ===========================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_job_notes_updated_at'
    ) THEN
        CREATE TRIGGER update_job_notes_updated_at
            BEFORE UPDATE ON job_notes
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_time_entries_updated_at'
    ) THEN
        CREATE TRIGGER update_time_entries_updated_at
            BEFORE UPDATE ON time_entries
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ===========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===========================================================

-- Enable RLS on new tables
ALTER TABLE job_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for job_notes
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view job notes from their business" ON job_notes;
DROP POLICY IF EXISTS "Users can create job notes for their business jobs" ON job_notes;
DROP POLICY IF EXISTS "Users can update their own job notes" ON job_notes;
DROP POLICY IF EXISTS "Users can delete their own job notes" ON job_notes;

-- View job notes (business isolation)
CREATE POLICY "Users can view job notes from their business"
    ON job_notes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM jobs j
            INNER JOIN users u ON u.business_id = j.business_id
            WHERE j.id = job_notes.job_id
            AND u.id = auth.uid()
        )
    );

-- Create job notes (business isolation)
CREATE POLICY "Users can create job notes for their business jobs"
    ON job_notes
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM jobs j
            INNER JOIN users u ON u.business_id = j.business_id
            WHERE j.id = job_notes.job_id
            AND u.id = auth.uid()
        )
        AND user_id = auth.uid()
    );

-- Update own job notes only
CREATE POLICY "Users can update their own job notes"
    ON job_notes
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Delete own job notes only
CREATE POLICY "Users can delete their own job notes"
    ON job_notes
    FOR DELETE
    USING (user_id = auth.uid());

-- ============================================
-- RLS Policies for time_entries
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Technicians can view their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Admins can view all business time entries" ON time_entries;
DROP POLICY IF EXISTS "Technicians can create their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Technicians can update their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Technicians can delete their own time entries" ON time_entries;

-- Technicians can view their own time entries
CREATE POLICY "Technicians can view their own time entries"
    ON time_entries
    FOR SELECT
    USING (technician_id = auth.uid());

-- Admins can view all time entries for their business
CREATE POLICY "Admins can view all business time entries"
    ON time_entries
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
            AND EXISTS (
                SELECT 1 FROM users tech
                WHERE tech.id = time_entries.technician_id
                AND tech.business_id = u.business_id
            )
        )
    );

-- Technicians can create their own time entries
CREATE POLICY "Technicians can create their own time entries"
    ON time_entries
    FOR INSERT
    WITH CHECK (
        technician_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM jobs j
            INNER JOIN users u ON u.business_id = j.business_id
            WHERE j.id = time_entries.job_id
            AND u.id = auth.uid()
        )
    );

-- Technicians can update their own time entries
CREATE POLICY "Technicians can update their own time entries"
    ON time_entries
    FOR UPDATE
    USING (technician_id = auth.uid())
    WITH CHECK (technician_id = auth.uid());

-- Technicians can delete their own time entries
CREATE POLICY "Technicians can delete their own time entries"
    ON time_entries
    FOR DELETE
    USING (technician_id = auth.uid());

-- ===========================================================
-- STORAGE: Fix RLS policies for media bucket
-- ===========================================================

-- Create storage bucket for media if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Users can upload media for their business jobs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;

-- Allow users to upload media for jobs in their business
CREATE POLICY "Users can upload media for their business jobs"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'media'
        AND auth.uid() IS NOT NULL
    );

-- Allow anyone to view media (public bucket)
CREATE POLICY "Anyone can view media"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'media');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own media"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'media'
        AND auth.uid() = owner
    );

-- ===========================================================
-- VERIFICATION QUERIES
-- ===========================================================

-- Verify tables exist
DO $$
BEGIN
    RAISE NOTICE 'Verifying tables...';

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_notes') THEN
        RAISE NOTICE '✓ job_notes table created';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_entries') THEN
        RAISE NOTICE '✓ time_entries table created';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'customer_signature') THEN
        RAISE NOTICE '✓ customer_signature column added to jobs';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'full_name') THEN
        RAISE NOTICE '✓ full_name column added to users';
    END IF;

    RAISE NOTICE '✅ All missing tables and columns have been added!';
END $$;
