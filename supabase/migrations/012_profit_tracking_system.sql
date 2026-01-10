-- ===========================================================
-- PROFIT TRACKING & COST ANALYSIS SYSTEM
-- This migration adds comprehensive profit tracking capabilities
-- ===========================================================

-- ===========================================================
-- STEP 1: Add hourly rates to users table
-- ===========================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'hourly_rate'
    ) THEN
        ALTER TABLE users ADD COLUMN hourly_rate DECIMAL(10, 2) DEFAULT 0;
        COMMENT ON COLUMN users.hourly_rate IS 'Technician hourly rate for labor cost calculations';
    END IF;
END $$;

-- ===========================================================
-- STEP 2: Add estimated cost to services table
-- ===========================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'services' AND column_name = 'estimated_cost'
    ) THEN
        ALTER TABLE services ADD COLUMN estimated_cost DECIMAL(10, 2) DEFAULT 0;
        COMMENT ON COLUMN services.estimated_cost IS 'Estimated cost to deliver this service (for profit margin calculation)';
    END IF;
END $$;

-- ===========================================================
-- STEP 3: Enhance jobs table with estimated vs actual costs
-- ===========================================================

-- Add estimated cost fields
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'estimated_labor_hours'
    ) THEN
        ALTER TABLE jobs ADD COLUMN estimated_labor_hours DECIMAL(5, 2) DEFAULT 0;
        COMMENT ON COLUMN jobs.estimated_labor_hours IS 'Estimated hours for the job (from quote)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'estimated_materials_cost'
    ) THEN
        ALTER TABLE jobs ADD COLUMN estimated_materials_cost DECIMAL(10, 2) DEFAULT 0;
        COMMENT ON COLUMN jobs.estimated_materials_cost IS 'Estimated cost of materials (from quote)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'estimated_other_costs'
    ) THEN
        ALTER TABLE jobs ADD COLUMN estimated_other_costs DECIMAL(10, 2) DEFAULT 0;
        COMMENT ON COLUMN jobs.estimated_other_costs IS 'Other estimated costs (permits, rentals, etc.)';
    END IF;
END $$;

-- Add actual cost fields
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'actual_labor_cost'
    ) THEN
        ALTER TABLE jobs ADD COLUMN actual_labor_cost DECIMAL(10, 2) DEFAULT 0;
        COMMENT ON COLUMN jobs.actual_labor_cost IS 'Actual labor cost (auto-calculated from time_entries)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'actual_materials_cost'
    ) THEN
        ALTER TABLE jobs ADD COLUMN actual_materials_cost DECIMAL(10, 2) DEFAULT 0;
        COMMENT ON COLUMN jobs.actual_materials_cost IS 'Actual materials cost (auto-calculated from job_expenses)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'actual_other_costs'
    ) THEN
        ALTER TABLE jobs ADD COLUMN actual_other_costs DECIMAL(10, 2) DEFAULT 0;
        COMMENT ON COLUMN jobs.actual_other_costs IS 'Other actual costs (auto-calculated from job_expenses)';
    END IF;
END $$;

-- Add profit calculation fields
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'gross_profit'
    ) THEN
        ALTER TABLE jobs ADD COLUMN gross_profit DECIMAL(10, 2) DEFAULT 0;
        COMMENT ON COLUMN jobs.gross_profit IS 'Revenue minus total costs (auto-calculated)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'profit_margin'
    ) THEN
        ALTER TABLE jobs ADD COLUMN profit_margin DECIMAL(5, 2) DEFAULT 0;
        COMMENT ON COLUMN jobs.profit_margin IS 'Profit as percentage of revenue (auto-calculated)';
    END IF;
END $$;

-- ===========================================================
-- STEP 4: Create job_expenses table
-- ===========================================================

