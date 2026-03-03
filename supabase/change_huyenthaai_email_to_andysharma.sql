-- One-off email migration for existing account
-- Run in Supabase SQL Editor.
--
-- What it does:
-- 1) Finds the auth user by old OR new email.
-- 2) Moves auth login email to the new value (same auth user id).
-- 3) Syncs auth.identities for email/password login.
-- 4) Ensures a linked row exists in public.users (creates one if missing).
-- 5) Updates all public.* tables that have an "email" column.
--
-- Target change:
--   huyenthaai@gmail.com -> andysharma@outlook.com.au

BEGIN;

DO $$
DECLARE
  v_old_email TEXT := 'huyenthaai@gmail.com';
  v_new_email TEXT := 'andysharma@outlook.com.au';
  v_auth_user_id UUID;
  v_auth_email TEXT;
  v_existing_new_owner UUID;
  v_business_id UUID;
  v_role TEXT;
  v_rows INTEGER := 0;
  v_has_full_name BOOLEAN := false;
  v_has_name BOOLEAN := false;
  v_has_phone BOOLEAN := false;
  v_business_has_email BOOLEAN := false;
  v_full_name TEXT := 'Andy Sharma';
  r RECORD;
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION 'Missing table public.users. Run migrations first.';
  END IF;

  IF to_regclass('public.businesses') IS NULL THEN
    RAISE EXCEPTION 'Missing table public.businesses. Run migrations first.';
  END IF;

  -- 1) Resolve auth user (prefer old email, then new)
  SELECT id, email
  INTO v_auth_user_id, v_auth_email
  FROM auth.users
  WHERE LOWER(email) IN (LOWER(v_old_email), LOWER(v_new_email))
  ORDER BY CASE WHEN LOWER(email) = LOWER(v_old_email) THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION
      'No auth.users record found for % or %',
      v_old_email, v_new_email;
  END IF;

  SELECT id
  INTO v_existing_new_owner
  FROM auth.users
  WHERE LOWER(email) = LOWER(v_new_email)
    AND id <> v_auth_user_id
  LIMIT 1;

  IF v_existing_new_owner IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot migrate: % is already owned by a different auth user id %',
      v_new_email, v_existing_new_owner;
  END IF;

  -- 2) Update auth user email
  UPDATE auth.users
  SET
    email = v_new_email,
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    raw_user_meta_data = CASE
      WHEN raw_user_meta_data IS NULL
        THEN jsonb_build_object('email', v_new_email)
      ELSE
        jsonb_set(raw_user_meta_data, '{email}', to_jsonb(v_new_email::TEXT), true)
    END
  WHERE id = v_auth_user_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'auth.users updated rows: % (id=%)', v_rows, v_auth_user_id;

  -- 3) Update email identity mapping
  UPDATE auth.identities
  SET
    provider_id = v_new_email,
    identity_data = jsonb_set(
      COALESCE(identity_data, '{}'::jsonb),
      '{email}',
      to_jsonb(v_new_email::TEXT),
      true
    )
  WHERE user_id = v_auth_user_id
    AND provider = 'email';

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'auth.identities updated rows: %', v_rows;

  -- 4) Ensure public.users row exists and is linked by id
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'full_name'
  ) INTO v_has_full_name;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'name'
  ) INTO v_has_name;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'phone'
  ) INTO v_has_phone;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'email'
  ) INTO v_business_has_email;

  -- business_id from linked public.users row first
  SELECT business_id, role::TEXT
  INTO v_business_id, v_role
  FROM public.users
  WHERE id = v_auth_user_id
  LIMIT 1;

  -- fallback business_id/role from email match row
  IF v_business_id IS NULL THEN
    SELECT business_id, role::TEXT
    INTO v_business_id, v_role
    FROM public.users
    WHERE LOWER(email) IN (LOWER(v_old_email), LOWER(v_new_email))
    LIMIT 1;
  END IF;

  -- fallback business_id from businesses.contact email
  IF v_business_id IS NULL THEN
    SELECT id
    INTO v_business_id
    FROM public.businesses
    WHERE LOWER(COALESCE(email, '')) IN (LOWER(v_old_email), LOWER(v_new_email))
    LIMIT 1;
  END IF;

  -- fallback business_id if there is exactly one business
  IF v_business_id IS NULL THEN
    IF (SELECT COUNT(*) FROM public.businesses) = 1 THEN
      SELECT id INTO v_business_id FROM public.businesses LIMIT 1;
    END IF;
  END IF;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION
      'Could not resolve business_id. Add a business row first, then rerun this script.';
  END IF;

  IF v_role IS NULL OR v_role = '' THEN
    v_role := 'admin';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_auth_user_id) THEN
    IF v_has_full_name AND v_has_phone THEN
      EXECUTE
        'UPDATE public.users
         SET email = $1,
             business_id = $2,
             role = $3::user_role,
             full_name = COALESCE(full_name, $4)
         WHERE id = $5'
      USING v_new_email, v_business_id, v_role, v_full_name, v_auth_user_id;
    ELSIF v_has_full_name THEN
      EXECUTE
        'UPDATE public.users
         SET email = $1,
             business_id = $2,
             role = $3::user_role,
             full_name = COALESCE(full_name, $4)
         WHERE id = $5'
      USING v_new_email, v_business_id, v_role, v_full_name, v_auth_user_id;
    ELSIF v_has_name THEN
      EXECUTE
        'UPDATE public.users
         SET email = $1,
             business_id = $2,
             role = $3::user_role,
             name = COALESCE(name, $4)
         WHERE id = $5'
      USING v_new_email, v_business_id, v_role, v_full_name, v_auth_user_id;
    ELSE
      EXECUTE
        'UPDATE public.users
         SET email = $1,
             business_id = $2,
             role = $3::user_role
         WHERE id = $4'
      USING v_new_email, v_business_id, v_role, v_auth_user_id;
    END IF;
  ELSE
    IF v_has_full_name AND v_has_phone THEN
      EXECUTE
        'INSERT INTO public.users (id, business_id, email, role, full_name, phone)
         VALUES ($1, $2, $3, $4::user_role, $5, NULL)'
      USING v_auth_user_id, v_business_id, v_new_email, v_role, v_full_name;
    ELSIF v_has_full_name THEN
      EXECUTE
        'INSERT INTO public.users (id, business_id, email, role, full_name)
         VALUES ($1, $2, $3, $4::user_role, $5)'
      USING v_auth_user_id, v_business_id, v_new_email, v_role, v_full_name;
    ELSIF v_has_name THEN
      EXECUTE
        'INSERT INTO public.users (id, business_id, email, role, name)
         VALUES ($1, $2, $3, $4::user_role, $5)'
      USING v_auth_user_id, v_business_id, v_new_email, v_role, v_full_name;
    ELSE
      EXECUTE
        'INSERT INTO public.users (id, business_id, email, role)
         VALUES ($1, $2, $3, $4::user_role)'
      USING v_auth_user_id, v_business_id, v_new_email, v_role;
    END IF;
  END IF;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'public.users upsert/update affected rows: %', v_rows;

  -- 5) Update all public tables containing an email column
  FOR r IN
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'email'
  LOOP
    EXECUTE format(
      'UPDATE %I.%I SET email = $1 WHERE LOWER(email) = LOWER($2)',
      r.table_schema,
      r.table_name
    )
    USING v_new_email, v_old_email;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows > 0 THEN
      RAISE NOTICE 'Updated %.%: % row(s)', r.table_schema, r.table_name, v_rows;
    END IF;
  END LOOP;

  -- keep business contact synced
  IF v_business_has_email THEN
    UPDATE public.businesses
    SET email = v_new_email
    WHERE id = v_business_id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RAISE NOTICE 'businesses updated rows by id: %', v_rows;
  END IF;

  RAISE NOTICE 'Email migration complete: % -> % (auth id=%)', v_old_email, v_new_email, v_auth_user_id;
END $$;

COMMIT;

-- Verification
SELECT id, email, email_confirmed_at
FROM auth.users
WHERE LOWER(email) IN ('huyenthaai@gmail.com', 'andysharma@outlook.com.au')
ORDER BY created_at DESC;

SELECT id, email, role, business_id
FROM public.users
WHERE LOWER(email) IN ('huyenthaai@gmail.com', 'andysharma@outlook.com.au')
ORDER BY created_at DESC;
