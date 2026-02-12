-- =====================================================
-- COMPREHENSIVE TEST DATA SEED SCRIPT
-- Blue Collar Bot CRM
-- =====================================================
-- 
-- INSTRUCTIONS:
-- 1. Replace YOUR_BUSINESS_ID_HERE with your actual business UUID
-- 2. Run this script in Supabase SQL Editor
--
-- =====================================================

-- Set this to your business ID
SET app.current_business_id = 'd9b72aa1-71b0-4575-b80d-5980afa21348';

DO $$
DECLARE
    v_business_id UUID := current_setting('app.current_business_id', true)::UUID;
    v_tech_1_id UUID;
    v_tech_2_id UUID;
    v_tech_3_id UUID;
    v_customer_ids UUID[];
    v_service_ids UUID[];
    v_job_id UUID;
    v_customer_id UUID;
    v_service_id UUID;
    v_invoice_id UUID;
    v_status_text TEXT;
    i INTEGER;
    v_count INTEGER;
BEGIN

-- Validate business_id
IF v_business_id IS NULL OR v_business_id::TEXT = 'YOUR_BUSINESS_ID_HERE' THEN
    RAISE EXCEPTION 'Please set your business_id at the top of this script! Replace YOUR_BUSINESS_ID_HERE with your actual UUID.';
END IF;

-- Check if business exists
SELECT COUNT(*) INTO v_count FROM public.businesses WHERE id = v_business_id;
IF v_count = 0 THEN
    RAISE EXCEPTION 'Business ID % not found. Please check your business_id.', v_business_id;
END IF;

RAISE NOTICE 'Starting seed for business_id: %', v_business_id;

-- =====================================================
-- STEP 1: CLEAN EXISTING DATA
-- =====================================================

RAISE NOTICE 'Step 1: Cleaning existing data...';

DELETE FROM public.invoice_line_items 
WHERE invoice_id IN (SELECT id FROM public.invoices WHERE business_id = v_business_id);

DELETE FROM public.invoices WHERE business_id = v_business_id;
DELETE FROM public.job_expenses WHERE business_id = v_business_id;
DELETE FROM public.job_notes 
WHERE job_id IN (SELECT id FROM public.jobs WHERE business_id = v_business_id);
DELETE FROM public.job_services 
WHERE job_id IN (SELECT id FROM public.jobs WHERE business_id = v_business_id);
DELETE FROM public.time_entries 
WHERE job_id IN (SELECT id FROM public.jobs WHERE business_id = v_business_id);
DELETE FROM public.media 
WHERE job_id IN (SELECT id FROM public.jobs WHERE business_id = v_business_id);
DELETE FROM public.technician_locations 
WHERE technician_id IN (SELECT id FROM public.users WHERE business_id = v_business_id AND role = 'tech');
DELETE FROM public.sms_notifications WHERE business_id = v_business_id;
DELETE FROM public.notifications 
WHERE user_id IN (SELECT id FROM public.users WHERE business_id = v_business_id);
DELETE FROM public.jobs WHERE business_id = v_business_id;
DELETE FROM public.customers WHERE business_id = v_business_id;
DELETE FROM public.services WHERE business_id = v_business_id;

RAISE NOTICE 'Existing data cleaned.';

-- =====================================================
-- STEP 2: GET TECHNICIANS
-- =====================================================

RAISE NOTICE 'Step 2: Getting technicians...';

SELECT id INTO v_tech_1_id FROM public.users WHERE business_id = v_business_id AND role = 'tech' LIMIT 1;
SELECT id INTO v_tech_2_id FROM public.users WHERE business_id = v_business_id AND role = 'tech' OFFSET 1 LIMIT 1;
SELECT id INTO v_tech_3_id FROM public.users WHERE business_id = v_business_id AND role = 'tech' OFFSET 2 LIMIT 1;

