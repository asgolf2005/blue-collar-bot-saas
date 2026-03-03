-- Blue Collar Bot - 2026 full operational dataset reset (single business)
-- Target admin login: andysharma@outlook.com.au (fallback: huyenthaai@gmail.com)
--
-- What this script does:
-- 1) Resolves the business_id from the admin email.
-- 2) Deletes current operational data for that business (jobs/invoices/customers/services + related rows).
-- 3) Rebuilds a realistic 2026 dataset from Jan 1 -> Dec 25.
-- 4) Uses only completed/cancelled jobs up to "today", and scheduled-only after today.
-- 5) Creates paid invoices for completed jobs, while intentionally leaving a small controlled
--    completed-without-invoice set for "Need Invoice" edge-case testing.
--
-- Safe usage:
-- - Run this in Supabase SQL Editor.
-- - This is destructive for the target business operational data.

DO $$
DECLARE
  v_admin_email_primary TEXT := 'andysharma@outlook.com.au';
  v_admin_email_fallback TEXT := 'huyenthaai@gmail.com';
  v_business_id UUID;
  v_today DATE := LEAST(CURRENT_DATE, DATE '2026-12-25');
  v_start_date DATE := DATE '2026-01-01';
  v_end_date DATE := DATE '2026-12-25';
  v_seed_tag TEXT := 'seed2026-' || TO_CHAR(clock_timestamp(), 'YYYYMMDDHH24MISS');

  -- Set to 0 for strict "all completed jobs invoiced + paid".
  -- Keep small non-zero value to test Need Invoice edge case.
  v_uninvoiced_completed_jobs INTEGER := 4;

  v_tech_count INTEGER := 0;
  v_customer_count INTEGER := 0;
  v_service_count INTEGER := 0;
  v_jobs_total INTEGER := 0;
  v_jobs_completed INTEGER := 0;
  v_jobs_cancelled INTEGER := 0;
  v_jobs_scheduled INTEGER := 0;
  v_jobs_unassigned INTEGER := 0;
  v_jobs_mapped INTEGER := 0;
  v_jobs_unmapped INTEGER := 0;
  v_invoices_paid INTEGER := 0;
