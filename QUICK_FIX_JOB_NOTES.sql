-- ===========================================================
-- QUICK FIX: Job Notes Bug
-- Copy this entire file and paste into Supabase SQL Editor
-- ===========================================================

-- Create job note types enum
CREATE TYPE job_note_type AS ENUM ('note', 'status_change', 'photo_added', 'system');

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
CREATE INDEX idx_job_notes_job_id ON job_notes(job_id);
CREATE INDEX idx_job_notes_user_id ON job_notes(user_id);
CREATE INDEX idx_job_notes_created_at ON job_notes(job_id, created_at DESC);

-- Create time_entries table (bonus feature for future use)
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

-- Add missing columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'customer_signature'
    ) THEN
        ALTER TABLE jobs ADD COLUMN customer_signature TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'full_name'
    ) THEN
        ALTER TABLE users ADD COLUMN full_name TEXT;
        UPDATE users SET full_name = name WHERE full_name IS NULL;
    END IF;
END $$;

-- Create update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
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

-- Enable Row Level Security
ALTER TABLE job_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view job notes from their business" ON job_notes;
DROP POLICY IF EXISTS "Users can create job notes for their business jobs" ON job_notes;
DROP POLICY IF EXISTS "Users can update their own job notes" ON job_notes;
DROP POLICY IF EXISTS "Users can delete their own job notes" ON job_notes;

-- RLS Policies for job_notes
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

CREATE POLICY "Users can update their own job notes"
    ON job_notes
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own job notes"
    ON job_notes
    FOR DELETE
    USING (user_id = auth.uid());

-- RLS Policies for time_entries
DROP POLICY IF EXISTS "Technicians can view their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Admins can view all business time entries" ON time_entries;
DROP POLICY IF EXISTS "Technicians can create their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Technicians can update their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Technicians can delete their own time entries" ON time_entries;

CREATE POLICY "Technicians can view their own time entries"
    ON time_entries
    FOR SELECT
    USING (technician_id = auth.uid());

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

CREATE POLICY "Technicians can update their own time entries"
    ON time_entries
    FOR UPDATE
    USING (technician_id = auth.uid())
    WITH CHECK (technician_id = auth.uid());

CREATE POLICY "Technicians can delete their own time entries"
    ON time_entries
    FOR DELETE
    USING (technician_id = auth.uid());

-- Fix storage bucket policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload media for their business jobs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;

CREATE POLICY "Users can upload media for their business jobs"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'media'
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Anyone can view media"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'media');

CREATE POLICY "Users can delete their own media"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'media'
        AND auth.uid() = owner
    );

-- Verification
DO $$
BEGIN
    RAISE NOTICE '✅ Migration complete!';

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_notes') THEN
        RAISE NOTICE '✓ job_notes table created';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_entries') THEN
        RAISE NOTICE '✓ time_entries table created';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'customer_signature') THEN
        RAISE NOTICE '✓ customer_signature column added';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'full_name') THEN
        RAISE NOTICE '✓ full_name column added';
    END IF;

    RAISE NOTICE '🎉 Job notes feature is now working!';
END $$;