IF v_tech_1_id IS NULL THEN SELECT id INTO v_tech_1_id FROM public.users WHERE business_id = v_business_id LIMIT 1; END IF;
IF v_tech_2_id IS NULL THEN v_tech_2_id := v_tech_1_id; END IF;
IF v_tech_3_id IS NULL THEN v_tech_3_id := v_tech_1_id; END IF;

RAISE NOTICE 'Technicians: %, %, %', SUBSTRING(v_tech_1_id::TEXT, 1, 8), SUBSTRING(v_tech_2_id::TEXT, 1, 8), SUBSTRING(v_tech_3_id::TEXT, 1, 8);

-- =====================================================
-- STEP 3: CREATE 10 SERVICES
-- =====================================================

RAISE NOTICE 'Step 3: Creating services...';

INSERT INTO public.services (business_id, name, description, base_price, duration_minutes, is_active, estimated_cost) VALUES
(v_business_id, 'Toilet Repair', 'Fix running toilets, leaks, and clogs. Includes parts and labor.', 150.00, 60, true, 80.00),
(v_business_id, 'Pipe Installation', 'Professional pipe installation and replacement services.', 200.00, 120, true, 120.00),
(v_business_id, 'Leak Detection', 'Advanced leak detection using thermal imaging and acoustic equipment.', 275.00, 120, true, 150.00),
(v_business_id, 'Drain Cleaning', 'High-pressure hydro jetting and drain snake services.', 180.00, 90, true, 90.00),
(v_business_id, 'Water Heater Repair', 'Repair and maintenance for tank and tankless water heaters.', 250.00, 90, true, 140.00),
(v_business_id, 'Emergency Call-Out', '24/7 emergency plumbing services with rapid response.', 350.00, 60, true, 200.00),
(v_business_id, 'Faucet Repair', 'Fix dripping faucets, handle replacement, and cartridge installation.', 120.00, 45, true, 60.00),
(v_business_id, 'Sewer Line Repair', 'Main sewer line inspection, repair, and replacement.', 500.00, 180, true, 300.00),
(v_business_id, 'Bathroom Renovation', 'Complete bathroom plumbing renovation and fixture installation.', 2500.00, 480, true, 1800.00),
(v_business_id, 'Water Pressure Check', 'Diagnose and fix low or high water pressure issues.', 100.00, 30, true, 50.00);

SELECT array_agg(id ORDER BY created_at) INTO v_service_ids FROM public.services WHERE business_id = v_business_id;
RAISE NOTICE 'Created % services', COALESCE(array_length(v_service_ids, 1), 0);

-- =====================================================
-- STEP 4: CREATE 20 CUSTOMERS
-- =====================================================

RAISE NOTICE 'Step 4: Creating customers...';

