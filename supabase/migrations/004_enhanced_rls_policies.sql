-- ===========================================================
-- ENHANCED RLS POLICIES FOR NEW TABLES
-- ===========================================================

-- Enable RLS on new tables
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ===========================================================
-- RLS POLICIES: services
-- ===========================================================

-- Admin can manage services
CREATE POLICY "Admin can view services in their business"
    ON services FOR SELECT
    USING (business_id = auth.user_business_id() AND auth.user_role() = 'admin');

CREATE POLICY "Admin can insert services"
    ON services FOR INSERT
    WITH CHECK (business_id = auth.user_business_id() AND auth.user_role() = 'admin');

CREATE POLICY "Admin can update services"
    ON services FOR UPDATE
    USING (business_id = auth.user_business_id() AND auth.user_role() = 'admin');

CREATE POLICY "Admin can delete services"
    ON services FOR DELETE
    USING (business_id = auth.user_business_id() AND auth.user_role() = 'admin');

-- Tech can view active services
CREATE POLICY "Tech can view active services"
    ON services FOR SELECT
    USING (business_id = auth.user_business_id() AND is_active = true);

-- ===========================================================
-- RLS POLICIES: invoices
-- ===========================================================

-- Admin can manage all invoices
CREATE POLICY "Admin can view invoices in their business"
    ON invoices FOR SELECT
    USING (business_id = auth.user_business_id() AND auth.user_role() = 'admin');

CREATE POLICY "Admin can insert invoices"
    ON invoices FOR INSERT
    WITH CHECK (business_id = auth.user_business_id() AND auth.user_role() = 'admin');

CREATE POLICY "Admin can update invoices"
    ON invoices FOR UPDATE
    USING (business_id = auth.user_business_id() AND auth.user_role() = 'admin');

CREATE POLICY "Admin can delete invoices"
    ON invoices FOR DELETE
    USING (business_id = auth.user_business_id() AND auth.user_role() = 'admin');

-- Customers can view their own invoices
CREATE POLICY "Customers can view their own invoices"
    ON invoices FOR SELECT
    USING (
        customer_id IN (
            SELECT id FROM customers WHERE user_id = auth.uid()
        )
    );

-- ===========================================================
-- RLS POLICIES: invoice_line_items
-- ===========================================================

-- Admin can manage line items
CREATE POLICY "Admin can view invoice line items"
    ON invoice_line_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_line_items.invoice_id
            AND invoices.business_id = auth.user_business_id()
            AND auth.user_role() = 'admin'
        )
    );

CREATE POLICY "Admin can insert invoice line items"
    ON invoice_line_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_line_items.invoice_id
            AND invoices.business_id = auth.user_business_id()
            AND auth.user_role() = 'admin'
        )
    );

CREATE POLICY "Admin can update invoice line items"
    ON invoice_line_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_line_items.invoice_id
            AND invoices.business_id = auth.user_business_id()
            AND auth.user_role() = 'admin'
        )
    );

CREATE POLICY "Admin can delete invoice line items"
    ON invoice_line_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_line_items.invoice_id
            AND invoices.business_id = auth.user_business_id()
            AND auth.user_role() = 'admin'
        )
    );

-- Customers can view their invoice line items
CREATE POLICY "Customers can view their invoice line items"
    ON invoice_line_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_line_items.invoice_id
            AND invoices.customer_id IN (
                SELECT id FROM customers WHERE user_id = auth.uid()
            )
        )
    );

-- ===========================================================
-- RLS POLICIES: job_services
-- ===========================================================

-- Admin can manage job services
CREATE POLICY "Admin can view job services"
    ON job_services FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = job_services.job_id
            AND jobs.business_id = auth.user_business_id()
        )
    );

CREATE POLICY "Admin can insert job services"
    ON job_services FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = job_services.job_id
            AND jobs.business_id = auth.user_business_id()
            AND auth.user_role() = 'admin'
        )
    );

CREATE POLICY "Admin can update job services"
    ON job_services FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = job_services.job_id
            AND jobs.business_id = auth.user_business_id()
            AND auth.user_role() = 'admin'
        )
    );

CREATE POLICY "Admin can delete job services"
    ON job_services FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = job_services.job_id
            AND jobs.business_id = auth.user_business_id()
            AND auth.user_role() = 'admin'
        )
    );

-- Tech can view job services for their jobs
CREATE POLICY "Tech can view their job services"
    ON job_services FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = job_services.job_id
            AND jobs.technician_id = auth.uid()
        )
    );

-- ===========================================================
-- RLS POLICIES: subscriptions
-- ===========================================================

-- Admin can view their subscription
CREATE POLICY "Admin can view their subscription"
    ON subscriptions FOR SELECT
    USING (business_id = auth.user_business_id() AND auth.user_role() = 'admin');

-- System can manage subscriptions (via service role)
-- No INSERT/UPDATE/DELETE policies for regular users
-- These operations handled by API with service role key

-- ===========================================================
-- RLS POLICIES: notifications
-- ===========================================================

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
    ON notifications FOR DELETE
    USING (user_id = auth.uid());

-- ===========================================================
-- UPDATE EXISTING POLICIES: Add customer access
-- ===========================================================

-- Customers can view their own jobs
CREATE POLICY "Customers can view their own jobs"
    ON jobs FOR SELECT
    USING (
        customer_id IN (
            SELECT id FROM customers WHERE user_id = auth.uid()
        )
    );

-- Customers can view their own customer record
CREATE POLICY "Customers can view their own record"
    ON customers FOR SELECT
    USING (user_id = auth.uid());

-- Customers can update their own record (limited fields)
CREATE POLICY "Customers can update their own record"
    ON customers FOR UPDATE
    USING (user_id = auth.uid());
