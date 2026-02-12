-- =====================================================
-- EXPANDED TEST DATA SEED SCRIPT
-- Creates jobs/invoices across multiple days with different technicians
-- =====================================================

-- Replace with your business ID
SET app.current_business_id = 'YOUR_BUSINESS_ID_HERE';

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
    v_invoice_id UUID;
    v_count INTEGER;
    i INTEGER;
    v_day_offset INTEGER;
    v_tech_index INTEGER;
    v_status TEXT;
    v_job_date TIMESTAMP WITH TIME ZONE;
    v_invoice_total NUMERIC;
BEGIN

-- Validate business_id
IF v_business_id IS NULL OR v_business_id::TEXT = 'YOUR_BUSINESS_ID_HERE' THEN
    RAISE EXCEPTION 'Please set your business_id at the top of this script!';
END IF;

SELECT COUNT(*) INTO v_count FROM public.businesses WHERE id = v_business_id;
IF v_count = 0 THEN
    RAISE EXCEPTION 'Business ID % not found!', v_business_id;
END IF;

RAISE NOTICE 'Starting expanded seed for business_id: %', v_business_id;

-- =====================================================
-- STEP 1: GET EXISTING TECHS OR CREATE NEW ONES
-- =====================================================

-- Get up to 4 existing techs
SELECT id INTO v_tech_1_id FROM public.users WHERE business_id = v_business_id AND role = 'tech' LIMIT 1;
SELECT id INTO v_tech_2_id FROM public.users WHERE business_id = v_business_id AND role = 'tech' OFFSET 1 LIMIT 1;
SELECT id INTO v_tech_3_id FROM public.users WHERE business_id = v_business_id AND role = 'tech' OFFSET 2 LIMIT 1;
SELECT id INTO v_tech_4_id FROM public.users WHERE business_id = v_business_id AND role = 'tech' OFFSET 3 LIMIT 1;

-- Fallback to any users if not enough techs
IF v_tech_1_id IS NULL THEN SELECT id INTO v_tech_1_id FROM public.users WHERE business_id = v_business_id LIMIT 1; END IF;
IF v_tech_2_id IS NULL THEN v_tech_2_id := v_tech_1_id; END IF;
IF v_tech_3_id IS NULL THEN v_tech_3_id := v_tech_1_id; END IF;
IF v_tech_4_id IS NULL THEN v_tech_4_id := v_tech_1_id; END IF;

RAISE NOTICE 'Using technicians: %, %, %, %', 
    SUBSTRING(v_tech_1_id::TEXT, 1, 8),
    SUBSTRING(v_tech_2_id::TEXT, 1, 8), 
    SUBSTRING(v_tech_3_id::TEXT, 1, 8),
    SUBSTRING(v_tech_4_id::TEXT, 1, 8);

-- =====================================================
-- STEP 2: GET EXISTING CUSTOMERS AND SERVICES
-- =====================================================

SELECT array_agg(id ORDER BY created_at) INTO v_customer_ids FROM public.customers WHERE business_id = v_business_id;
SELECT array_agg(id ORDER BY created_at) INTO v_service_ids FROM public.services WHERE business_id = v_business_id;

