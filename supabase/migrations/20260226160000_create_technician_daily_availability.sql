-- Daily technician working availability for dispatch and roster controls
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS technician_daily_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    is_working BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (business_id, technician_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_tech_daily_availability_business_date
    ON technician_daily_availability (business_id, work_date);

CREATE INDEX IF NOT EXISTS idx_tech_daily_availability_tech_date
    ON technician_daily_availability (technician_id, work_date);

ALTER TABLE technician_daily_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view technician daily availability" ON technician_daily_availability;
DROP POLICY IF EXISTS "Admin can insert technician daily availability" ON technician_daily_availability;
DROP POLICY IF EXISTS "Admin can update technician daily availability" ON technician_daily_availability;
DROP POLICY IF EXISTS "Admin can delete technician daily availability" ON technician_daily_availability;
DROP POLICY IF EXISTS "Tech can view own daily availability" ON technician_daily_availability;

CREATE POLICY "Admin can view technician daily availability"
    ON technician_daily_availability FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id = technician_daily_availability.business_id
        )
    );

CREATE POLICY "Admin can insert technician daily availability"
    ON technician_daily_availability FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id = technician_daily_availability.business_id
        )
    );

CREATE POLICY "Admin can update technician daily availability"
    ON technician_daily_availability FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id = technician_daily_availability.business_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id = technician_daily_availability.business_id
        )
    );

CREATE POLICY "Admin can delete technician daily availability"
    ON technician_daily_availability FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id = technician_daily_availability.business_id
        )
    );

CREATE POLICY "Tech can view own daily availability"
    ON technician_daily_availability FOR SELECT
    USING (technician_id = auth.uid());

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname = 'update_updated_at_column'
          AND n.nspname = 'public'
    ) THEN
        DROP TRIGGER IF EXISTS update_technician_daily_availability_updated_at ON technician_daily_availability;
        CREATE TRIGGER update_technician_daily_availability_updated_at
            BEFORE UPDATE ON technician_daily_availability
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