INSERT INTO public.customers (business_id, name, email, phone, address, portal_access, created_at) VALUES
(v_business_id, 'Robert Wilson', 'robert.wilson@email.com', '555-0123', '123 Main St, Springfield, ST 12345', true, NOW() - INTERVAL '45 days'),
(v_business_id, 'Michael Brown', 'michael.brown@email.com', '555-0124', '456 Oak Ave, Springfield, ST 12345', true, NOW() - INTERVAL '38 days'),
(v_business_id, 'Aryan Sharma', 'aryan.sharma@email.com', '555-0125', '789 Pine Rd, Springfield, ST 12345', false, NOW() - INTERVAL '30 days'),
(v_business_id, 'Amanda Martinez', 'amanda.m@email.com', '555-0126', '321 Elm St, Springfield, ST 12345', true, NOW() - INTERVAL '28 days'),
(v_business_id, 'Ashley Thomas', 'ashley.thomas@email.com', '555-0127', '654 Maple Dr, Springfield, ST 12345', false, NOW() - INTERVAL '25 days'),
(v_business_id, 'John Smith', 'john.smith@email.com', '555-0128', '987 Cedar Ln, Springfield, ST 12345', true, NOW() - INTERVAL '22 days'),
(v_business_id, 'Emily Davis', 'emily.davis@email.com', '555-0129', '147 Birch St, Springfield, ST 12345', true, NOW() - INTERVAL '20 days'),
(v_business_id, 'Daniel Anderson', 'daniel.a@email.com', '555-0130', '258 Spruce Ave, Springfield, ST 12345', false, NOW() - INTERVAL '18 days'),
(v_business_id, 'Jessica Lewis', 'jessica.lewis@email.com', '555-0131', '369 Willow Rd, Springfield, ST 12345', true, NOW() - INTERVAL '15 days'),
(v_business_id, 'Christopher Lee', 'chris.lee@email.com', '555-0132', '741 Aspen Dr, Springfield, ST 12345', false, NOW() - INTERVAL '12 days'),
(v_business_id, 'Sarah Johnson', 'sarah.j@email.com', '555-0133', '852 Redwood St, Springfield, ST 12345', true, NOW() - INTERVAL '10 days'),
(v_business_id, 'Matthew Taylor', 'matt.taylor@email.com', '555-0134', '963 Hickory Ln, Springfield, ST 12345', true, NOW() - INTERVAL '8 days'),
(v_business_id, 'Jennifer White', 'jen.white@email.com', '555-0135', '159 Poplar Ave, Springfield, ST 12345', false, NOW() - INTERVAL '6 days'),
(v_business_id, 'David Miller', 'david.miller@email.com', '555-0136', '357 Cypress Rd, Springfield, ST 12345', true, NOW() - INTERVAL '5 days'),
(v_business_id, 'Laura Garcia', 'laura.garcia@email.com', '555-0137', '486 Magnolia Dr, Springfield, ST 12345', true, NOW() - INTERVAL '4 days'),
(v_business_id, 'Kevin Jones', 'kevin.jones@email.com', '555-0138', '729 Dogwood St, Springfield, ST 12345', false, NOW() - INTERVAL '3 days'),
(v_business_id, 'Nicole Clark', 'nicole.clark@email.com', '555-0139', '846 Sycamore Ln, Springfield, ST 12345', true, NOW() - INTERVAL '2 days'),
(v_business_id, 'Ryan Rodriguez', 'ryan.r@email.com', '555-0140', '963 Chestnut Ave, Springfield, ST 12345', true, NOW() - INTERVAL '1 day'),
(v_business_id, 'Stephanie Walker', 'steph.w@email.com', '555-0141', '357 Walnut Rd, Springfield, ST 12345', false, NOW()),
(v_business_id, 'Andrew Hall', 'andrew.hall@email.com', '555-0142', '486 Beech Dr, Springfield, ST 12345', true, NOW());

SELECT array_agg(id ORDER BY created_at) INTO v_customer_ids FROM public.customers WHERE business_id = v_business_id;
RAISE NOTICE 'Created % customers', COALESCE(array_length(v_customer_ids, 1), 0);

-- =====================================================
-- STEP 5: CREATE 50 JOBS
-- =====================================================

RAISE NOTICE 'Step 5: Creating 50 jobs...';