IF COALESCE(array_length(v_customer_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'No customers found! Run the comprehensive seed first.';
END IF;

IF COALESCE(array_length(v_service_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'No services found! Run the comprehensive seed first.';
END IF;

RAISE NOTICE 'Found % customers and % services', 
    COALESCE(array_length(v_customer_ids, 1), 0),
    COALESCE(array_length(v_service_ids, 1), 0);

-- =====================================================
-- STEP 3: CREATE 100 MORE JOBS OVER 30 DAYS
-- =====================================================

RAISE NOTICE 'Creating 100 jobs over 30 days...';

FOR i IN 1..100 LOOP
    -- Spread across 30 days (some days will have multiple jobs)
    v_day_offset := (i % 30); -- 0 to 29 days ago
    v_job_date := NOW() - (v_day_offset || ' days')::INTERVAL;
    
    -- Rotate through technicians
    v_tech_index := (i % 4);
    
    -- Determine status based on day offset (older jobs more likely completed)
    IF v_day_offset > 20 THEN
        v_status := (ARRAY['completed', 'completed', 'completed', 'cancelled'])[1 + (i % 4)];
    ELSIF v_day_offset > 10 THEN
        v_status := (ARRAY['completed', 'in_progress', 'scheduled', 'arrived'])[1 + (i % 4)];
    ELSIF v_day_offset > 5 THEN
        v_status := (ARRAY['scheduled', 'on_the_way', 'in_progress'])[1 + (i % 3)];
    ELSE
        v_status := (ARRAY['scheduled', 'scheduled', 'scheduled', 'on_the_way'])[1 + (i % 4)];
    END IF;
    
    -- Insert job
    INSERT INTO public.jobs (
        business_id,
        customer_id,
        technician_id,
        status,
        scheduled_start,
        scheduled_end,
        description,
        urgency,
        source,
        total_cost,
        created_at,
        updated_at
    ) VALUES (
        v_business_id,
        v_customer_ids[1 + (i % array_length(v_customer_ids, 1))],
        CASE v_tech_index 
            WHEN 0 THEN v_tech_1_id 
            WHEN 1 THEN v_tech_2_id 
            WHEN 2 THEN v_tech_3_id 
            ELSE v_tech_4_id 
        END,
        v_status::job_status,
        v_job_date + INTERVAL '8 hours',
        v_job_date + INTERVAL '10 hours',
        'Expanded seed job #' || i,
        (ARRAY['low', 'medium', 'high', 'emergency'])[1 + (i % 4)],
        'manual'::job_source,
        150 + (i * 5), -- Varying costs
        v_job_date,
        v_job_date
    ) RETURNING id INTO v_job_id;
    
    -- Link to service
    INSERT INTO public.job_services (job_id, service_id, quantity)
    VALUES (v_job_id, v_service_ids[1 + (i % array_length(v_service_ids, 1))], 1);
    
    -- Add second service to some jobs
    IF i % 3 = 0 THEN
        INSERT INTO public.job_services (job_id, service_id, quantity)
        VALUES (v_job_id, v_service_ids[1 + ((i + 1) % array_length(v_service_ids, 1))], 1);
    END IF;
END LOOP;

SELECT COUNT(*) INTO v_count FROM public.jobs WHERE business_id = v_business_id;
RAISE NOTICE 'Total jobs after expansion: %', v_count;

-- =====================================================
-- STEP 4: CREATE 60 INVOICES - ALL ON SAME DAY
-- =====================================================

RAISE NOTICE 'Creating 60 invoices (all paid on same day)...';

-- Target date: Feb 1, 2026 (same as existing paid invoices)
DECLARE
    v_target_date DATE := '2026-02-01';
    v_paid_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get completed jobs that don't have invoices yet
    FOR i IN 1..60 LOOP
        -- Pick a completed job that doesn't have an invoice
        SELECT j.id, j.customer_id, j.total_cost
        INTO v_job_id
        FROM public.jobs j
        LEFT JOIN public.invoices inv ON inv.job_id = j.id
        WHERE j.business_id = v_business_id 
          AND j.status = 'completed'
          AND inv.id IS NULL
        ORDER BY j.created_at
        LIMIT 1
        OFFSET (i - 1);
        
        EXIT WHEN v_job_id IS NULL;
        
        -- Create invoice
        v_invoice_total := 200 + (i * 25) + (random() * 100);
        v_paid_timestamp := v_target_date::TIMESTAMP WITH TIME ZONE + INTERVAL '14 hours' + (i * INTERVAL '5 minutes');
        
        INSERT INTO public.invoices (
            business_id,
            job_id,
            customer_id,
            invoice_number,
            status,
            issue_date,
            due_date,
            subtotal,
            tax,
            total,
            paid_at,
            created_at,
            updated_at
        ) VALUES (
            v_business_id,
            v_job_id,
            (SELECT customer_id FROM public.jobs WHERE id = v_job_id),
            'INV-2026-' || LPAD((1000 + i)::TEXT, 4, '0'),
            'paid'::invoice_status,
            v_target_date,
            v_target_date + INTERVAL '14 days',
            v_invoice_total * 0.9,
            v_invoice_total * 0.1,
            v_invoice_total,
            v_paid_timestamp,
            v_target_date::TIMESTAMP WITH TIME ZONE,
            v_paid_timestamp
        );
    END LOOP;
END;

-- Create some sent/overdue invoices on same day too
DECLARE
    v_target_date DATE := '2026-02-01';
BEGIN
    FOR i IN 1..20 LOOP
        SELECT j.id INTO v_job_id
        FROM public.jobs j
        LEFT JOIN public.invoices inv ON inv.job_id = j.id
        WHERE j.business_id = v_business_id 
          AND j.status IN ('completed', 'in_progress')
          AND inv.id IS NULL
        LIMIT 1
        OFFSET (i - 1);
        
        EXIT WHEN v_job_id IS NULL;
        
        v_invoice_total := 300 + (i * 30);
        
        INSERT INTO public.invoices (
            business_id,
            job_id,
            customer_id,
            invoice_number,
            status,
            issue_date,
            due_date,
            subtotal,
            tax,
            total,
            created_at
        ) VALUES (
            v_business_id,
            v_job_id,
            (SELECT customer_id FROM public.jobs WHERE id = v_job_id),
            'INV-2026-' || LPAD((2000 + i)::TEXT, 4, '0'),
            CASE WHEN i % 3 = 0 THEN 'overdue'::invoice_status ELSE 'sent'::invoice_status END,
            v_target_date,
            v_target_date - INTERVAL '7 days', -- Already overdue
            v_invoice_total * 0.9,
            v_invoice_total * 0.1,
            v_invoice_total,
            v_target_date::TIMESTAMP WITH TIME ZONE
        );
    END LOOP;
END;

SELECT COUNT(*) INTO v_count FROM public.invoices WHERE business_id = v_business_id;
RAISE NOTICE 'Total invoices after expansion: %', v_count;

SELECT 
    status::TEXT,
    COUNT(*),
    SUM(total)
INTO v_status, v_count, v_invoice_total
FROM public.invoices 
WHERE business_id = v_business_id
GROUP BY status;

-- =====================================================
-- VERIFICATION
-- =====================================================

RAISE NOTICE '============================================';
RAISE NOTICE 'EXPANDED SEED COMPLETE!';
RAISE NOTICE '============================================';

SELECT COUNT(*) INTO v_count FROM public.jobs WHERE business_id = v_business_id;
RAISE NOTICE 'Total Jobs: %', v_count;

SELECT status::TEXT, COUNT(*) INTO v_status, v_count FROM public.jobs WHERE business_id = v_business_id GROUP BY status;
RAISE NOTICE 'Job Status: % = %', v_status, v_count;

SELECT COUNT(*) INTO v_count FROM public.invoices WHERE business_id = v_business_id;
RAISE NOTICE 'Total Invoices: %', v_count;

SELECT 
    status::TEXT, 
    COUNT(*),
    SUM(total)::NUMERIC(10,2)
INTO v_status, v_count, v_invoice_total
FROM public.invoices 
WHERE business_id = v_business_id AND status = 'paid'
GROUP BY status;
RAISE NOTICE 'Paid: % invoices, $% total', v_count, v_invoice_total;

SELECT 
    COUNT(*),
    SUM(total)::NUMERIC(10,2)
INTO v_count, v_invoice_total
FROM public.invoices 
WHERE business_id = v_business_id AND status IN ('sent', 'overdue');
RAISE NOTICE 'Outstanding: % invoices, $% total', v_count, v_invoice_total;

-- Show jobs by day
RAISE NOTICE 'Jobs by day (last 7 days):';
FOR i IN 0..6 LOOP
    SELECT COUNT(*) INTO v_count 
    FROM public.jobs 
    WHERE business_id = v_business_id 
      AND created_at::DATE = (CURRENT_DATE - i)::DATE;
    RAISE NOTICE '  %: % jobs', (CURRENT_DATE - i)::DATE, v_count;
END LOOP;

-- Show jobs by technician
RAISE NOTICE 'Jobs by technician:';
FOR i IN 1..4 LOOP
    SELECT COUNT(*) INTO v_count 
    FROM public.jobs 
    WHERE business_id = v_business_id 
      AND technician_id = CASE i 
        WHEN 1 THEN v_tech_1_id 
        WHEN 2 THEN v_tech_2_id 
        WHEN 3 THEN v_tech_3_id 
        ELSE v_tech_4_id 
      END;
    RAISE NOTICE '  Tech %: % jobs', i, v_count;
END LOOP;

RAISE NOTICE '============================================';

END $$;
