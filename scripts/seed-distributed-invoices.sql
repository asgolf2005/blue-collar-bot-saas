-- =====================================================
-- DISTRIBUTED INVOICES SEED SCRIPT
-- Creates invoices across MULTIPLE DAYS (not all on same day)
-- Jobs spread over 30 days, invoices paid on various dates
-- =====================================================

-- Replace with your business ID
SET app.current_business_id = 'd9b72aa1-71b0-4575-b80d-5980afa21348';

DO $$
DECLARE
    v_business_id UUID := current_setting('app.current_business_id', true)::UUID;
    v_tech_1_id UUID;
    v_tech_2_id UUID;
    v_tech_3_id UUID;
    v_tech_4_id UUID;
    v_customer_ids UUID[];
    v_service_ids UUID[];
    v_job_id UUID;
    v_count INTEGER;
    i INTEGER;
    v_day_offset INTEGER;
    v_invoice_day INTEGER;
    v_tech_index INTEGER;
    v_status TEXT;
    v_job_date TIMESTAMP WITH TIME ZONE;
    v_invoice_date DATE;
    v_paid_timestamp TIMESTAMP WITH TIME ZONE;
    v_invoice_total NUMERIC;
    v_target_status TEXT;
BEGIN

-- Validate business_id
IF v_business_id IS NULL OR v_business_id::TEXT = 'YOUR_BUSINESS_ID_HERE' THEN
    RAISE EXCEPTION 'Please set your business_id at the top of this script!';
END IF;

SELECT COUNT(*) INTO v_count FROM public.businesses WHERE id = v_business_id;
IF v_count = 0 THEN
    RAISE EXCEPTION 'Business ID % not found!', v_business_id;
END IF;

RAISE NOTICE 'Starting distributed invoice seed for business_id: %', v_business_id;

-- =====================================================
-- STEP 1: GET TECHS
-- =====================================================

SELECT id INTO v_tech_1_id FROM public.users WHERE business_id = v_business_id AND role = 'tech' LIMIT 1;
SELECT id INTO v_tech_2_id FROM public.users WHERE business_id = v_business_id AND role = 'tech' OFFSET 1 LIMIT 1;
SELECT id INTO v_tech_3_id FROM public.users WHERE business_id = v_business_id AND role = 'tech' OFFSET 2 LIMIT 1;
SELECT id INTO v_tech_4_id FROM public.users WHERE business_id = v_business_id AND role = 'tech' OFFSET 3 LIMIT 1;

IF v_tech_1_id IS NULL THEN SELECT id INTO v_tech_1_id FROM public.users WHERE business_id = v_business_id LIMIT 1; END IF;
IF v_tech_2_id IS NULL THEN v_tech_2_id := v_tech_1_id; END IF;
IF v_tech_3_id IS NULL THEN v_tech_3_id := v_tech_1_id; END IF;
IF v_tech_4_id IS NULL THEN v_tech_4_id := v_tech_1_id; END IF;

-- =====================================================
-- STEP 2: GET CUSTOMERS AND SERVICES
-- =====================================================

SELECT array_agg(id ORDER BY created_at) INTO v_customer_ids FROM public.customers WHERE business_id = v_business_id;
SELECT array_agg(id ORDER BY created_at) INTO v_service_ids FROM public.services WHERE business_id = v_business_id;