FOR i IN 1..50 LOOP
    v_customer_id := v_customer_ids[1 + ((i - 1) % array_length(v_customer_ids, 1))];
    v_service_id := v_service_ids[1 + ((i - 1) % array_length(v_service_ids, 1))];
    
    INSERT INTO public.jobs (
        business_id, customer_id, technician_id, status,
        scheduled_start, scheduled_end, description, urgency, source,
        labor_hours, labor_rate, parts_cost, total_cost,
        estimated_labor_hours, estimated_materials_cost, estimated_other_costs,
        actual_labor_cost, actual_materials_cost, actual_other_costs,
        gross_profit, profit_margin,
        created_at, updated_at
    ) 
    SELECT 
        v_business_id, 
        v_customer_id, 
        CASE WHEN i % 3 = 1 THEN v_tech_1_id WHEN i % 3 = 2 THEN v_tech_2_id ELSE v_tech_3_id END,
        (CASE 
            WHEN i <= 10 THEN (ARRAY['completed', 'in_progress', 'completed'])[1 + (i % 3)]
            WHEN i <= 20 THEN (ARRAY['scheduled', 'on_the_way', 'in_progress', 'arrived'])[1 + (i % 4)]
            WHEN i <= 40 AND i % 5 = 0 THEN 'cancelled'
            WHEN i <= 40 THEN 'scheduled'
            ELSE 'scheduled'
        END)::job_status,
        CASE 
            WHEN i <= 10 THEN NOW() - INTERVAL '7 days' + ((i % 7) || ' days')::INTERVAL + INTERVAL '8 hours'
            WHEN i <= 20 THEN CURRENT_DATE + INTERVAL '8 hours' + ((i % 8) || ' hours')::INTERVAL
            ELSE CURRENT_DATE + ((i - 20) || ' days')::INTERVAL + INTERVAL '8 hours'
        END,
        CASE 
            WHEN i <= 10 THEN NOW() - INTERVAL '7 days' + ((i % 7) || ' days')::INTERVAL + INTERVAL '10 hours'
            WHEN i <= 20 THEN CURRENT_DATE + INTERVAL '10 hours' + ((i % 8) || ' hours')::INTERVAL
            ELSE CURRENT_DATE + ((i - 20) || ' days')::INTERVAL + INTERVAL '10 hours'
        END,
        'Job description for service #' || i,
        (ARRAY['low', 'medium', 'high', 'emergency'])[1 + (i % 4)],
        (CASE WHEN i % 4 = 0 THEN 'ai_caller' ELSE 'manual' END)::job_source,
        1 + (i % 4), 75.00, 45.00 + (i * 5), 150.00 + (i * 25),
        2, 50.00, 25.00, 150.00, 50.00, 25.00,
        50.00 + (i * 10), 0.20,
        NOW() - INTERVAL '10 days', NOW()
    RETURNING id INTO v_job_id;
    
    -- Link to primary service
    INSERT INTO public.job_services (job_id, service_id, quantity) VALUES (v_job_id, v_service_id, 1);
    
    -- Add secondary service
    IF i % 3 = 0 THEN
        INSERT INTO public.job_services (job_id, service_id, quantity) 
        VALUES (v_job_id, v_service_ids[1 + ((i) % array_length(v_service_ids, 1))], 1);
    END IF;
END LOOP;

SELECT COUNT(*) INTO v_count FROM public.jobs WHERE business_id = v_business_id;
RAISE NOTICE 'Created % jobs', v_count;

-- =====================================================
-- STEP 6: ADD JOB NOTES & EXPENSES
-- =====================================================

RAISE NOTICE 'Step 6: Adding job notes and expenses...';

-- Add notes for completed jobs using CORRECT enum: job_note_type
FOR v_job_id IN 
    SELECT id FROM public.jobs WHERE business_id = v_business_id AND status = 'completed'::job_status LIMIT 10
LOOP
    INSERT INTO public.job_notes (job_id, user_id, note_type, content, is_visible_to_customer, created_at)
    VALUES 
    (v_job_id, v_tech_1_id, 'note'::job_note_type, 'Arrived on site and assessed the situation.', true, NOW() - INTERVAL '5 days'),
    (v_job_id, v_tech_1_id, 'status_change'::job_note_type, 'Status updated: Started work on the repair.', true, NOW() - INTERVAL '5 days'),
    (v_job_id, v_tech_1_id, 'photo_added'::job_note_type, 'Photo documentation of completed work.', true, NOW() - INTERVAL '5 days');
    
    -- Add expenses using CORRECT enum values: materials, equipment_rental, etc.
    INSERT INTO public.job_expenses (job_id, business_id, category, description, amount, purchase_date, vendor)
    VALUES 
    (v_job_id, v_business_id, 'materials'::expense_category, 'Replacement parts', 45.00, CURRENT_DATE - INTERVAL '6 days', 'Supply Co'),
    (v_job_id, v_business_id, 'equipment_rental'::expense_category, 'Specialty tool rental', 25.00, CURRENT_DATE - INTERVAL '5 days', 'Tool Rental');
