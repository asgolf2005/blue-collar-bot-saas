-- ===========================================================
-- ENHANCED SCHEMA FOR PRODUCTION MULTI-TENANT SAAS
-- ===========================================================

-- ===========================================================
-- TABLE: services
-- Services offered by each business
-- ===========================================================
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    base_price DECIMAL(10, 2),
    duration_minutes INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_services_business_id ON services(business_id);
CREATE INDEX idx_services_active ON services(business_id, is_active);

-- ===========================================================
-- TABLE: invoices
-- Invoices for completed jobs
-- ===========================================================
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    status invoice_status DEFAULT 'draft',
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, invoice_number)
);

CREATE INDEX idx_invoices_business_id ON invoices(business_id);
CREATE INDEX idx_invoices_job_id ON invoices(job_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(business_id, status);

-- ===========================================================
-- TABLE: invoice_line_items
-- Line items for each invoice
-- ===========================================================
CREATE TYPE line_item_type AS ENUM ('service', 'labor', 'parts');

CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    type line_item_type NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

-- ===========================================================
-- TABLE: job_services
-- Link jobs to services (many-to-many)
-- ===========================================================
CREATE TABLE job_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    quantity DECIMAL(10, 2) DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id, service_id)
);

CREATE INDEX idx_job_services_job_id ON job_services(job_id);
CREATE INDEX idx_job_services_service_id ON job_services(service_id);

-- ===========================================================
-- TABLE: subscriptions
-- Stripe subscription tracking for each business
-- ===========================================================
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'unpaid');
CREATE TYPE subscription_tier AS ENUM ('starter', 'professional', 'enterprise');

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    tier subscription_tier DEFAULT 'starter',
    status subscription_status DEFAULT 'trialing',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id)
);

CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ===========================================================
-- TABLE: notifications
-- System notifications for users
-- ===========================================================
CREATE TYPE notification_type AS ENUM ('job_assigned', 'job_status_changed', 'invoice_sent', 'payment_received', 'appointment_reminder');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created ON notifications(user_id, created_at DESC);

-- ===========================================================
-- ALTER existing tables for enhanced features
-- ===========================================================

-- Add branding columns to businesses
ALTER TABLE businesses ADD COLUMN logo_url TEXT;
ALTER TABLE businesses ADD COLUMN primary_color TEXT DEFAULT '#3b82f6';
ALTER TABLE businesses ADD COLUMN slug TEXT UNIQUE;
ALTER TABLE businesses ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE businesses ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;

-- Add labor tracking to jobs
ALTER TABLE jobs ADD COLUMN labor_hours DECIMAL(5, 2);
ALTER TABLE jobs ADD COLUMN labor_rate DECIMAL(10, 2);
ALTER TABLE jobs ADD COLUMN parts_cost DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE jobs ADD COLUMN total_cost DECIMAL(10, 2);

-- Add customer portal fields
ALTER TABLE customers ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE customers ADD COLUMN portal_access BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_customers_user_id ON customers(user_id);

-- ===========================================================
-- FUNCTIONS: Auto-generate invoice numbers
-- ===========================================================
CREATE OR REPLACE FUNCTION generate_invoice_number(p_business_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_count INTEGER;
    v_number TEXT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM invoices
    WHERE business_id = p_business_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);

    v_number := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((v_count + 1)::TEXT, 5, '0');

    RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- ===========================================================
-- FUNCTIONS: Create notification helper
-- ===========================================================
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type notification_type,
    p_title TEXT,
    p_message TEXT,
    p_link TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (p_user_id, p_type, p_title, p_message, p_link)
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- ===========================================================
-- TRIGGERS: Notify tech when job assigned
-- ===========================================================
CREATE OR REPLACE FUNCTION notify_tech_job_assigned()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.technician_id IS NOT NULL AND (OLD.technician_id IS NULL OR OLD.technician_id != NEW.technician_id) THEN
        PERFORM create_notification(
            NEW.technician_id,
            'job_assigned',
            'New Job Assigned',
            'You have been assigned a new job for ' || (SELECT name FROM customers WHERE id = NEW.customer_id),
            '/tech/jobs/' || NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_tech_job_assigned
    AFTER INSERT OR UPDATE OF technician_id ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION notify_tech_job_assigned();

-- ===========================================================
-- TRIGGERS: Update timestamps
-- ===========================================================
CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
