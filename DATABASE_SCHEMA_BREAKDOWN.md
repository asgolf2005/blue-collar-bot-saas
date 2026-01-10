# Blue Collar Bot SaaS - Database Schema Breakdown

Complete breakdown of all Supabase tables in your database.

---

## Schema: `auth` (Supabase Authentication)

Managed by Supabase Auth service. **Do not modify these tables directly.**

### Core Tables:
- **`auth.users`** - User authentication records (email, password, phone)
- **`auth.identities`** - OAuth provider identities (Google, Facebook, etc.)
- **`auth.sessions`** - Active user sessions
- **`auth.refresh_tokens`** - JWT refresh tokens

### Security Tables:
- **`auth.mfa_factors`** - Multi-factor authentication
- **`auth.mfa_challenges`** - MFA verification challenges
- **`auth.audit_log_entries`** - Auth activity audit log

### OAuth Tables:
- **`auth.oauth_clients`** - OAuth client configurations
- **`auth.oauth_authorizations`** - OAuth authorization codes
- **`auth.oauth_consents`** - User OAuth consents

---

## Schema: `public` (Your Application Data)

### 🏢 Business & Users

#### `businesses`
**Purpose:** Multi-tenant business accounts

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | Business name |
| `address` | text | Business address |
| `email` | text | Contact email |
| `phone` | text | Contact phone |
| `primary_calendar_id` | text | Google Calendar ID |
| `service_area_json` | jsonb | Service area polygons |
| `logo_url` | text | Business logo |
| `primary_color` | text | Brand color (#hex) |
| `slug` | text | URL-friendly identifier |
| `stripe_customer_id` | text | Stripe customer ID |
| `onboarding_completed` | boolean | Onboarding status |
| `sms_enabled` | boolean | SMS notifications enabled |
| `sms_notifications` | jsonb | SMS settings |

**Key Features:**
- Multi-tenant isolation
- Stripe billing integration
- Custom branding support

#### `users`
**Purpose:** Application users (admins, techs, customers)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | FK to auth.users(id) |
| `business_id` | uuid | FK to businesses |
| `email` | text | User email (unique) |
| `full_name` | text | Display name |
| `phone` | text | Contact number |
| `role` | enum | 'admin', 'tech', 'customer' |
| `hourly_rate` | numeric | For techs (billing rate) |

**Key Features:**
- Links auth.users to business accounts
- Role-based access control (RBAC)
- Tech hourly rates for invoicing

#### `customers`
**Purpose:** Customer/client records

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `business_id` | uuid | FK to businesses |
| `name` | text | Customer name |
| `phone` | text | Contact phone |
| `email` | text | Contact email |
| `address` | text | Service address |
| `user_id` | uuid | FK to auth.users (optional) |
| `portal_access` | boolean | Can access customer portal |
| `last_login` | timestamp | Last portal login |

**Key Features:**
- Can have portal access (user_id link)
- Or be contact-only (no login)
- Service address for jobs

---

### 📅 Jobs & Scheduling

#### `jobs`
**Purpose:** Service jobs/appointments

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `business_id` | uuid | FK to businesses |
| `customer_id` | uuid | FK to customers |
| `technician_id` | uuid | FK to users (tech) |
| `status` | enum | Job status (see below) |
| `scheduled_start` | timestamptz | Start time |
| `scheduled_end` | timestamptz | End time |
| `description` | text | Job details |
| `urgency` | text | Priority level |
| `calendar_event_id` | text | Google Calendar event ID |
| `source` | enum | 'manual', 'phone', 'web', 'api' |
| `customer_signature` | text | Base64 signature image |
| **Pricing Fields** | | |
| `labor_hours` | numeric | Actual hours worked |
| `labor_rate` | numeric | Hourly rate |
| `parts_cost` | numeric | Materials cost |
| `total_cost` | numeric | Total job cost |
| **Estimates** | | |
| `estimated_labor_hours` | numeric | Estimated hours |
| `estimated_materials_cost` | numeric | Estimated materials |
| `estimated_other_costs` | numeric | Other estimates |
| **Actuals** | | |
| `actual_labor_cost` | numeric | Actual labor cost |
| `actual_materials_cost` | numeric | Actual materials |
| `actual_other_costs` | numeric | Other actuals |
| **Profit** | | |
| `gross_profit` | numeric | Profit amount |
| `profit_margin` | numeric | Profit percentage |

**Job Status Values:**
- `scheduled` - Job booked, not started
- `on_the_way` - Tech traveling to job
- `arrived` - Tech arrived at location
- `in_progress` - Work in progress
- `completed` - Job finished
- `cancelled` - Job cancelled

**Job Source Values:**
- `manual` - Created by admin
- `phone` - AI phone receptionist
- `web` - Customer portal
- `api` - API integration

**Key Features:**
- Google Calendar sync
- Digital signatures
- Profit tracking
- Estimate vs. actual comparison

#### `job_services`
**Purpose:** Many-to-many link between jobs and services

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `job_id` | uuid | FK to jobs |
| `service_id` | uuid | FK to services |
| `quantity` | numeric | Service quantity |
| `notes` | text | Service-specific notes |

#### `services`
**Purpose:** Service catalog

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `business_id` | uuid | FK to businesses |
| `name` | text | Service name |
| `description` | text | Service details |
| `base_price` | numeric | Default price |
| `duration_minutes` | integer | Estimated duration |
| `is_active` | boolean | Service enabled |
| `estimated_cost` | numeric | Cost to business |

---

### 💰 Invoicing & Payments

#### `invoices`
**Purpose:** Customer invoices

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `business_id` | uuid | FK to businesses |
| `job_id` | uuid | FK to jobs |
| `customer_id` | uuid | FK to customers |
| `invoice_number` | text | Invoice # (unique) |
| `status` | enum | 'draft', 'sent', 'paid', 'overdue', 'cancelled' |
| `issue_date` | date | Invoice date |
| `due_date` | date | Payment due date |
| `subtotal` | numeric | Pre-tax total |
| `tax` | numeric | Tax amount |
| `total` | numeric | Grand total |
| `notes` | text | Invoice notes |
| `paid_at` | timestamptz | Payment timestamp |
| `payment_intent_id` | text | Stripe payment intent |

#### `invoice_line_items`
**Purpose:** Invoice items (services, parts, labor)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `invoice_id` | uuid | FK to invoices |
| `service_id` | uuid | FK to services (optional) |
| `type` | enum | 'service', 'part', 'labor', 'other' |
| `description` | text | Line item description |
| `quantity` | numeric | Quantity |
| `unit_price` | numeric | Price per unit |
| `total` | numeric | Line total |

#### `subscriptions`
**Purpose:** Business subscription management

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `business_id` | uuid | FK to businesses (unique) |
| `stripe_customer_id` | text | Stripe customer ID |
| `stripe_subscription_id` | text | Stripe subscription ID |
| `tier` | enum | 'starter', 'pro', 'enterprise' |
| `plan_name` | text | Plan name |
| `status` | enum | 'trialing', 'active', 'past_due', 'cancelled' |
| `current_period_start` | timestamptz | Billing period start |
| `current_period_end` | timestamptz | Billing period end |
| `cancel_at_period_end` | boolean | Will cancel at period end |

---

### 📍 GPS Tracking (NEW!)

#### `technician_locations`
**Purpose:** Real-time tech location tracking

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `technician_id` | uuid | FK to users (tech) |
| `job_id` | uuid | FK to jobs (optional) |
| `latitude` | double precision | GPS latitude |
| `longitude` | double precision | GPS longitude |
| `heading` | double precision | Direction (0-360°) |
| `speed` | double precision | Speed (m/s) |
| `accuracy` | double precision | GPS accuracy (meters) |
| `recorded_at` | timestamptz | Location timestamp |

**Key Features:**
- Real-time updates every 10-30 seconds
- Links to active jobs
- Powers ETA calculations
- Admin live map view

---

### ⏱️ Time Tracking

#### `time_entries`
**Purpose:** Tech clock in/out for jobs

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `job_id` | uuid | FK to jobs |
| `technician_id` | uuid | FK to users |
| `clock_in` | timestamptz | Start time |
| `clock_out` | timestamptz | End time (null if active) |
| `break_minutes` | integer | Break time |

**Key Features:**
- Active time tracking (clock_out = null)
- Break time tracking
- Payroll calculations

---

### 💸 Expenses

#### `job_expenses`
**Purpose:** Job-related expenses (parts, materials, etc.)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `job_id` | uuid | FK to jobs |
| `business_id` | uuid | FK to businesses |
| `category` | enum | Expense category |
| `description` | text | Expense description |
| `amount` | numeric | Expense amount |
| `receipt_url` | text | Receipt photo URL |
| `vendor` | text | Vendor name |
| `purchase_date` | date | Purchase date |
| `notes` | text | Additional notes |
| `created_by` | uuid | FK to users |

**Expense Categories:**
- `parts` - Replacement parts
- `materials` - Consumable materials
- `equipment` - Tool rentals
- `fuel` - Vehicle fuel
- `other` - Miscellaneous

---

### 📝 Notes & Media

#### `job_notes`
**Purpose:** Job notes and communication log

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `job_id` | uuid | FK to jobs |
| `user_id` | uuid | FK to users (author) |
| `note_type` | text | 'note', 'call', 'email', etc. |
| `content` | text | Note content |
| `is_visible_to_customer` | boolean | Show in customer portal |
| `metadata` | jsonb | Additional data |

#### `media`
**Purpose:** Job photos and files

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `job_id` | uuid | FK to jobs |
| `technician_id` | uuid | FK to users (uploader) |
| `file_url` | text | Supabase Storage URL |
| `file_type` | text | MIME type |

---

### 🔔 Notifications

#### `notifications`
**Purpose:** In-app notifications

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK to users |
| `type` | enum | Notification type |
| `title` | text | Notification title |
| `message` | text | Notification body |
| `link` | text | Deep link URL |
| `read` | boolean | Read status |

**Notification Types:**
- `job_assigned` - Job assigned to tech
- `job_updated` - Job status changed
- `payment_received` - Payment completed
- `appointment_reminder` - Upcoming appointment

#### `notification_preferences`
**Purpose:** User notification settings

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK to users |
| `notification_type` | text | Notification category |
| `enabled` | boolean | Enabled/disabled |

#### `sms_notifications`
**Purpose:** SMS notification log

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `business_id` | uuid | FK to businesses |
| `job_id` | uuid | FK to jobs (optional) |
| `customer_id` | uuid | FK to customers (optional) |
| `invoice_id` | uuid | FK to invoices (optional) |
| `to_phone` | text | Recipient phone |
| `message` | text | SMS content |
| `template_name` | text | Template used |
| `status` | text | 'pending', 'sent', 'delivered', 'failed' |
| `twilio_message_id` | text | Twilio message SID |
| `error_message` | text | Error details if failed |
| `sent_at` | timestamptz | Send timestamp |
| `delivered_at` | timestamptz | Delivery timestamp |

---

## Schema: `realtime` (Supabase Realtime)

Managed by Supabase Realtime service. Used for live updates.

### `realtime.messages`
**Purpose:** Real-time message queue

Partitioned by date (`messages_2026_01_XX` tables).

### `realtime.subscription`
**Purpose:** Active realtime subscriptions

Tracks which clients are subscribed to which database changes.

---

## Schema: `storage` (Supabase Storage)

Managed by Supabase Storage service.

### `storage.buckets`
**Purpose:** Storage buckets configuration

Your buckets might include:
- `job-photos` - Job site photos
- `receipts` - Expense receipts
- `signatures` - Customer signatures
- `logos` - Business logos

### `storage.objects`
**Purpose:** Stored files metadata

Tracks all uploaded files in buckets.

---

## 🔐 Row Level Security (RLS)

All tables in the `public` schema use RLS for multi-tenant data isolation:

### Isolation by Business:
- Admins see only their `business_id` data
- Techs see only their assigned jobs
- Customers see only their jobs/invoices

### Example RLS Policy:
```sql
-- Admins can see all jobs in their business
CREATE POLICY "Admins view business jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.business_id = jobs.business_id
    )
  );
```

---

## 🗂️ Database Indexes

Critical indexes for performance:

### GPS Tracking:
- `idx_tech_locations_technician_id` - Fast tech lookups
- `idx_tech_locations_recorded_at` - Recent locations
- `idx_tech_locations_tech_recorded_at` - Composite for latest location

### Jobs:
- `jobs.business_id` - Multi-tenant filtering
- `jobs.scheduled_start` - Date range queries
- `jobs.technician_id` - Tech assignment lookups
- `jobs.customer_id` - Customer history

### Invoices:
- `invoices.business_id`
- `invoices.status`
- `invoices.issue_date`

---

## 🔄 Database Functions

### `get_latest_tech_locations(business_uuid UUID)`
**Purpose:** Get latest location for each tech in a business

**Returns:** Table with tech locations from the last hour

**Usage:**
```sql
SELECT * FROM get_latest_tech_locations('business-id-here');
```

**Security:** `SECURITY DEFINER` - bypasses RLS for performance

---

## 📊 Data Relationships

```
businesses (1) ──┬── (many) users
                 ├── (many) customers
                 ├── (many) jobs
                 ├── (many) services
                 └── (1) subscription

jobs (1) ──┬── (many) job_services
           ├── (many) job_notes
           ├── (many) media
           ├── (many) time_entries
           ├── (many) job_expenses
           ├── (many) technician_locations
           └── (1) invoice

invoices (1) ─── (many) invoice_line_items
```

---

## 🚀 Performance Tips

1. **Always filter by `business_id` first** - Enables index usage
2. **Use RPC functions for complex queries** - Bypass RLS overhead
3. **Limit GPS location history** - Keep only last 1-7 days
4. **Use composite indexes** - e.g., `(business_id, created_at)`
5. **Partition large tables** - Consider partitioning by date for locations

---

## 📝 Common Queries

### Get Today's Jobs for a Tech:
```sql
SELECT * FROM jobs
WHERE technician_id = 'tech-id'
AND scheduled_start::date = CURRENT_DATE
ORDER BY scheduled_start;
```

### Get Active Jobs for Business:
```sql
SELECT * FROM jobs
WHERE business_id = 'business-id'
AND status IN ('on_the_way', 'arrived', 'in_progress')
ORDER BY scheduled_start;
```

### Get Latest Tech Location:
```sql
SELECT * FROM technician_locations
WHERE technician_id = 'tech-id'
ORDER BY recorded_at DESC
LIMIT 1;
```

### Calculate Job Profit:
```sql
UPDATE jobs
SET
  gross_profit = total_cost - (actual_labor_cost + actual_materials_cost + actual_other_costs),
  profit_margin = CASE
    WHEN total_cost > 0
    THEN ((total_cost - (actual_labor_cost + actual_materials_cost + actual_other_costs)) / total_cost) * 100
    ELSE 0
  END
WHERE id = 'job-id';
```

---

**Last Updated:** 2026-01-05
**Schema Version:** Production
**Total Tables:** 30+ across all schemas
