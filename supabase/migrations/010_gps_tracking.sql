-- GPS Tracking Migration
-- Updates existing technician_locations table and adds supporting features

-- Add recorded_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'technician_locations'
    AND column_name = 'recorded_at'
  ) THEN
    ALTER TABLE public.technician_locations
    ADD COLUMN recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Create indexes for fast queries (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_tech_locations_technician_id ON technician_locations(technician_id);
CREATE INDEX IF NOT EXISTS idx_tech_locations_recorded_at ON technician_locations(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_tech_locations_job_id ON technician_locations(job_id);
CREATE INDEX IF NOT EXISTS idx_tech_locations_tech_recorded_at ON technician_locations(technician_id, recorded_at DESC);

-- Enable Row Level Security
ALTER TABLE technician_locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Techs can insert own location" ON technician_locations;
DROP POLICY IF EXISTS "Admins can view all locations" ON technician_locations;
DROP POLICY IF EXISTS "Customers can see assigned tech location" ON technician_locations;
DROP POLICY IF EXISTS "Techs can view own location" ON technician_locations;

-- Policy: Techs can insert their own location
CREATE POLICY "Techs can insert own location"
  ON technician_locations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = technician_id
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'tech'
    )
  );

-- Policy: Techs can view their own location history
CREATE POLICY "Techs can view own location"
  ON technician_locations FOR SELECT
  TO authenticated
  USING (
    auth.uid() = technician_id
  );

-- Policy: Admins can view all locations in their business
CREATE POLICY "Admins can view all locations"
  ON technician_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u1
      WHERE u1.id = auth.uid()
      AND u1.role = 'admin'
      AND u1.business_id = (
        SELECT u2.business_id FROM users u2
        WHERE u2.id = technician_locations.technician_id
      )
    )
  );

-- Policy: Customers can see location of tech assigned to their job
CREATE POLICY "Customers can see assigned tech location"
  ON technician_locations FOR SELECT
  TO authenticated
  USING (
    job_id IN (
      SELECT j.id FROM jobs j
      JOIN customers c ON c.id = j.customer_id
      WHERE c.user_id = auth.uid()
    )
  );

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_latest_tech_locations(UUID);

-- Function to get latest location for each tech
CREATE FUNCTION get_latest_tech_locations(business_uuid UUID)
RETURNS TABLE (
  tech_id UUID,
  tech_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  job_id UUID,
  recorded_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (tl.technician_id)
    tl.technician_id as tech_id,
    u.full_name as tech_name,
    tl.latitude,
    tl.longitude,
    tl.accuracy,
    tl.speed,
    tl.heading,
    tl.job_id,
    COALESCE(tl.recorded_at, tl.created_at) as recorded_at
  FROM technician_locations tl
  JOIN users u ON u.id = tl.technician_id
  WHERE u.business_id = business_uuid
    AND u.role = 'tech'
    AND COALESCE(tl.recorded_at, tl.created_at) > NOW() - INTERVAL '1 hour' -- Only recent locations
  ORDER BY tl.technician_id, COALESCE(tl.recorded_at, tl.created_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE technician_locations IS 'Stores real-time GPS location data for technicians';
COMMENT ON COLUMN technician_locations.latitude IS 'Latitude in decimal degrees (-90 to 90)';
COMMENT ON COLUMN technician_locations.longitude IS 'Longitude in decimal degrees (-180 to 180)';
COMMENT ON COLUMN technician_locations.accuracy IS 'Location accuracy in meters';
COMMENT ON COLUMN technician_locations.speed IS 'Speed in meters per second (from GPS)';
COMMENT ON COLUMN technician_locations.heading IS 'Direction of travel in degrees (0-360, 0=North)';

-- Grant execute permission on function
GRANT EXECUTE ON FUNCTION get_latest_tech_locations(UUID) TO authenticated;
