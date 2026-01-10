# Project Context - Blue Collar Bot SaaS

Last updated: 2026-01-02

## Purpose
Blue Collar Bot is a SaaS platform for trade businesses (plumbing, HVAC, electrical, handyman) that combines a modern CRM with an AI phone receptionist flow (n8n). It supports three roles: admin, technician, and customer.

## Current State (Production Beta)
- Core product is complete and running in production beta.
- Admin dashboard: jobs, customers, invoices, services, analytics, settings.
- Technician app: today view, weekly schedule, job details, status updates, photo uploads, stats dashboard.
- Customer portal: appointments, invoices, profile.
- Real-time notifications (Supabase Realtime) and email notifications (Resend) are integrated.
- Premium glassmorphic UI with dark mode, global search (Cmd+K), toasts, bulk actions.

## Architecture
- Frontend: Next.js App Router (server components for data, client components for interactivity).
- Backend: Supabase (Postgres, Auth, Storage, RLS, Realtime).
- Integrations: n8n webhook for AI receptionist job intake; Stripe for invoice payments.
- Deployment target: Vercel.

## Data Model (Core Tables)
- businesses, users, customers
- jobs (status, schedule, labor/parts fields)
- services, job_services
- invoices, invoice_line_items
- media (job photos)
- notifications

## Migrations Summary
- 001_initial_schema.sql: Core tables (businesses, users, customers, jobs, media) and enums.
- 002_rls_policies.sql: RLS policies for core tables.
- 003_customer_tracking.sql: technician_locations table, ETA fields on jobs, photo_type on media, RLS for tracking.
- 003_enhanced_schema.sql: services, job_services, invoices + line items, subscriptions, notifications, and job labor/parts fields.
- 004_enhanced_rls_policies.sql: RLS for new tables (services, invoices, job_services, subscriptions, notifications).
- 005_missing_tables_fix.sql: job_notes and time_entries, customer_signature on jobs, users.full_name, triggers + RLS.
- 006_allow_techs_read_customers.sql: allow techs to read customers in the same business.
- 007_fix_notification_insert.sql: allow create_notification function to bypass RLS and insert policy.
- 008_fix_storage_rls.sql: reset storage policies for media uploads.
- 009_storage_complete_setup.sql: create storage bucket and policies for job photos.
- 010_enhanced_notifications.sql: notification preferences and enhanced notification function.
- 011_sms_notifications.sql: sms_notifications table and business SMS settings.
- 012_profit_tracking_system.sql: profit tracking fields, job_expenses, functions and triggers.

## Key Flows
1) Auth and routing
- Supabase Auth with role-based routing.
- Admin redirects to /admin/jobs, tech to /tech/dashboard, customer to /customer/appointments.

2) Job lifecycle
- Jobs created by admins or via n8n webhook.
- Status: scheduled, on_the_way, arrived, in_progress, completed, cancelled.
- Techs update status and upload photos.

3) Invoices and payments
- Admins create invoices from jobs with line items.
- Customer portal shows invoices and allows payment via Stripe Checkout.
- Webhook updates invoice status to paid and triggers notifications.

4) Notifications
- In-app notifications via Supabase Realtime.
- Email notifications via Resend (customer welcome, invoice, job status, tech assignment).

## Analytics Behavior (Important)
- /admin/analytics currently computes metrics over the last 30 days using created_at for jobs and invoices.
- Some analytics widgets use scheduled_start instead of created_at (tech performance).
- /admin/jobs metrics are all-time and use weekly trends on scheduled_start.
- This explains why revenue collection progress can differ across pages.

## Known Quirks / Risks
- Currency units are inconsistent in places:
  - Stripe expects cents and some UI divides totals by 100.
  - Invoice creation computes totals as decimal currency.
  - Validate that invoice totals are stored in cents or dollars consistently before changing logic.
- Analytics time windows are inconsistent across widgets and pages.

## Code Map
- UI pages: app/admin, app/tech, app/customer
- Components: components/admin, components/tech, components/customer, components/ui
- Hooks: hooks/* (realtime jobs, keyboard shortcuts, etc.)
- Supabase clients and utilities: lib/supabase, lib/utils
- Email: lib/email
- Notifications: lib/notifications
- Database migrations: supabase/migrations

## Environment Configuration
Required (.env.local):
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_SITE_URL
- N8N_WEBHOOK_SECRET

Optional:
- RESEND_API_KEY, EMAIL_FROM
- STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET
- TWILIO_* (SMS, planned)

## How We Got Here (Condensed)
- Built core multi-tenant schema, RLS, and role-based routing.
- Implemented admin CRM (jobs, customers, invoices, services) and tech workflows.
- Added customer portal, photo uploads, and realtime updates.
- Implemented premium design system, dark mode, and global search.
- Added notifications and email system.
- Added analytics dashboard and tech stats.

## Roadmap
Near-term UX polish:
- Loading skeletons
- Enhanced empty states
- Keyboard shortcuts and context menus
- Analytics time-range selector with consistent period logic

Medium-term:
- SMS notifications (Twilio)
- Stripe subscriptions and billing portal
- Audit logging
- Two-factor authentication

Long-term:
- Native mobile apps
- Advanced analytics (forecasting, CLV)
- Multi-business switching
- Public API and webhooks
- White-labeling

## Notes for New Sessions
- Use this file as the primary context reference.
- Validate currency units when touching invoices or revenue charts.
- Clarify analytics time window before adjusting metrics.
