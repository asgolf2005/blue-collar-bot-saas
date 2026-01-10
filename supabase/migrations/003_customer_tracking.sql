-- Migration: Customer Tracking Enhancement
-- Adds technician location tracking, ETA fields, and photo types

-- 1. Create technician_locations table for real-time GPS tracking
CREATE TABLE IF NOT EXISTS technician_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  heading DECIMAL(5, 2),
  speed DECIMAL(6, 2),
  accuracy DECIMAL(8, 2),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_technician_locations_tech ON technician_locations(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_locations_job ON technician_locations(job_id);
CREATE INDEX IF NOT EXISTS idx_technician_locations_updated ON technician_locations(updated_at DESC);

-- Enable real-time for this table
ALTER TABLE technician_locations REPLICA IDENTITY FULL;

-- 2. Add ETA fields to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS eta_minutes INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS eta_updated_at TIMESTAMP WITH TIME ZONE;

-- 3. Add photo_type to media table
ALTER TABLE media ADD COLUMN IF NOT EXISTS photo_type VARCHAR(20) DEFAULT 'during';

-- 4. Row Level Security Policies for technician_locations

-- Enable RLS
ALTER TABLE technician_locations ENABLE ROW LEVEL SECURITY;

-- Customers can view technician location for their active jobs
CREATE POLICY "Customers can view technician location for their jobs"
ON technician_locations FOR SELECT
USING (
  job_id IN (
    SELECT j.id FROM jobs j
    JOIN customers c ON j.customer_id = c.id
    WHERE c.user_id = auth.uid()
    AND j.status IN ('on_the_way', 'arrived', 'in_progress')
  )
);

-- Technicians can view their own location
CREATE POLICY "Technicians can view their own location"
ON technician_locations FOR SELECT
USING (technician_id = auth.uid());

-- Technicians can insert their location
CREATE POLICY "Technicians can insert their location"
ON technician_locations FOR INSERT
WITH CHECK (technician_id = auth.uid());

-- Technicians can update their own location
CREATE POLICY "Technicians can update their location"
ON technician_locations FOR UPDATE
USING (technician_id = auth.uid());

-- Technicians can delete their old locations
CREATE POLICY "Technicians can delete their location"
ON technician_locations FOR DELETE
USING (technician_id = auth.uid());

-- Admins can view all locations for their business
CREATE POLICY "Admins can view all technician locations"
ON technician_locations FOR SELECT
USING (
  technician_id IN (
    SELECT u.id FROM users u
    WHERE u.business_id = (
      SELECT business_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

-- 5. Add function to clean up old location records (keep last 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_locations()
RETURNS void AS $$
BEGIN
  DELETE FROM technician_locations
  WHERE updated_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- 6. Create a view for latest technician location per job
CREATE OR REPLACE VIEW latest_technician_locations AS
SELECT DISTINCT ON (job_id)
  id,
  technician_id,
  job_id,
  latitude,
  longitude,
  heading,
  speed,
  accuracy,
  updated_at
FROM technician_locations
WHERE job_id IS NOT NULL
ORDER BY job_id, updated_at DESC;