-- Create expense_category enum type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_category') THEN
        CREATE TYPE expense_category AS ENUM (
            'materials',
            'subcontractor',
            'equipment_rental',
            'travel',
            'permits',
            'other'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS job_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    category expense_category NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    receipt_url TEXT,
    vendor TEXT,
    purchase_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE job_expenses IS 'Individual expenses tracked per job for accurate profit calculation';

CREATE INDEX IF NOT EXISTS idx_job_expenses_job_id ON job_expenses(job_id);
CREATE INDEX IF NOT EXISTS idx_job_expenses_business_id ON job_expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_job_expenses_category ON job_expenses(job_id, category);
CREATE INDEX IF NOT EXISTS idx_job_expenses_created_at ON job_expenses(job_id, created_at DESC);

-- ===========================================================
-- STEP 5: Auto-calculation functions
-- ===========================================================

-- Function: Calculate actual labor cost from time_entries
CREATE OR REPLACE FUNCTION calculate_actual_labor_cost(p_job_id UUID)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    v_total_cost DECIMAL(10, 2);
BEGIN
    SELECT COALESCE(SUM(
        EXTRACT(EPOCH FROM (
            COALESCE(te.clock_out, NOW()) - te.clock_in
        )) / 3600.0 * COALESCE(u.hourly_rate, 0)
    ), 0)
    INTO v_total_cost
    FROM time_entries te
    LEFT JOIN users u ON u.id = te.technician_id
    WHERE te.job_id = p_job_id;

    RETURN v_total_cost;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate total expenses by category
CREATE OR REPLACE FUNCTION calculate_expenses_by_category(
    p_job_id UUID,
    p_category expense_category
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    v_total DECIMAL(10, 2);
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total
    FROM job_expenses
    WHERE job_id = p_job_id AND category = p_category;

    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- Function: Update job profit calculations
CREATE OR REPLACE FUNCTION update_job_profit_calculations(p_job_id UUID)
RETURNS VOID AS $$
DECLARE
    v_actual_labor_cost DECIMAL(10, 2);
    v_actual_materials_cost DECIMAL(10, 2);
    v_actual_other_costs DECIMAL(10, 2);
    v_total_actual_cost DECIMAL(10, 2);
    v_total_revenue DECIMAL(10, 2);
    v_gross_profit DECIMAL(10, 2);
    v_profit_margin DECIMAL(5, 2);
BEGIN
    -- Calculate actual labor cost from time_entries
    v_actual_labor_cost := calculate_actual_labor_cost(p_job_id);

    -- Calculate materials cost from expenses
    v_actual_materials_cost := calculate_expenses_by_category(p_job_id, 'materials');

    -- Calculate other costs (sum of all non-materials expenses)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_actual_other_costs
    FROM job_expenses
    WHERE job_id = p_job_id AND category != 'materials';

    -- Get total revenue from job (from total_cost which is actually revenue)
    -- Note: We should rename total_cost to revenue in a future migration
    SELECT COALESCE(total_cost, 0)
    INTO v_total_revenue
    FROM jobs
    WHERE id = p_job_id;

    -- Calculate totals
    v_total_actual_cost := v_actual_labor_cost + v_actual_materials_cost + v_actual_other_costs;
    v_gross_profit := v_total_revenue - v_total_actual_cost;

    -- Calculate profit margin (avoid division by zero)
    IF v_total_revenue > 0 THEN
        v_profit_margin := (v_gross_profit / v_total_revenue) * 100;
    ELSE
        v_profit_margin := 0;
    END IF;

    -- Update the job record
    UPDATE jobs
    SET
        actual_labor_cost = v_actual_labor_cost,
        actual_materials_cost = v_actual_materials_cost,
        actual_other_costs = v_actual_other_costs,
        gross_profit = v_gross_profit,
        profit_margin = v_profit_margin,
        updated_at = NOW()
    WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- ===========================================================
-- STEP 6: Triggers for auto-calculation
-- ===========================================================

-- Trigger: Recalculate profit when time entry changes
CREATE OR REPLACE FUNCTION trigger_recalculate_profit_on_time_entry()
RETURNS TRIGGER AS $$
BEGIN
    -- Use NEW.job_id for INSERT/UPDATE, OLD.job_id for DELETE
    IF TG_OP = 'DELETE' THEN
        PERFORM update_job_profit_calculations(OLD.job_id);
    ELSE
        PERFORM update_job_profit_calculations(NEW.job_id);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_time_entry_profit_recalc ON time_entries;
CREATE TRIGGER trigger_time_entry_profit_recalc
    AFTER INSERT OR UPDATE OR DELETE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_profit_on_time_entry();

-- Trigger: Recalculate profit when expense changes
CREATE OR REPLACE FUNCTION trigger_recalculate_profit_on_expense()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM update_job_profit_calculations(OLD.job_id);
    ELSE
        PERFORM update_job_profit_calculations(NEW.job_id);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_expense_profit_recalc ON job_expenses;
CREATE TRIGGER trigger_expense_profit_recalc
    AFTER INSERT OR UPDATE OR DELETE ON job_expenses
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_profit_on_expense();

-- Trigger: Update job_expenses updated_at
CREATE TRIGGER update_job_expenses_updated_at
    BEFORE UPDATE ON job_expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===========================================================
-- STEP 7: RLS Policies for job_expenses
-- ===========================================================
ALTER TABLE job_expenses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view expenses from their business" ON job_expenses;
DROP POLICY IF EXISTS "Users can create expenses for their business jobs" ON job_expenses;
DROP POLICY IF EXISTS "Users can update expenses from their business" ON job_expenses;
DROP POLICY IF EXISTS "Users can delete expenses from their business" ON job_expenses;

-- View expenses (business isolation)
CREATE POLICY "Users can view expenses from their business"
    ON job_expenses
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.business_id = job_expenses.business_id
        )
    );