END LOOP;

-- =====================================================
-- STEP 7: CREATE 30 INVOICES
-- =====================================================

RAISE NOTICE 'Step 7: Creating invoices...';

FOR i IN 1..30 LOOP
    SELECT id, customer_id INTO v_job_id, v_customer_id
    FROM public.jobs 
    WHERE business_id = v_business_id AND status = 'completed'::job_status 
    ORDER BY created_at LIMIT 1 OFFSET ((i - 1) % 15);
    
    IF v_job_id IS NOT NULL THEN
        INSERT INTO public.invoices (
            business_id, job_id, customer_id, invoice_number, status,
            issue_date, due_date, subtotal, tax, total, notes, paid_at,
            created_at, updated_at
        ) VALUES (
            v_business_id, v_job_id, v_customer_id, 
            'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(i::TEXT, 4, '0'),
            (CASE 
                WHEN i <= 9 THEN 'paid'
                WHEN i <= 18 THEN 'sent'  
                WHEN i <= 24 THEN 'draft'
                WHEN i <= 27 THEN 'overdue'
                ELSE 'cancelled'
            END)::invoice_status,
            CURRENT_DATE - INTERVAL '10 days' + (i || ' days')::INTERVAL,
            CURRENT_DATE + INTERVAL '14 days',
            280.00 + (i * 15), 22.40 + (i * 1.2), 302.40 + (i * 16.2),
            'Thank you for your business!',
            CASE WHEN i <= 9 THEN NOW() - INTERVAL '5 days' ELSE NULL END,
            NOW(), NOW()
        ) RETURNING id INTO v_invoice_id;
        
        INSERT INTO public.invoice_line_items (invoice_id, service_id, type, description, quantity, unit_price, total)
        VALUES
        (v_invoice_id, v_service_ids[1], 'service'::line_item_type, 'Primary Service', 1, 150.00, 150.00),
        (v_invoice_id, NULL, 'labor'::line_item_type, 'Labor (2 hrs)', 2, 75.00, 150.00),
        (v_invoice_id, NULL, 'parts'::line_item_type, 'Parts & Materials', 1, 45.00 + i, 45.00 + i);
    END IF;
END LOOP;

SELECT COUNT(*) INTO v_count FROM public.invoices WHERE business_id = v_business_id;
RAISE NOTICE 'Created % invoices', v_count;

-- =====================================================
-- VERIFICATION SUMMARY
-- =====================================================

RAISE NOTICE '============================================';
RAISE NOTICE 'SEED COMPLETE - VERIFICATION';
RAISE NOTICE '============================================';

SELECT COUNT(*) INTO v_count FROM public.services WHERE business_id = v_business_id;
RAISE NOTICE 'Services: %', v_count;

SELECT COUNT(*) INTO v_count FROM public.customers WHERE business_id = v_business_id;
RAISE NOTICE 'Customers: %', v_count;

SELECT status || ': ' || cnt INTO v_status_text FROM (
    SELECT status::TEXT, COUNT(*) as cnt FROM public.jobs WHERE business_id = v_business_id GROUP BY status ORDER BY status
) t;
RAISE NOTICE 'Jobs: %', v_status_text;

SELECT COUNT(*) INTO v_count FROM public.jobs WHERE business_id = v_business_id AND scheduled_start >= CURRENT_DATE AND scheduled_start < CURRENT_DATE + INTERVAL '7 days';
RAISE NOTICE 'Jobs next 7 days: %', v_count;

SELECT 
    COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0)::NUMERIC(10,2),
    COALESCE(SUM(CASE WHEN status IN ('sent', 'overdue') THEN total ELSE 0 END), 0)::NUMERIC(10,2)
INTO i, v_count
FROM public.invoices WHERE business_id = v_business_id;
RAISE NOTICE 'Revenue: Paid=$%, Outstanding=$%', i, v_count;

RAISE NOTICE '============================================';
RAISE NOTICE 'SEED COMPLETE!';
RAISE NOTICE '============================================';

END $$;
