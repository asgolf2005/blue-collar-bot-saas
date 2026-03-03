# Live Supabase Schema Reference (Blue Collar Bot)
Last updated: 2026-03-01

This file is the operational schema snapshot for seed/reset work.
It combines:
- Live constraints provided from SQL Editor output.
- App-critical table expectations used by admin pages and APIs.

## 1) Verified Live Constraints (from DB)
### `businesses`
- `PRIMARY KEY (id)`
- `UNIQUE (slug)`

### `users`
- `PRIMARY KEY (id)`
- `UNIQUE (email)`
- `FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE`
- `FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `customers`
- `PRIMARY KEY (id)`
- `FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE`
- `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL`

### `services`
- `PRIMARY KEY (id)`
- `FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE`

### `jobs`
- `PRIMARY KEY (id)`
- `FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE`
- `FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE`
- `FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL`

### `job_services`
- `PRIMARY KEY (id)`
- `UNIQUE (job_id, service_id)`
- `FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE`
- `FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE`

### `invoices`
- `PRIMARY KEY (id)`
- `UNIQUE (business_id, invoice_number)`
- `FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE`
- `FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE`
- `FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE`

### `invoice_line_items`
- `PRIMARY KEY (id)`
- `FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE`
- `FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL`

### `technician_daily_availability`
- `PRIMARY KEY (id)`
- `UNIQUE (business_id, technician_id, work_date)`
- `FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE`
- `FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE CASCADE`

### `job_notes`
- `PRIMARY KEY (id)`
- `FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE`
- `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`

### `job_expenses`
- `PRIMARY KEY (id)`
- `FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE`
- `FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE`
- `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`

### `time_entries`
- `PRIMARY KEY (id)`

## 2) RLS Notes (verified)
- Most business tables are gated by:
  - `get_user_business_id()`
  - `get_user_role()`
- Admin can insert/update/delete business-scoped rows.
- Tech has restricted select/update on assigned jobs and related resources.
- Customer reads are scoped via `customers.user_id = auth.uid()`.

Implication for seed/reset:
- Run as service role in SQL editor or with an admin-authenticated context.
- Bulk reset scripts should target a single `business_id`.

## 2.1) Verified Live Columns (core operational tables)
These are confirmed from `information_schema.columns` in your live DB.

### `users`
- `id uuid not null`
- `business_id uuid not null`
- `email text not null`
- `full_name text not null`
- `phone text null`
- `role user_role not null default 'tech'`
- `created_at timestamptz default now()`
- `hourly_rate numeric default 0`

### `businesses`
- `id uuid not null default uuid_generate_v4()`
- `name text not null`
- `address text null`
- `email text null`
- `phone text null`
- `primary_calendar_id text null`
- `service_area_json jsonb null`
- `logo_url text null`
- `primary_color text default '#3b82f6'`
- `slug text unique`
- `stripe_customer_id text null`
- `onboarding_completed boolean default false`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`
- `sms_enabled boolean default false`
- `sms_notifications jsonb default '{}'`
- `typography_id text default 'manrope'`
- `density_id text default 'cozy'`
- `radius_id text default 'pill'`
- `motion_id text default 'balanced'`
- `theme_id text default 'blueprint'`
- `theme_overrides jsonb default '{}'`

### `customers`
- `id uuid not null default uuid_generate_v4()`
- `business_id uuid not null`
- `name text not null`
- `phone text not null`
- `email text null`
- `address text null`
- `user_id uuid null`
- `portal_access boolean default false`
- `last_login timestamptz null`
- `created_at timestamptz default now()`