-- Create expenses (business isolation)
CREATE POLICY "Users can create expenses for their business jobs"
    ON job_expenses
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM jobs j
            INNER JOIN users u ON u.business_id = j.business_id
            WHERE j.id = job_expenses.job_id
            AND u.id = auth.uid()
            AND job_expenses.business_id = u.business_id
        )
    );

-- Update expenses (business isolation)
CREATE POLICY "Users can update expenses from their business"
    ON job_expenses
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.business_id = job_expenses.business_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.business_id = job_expenses.business_id
        )
    );

-- Delete expenses (business isolation)
CREATE POLICY "Users can delete expenses from their business"
    ON job_expenses
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.business_id = job_expenses.business_id
        )
    );

-- ===========================================================
-- STEP 8: Initialize profit calculations for existing jobs
-- ===========================================================
-- This will calculate profit for all existing jobs in the system
DO $$
DECLARE
    v_job_record RECORD;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Initializing profit calculations for existing jobs...';

    FOR v_job_record IN
        SELECT id FROM jobs
        WHERE status IN ('completed', 'in_progress')
    LOOP
        PERFORM update_job_profit_calculations(v_job_record.id);
        v_count := v_count + 1;
    END LOOP;

    RAISE NOTICE 'Profit calculations initialized for % jobs', v_count;
END $$;

-- ===========================================================
-- VERIFICATION
-- ===========================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PROFIT TRACKING SYSTEM - VERIFICATION';
    RAISE NOTICE '========================================';

    -- Check users.hourly_rate
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'hourly_rate') THEN
        RAISE NOTICE '✓ users.hourly_rate added';
    END IF;

    -- Check services.estimated_cost
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'estimated_cost') THEN
        RAISE NOTICE '✓ services.estimated_cost added';
    END IF;

    -- Check jobs estimated fields
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'estimated_labor_hours') THEN
        RAISE NOTICE '✓ jobs.estimated_labor_hours added';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'estimated_materials_cost') THEN
        RAISE NOTICE '✓ jobs.estimated_materials_cost added';
    END IF;

    -- Check jobs actual fields
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'actual_labor_cost') THEN
        RAISE NOTICE '✓ jobs.actual_labor_cost added';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'actual_materials_cost') THEN
        RAISE NOTICE '✓ jobs.actual_materials_cost added';
    END IF;

    -- Check jobs profit fields
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'gross_profit') THEN
        RAISE NOTICE '✓ jobs.gross_profit added';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'profit_margin') THEN
        RAISE NOTICE '✓ jobs.profit_margin added';
    END IF;

    -- Check job_expenses table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_expenses') THEN
        RAISE NOTICE '✓ job_expenses table created';
    END IF;

    -- Check functions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_actual_labor_cost') THEN
        RAISE NOTICE '✓ calculate_actual_labor_cost() function created';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_job_profit_calculations') THEN
        RAISE NOTICE '✓ update_job_profit_calculations() function created';
    END IF;

    -- Check triggers
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_time_entry_profit_recalc') THEN
        RAISE NOTICE '✓ Time entry profit recalculation trigger created';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_expense_profit_recalc') THEN
        RAISE NOTICE '✓ Expense profit recalculation trigger created';
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ PROFIT TRACKING SYSTEM READY!';
    RAISE NOTICE '========================================';
END $$;
