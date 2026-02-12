-- =====================================================
-- CHECK INVOICE REVENUE (Paid vs Unpaid)
-- Run this to see actual invoice amounts
-- =====================================================

-- Replace with your business ID
SET app.current_business_id = 'YOUR_BUSINESS_ID_HERE';

-- Invoice totals by status
SELECT 
    'INVOICE BREAKDOWN' as check_type,
    status::TEXT,
    COUNT(*) as invoice_count,
    SUM(subtotal) as subtotal,
    SUM(tax) as tax,
    SUM(total) as total_amount
FROM public.invoices 
WHERE business_id = current_setting('app.current_business_id', true)::UUID
GROUP BY status
ORDER BY 
    CASE status 
        WHEN 'paid' THEN 1 
        WHEN 'sent' THEN 2 
        WHEN 'draft' THEN 3 
        WHEN 'overdue' THEN 4 
        WHEN 'cancelled' THEN 5 
    END;

-- Summary totals
SELECT 
    'SUMMARY' as check_type,
    SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END) as paid_revenue,
    SUM(CASE WHEN status IN ('sent', 'overdue') THEN total ELSE 0 END) as outstanding_revenue,
    SUM(CASE WHEN status = 'draft' THEN total ELSE 0 END) as draft_revenue,
    SUM(total) as total_invoice_value,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
    COUNT(CASE WHEN status IN ('sent', 'overdue') THEN 1 END) as unpaid_count
FROM public.invoices 
WHERE business_id = current_setting('app.current_business_id', true)::UUID;

-- Top invoices
SELECT 
    'TOP INVOICES' as check_type,
    i.invoice_number,
    i.status::TEXT,
    i.total,
    i.issue_date,
    i.paid_at,
    c.name as customer_name
FROM public.invoices i
JOIN public.customers c ON c.id = i.customer_id
WHERE i.business_id = current_setting('app.current_business_id', true)::UUID
ORDER BY i.total DESC
LIMIT 10;

-- Revenue by month (if paid)
SELECT 
    'MONTHLY PAID REVENUE' as check_type,
    DATE_TRUNC('month', paid_at)::DATE as month,
    COUNT(*) as invoices_paid,
    SUM(total) as revenue
FROM public.invoices 
WHERE business_id = current_setting('app.current_business_id', true)::UUID
  AND status = 'paid'
  AND paid_at IS NOT NULL
GROUP BY DATE_TRUNC('month', paid_at)
ORDER BY month DESC;
