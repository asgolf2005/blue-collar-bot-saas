-- ===========================================================
-- SECTION 2: ROW LEVEL SECURITY POLICIES
-- ===========================================================

-- Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- ===========================================================
-- HELPER FUNCTION: Get user's business_id
-- ===========================================================
CREATE OR REPLACE FUNCTION auth.user_business_id()
RETURNS UUID AS $$
    SELECT business_id FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- ===========================================================
-- HELPER FUNCTION: Get user's role
-- ===========================================================
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS user_role AS $$
    SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- ===========================================================
-- RLS POLICIES: businesses
-- ===========================================================

-- Admin can read their own business
CREATE POLICY "Users can view their own business"
    ON businesses FOR SELECT
    USING (id = auth.user_business_id());

-- Admin can update their own business
CREATE POLICY "Admin can update their own business"
    ON businesses FOR UPDATE
    USING (id = auth.user_business_id() AND auth.user_role() = 'admin');

-- ===========================================================
-- RLS POLICIES: users
-- ===========================================================

-- Users can view other users in their business
CREATE POLICY "Users can view users in their business"
    ON users FOR SELECT
    USING (business_id = auth.user_business_id());

-- Admin can manage users in their business
CREATE POLICY "Admin can insert users in their business"
    ON users FOR INSERT
    WITH CHECK (business_id = auth.user_business_id() AND auth.user_role() = 'admin');

CREATE POLICY "Admin can update users in their business"
    ON users FOR UPDATE
    USING (business_id = auth.user_business_id() AND auth.user_role() = 'admin');

CREATE POLICY "Admin can delete users in their business"
    ON users FOR DELETE
    USING (business_id = auth.user_business_id() AND auth.user_role() = 'admin');

-- ===========================================================
-- RLS POLICIES: customers
-- ===========================================================

-- Only admin can read customers
CREATE POLICY "Admin can view customers in their business"
    ON customers FOR SELECT
    USING (business_id = auth.user_business_id() AND auth.user_role() = 'admin');

-- Admin can insert customers
CREATE POLICY "Admin can insert customers"
    ON customers FOR INSERT
    WITH CHECK (business_id = auth.user_business_id() AND auth.user_role() = 'admin');

-- Admin can update customers
CREATE POLICY "Admin can update customers"
    ON customers FOR UPDATE
    USING (business_id = auth.user_business_id() AND auth.user_role() = 'admin');

-- Admin can delete customers
CREATE POLICY "Admin can delete customers"
    ON customers FOR DELETE
    USING (business_id = auth.user_business_id() AND auth.user_role() = 'admin');

-- ===========================================================
-- RLS POLICIES: jobs
-- ===========================================================

-- Admin can view all jobs in their business
CREATE POLICY "Admin can view all jobs in their business"
    ON jobs FOR SELECT
    USING (business_id = auth.user_business_id() AND auth.user_role() = 'admin');

-- Tech can view only their assigned jobs
CREATE POLICY "Tech can view their assigned jobs"
    ON jobs FOR SELECT
    USING (
        business_id = auth.user_business_id()
        AND auth.user_role() = 'tech'
        AND technician_id = auth.uid()
    );

-- Admin can insert jobs
CREATE POLICY "Admin can insert jobs"
    ON jobs FOR INSERT
    WITH CHECK (business_id = auth.user_business_id() AND auth.user_role() = 'admin');

-- Admin can update all jobs in their business
CREATE POLICY "Admin can update jobs in their business"
    ON jobs FOR UPDATE
    USING (business_id = auth.user_business_id() AND auth.user_role() = 'admin');

-- Tech can update only their assigned jobs (status, etc.)
CREATE POLICY "Tech can update their assigned jobs"
    ON jobs FOR UPDATE
    USING (
        business_id = auth.user_business_id()
        AND auth.user_role() = 'tech'
        AND technician_id = auth.uid()
    );

-- Admin can delete jobs
CREATE POLICY "Admin can delete jobs"
    ON jobs FOR DELETE
    USING (business_id = auth.user_business_id() AND auth.user_role() = 'admin');

-- ===========================================================
-- RLS POLICIES: media
-- ===========================================================

-- Admin can view all media in their business
CREATE POLICY "Admin can view all media in their business"
    ON media FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = media.job_id
            AND jobs.business_id = auth.user_business_id()
            AND auth.user_role() = 'admin'
        )
    );

-- Tech can view media for their assigned jobs
CREATE POLICY "Tech can view media for their assigned jobs"
    ON media FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = media.job_id
            AND jobs.technician_id = auth.uid()
        )
    );

-- Tech can upload media to their assigned jobs
CREATE POLICY "Tech can upload media to their assigned jobs"
    ON media FOR INSERT
    WITH CHECK (
        technician_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = media.job_id
            AND jobs.technician_id = auth.uid()
        )
    );

-- Admin can delete media
CREATE POLICY "Admin can delete media"
    ON media FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = media.job_id
            AND jobs.business_id = auth.user_business_id()
            AND auth.user_role() = 'admin'
        )
    );
