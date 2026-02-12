-- COMPLETE ANALYTICS DATA AUDIT
-- Run this to see exactly what data exists for analytics

-- Replace with your business ID
SET app.current_business_id = 'YOUR_BUSINESS_ID_HERE';

-- =====================================================
-- 1. REVENUE ANALYSIS (from invoices)
-- =====================================================
SELECT '=== REVENUE BY INVOICE STATUS ===' as section;

SELECT 
    status::TEXT,
    COUNT(*) as invoice_count,
    SUM(subtotal) as subtotal,
    SUM(tax) as tax,
    SUM(total) as total_revenue,
    AVG(total)::NUMERIC(10,2) as avg_invoice,
    MIN(created_at)::DATE as earliest,
    MAX(created_at)::DATE as latest
FROM public.invoices 
WHERE business_id = current_setting('app.current_business_id', true)::UUID
GROUP BY status
ORDER BY 
    CASE status 
        WHEN 'paid' THEN 1 
        WHEN 'sent' THEN 2 
        WHEN 'draft' THEN 3 
        WHEN 'overdue' THEN 4 
        ELSE 5 
    END;

-- Paid invoices by date
SELECT '=== PAID INVOICES BY DATE ===' as section;

SELECT 
    COALESCE(paid_at::DATE, created_at::DATE) as date,
    COUNT(*) as invoices_paid,
    SUM(total) as daily_revenue
FROM public.invoices 
WHERE business_id = current_setting('app.current_business_id', true)::UUID
  AND status = 'paid'
GROUP BY COALESCE(paid_at::DATE, created_at::DATE)
ORDER BY date DESC
LIMIT 14;

-- =====================================================
-- 2. JOBS ANALYSIS
-- =====================================================
SELECT '=== JOBS BY STATUS ===' as section;

SELECT 
    status::TEXT,
    COUNT(*) as job_count,
    SUM(total_cost) as total_estimated_cost,
    AVG(total_cost)::NUMERIC(10,2) as avg_estimated_cost,
    MIN(created_at)::DATE as earliest,
    MAX(created_at)::DATE as latest
FROM public.jobs 
WHERE business_id = current_setting('app.current_business_id', true)::UUID
GROUP BY status
ORDER BY job_count DESC;

-- Total jobs summary
SELECT '=== JOBS SUMMARY ===' as section;

SELECT 
    COUNT(*) as total_jobs,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
    COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_jobs,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_jobs,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_jobs,
    ROUND(COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / NULLIF(COUNT(*), 0), 1) as completion_rate
FROM public.jobs 
WHERE business_id = current_setting('app.current_business_id', true)::UUID;

-- =====================================================
-- 3. TECHNICIAN PERFORMANCE
-- =====================================================
SELECT '=== TECHNICIAN JOB COUNTS ===' as section;

SELECT 
    u.full_name as technician,
    u.id as tech_id,
    COUNT(j.id) as total_jobs,
    COUNT(j.id) FILTER (WHERE j.status = 'completed') as completed_jobs,
    SUM(j.total_cost) FILTER (WHERE j.status = 'completed') as completed_revenue_estimate
FROM public.jobs j
JOIN public.users u ON u.id = j.technician_id
WHERE j.business_id = current_setting('app.current_business_id', true)::UUID
GROUP BY u.id, u.full_name
ORDER BY completed_jobs DESC;

-- =====================================================
-- 4. SERVICE PERFORMANCE
-- =====================================================
SELECT '=== SERVICE POPULARITY ===' as section;

SELECT 
    s.name as service,
    s.id as service_id,
    COUNT(js.id) as times_booked,
    SUM(s.base_price) as estimated_revenue
FROM public.services s
LEFT JOIN public.job_services js ON js.service_id = s.id
LEFT JOIN public.jobs j ON j.id = js.job_id AND j.business_id = current_setting('app.current_business_id', true)::UUID
WHERE s.business_id = current_setting('app.current_business_id', true)::UUID
GROUP BY s.id, s.name, s.base_price
ORDER BY times_booked DESC;

-- =====================================================
-- 5. DAILY BREAKDOWN (Last 30 days)
-- =====================================================
SELECT '=== DAILY ACTIVITY (Last 30 days) ===' as section;

WITH dates AS (
    SELECT generate_series(
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE,
        INTERVAL '1 day'
    )::DATE as date
)
SELECT 
    d.date,
    COUNT(j.id) as jobs_created,
    COUNT(j.id) FILTER (WHERE j.status = 'completed' AND j.completed_at::DATE = d.date) as jobs_completed,
    COALESCE(SUM(i.total) FILTER (WHERE i.status = 'paid' AND (i.paid_at::DATE = d.date OR i.created_at::DATE = d.date)), 0) as revenue
FROM dates d
LEFT JOIN public.jobs j ON j.created_at::DATE = d.date AND j.business_id = current_setting('app.current_business_id', true)::UUID
LEFT JOIN public.invoices i ON i.business_id = current_setting('app.current_business_id', true)::UUID
GROUP BY d.date
ORDER BY d.date DESC
LIMIT 14;

-- =====================================================
-- 6. KEY METRICS SUMMARY
-- =====================================================
SELECT '=== FINAL KEY METRICS ===' as section;

SELECT
    (SELECT SUM(total) FROM public.invoices WHERE business_id = current_setting('app.current_business_id', true)::UUID AND status = 'paid') as total_paid_revenue,
    (SELECT SUM(total) FROM public.invoices WHERE business_id = current_setting('app.current_business_id', true)::UUID AND status IN ('sent', 'overdue')) as outstanding_revenue,
    (SELECT COUNT(*) FROM public.jobs WHERE business_id = current_setting('app.current_business_id', true)::UUID) as total_jobs,
    (SELECT COUNT(*) FROM public.jobs WHERE business_id = current_setting('app.current_business_id', true)::UUID AND status = 'completed') as completed_jobs,
    (SELECT ROUND(COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / NULLIF(COUNT(*), 0), 1) FROM public.jobs WHERE business_id = current_setting('app.current_business_id', true)::UUID) as completion_rate,
    (SELECT ROUND(SUM(total) / NULLIF(COUNT(*), 0), 0) FROM public.invoices WHERE business_id = current_setting('app.current_business_id', true)::UUID AND status = 'paid') as avg_ticket;