### `services`
- `id uuid not null default uuid_generate_v4()`
- `business_id uuid not null`
- `name text not null`
- `description text null`
- `base_price numeric null`
- `duration_minutes int null`
- `is_active boolean default true`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`
- `estimated_cost numeric default 0`

### `jobs`
- `id uuid not null default uuid_generate_v4()`
- `business_id uuid not null`
- `customer_id uuid not null`
- `technician_id uuid null`
- `status job_status not null default 'scheduled'`
- `scheduled_start timestamptz not null`
- `scheduled_end timestamptz not null`
- `description text null`
- `urgency text null`
- `calendar_event_id text null`
- `source job_source not null default 'manual'`
- `labor_hours numeric null`
- `labor_rate numeric null`
- `parts_cost numeric default 0`
- `total_cost numeric null`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`
- `customer_signature text null`
- `estimated_labor_hours numeric default 0`
- `estimated_materials_cost numeric default 0`
- `estimated_other_costs numeric default 0`
- `actual_labor_cost numeric default 0`
- `actual_materials_cost numeric default 0`
- `actual_other_costs numeric default 0`
- `gross_profit numeric default 0`
- `profit_margin numeric default 0`

### `job_services`
- `id uuid not null default uuid_generate_v4()`
- `job_id uuid not null`
- `service_id uuid not null`
- `quantity numeric default 1`
- `notes text null`
- `created_at timestamptz default now()`

### `invoices`
- `id uuid not null default uuid_generate_v4()`
- `business_id uuid not null`
- `job_id uuid not null`
- `customer_id uuid not null`
- `invoice_number text not null`
- `status invoice_status default 'draft'`
- `issue_date date not null default current_date`
- `due_date date null`
- `subtotal numeric not null default 0`
- `tax numeric not null default 0`
- `total numeric not null default 0`
- `notes text null`
- `paid_at timestamptz null`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`
- `payment_intent_id text null`

### `invoice_line_items`
- `id uuid not null default uuid_generate_v4()`
- `invoice_id uuid not null`
- `service_id uuid null`
- `type line_item_type not null`
- `description text not null`
- `quantity numeric not null default 1`
- `unit_price numeric not null`
- `total numeric not null`
- `created_at timestamptz default now()`

### `technician_daily_availability`
- `id uuid not null default uuid_generate_v4()`
- `business_id uuid not null`
- `technician_id uuid not null`
- `work_date date not null`
- `is_working boolean not null default true`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

## 3) App-Critical Data Expectations
These are required for admin UI consistency:
- Jobs timeline fields:
  - `scheduled_start`, `scheduled_end`, `status`, `created_at`, `updated_at`
- Financial:
  - `jobs.total_cost`, `invoices.status`, `invoices.total`, `invoices.paid_at`
- Mapping:
  - `job_services(job_id, service_id)` to populate service analytics
- Dispatch:
  - `jobs.technician_id` can be null for unassigned edge cases
- Invoicing:
  - `invoice_line_items.type` must be non-null (`service|labor|parts`)

## 4) Known Drift Risks Observed
- Live DB may differ from historical migrations (example seen in app debugging).
- Do not assume optional columns always exist across all environments.
- For robust seed scripts, avoid hard dependency on non-core columns unless verified by `information_schema.columns`.

## 5) Canonical Verification Queries (run before major seed/reset)
```sql
-- columns
select table_name, ordinal_position, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'businesses','users','customers','services','jobs','job_services',
    'invoices','invoice_line_items','technician_daily_availability',
    'job_notes','time_entries','job_expenses'
  )
order by table_name, ordinal_position;

-- constraints
select
  conrelid::regclass::text as table_name,
  conname as constraint_name,
  case contype
    when 'p' then 'PRIMARY KEY'
    when 'f' then 'FOREIGN KEY'
    when 'u' then 'UNIQUE'
    when 'c' then 'CHECK'
    else contype::text
  end as constraint_type,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where connamespace = 'public'::regnamespace
  and conrelid::regclass::text in (
    'businesses','users','customers','services','jobs','job_services',
    'invoices','invoice_line_items','technician_daily_availability',
    'job_notes','time_entries','job_expenses'
  )
order by table_name, constraint_type, constraint_name;
```

## 6) Files tied to this schema
- Reset/seed script:
  - `supabase/reset_business_2026_dataset.sql`
- Invoicing API:
  - `app/api/invoices/create/route.ts`
- Uninvoiced jobs API:
  - `app/api/jobs/uninvoiced/route.ts`