BEGIN
  SELECT u.business_id
  INTO v_business_id
  FROM public.users u
  WHERE LOWER(u.email) IN (LOWER(v_admin_email_primary), LOWER(v_admin_email_fallback))
    AND u.role = 'admin'
  ORDER BY CASE
    WHEN LOWER(u.email) = LOWER(v_admin_email_primary) THEN 0
    ELSE 1
  END
  LIMIT 1;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION
      'No admin user with email % or % found in public.users',
      v_admin_email_primary, v_admin_email_fallback;
  END IF;

  -- Require at least one technician profile in this business.
  SELECT COUNT(*)
  INTO v_tech_count
  FROM public.users u
  WHERE u.business_id = v_business_id
    AND u.role = 'tech';

  IF v_tech_count = 0 THEN
    RAISE EXCEPTION 'No technicians found for business %. Create tech users first.', v_business_id;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 1) CLEAR EXISTING OPERATIONAL DATA (target business only)
  -- ---------------------------------------------------------------------------
  -- Optional tables
  IF to_regclass('public.technician_daily_availability') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.technician_daily_availability WHERE business_id = $1'
    USING v_business_id;
  END IF;

  IF to_regclass('public.job_expenses') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.job_expenses WHERE business_id = $1'
    USING v_business_id;
  END IF;

  IF to_regclass('public.sms_notifications') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.sms_notifications WHERE business_id = $1'
    USING v_business_id;
  END IF;

  IF to_regclass('public.technician_locations') IS NOT NULL THEN
    -- technician_locations has no business_id; remove through users relation
    EXECUTE '
      DELETE FROM public.technician_locations tl
      USING public.users u
      WHERE tl.technician_id = u.id
        AND u.business_id = $1
    ' USING v_business_id;
  END IF;

  -- notifications are per user
  IF to_regclass('public.notifications') IS NOT NULL THEN
    EXECUTE '
      DELETE FROM public.notifications n
      USING public.users u
      WHERE n.user_id = u.id
        AND u.business_id = $1
    ' USING v_business_id;
  END IF;

  -- core operational tables
  DELETE FROM public.invoice_line_items
  WHERE invoice_id IN (
    SELECT i.id FROM public.invoices i WHERE i.business_id = v_business_id
  );

  DELETE FROM public.invoices
  WHERE business_id = v_business_id;

  DELETE FROM public.job_services
  WHERE job_id IN (
    SELECT j.id FROM public.jobs j WHERE j.business_id = v_business_id
  );

  IF to_regclass('public.job_notes') IS NOT NULL THEN
    EXECUTE '
      DELETE FROM public.job_notes jn
      USING public.jobs j
      WHERE jn.job_id = j.id
        AND j.business_id = $1
    ' USING v_business_id;
  END IF;

  IF to_regclass('public.time_entries') IS NOT NULL THEN
    EXECUTE '
      DELETE FROM public.time_entries te
      USING public.jobs j
      WHERE te.job_id = j.id
        AND j.business_id = $1
    ' USING v_business_id;
  END IF;

  DELETE FROM public.media
  WHERE job_id IN (
    SELECT j.id FROM public.jobs j WHERE j.business_id = v_business_id
  );

  DELETE FROM public.jobs
  WHERE business_id = v_business_id;

  DELETE FROM public.customers
  WHERE business_id = v_business_id;

  DELETE FROM public.services
  WHERE business_id = v_business_id;

  -- ---------------------------------------------------------------------------
  -- 2) SERVICE CATALOG
  -- ---------------------------------------------------------------------------
  CREATE TEMP TABLE tmp_services (
    id UUID PRIMARY KEY,
    name TEXT,
    base_price NUMERIC(10,2),
    duration_minutes INTEGER
  ) ON COMMIT DROP;

  WITH svc(name, description, base_price, duration_minutes) AS (
    VALUES
      ('Interior Room Paint', 'Wall prep, masking, two-coat application, cleanup', 980.00::numeric, 210),
      ('Exterior Touch-Up', 'Exterior prep and color-match touch-ups', 1120.00::numeric, 230),
      ('Drywall Patch + Paint', 'Patch, sand, prime, and paint blend', 840.00::numeric, 190),
      ('Fence Staining', 'Wash, prep, stain/seal timber fencing', 1250.00::numeric, 240),
      ('Cabinet Refinishing', 'Doors/fronts refinish with protective coat', 1580.00::numeric, 330),
      ('Deck & Patio Sealing', 'Pressure clean and protective weather seal', 990.00::numeric, 220),
      ('Commercial Repaint', 'After-hours commercial repaint package', 1840.00::numeric, 360),
      ('Color Consultation + Sampling', 'On-site color plan + sample patches', 420.00::numeric, 90)
  ),
  inserted AS (
    INSERT INTO public.services (
      business_id, name, description, base_price, duration_minutes, is_active, created_at, updated_at
    )
    SELECT
      v_business_id,
      s.name,
      s.description,
      s.base_price,
      s.duration_minutes,
      true,
      NOW(),
      NOW()
    FROM svc s
    RETURNING id, name, base_price, duration_minutes
  )
  INSERT INTO tmp_services(id, name, base_price, duration_minutes)
  SELECT id, name, base_price, duration_minutes FROM inserted;

  SELECT COUNT(*) INTO v_service_count FROM tmp_services;

  -- ---------------------------------------------------------------------------
  -- 3) CUSTOMERS
  -- ---------------------------------------------------------------------------
  CREATE TEMP TABLE tmp_customers (
    id UUID PRIMARY KEY,
    name TEXT
  ) ON COMMIT DROP;

  WITH seq AS (
    SELECT gs AS n
    FROM generate_series(1, 96) AS gs
  ),
  inserted AS (
    INSERT INTO public.customers (
      business_id, name, phone, email, address, portal_access, created_at
    )
    SELECT
      v_business_id,
      format(
        '%s %s %s',
        (ARRAY[
          'Anderson','Bennett','Carter','Diaz','Evans','Flores','Garcia','Hughes',
          'Ibrahim','Jenkins','Khan','Lopez','Morris','Nelson','Owens','Parker',
          'Quincy','Reed','Stewart','Turner','Upton','Walker','Xu','Young','Zimmerman'
        ])[1 + floor(random() * 25)::int],
        (ARRAY['Residence','Condo HOA','Retail','Dental','Medical','Warehouse','Studio','Office','Bistro','Properties'])[1 + floor(random() * 10)::int],
        lpad(seq.n::text, 2, '0')
      ),
      format('+1-555-%s-%s', lpad((200 + (seq.n % 700))::text, 3, '0'), lpad((1000 + seq.n)::text, 4, '0')),
      format('paint.customer.%s.%s@example.com', lpad(seq.n::text, 2, '0'), substr(md5(v_business_id::text || seq.n::text), 1, 6)),
      format('%s %s %s', (100 + (seq.n * 7) % 900)::text, (ARRAY['Maple Ave','Cedar Lane','Hillcrest Ave','Pine Drive','Oak Street','River Rd','Sunset Blvd','King St'])[1 + floor(random() * 8)::int], ''),
      (random() < 0.68),
      (TIMESTAMPTZ '2026-01-01 08:00:00+00' + make_interval(days => floor(random() * 150)::int, hours => floor(random() * 10)::int))
    FROM seq
    RETURNING id, name
  )
  INSERT INTO tmp_customers(id, name)
  SELECT id, name FROM inserted;

  SELECT COUNT(*) INTO v_customer_count FROM tmp_customers;

  -- ---------------------------------------------------------------------------
  -- 4) TECH POOL (existing users with role='tech')
  -- ---------------------------------------------------------------------------
  CREATE TEMP TABLE tmp_techs (
    id UUID PRIMARY KEY,
    full_name TEXT,
    hourly_rate NUMERIC(10,2)
  ) ON COMMIT DROP;

  INSERT INTO tmp_techs (id, full_name, hourly_rate)
  SELECT
    u.id,
    COALESCE(
      NULLIF(to_jsonb(u)->>'full_name', ''),
      NULLIF(to_jsonb(u)->>'name', ''),
      split_part(u.email, '@', 1)
    ) AS full_name,
    COALESCE((to_jsonb(u)->>'hourly_rate')::numeric, 68.00::numeric)
  FROM public.users u
  WHERE u.business_id = v_business_id
    AND u.role = 'tech';

  CREATE TEMP TABLE tmp_tech_rank (
    rn INTEGER PRIMARY KEY,
    id UUID,
    hourly_rate NUMERIC(10,2)
  ) ON COMMIT DROP;

  INSERT INTO tmp_tech_rank (rn, id, hourly_rate)
  SELECT
    row_number() OVER (ORDER BY random()),
    t.id,
    t.hourly_rate
  FROM tmp_techs t;

  -- ---------------------------------------------------------------------------
  -- 5) JOB DISTRIBUTION PLAN (Aug onward reduced volume 1-10 / month)
  -- ---------------------------------------------------------------------------
  CREATE TEMP TABLE tmp_month_plan (
    month_start DATE PRIMARY KEY,
    job_count INTEGER NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO tmp_month_plan(month_start, job_count)
  VALUES
    (DATE '2026-01-01', 62),
    (DATE '2026-02-01', 58),
    (DATE '2026-03-01', 52),
    (DATE '2026-04-01', 44),
    (DATE '2026-05-01', 38),
    (DATE '2026-06-01', 34),
    (DATE '2026-07-01', 30),
    (DATE '2026-08-01', 9),
    (DATE '2026-09-01', 8),
    (DATE '2026-10-01', 6),
    (DATE '2026-11-01', 5),
    (DATE '2026-12-01', 4);

  -- ---------------------------------------------------------------------------
  -- 6) BUILD JOB SEED ROWS
  -- ---------------------------------------------------------------------------
  CREATE TEMP TABLE tmp_job_seed ON COMMIT DROP AS
  WITH expanded AS (
    SELECT
      mp.month_start,
      LEAST((mp.month_start + INTERVAL '1 month - 1 day')::date, v_end_date) AS month_end,
      g.n AS month_job_n,
      row_number() OVER (ORDER BY mp.month_start, g.n) AS global_job_n
    FROM tmp_month_plan mp
    JOIN LATERAL generate_series(1, mp.job_count) g(n) ON TRUE
  ),
  prepared AS (
    SELECT
      row_number() OVER () AS seed_n,
      c.id AS customer_id,
      p.id AS primary_service_id,
      p.name AS primary_service_name,
      COALESCE(p.base_price, 250)::numeric(10,2) AS primary_price,
      COALESCE(p.duration_minutes, 120) AS primary_duration,
      s2.id AS secondary_service_id,
      s2.name AS secondary_service_name,
      COALESCE(s2.base_price, 180)::numeric(10,2) AS secondary_price,
      COALESCE(s2.duration_minutes, 90) AS secondary_duration,
      t.id AS selected_tech_id,
      t.hourly_rate AS selected_hourly_rate,
      (expanded.month_start + floor(random() * ((expanded.month_end - expanded.month_start + 1)))::int)::date AS scheduled_date,
      (7 + floor(random() * 10)::int) AS start_hour,
      (ARRAY[0, 15, 30, 45])[1 + floor(random() * 4)::int]::int AS start_minute,
      (random() < 0.23) AS has_secondary,
      (random() < 0.965) AS map_services,
      (random() < 0.115) AS should_cancel
    FROM expanded
    CROSS JOIN LATERAL (
      SELECT c1.id
      FROM tmp_customers c1
      ORDER BY md5(
        c1.id::text
        || expanded.month_start::text
        || expanded.month_job_n::text
        || ':customer'
      )
      LIMIT 1
    ) c
    CROSS JOIN LATERAL (
      SELECT s1.id, s1.name, s1.base_price, s1.duration_minutes
      FROM tmp_services s1
      ORDER BY md5(
        s1.id::text
        || expanded.month_start::text
        || expanded.month_job_n::text
        || ':primary-service'
      )
      LIMIT 1
    ) p
    CROSS JOIN LATERAL (
      SELECT s2.id, s2.name, s2.base_price, s2.duration_minutes
      FROM tmp_services s2
      WHERE s2.id <> p.id
      ORDER BY md5(
        s2.id::text
        || expanded.month_start::text
        || expanded.month_job_n::text
        || ':secondary-service'
      )
      LIMIT 1
    ) s2
    CROSS JOIN LATERAL (
      SELECT tr.id, tr.hourly_rate
      FROM tmp_tech_rank tr
      WHERE tr.rn = 1 + ((expanded.global_job_n - 1) % v_tech_count)
      LIMIT 1
    ) t
  ),
  finalized AS (
    SELECT
      seed_n,
      customer_id,
      primary_service_id,
      primary_service_name,
      primary_price,
      secondary_service_id,
      secondary_service_name,
      secondary_price,
      has_secondary,
      map_services,
      scheduled_date,
      (scheduled_date::timestamp + make_interval(hours => start_hour, mins => start_minute))::timestamptz AS scheduled_start,
      GREATEST(
        60,
        round(
          (primary_duration * (0.82 + random() * 0.52))
          + (CASE WHEN has_secondary THEN secondary_duration * 0.35 ELSE 0 END)
        )::int
      ) AS duration_minutes,
      selected_tech_id,
      selected_hourly_rate,
      CASE
        WHEN scheduled_date <= v_today THEN
          CASE WHEN should_cancel THEN 'cancelled'::job_status ELSE 'completed'::job_status END
        ELSE 'scheduled'::job_status
      END AS status,
      CASE
        WHEN random() < 0.78 THEN 'manual'::job_source
        ELSE 'ai_caller'::job_source
      END AS source,
      CASE
        WHEN random() < 0.12 THEN 'high'
        WHEN random() < 0.48 THEN 'medium'
        ELSE 'low'
      END AS urgency
    FROM prepared
  )
  SELECT
    f.seed_n,
    f.customer_id,
    CASE
      WHEN f.scheduled_date > v_today AND random() < 0.14 THEN NULL
      WHEN f.scheduled_date <= v_today AND random() < 0.03 THEN NULL
      ELSE f.selected_tech_id
    END AS technician_id,
    f.status,
    f.source,
    f.urgency,
    f.primary_service_id,
    f.primary_service_name,
    f.secondary_service_id,
    f.secondary_service_name,
    f.has_secondary,
    f.map_services,
    f.scheduled_start,
    (f.scheduled_start + make_interval(mins => f.duration_minutes)) AS scheduled_end,
    round(
      ((f.duration_minutes::numeric / 60::numeric) * (0.92::numeric + (random() * 0.34)::numeric)),
      2
    ) AS labor_hours,
    f.selected_hourly_rate AS labor_rate,
    round(
      (
        (f.primary_price + CASE WHEN f.has_secondary THEN f.secondary_price * 0.45::numeric ELSE 0::numeric END)
        * (0.06::numeric + (random() * 0.22)::numeric)
      ),
      2
    ) AS parts_cost,
    format(
      '%s%s - prep, masking, surface correction, two-pass finish, cleanup',
      f.primary_service_name,
      CASE WHEN f.has_secondary THEN ' + ' || f.secondary_service_name ELSE '' END
    ) AS description
  FROM finalized f;

  -- ---------------------------------------------------------------------------
  -- 7) INSERT JOBS
  -- ---------------------------------------------------------------------------
  CREATE TEMP TABLE tmp_jobs_inserted (
    job_id UUID PRIMARY KEY,
    seed_n BIGINT,
    customer_id UUID,
    technician_id UUID,
    status job_status,
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    total_cost NUMERIC(10,2),
    primary_service_id UUID,
    secondary_service_id UUID,
    has_secondary BOOLEAN,
    map_services BOOLEAN,
    description TEXT
  ) ON COMMIT DROP;

  WITH src AS (
    SELECT
      s.*,
      round(
        GREATEST(
          120,
          (
            (
              (COALESCE(ts.base_price, 250::numeric) + CASE WHEN s.has_secondary THEN COALESCE(ts2.base_price, 180::numeric) * 0.45::numeric ELSE 0::numeric END)
              * (0.92::numeric + (random() * 0.40)::numeric)
            )
            + s.parts_cost
            + (s.labor_hours * s.labor_rate * 0.12::numeric)
          )
        ),
        2
      ) AS total_cost,
      LEAST(
        (s.scheduled_start - make_interval(days => (2 + floor(random() * 16)::int), hours => floor(random() * 10)::int)),
        NOW() - INTERVAL '5 minutes'
      ) AS created_at,
      CASE
        WHEN s.status = 'scheduled'::job_status THEN
          LEAST(
            (s.scheduled_start - make_interval(days => 1, hours => floor(random() * 8)::int)),
            NOW() - INTERVAL '2 minutes'
          )
        ELSE
          LEAST(
            (s.scheduled_end + make_interval(mins => (20 + floor(random() * 130)::int))),
            NOW() - INTERVAL '2 minutes'
          )
      END AS updated_at
    FROM tmp_job_seed s
    LEFT JOIN tmp_services ts ON ts.id = s.primary_service_id
    LEFT JOIN tmp_services ts2 ON ts2.id = s.secondary_service_id
  ),
  ins AS (
    INSERT INTO public.jobs (
      business_id,
      customer_id,
      technician_id,
      status,
      scheduled_start,
      scheduled_end,
      description,
      urgency,
      calendar_event_id,
      source,
      labor_hours,
      labor_rate,
      parts_cost,
      total_cost,
      created_at,
      updated_at
    )
    SELECT
      v_business_id,
      src.customer_id,
      src.technician_id,
      src.status,
      src.scheduled_start,
      src.scheduled_end,
      src.description,
      src.urgency,
      format('%s-%s', v_seed_tag, src.seed_n),
      src.source,
      src.labor_hours,
      src.labor_rate,
      src.parts_cost,
      src.total_cost,
      src.created_at,
      src.updated_at
    FROM src
    RETURNING id, customer_id, technician_id, status, scheduled_start, scheduled_end, created_at, updated_at, total_cost, description, calendar_event_id
  )
  INSERT INTO tmp_jobs_inserted (
    job_id, seed_n, customer_id, technician_id, status, scheduled_start, scheduled_end, created_at, updated_at, total_cost,
    primary_service_id, secondary_service_id, has_secondary, map_services, description
  )
  SELECT
    i.id,
    s.seed_n,
    i.customer_id,
    i.technician_id,
    i.status,
    i.scheduled_start,
    i.scheduled_end,
    i.created_at,
    i.updated_at,
    i.total_cost,
    s.primary_service_id,
    s.secondary_service_id,
    s.has_secondary,
    s.map_services,
    i.description
  FROM ins i
  JOIN tmp_job_seed s
    ON i.calendar_event_id = format('%s-%s', v_seed_tag, s.seed_n);

  -- Clean seed-only calendar marker.
  UPDATE public.jobs j
  SET calendar_event_id = NULL
  WHERE j.id IN (SELECT job_id FROM tmp_jobs_inserted);

  -- ---------------------------------------------------------------------------
  -- 8) JOB -> SERVICE LINKS (with tiny mapping-gap edge case)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.job_services (job_id, service_id, quantity, notes, created_at)
  SELECT
    ji.job_id,
    ji.primary_service_id,
    1,
    'Primary scope',
    ji.created_at
  FROM tmp_jobs_inserted ji
  WHERE ji.map_services = true
    AND ji.primary_service_id IS NOT NULL;

  INSERT INTO public.job_services (job_id, service_id, quantity, notes, created_at)
  SELECT
    ji.job_id,
    ji.secondary_service_id,
    1,
    'Secondary scope',
    ji.created_at
  FROM tmp_jobs_inserted ji
  WHERE ji.map_services = true
    AND ji.has_secondary = true
    AND ji.secondary_service_id IS NOT NULL;

  -- ---------------------------------------------------------------------------
  -- 9) INVOICES
  -- Completed jobs are paid except a small controlled uninvoiced edge set.
  -- ---------------------------------------------------------------------------
  CREATE TEMP TABLE tmp_uninvoiced_jobs ON COMMIT DROP AS
  SELECT ji.job_id
  FROM tmp_jobs_inserted ji
  WHERE ji.status = 'completed'::job_status
  ORDER BY ji.scheduled_end DESC, ji.job_id
  LIMIT v_uninvoiced_completed_jobs;

  CREATE TEMP TABLE tmp_invoices_inserted (
    invoice_id UUID PRIMARY KEY,
    job_id UUID,
    subtotal NUMERIC(10,2)
  ) ON COMMIT DROP;

  WITH invoice_src AS (
    SELECT
      ji.job_id,
      ji.customer_id,
      ji.description,
      GREATEST(120::numeric, COALESCE(ji.total_cost, 0))::numeric(10,2) AS gross_total,
      ji.scheduled_end::date AS completion_date,
      row_number() OVER (ORDER BY ji.scheduled_end, ji.job_id) AS seq
    FROM tmp_jobs_inserted ji
    LEFT JOIN tmp_uninvoiced_jobs ux ON ux.job_id = ji.job_id
    WHERE ji.status = 'completed'::job_status
      AND ux.job_id IS NULL
  ),
  computed AS (
    SELECT
      s.*,
      round((s.gross_total / 1.10), 2) AS subtotal,
      round((s.gross_total - round((s.gross_total / 1.10), 2)), 2) AS tax,
      LEAST(v_today, (s.completion_date + floor(random() * 3)::int)) AS issue_date
    FROM invoice_src s
  ),
  ins AS (
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
      notes,
      paid_at,
      created_at,
      updated_at
    )
    SELECT
      v_business_id,
      c.job_id,
      c.customer_id,
      format('INV-2026-%s', lpad(c.seq::text, 5, '0')),
      'paid'::invoice_status,
      c.issue_date,
      (c.issue_date + 14),
      c.subtotal,
      c.tax,
      c.gross_total,
      format('Auto-generated from completed job (%s)', c.job_id::text),
      LEAST(
        (c.issue_date::timestamp + make_interval(days => (1 + floor(random() * 10)::int), hours => (2 + floor(random() * 8)::int))),
        NOW() - INTERVAL '3 minutes'
      ),
      LEAST(c.issue_date::timestamp, NOW() - INTERVAL '4 minutes'),
      NOW()
    FROM computed c
    RETURNING id, job_id, subtotal
  )
  INSERT INTO tmp_invoices_inserted(invoice_id, job_id, subtotal)
  SELECT id, job_id, subtotal FROM ins;

  INSERT INTO public.invoice_line_items (
    invoice_id, service_id, type, description, quantity, unit_price, total, created_at
  )
  SELECT
    ii.invoice_id,
    js.service_id,
    'service'::line_item_type,
    LEFT(COALESCE(j.description, 'Service charge'), 240),
    1,
    ii.subtotal,
    ii.subtotal,
    NOW()
  FROM tmp_invoices_inserted ii
  JOIN public.jobs j ON j.id = ii.job_id
  LEFT JOIN LATERAL (
    SELECT jsl.service_id
    FROM public.job_services jsl
    WHERE jsl.job_id = ii.job_id
    ORDER BY jsl.created_at
    LIMIT 1
  ) js ON TRUE;

  -- ---------------------------------------------------------------------------
  -- 10) TECHNICIAN DAILY AVAILABILITY (for dispatch/fleet controls)
  -- ---------------------------------------------------------------------------
  IF to_regclass('public.technician_daily_availability') IS NOT NULL THEN
    INSERT INTO public.technician_daily_availability (
      business_id, technician_id, work_date, is_working, created_at, updated_at
    )
    SELECT
      v_business_id,
      t.id,
      d.work_date,
      CASE
        WHEN extract(isodow FROM d.work_date) IN (6, 7) THEN
          CASE WHEN d.work_date >= DATE '2026-08-01' THEN random() < 0.14 ELSE random() < 0.22 END
        ELSE
          CASE WHEN d.work_date >= DATE '2026-08-01' THEN random() < 0.62 ELSE random() < 0.89 END
      END,
      NOW(),
      NOW()
    FROM tmp_techs t
    CROSS JOIN LATERAL (
      SELECT gs::date AS work_date
      FROM generate_series(v_start_date, v_end_date, INTERVAL '1 day') gs
    ) d
    ON CONFLICT (business_id, technician_id, work_date)
    DO UPDATE
      SET is_working = EXCLUDED.is_working,
          updated_at = NOW();
  END IF;

  -- ---------------------------------------------------------------------------
  -- 11) SUMMARY
  -- ---------------------------------------------------------------------------
  SELECT COUNT(*) INTO v_jobs_total FROM tmp_jobs_inserted;
  SELECT COUNT(*) INTO v_jobs_completed FROM tmp_jobs_inserted WHERE status = 'completed'::job_status;
  SELECT COUNT(*) INTO v_jobs_cancelled FROM tmp_jobs_inserted WHERE status = 'cancelled'::job_status;
  SELECT COUNT(*) INTO v_jobs_scheduled FROM tmp_jobs_inserted WHERE status = 'scheduled'::job_status;
  SELECT COUNT(*) INTO v_jobs_unassigned FROM tmp_jobs_inserted WHERE technician_id IS NULL;

  SELECT COUNT(DISTINCT js.job_id) INTO v_jobs_mapped
  FROM public.job_services js
  JOIN public.jobs j ON j.id = js.job_id
  WHERE j.business_id = v_business_id;

  v_jobs_unmapped := v_jobs_total - v_jobs_mapped;

  SELECT COUNT(*) INTO v_invoices_paid
  FROM public.invoices i
  WHERE i.business_id = v_business_id
    AND i.status = 'paid'::invoice_status;

  RAISE NOTICE 'Reset complete for business_id=%', v_business_id;
  RAISE NOTICE 'Services: %, Customers: %, Techs: %', v_service_count, v_customer_count, v_tech_count;
  RAISE NOTICE 'Jobs total: % (completed %, cancelled %, scheduled %)', v_jobs_total, v_jobs_completed, v_jobs_cancelled, v_jobs_scheduled;
  RAISE NOTICE 'Jobs mapped/unmapped: % / %', v_jobs_mapped, v_jobs_unmapped;
  RAISE NOTICE 'Unassigned jobs: %', v_jobs_unassigned;
  RAISE NOTICE 'Paid invoices: %, completed-no-invoice edge cases: %', v_invoices_paid, v_uninvoiced_completed_jobs;
END;
$$ LANGUAGE plpgsql;
