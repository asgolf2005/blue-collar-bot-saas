-- =====================================================
-- VERIFY SEED DATA
-- Run this to check if your test data was created correctly
-- =====================================================

-- Set this to your business ID
SET app.current_business_id = 'YOUR_BUSINESS_ID_HERE';

SELECT 
    'TOTAL COUNTS' as check_type,
    (SELECT COUNT(*) FROM public.services WHERE business_id = current_setting('app.current_business_id', true)::UUID) as services,
    (SELECT COUNT(*) FROM public.customers WHERE business_id = current_setting('app.current_business_id', true)::UUID) as customers,
    (SELECT COUNT(*) FROM public.jobs WHERE business_id = current_setting('app.current_business_id', true)::UUID) as jobs,
    (SELECT COUNT(*) FROM public.invoices WHERE business_id = current_setting('app.current_business_id', true)::UUID) as invoices;

-- Check job status distribution
SELECT 
    'JOBS BY STATUS' as check_type,
    status::TEXT,
    COUNT(*) as count,
    MIN(created_at) as earliest,
    MAX(created_at) as latest
FROM public.jobs 
WHERE business_id = current_setting('app.current_business_id', true)::UUID
GROUP BY status;

-- Check jobs with total_cost
SELECT 
    'JOBS WITH COST' as check_type,
    COUNT(*) as total_jobs,
    COUNT(total_cost) as jobs_with_cost,
    SUM(total_cost) as total_revenue,
    AVG(total_cost)::NUMERIC(10,2) as avg_cost
FROM public.jobs 
WHERE business_id = current_setting('app.current_business_id', true)::UUID;

-- Check invoice totals
SELECT 
    'INVOICE TOTALS' as check_type,
    status::TEXT,
    COUNT(*) as count,
    SUM(total) as total_amount
FROM public.invoices 
WHERE business_id = current_setting('app.current_business_id', true)::UUID
GROUP BY status;

-- Check date range of jobs
SELECT 
    'DATE RANGE' as check_type,
    MIN(created_at) as earliest_job,
    MAX(created_at) as latest_job,
    MIN(scheduled_start) as earliest_scheduled,
    MAX(scheduled_start) as latest_scheduled
FROM public.jobs 
WHERE business_id = current_setting('app.current_business_id', true)::UUID;

-- Sample recent jobs
SELECT 
    'SAMPLE JOBS' as check_type,
    j.id::TEXT,
    j.status::TEXT,
    j.total_cost,
    j.created_at,
    c.name as customer_name
FROM public.jobs j
JOIN public.customers c ON c.id = j.customer_id
WHERE j.business_id = current_setting('app.current_business_id', true)::UUID
ORDER BY j.created_at DESC
LIMIT 5;