IF COALESCE(array_length(v_customer_ids, 1), 0) = 0 OR COALESCE(array_length(v_service_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'No customers or services found! Run the comprehensive seed first.';
END IF;

-- =====================================================
-- STEP 3: CREATE 80 JOBS OVER 30 DAYS
-- =====================================================

RAISE NOTICE 'Creating 80 jobs over 30 days...';

FOR i IN 1..80 LOOP
    -- Spread across 30 days
    v_day_offset := (i % 30);
    v_job_date := NOW() - (v_day_offset || ' days')::INTERVAL;
    v_tech_index := (i % 4);
    
    -- Status based on age
    IF v_day_offset > 20 THEN
        v_status := (ARRAY['completed', 'completed', 'completed', 'cancelled'])[1 + (i % 4)];
    ELSIF v_day_offset > 10 THEN
        v_status := (ARRAY['completed', 'in_progress', 'scheduled', 'arrived'])[1 + (i % 4)];
    ELSIF v_day_offset > 5 THEN
        v_status := (ARRAY['scheduled', 'on_the_way', 'in_progress'])[1 + (i % 3)];
    ELSE
        v_status := (ARRAY['scheduled', 'scheduled', 'scheduled', 'on_the_way'])[1 + (i % 4)];
    END IF;
    
    INSERT INTO public.jobs (
        business_id, customer_id, technician_id, status,
        scheduled_start, scheduled_end, description, urgency, source,
        total_cost, created_at, updated_at
    ) VALUES (
        v_business_id,
        v_customer_ids[1 + (i % array_length(v_customer_ids, 1))],
        CASE v_tech_index WHEN 0 THEN v_tech_1_id WHEN 1 THEN v_tech_2_id WHEN 2 THEN v_tech_3_id ELSE v_tech_4_id END,
        v_status::job_status,
        v_job_date + INTERVAL '8 hours',
        v_job_date + INTERVAL '10 hours',
        'Distributed job #' || i,
        (ARRAY['low', 'medium', 'high', 'emergency'])[1 + (i % 4)],
        'manual'::job_source,
        150 + (i * 8),
        v_job_date,
        v_job_date
    ) RETURNING id INTO v_job_id;
    
    INSERT INTO public.job_services (job_id, service_id, quantity)
    VALUES (v_job_id, v_service_ids[1 + (i % array_length(v_service_ids, 1))], 1);
END LOOP;

-- =====================================================
-- STEP 4: CREATE 60 PAID INVOICES ON DIFFERENT DAYS
-- Spread across 20 days (3 invoices per day)
-- =====================================================

RAISE NOTICE 'Creating 60 paid invoices across 20 different days...';

FOR i IN 1..60 LOOP
    -- Spread across 20 days (3 invoices per day)
    v_invoice_day := (i % 20); -- 0 to 19 days
    v_invoice_date := (CURRENT_DATE - v_invoice_day)::DATE;
    v_paid_timestamp := v_invoice_date::TIMESTAMP WITH TIME ZONE + INTERVAL '9 hours' + ((i % 8) * INTERVAL '1 hour');
    
    -- Get a completed job without invoice
    SELECT j.id INTO v_job_id
    FROM public.jobs j
    LEFT JOIN public.invoices inv ON inv.job_id = j.id
    WHERE j.business_id = v_business_id 
      AND j.status = 'completed'
      AND inv.id IS NULL
    LIMIT 1;
    
    EXIT WHEN v_job_id IS NULL;
    
    v_invoice_total := 250 + (i * 15) + (random() * 150);
    
    INSERT INTO public.invoices (
        business_id, job_id, customer_id, invoice_number,
        status, issue_date, due_date, subtotal, tax, total,
        paid_at, created_at, updated_at
    ) VALUES (
        v_business_id,
        v_job_id,
        (SELECT customer_id FROM public.jobs WHERE id = v_job_id),
        'INV-DIST-' || LPAD(i::TEXT, 4, '0'),
        'paid'::invoice_status,
        v_invoice_date,
        v_invoice_date + INTERVAL '14 days',
        v_invoice_total * 0.9,
        v_invoice_total * 0.1,
        v_invoice_total,
        v_paid_timestamp,
        v_invoice_date::TIMESTAMP WITH TIME ZONE,
        v_paid_timestamp
    );
END LOOP;

-- =====================================================
-- STEP 5: CREATE 30 SENT/OVERDUE INVOICES ON DIFFERENT DAYS
-- Spread across 15 days (2 per day)
-- =====================================================

RAISE NOTICE 'Creating 30 outstanding invoices across 15 different days...';

FOR i IN 1..30 LOOP
    v_invoice_day := (i % 15); -- 0 to 14 days
    v_invoice_date := (CURRENT_DATE - v_invoice_day)::DATE;
    v_target_status := CASE WHEN i % 3 = 0 THEN 'overdue' ELSE 'sent' END;
    
    SELECT j.id INTO v_job_id
    FROM public.jobs j
    LEFT JOIN public.invoices inv ON inv.job_id = j.id
    WHERE j.business_id = v_business_id 
      AND j.status IN ('completed', 'in_progress')
      AND inv.id IS NULL
    LIMIT 1;
    
    EXIT WHEN v_job_id IS NULL;
    
    v_invoice_total := 350 + (i * 25);
    
    INSERT INTO public.invoices (
        business_id, job_id, customer_id, invoice_number,
        status, issue_date, due_date, subtotal, tax, total, created_at
    ) VALUES (
        v_business_id,
        v_job_id,
        (SELECT customer_id FROM public.jobs WHERE id = v_job_id),
        'INV-OUT-' || LPAD(i::TEXT, 4, '0'),
        v_target_status::invoice_status,
        v_invoice_date,
        CASE WHEN v_target_status = 'overdue' THEN v_invoice_date - INTERVAL '5 days' ELSE v_invoice_date + INTERVAL '10 days' END,
        v_invoice_total * 0.9,
        v_invoice_total * 0.1,
        v_invoice_total,
        v_invoice_date::TIMESTAMP WITH TIME ZONE
    );
END LOOP;

-- =====================================================
-- VERIFICATION
-- =====================================================

RAISE NOTICE '============================================';
RAISE NOTICE 'DISTRIBUTED SEED COMPLETE!';
RAISE NOTICE '============================================';

SELECT COUNT(*) INTO v_count FROM public.jobs WHERE business_id = v_business_id;
RAISE NOTICE 'Total Jobs: %', v_count;

SELECT COUNT(*) INTO v_count FROM public.invoices WHERE business_id = v_business_id AND status = 'paid';
RAISE NOTICE 'Paid Invoices: %', v_count;

SELECT COUNT(*) INTO v_count FROM public.invoices WHERE business_id = v_business_id AND status IN ('sent', 'overdue');
RAISE NOTICE 'Outstanding Invoices: %', v_count;

-- Show invoices by day
RAISE NOTICE 'Invoices by day (last 10 days):';
FOR i IN 0..9 LOOP
    SELECT COUNT(*) INTO v_count 
    FROM public.invoices 
    WHERE business_id = v_business_id 
      AND status = 'paid'
      AND paid_at::DATE = (CURRENT_DATE - i)::DATE;
    IF v_count > 0 THEN
        RAISE NOTICE '  %: % paid invoices', (CURRENT_DATE - i)::DATE, v_count;
    END IF;
END LOOP;

-- Show jobs by day
RAISE NOTICE 'Recent jobs by day:';
FOR i IN 0..6 LOOP
    SELECT COUNT(*) INTO v_count 
    FROM public.jobs 
    WHERE business_id = v_business_id 
      AND created_at::DATE = (CURRENT_DATE - i)::DATE;
    RAISE NOTICE '  %: % jobs', (CURRENT_DATE - i)::DATE, v_count;
END LOOP;

-- Revenue by day
RAISE NOTICE 'Revenue by day (last 10 days):';
FOR i IN 0..9 LOOP
    SELECT COALESCE(SUM(total), 0)::NUMERIC(10,2) INTO v_invoice_total
    FROM public.invoices 
    WHERE business_id = v_business_id 
      AND status = 'paid'
      AND paid_at::DATE = (CURRENT_DATE - i)::DATE;
    IF v_invoice_total > 0 THEN
        RAISE NOTICE '  %: $%', (CURRENT_DATE - i)::DATE, v_invoice_total;
    END IF;
END LOOP;

RAISE NOTICE '============================================';

END $$;

