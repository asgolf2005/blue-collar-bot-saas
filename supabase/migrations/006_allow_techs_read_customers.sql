-- Allow technicians to read customers from their business
-- This is needed for technicians to see customer names in their job lists

CREATE POLICY "Technicians can view customers in their business"
    ON customers FOR SELECT
    USING (
        business_id IN (
            SELECT business_id
            FROM users
            WHERE id = auth.uid()
            AND role IN ('admin', 'tech')
        )
    );
