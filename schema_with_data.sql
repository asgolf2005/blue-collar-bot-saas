


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."expense_category" AS ENUM (
    'materials',
    'subcontractor',
    'equipment_rental',
    'travel',
    'permits',
    'other'
);


ALTER TYPE "public"."expense_category" OWNER TO "postgres";


CREATE TYPE "public"."invoice_status" AS ENUM (
    'draft',
    'sent',
    'paid',
    'overdue',
    'cancelled'
);


ALTER TYPE "public"."invoice_status" OWNER TO "postgres";


CREATE TYPE "public"."job_note_type" AS ENUM (
    'note',
    'status_change',
    'photo_added',
    'system'
);


ALTER TYPE "public"."job_note_type" OWNER TO "postgres";


CREATE TYPE "public"."job_source" AS ENUM (
    'ai_caller',
    'manual',
    'admin_portal'
);


ALTER TYPE "public"."job_source" OWNER TO "postgres";


CREATE TYPE "public"."job_status" AS ENUM (
    'scheduled',
    'on_the_way',
    'arrived',
    'in_progress',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."job_status" OWNER TO "postgres";


CREATE TYPE "public"."line_item_type" AS ENUM (
    'service',
    'labor',
    'parts'
);


ALTER TYPE "public"."line_item_type" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'job_assigned',
    'job_status_changed',
    'invoice_sent',
    'payment_received',
    'appointment_reminder'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."subscription_status" AS ENUM (
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid'
);


ALTER TYPE "public"."subscription_status" OWNER TO "postgres";


CREATE TYPE "public"."subscription_tier" AS ENUM (
    'starter',
    'professional',
    'enterprise'
);


ALTER TYPE "public"."subscription_tier" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'tech',
    'customer'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_actual_labor_cost"("p_job_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_total_cost DECIMAL(10, 2);
BEGIN
    SELECT COALESCE(SUM(
        EXTRACT(EPOCH FROM (
            COALESCE(te.clock_out, NOW()) - te.clock_in
        )) / 3600.0 * COALESCE(u.hourly_rate, 0)
    ), 0)
    INTO v_total_cost
    FROM time_entries te
    LEFT JOIN users u ON u.id = te.technician_id
    WHERE te.job_id = p_job_id;

    RETURN v_total_cost;
END;
$$;


ALTER FUNCTION "public"."calculate_actual_labor_cost"("p_job_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_expenses_by_category"("p_job_id" "uuid", "p_category" "public"."expense_category") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_total DECIMAL(10, 2);
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total
    FROM job_expenses
    WHERE job_id = p_job_id AND category = p_category;

    RETURN v_total;
END;
$$;


ALTER FUNCTION "public"."calculate_expenses_by_category"("p_job_id" "uuid", "p_category" "public"."expense_category") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_link" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (p_user_id, p_type, p_title, p_message, p_link)
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$;


ALTER FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_link" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_invoice_number"("p_business_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_count INTEGER;
    v_number TEXT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM invoices
    WHERE business_id = p_business_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);

    v_number := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((v_count + 1)::TEXT, 5, '0');

    RETURN v_number;
END;
$$;


ALTER FUNCTION "public"."generate_invoice_number"("p_business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_business_id"() RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
    SELECT business_id FROM users WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_user_business_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "public"."user_role"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
    SELECT role FROM users WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_tech_job_assigned"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.technician_id IS NOT NULL AND (OLD IS NULL OR OLD.technician_id IS NULL OR OLD.technician_id != NEW.technician_id) THEN
        PERFORM create_notification(
            NEW.technician_id,
            'job_assigned',
            'New Job Assigned',
            'You have been assigned a new job for ' || (SELECT name FROM customers WHERE id = NEW.customer_id),
            '/tech/jobs/' || NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_tech_job_assigned"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_recalculate_profit_on_expense"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM update_job_profit_calculations(OLD.job_id);
    ELSE
        PERFORM update_job_profit_calculations(NEW.job_id);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."trigger_recalculate_profit_on_expense"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_recalculate_profit_on_time_entry"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Use NEW.job_id for INSERT/UPDATE, OLD.job_id for DELETE
    IF TG_OP = 'DELETE' THEN
        PERFORM update_job_profit_calculations(OLD.job_id);
    ELSE
        PERFORM update_job_profit_calculations(NEW.job_id);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."trigger_recalculate_profit_on_time_entry"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_job_profit_calculations"("p_job_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_actual_labor_cost DECIMAL(10, 2);
    v_actual_materials_cost DECIMAL(10, 2);
    v_actual_other_costs DECIMAL(10, 2);
    v_total_actual_cost DECIMAL(10, 2);
    v_total_revenue DECIMAL(10, 2);
    v_gross_profit DECIMAL(10, 2);
    v_profit_margin DECIMAL(5, 2);
BEGIN
    -- Calculate actual labor cost from time_entries
    v_actual_labor_cost := calculate_actual_labor_cost(p_job_id);

    -- Calculate materials cost from expenses
    v_actual_materials_cost := calculate_expenses_by_category(p_job_id, 'materials');

    -- Calculate other costs (sum of all non-materials expenses)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_actual_other_costs
    FROM job_expenses
    WHERE job_id = p_job_id AND category != 'materials';

    -- Get total revenue from job (from total_cost which is actually revenue)
    -- Note: We should rename total_cost to revenue in a future migration
    SELECT COALESCE(total_cost, 0)
    INTO v_total_revenue
    FROM jobs
    WHERE id = p_job_id;

    -- Calculate totals
    v_total_actual_cost := v_actual_labor_cost + v_actual_materials_cost + v_actual_other_costs;
    v_gross_profit := v_total_revenue - v_total_actual_cost;

    -- Calculate profit margin (avoid division by zero)
    IF v_total_revenue > 0 THEN
        v_profit_margin := (v_gross_profit / v_total_revenue) * 100;
    ELSE
        v_profit_margin := 0;
    END IF;

    -- Update the job record
    UPDATE jobs
    SET
        actual_labor_cost = v_actual_labor_cost,
        actual_materials_cost = v_actual_materials_cost,
        actual_other_costs = v_actual_other_costs,
        gross_profit = v_gross_profit,
        profit_margin = v_profit_margin,
        updated_at = NOW()
    WHERE id = p_job_id;
END;
$$;


ALTER FUNCTION "public"."update_job_profit_calculations"("p_job_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."businesses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "email" "text",
    "phone" "text",
    "primary_calendar_id" "text",
    "service_area_json" "jsonb",
    "logo_url" "text",
    "primary_color" "text" DEFAULT '#3b82f6'::"text",
    "slug" "text",
    "stripe_customer_id" "text",
    "onboarding_completed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."businesses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "email" "text",
    "address" "text",
    "user_id" "uuid",
    "portal_access" boolean DEFAULT false,
    "last_login" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_line_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "service_id" "uuid",
    "type" "public"."line_item_type" NOT NULL,
    "description" "text" NOT NULL,
    "quantity" numeric(10,2) DEFAULT 1 NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "total" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invoice_line_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "job_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "invoice_number" "text" NOT NULL,
    "status" "public"."invoice_status" DEFAULT 'draft'::"public"."invoice_status",
    "issue_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "due_date" "date",
    "subtotal" numeric(10,2) DEFAULT 0 NOT NULL,
    "tax" numeric(10,2) DEFAULT 0 NOT NULL,
    "total" numeric(10,2) DEFAULT 0 NOT NULL,
    "notes" "text",
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_expenses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "business_id" "uuid" NOT NULL,
    "category" "public"."expense_category" NOT NULL,
    "description" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "receipt_url" "text",
    "vendor" "text",
    "purchase_date" "date" DEFAULT CURRENT_DATE,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_expenses" OWNER TO "postgres";


COMMENT ON TABLE "public"."job_expenses" IS 'Individual expenses tracked per job for accurate profit calculation';



CREATE TABLE IF NOT EXISTS "public"."job_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "note_type" "text" DEFAULT 'note'::"text",
    "content" "text" NOT NULL,
    "is_visible_to_customer" boolean DEFAULT true,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_services" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL,
    "quantity" numeric(10,2) DEFAULT 1,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "technician_id" "uuid",
    "status" "public"."job_status" DEFAULT 'scheduled'::"public"."job_status" NOT NULL,
    "scheduled_start" timestamp with time zone NOT NULL,
    "scheduled_end" timestamp with time zone NOT NULL,
    "description" "text",
    "urgency" "text",
    "calendar_event_id" "text",
    "source" "public"."job_source" DEFAULT 'manual'::"public"."job_source" NOT NULL,
    "labor_hours" numeric(5,2),
    "labor_rate" numeric(10,2),
    "parts_cost" numeric(10,2) DEFAULT 0,
    "total_cost" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "customer_signature" "text",
    "estimated_labor_hours" numeric(5,2) DEFAULT 0,
    "estimated_materials_cost" numeric(10,2) DEFAULT 0,
    "estimated_other_costs" numeric(10,2) DEFAULT 0,
    "actual_labor_cost" numeric(10,2) DEFAULT 0,
    "actual_materials_cost" numeric(10,2) DEFAULT 0,
    "actual_other_costs" numeric(10,2) DEFAULT 0,
    "gross_profit" numeric(10,2) DEFAULT 0,
    "profit_margin" numeric(5,2) DEFAULT 0
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."jobs"."estimated_labor_hours" IS 'Estimated hours for the job (from quote)';



COMMENT ON COLUMN "public"."jobs"."estimated_materials_cost" IS 'Estimated cost of materials (from quote)';



COMMENT ON COLUMN "public"."jobs"."estimated_other_costs" IS 'Other estimated costs (permits, rentals, etc.)';



COMMENT ON COLUMN "public"."jobs"."actual_labor_cost" IS 'Actual labor cost (auto-calculated from time_entries)';



COMMENT ON COLUMN "public"."jobs"."actual_materials_cost" IS 'Actual materials cost (auto-calculated from job_expenses)';



COMMENT ON COLUMN "public"."jobs"."actual_other_costs" IS 'Other actual costs (auto-calculated from job_expenses)';



COMMENT ON COLUMN "public"."jobs"."gross_profit" IS 'Revenue minus total costs (auto-calculated)';



COMMENT ON COLUMN "public"."jobs"."profit_margin" IS 'Profit as percentage of revenue (auto-calculated)';



CREATE TABLE IF NOT EXISTS "public"."media" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "technician_id" "uuid" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "link" "text",
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "base_price" numeric(10,2),
    "duration_minutes" integer,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "estimated_cost" numeric(10,2) DEFAULT 0
);


ALTER TABLE "public"."services" OWNER TO "postgres";


COMMENT ON COLUMN "public"."services"."estimated_cost" IS 'Estimated cost to deliver this service (for profit margin calculation)';



CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "tier" "public"."subscription_tier" DEFAULT 'starter'::"public"."subscription_tier",
    "plan_name" "text" DEFAULT 'starter'::"text",
    "status" "public"."subscription_status" DEFAULT 'trialing'::"public"."subscription_status",
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."time_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "technician_id" "uuid" NOT NULL,
    "clock_in" timestamp with time zone NOT NULL,
    "clock_out" timestamp with time zone,
    "break_minutes" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."time_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "business_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text",
    "role" "public"."user_role" DEFAULT 'tech'::"public"."user_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "hourly_rate" numeric(10,2) DEFAULT 0
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."hourly_rate" IS 'Technician hourly rate for labor cost calculations';



ALTER TABLE ONLY "public"."businesses"
    ADD CONSTRAINT "businesses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."businesses"
    ADD CONSTRAINT "businesses_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_line_items"
    ADD CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_business_id_invoice_number_key" UNIQUE ("business_id", "invoice_number");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_expenses"
    ADD CONSTRAINT "job_expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_notes"
    ADD CONSTRAINT "job_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_services"
    ADD CONSTRAINT "job_services_job_id_service_id_key" UNIQUE ("job_id", "service_id");



ALTER TABLE ONLY "public"."job_services"
    ADD CONSTRAINT "job_services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_business_id_key" UNIQUE ("business_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_customers_business_id" ON "public"."customers" USING "btree" ("business_id");



CREATE INDEX "idx_customers_phone" ON "public"."customers" USING "btree" ("business_id", "phone");



CREATE INDEX "idx_customers_user_id" ON "public"."customers" USING "btree" ("user_id");



CREATE INDEX "idx_invoice_line_items_invoice_id" ON "public"."invoice_line_items" USING "btree" ("invoice_id");



CREATE INDEX "idx_invoices_business_id" ON "public"."invoices" USING "btree" ("business_id");



CREATE INDEX "idx_invoices_customer_id" ON "public"."invoices" USING "btree" ("customer_id");



CREATE INDEX "idx_invoices_job_id" ON "public"."invoices" USING "btree" ("job_id");



CREATE INDEX "idx_invoices_status" ON "public"."invoices" USING "btree" ("business_id", "status");



CREATE INDEX "idx_job_expenses_business_id" ON "public"."job_expenses" USING "btree" ("business_id");



CREATE INDEX "idx_job_expenses_category" ON "public"."job_expenses" USING "btree" ("job_id", "category");



CREATE INDEX "idx_job_expenses_created_at" ON "public"."job_expenses" USING "btree" ("job_id", "created_at" DESC);



CREATE INDEX "idx_job_expenses_job_id" ON "public"."job_expenses" USING "btree" ("job_id");



CREATE INDEX "idx_job_notes_created_at" ON "public"."job_notes" USING "btree" ("job_id", "created_at" DESC);



CREATE INDEX "idx_job_notes_job_id" ON "public"."job_notes" USING "btree" ("job_id");



CREATE INDEX "idx_job_notes_user_id" ON "public"."job_notes" USING "btree" ("user_id");



CREATE INDEX "idx_job_services_job_id" ON "public"."job_services" USING "btree" ("job_id");



CREATE INDEX "idx_job_services_service_id" ON "public"."job_services" USING "btree" ("service_id");



CREATE INDEX "idx_jobs_business_id" ON "public"."jobs" USING "btree" ("business_id");



CREATE INDEX "idx_jobs_customer_id" ON "public"."jobs" USING "btree" ("customer_id");



CREATE INDEX "idx_jobs_scheduled_start" ON "public"."jobs" USING "btree" ("scheduled_start");



CREATE INDEX "idx_jobs_status" ON "public"."jobs" USING "btree" ("status");



CREATE INDEX "idx_jobs_technician_id" ON "public"."jobs" USING "btree" ("technician_id");



CREATE INDEX "idx_media_job_id" ON "public"."media" USING "btree" ("job_id");



CREATE INDEX "idx_media_technician_id" ON "public"."media" USING "btree" ("technician_id");



CREATE INDEX "idx_notifications_created" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("user_id", "read");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_services_active" ON "public"."services" USING "btree" ("business_id", "is_active");



CREATE INDEX "idx_services_business_id" ON "public"."services" USING "btree" ("business_id");



CREATE INDEX "idx_subscriptions_status" ON "public"."subscriptions" USING "btree" ("status");



CREATE INDEX "idx_subscriptions_stripe_customer" ON "public"."subscriptions" USING "btree" ("stripe_customer_id");



CREATE INDEX "idx_subscriptions_stripe_subscription" ON "public"."subscriptions" USING "btree" ("stripe_subscription_id");



CREATE INDEX "idx_users_business_id" ON "public"."users" USING "btree" ("business_id");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE OR REPLACE TRIGGER "trigger_expense_profit_recalc" AFTER INSERT OR DELETE OR UPDATE ON "public"."job_expenses" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_recalculate_profit_on_expense"();



CREATE OR REPLACE TRIGGER "trigger_notify_tech_job_assigned" AFTER INSERT OR UPDATE OF "technician_id" ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."notify_tech_job_assigned"();



CREATE OR REPLACE TRIGGER "trigger_time_entry_profit_recalc" AFTER INSERT OR DELETE OR UPDATE ON "public"."time_entries" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_recalculate_profit_on_time_entry"();



CREATE OR REPLACE TRIGGER "update_businesses_updated_at" BEFORE UPDATE ON "public"."businesses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_invoices_updated_at" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_job_expenses_updated_at" BEFORE UPDATE ON "public"."job_expenses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_job_notes_updated_at" BEFORE UPDATE ON "public"."job_notes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_jobs_updated_at" BEFORE UPDATE ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_services_updated_at" BEFORE UPDATE ON "public"."services" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_subscriptions_updated_at" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoice_line_items"
    ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_line_items"
    ADD CONSTRAINT "invoice_line_items_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_expenses"
    ADD CONSTRAINT "job_expenses_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_expenses"
    ADD CONSTRAINT "job_expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_expenses"
    ADD CONSTRAINT "job_expenses_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_notes"
    ADD CONSTRAINT "job_notes_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_notes"
    ADD CONSTRAINT "job_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_services"
    ADD CONSTRAINT "job_services_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_services"
    ADD CONSTRAINT "job_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admin can delete customers" ON "public"."customers" FOR DELETE USING ((("business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")));



CREATE POLICY "Admin can delete invoice line items" ON "public"."invoice_line_items" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."invoices"
  WHERE (("invoices"."id" = "invoice_line_items"."invoice_id") AND ("invoices"."business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin can delete invoices" ON "public"."invoices" FOR DELETE USING ((("business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")));



CREATE POLICY "Admin can delete job services" ON "public"."job_services" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_services"."job_id") AND ("jobs"."business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin can delete jobs" ON "public"."jobs" FOR DELETE USING ((("business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")));



CREATE POLICY "Admin can delete media" ON "public"."media" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "media"."job_id") AND ("jobs"."business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin can delete services" ON "public"."services" FOR DELETE USING ((("business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")));



CREATE POLICY "Admin can delete users in their business" ON "public"."users" FOR DELETE USING ((("business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")));



CREATE POLICY "Admin can insert customers" ON "public"."customers" FOR INSERT WITH CHECK ((("business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")));



CREATE POLICY "Admin can insert invoice line items" ON "public"."invoice_line_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."invoices"
  WHERE (("invoices"."id" = "invoice_line_items"."invoice_id") AND ("invoices"."business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin can insert invoices" ON "public"."invoices" FOR INSERT WITH CHECK ((("business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")));



CREATE POLICY "Admin can insert job services" ON "public"."job_services" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_services"."job_id") AND ("jobs"."business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin can insert jobs" ON "public"."jobs" FOR INSERT WITH CHECK ((("business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")));



CREATE POLICY "Admin can insert services" ON "public"."services" FOR INSERT WITH CHECK ((("business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")));



CREATE POLICY "Admin can insert users in their business" ON "public"."users" FOR INSERT WITH CHECK ((("business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")));



CREATE POLICY "Admin can update customers" ON "public"."customers" FOR UPDATE USING ((("business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")));



CREATE POLICY "Admin can update invoice line items" ON "public"."invoice_line_items" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."invoices"
  WHERE (("invoices"."id" = "invoice_line_items"."invoice_id") AND ("invoices"."business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin can update invoices" ON "public"."invoices" FOR UPDATE USING ((("business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")));



CREATE POLICY "Admin can update job services" ON "public"."job_services" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_services"."job_id") AND ("jobs"."business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin can update jobs in their business" ON "public"."jobs" FOR UPDATE USING ((("business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")));



CREATE POLICY "Admin can update services" ON "public"."services" FOR UPDATE USING ((("business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")));



CREATE POLICY "Admin can update their own business" ON "public"."businesses" FOR UPDATE USING ((("id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")));



CREATE POLICY "Admin can update users in their business" ON "public"."users" FOR UPDATE USING ((("business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")));



CREATE POLICY "Admin can view all jobs in their business" ON "public"."jobs" FOR SELECT USING ((("business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")));



CREATE POLICY "Admin can view all media in their business" ON "public"."media" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "media"."job_id") AND ("jobs"."business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin can view customers in their business" ON "public"."customers" FOR SELECT USING ((("business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")));



CREATE POLICY "Admin can view invoice line items" ON "public"."invoice_line_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."invoices"
  WHERE (("invoices"."id" = "invoice_line_items"."invoice_id") AND ("invoices"."business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin can view invoices in their business" ON "public"."invoices" FOR SELECT USING ((("business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")));



CREATE POLICY "Admin can view job services" ON "public"."job_services" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_services"."job_id") AND ("jobs"."business_id" = "public"."get_user_business_id"())))));



CREATE POLICY "Admin can view services in their business" ON "public"."services" FOR SELECT USING ((("business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")));



CREATE POLICY "Admin can view their subscription" ON "public"."subscriptions" FOR SELECT USING ((("business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."user_role")));



CREATE POLICY "Anyone can insert media" ON "public"."media" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can insert notes" ON "public"."job_notes" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can insert time entries" ON "public"."time_entries" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can update time entries" ON "public"."time_entries" FOR UPDATE USING (true);



CREATE POLICY "Anyone can view media" ON "public"."media" FOR SELECT USING (true);



CREATE POLICY "Anyone can view notes" ON "public"."job_notes" FOR SELECT USING (true);



CREATE POLICY "Anyone can view time entries" ON "public"."time_entries" FOR SELECT USING (true);



CREATE POLICY "Customers can update their own record" ON "public"."customers" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Customers can view their invoice line items" ON "public"."invoice_line_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."invoices"
  WHERE (("invoices"."id" = "invoice_line_items"."invoice_id") AND ("invoices"."customer_id" IN ( SELECT "customers"."id"
           FROM "public"."customers"
          WHERE ("customers"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Customers can view their own invoices" ON "public"."invoices" FOR SELECT USING (("customer_id" IN ( SELECT "customers"."id"
   FROM "public"."customers"
  WHERE ("customers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Customers can view their own jobs" ON "public"."jobs" FOR SELECT USING (("customer_id" IN ( SELECT "customers"."id"
   FROM "public"."customers"
  WHERE ("customers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Customers can view their own record" ON "public"."customers" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "System can create notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "Tech can update their assigned jobs" ON "public"."jobs" FOR UPDATE USING ((("business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'tech'::"public"."user_role") AND ("technician_id" = "auth"."uid"())));



CREATE POLICY "Tech can upload media to their assigned jobs" ON "public"."media" FOR INSERT WITH CHECK ((("technician_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "media"."job_id") AND ("jobs"."technician_id" = "auth"."uid"()))))));



CREATE POLICY "Tech can view active services" ON "public"."services" FOR SELECT USING ((("business_id" = "public"."get_user_business_id"()) AND ("is_active" = true)));



CREATE POLICY "Tech can view media for their assigned jobs" ON "public"."media" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "media"."job_id") AND ("jobs"."technician_id" = "auth"."uid"())))));



CREATE POLICY "Tech can view their assigned jobs" ON "public"."jobs" FOR SELECT USING ((("business_id" = "public"."get_user_business_id"()) AND ("public"."get_user_role"() = 'tech'::"public"."user_role") AND ("technician_id" = "auth"."uid"())));



CREATE POLICY "Tech can view their job services" ON "public"."job_services" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_services"."job_id") AND ("jobs"."technician_id" = "auth"."uid"())))));



CREATE POLICY "Technicians can view customers in their business" ON "public"."customers" FOR SELECT USING (("business_id" IN ( SELECT "users"."business_id"
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'tech'::"public"."user_role"]))))));



CREATE POLICY "Users can create expenses for their business jobs" ON "public"."job_expenses" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."jobs" "j"
     JOIN "public"."users" "u" ON (("u"."business_id" = "j"."business_id")))
  WHERE (("j"."id" = "job_expenses"."job_id") AND ("u"."id" = "auth"."uid"()) AND ("job_expenses"."business_id" = "u"."business_id")))));



CREATE POLICY "Users can create job notes for their business jobs" ON "public"."job_notes" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."jobs" "j"
     JOIN "public"."users" "u" ON (("u"."business_id" = "j"."business_id")))
  WHERE (("j"."id" = "job_notes"."job_id") AND ("u"."id" = "auth"."uid"())))) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can delete expenses from their business" ON "public"."job_expenses" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."business_id" = "job_expenses"."business_id")))));



CREATE POLICY "Users can delete their own job notes" ON "public"."job_notes" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their own notifications" ON "public"."notifications" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update expenses from their business" ON "public"."job_expenses" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."business_id" = "job_expenses"."business_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."business_id" = "job_expenses"."business_id")))));



CREATE POLICY "Users can update their own job notes" ON "public"."job_notes" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view expenses from their business" ON "public"."job_expenses" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."business_id" = "job_expenses"."business_id")))));



CREATE POLICY "Users can view job notes from their business" ON "public"."job_notes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."jobs" "j"
     JOIN "public"."users" "u" ON (("u"."business_id" = "j"."business_id")))
  WHERE (("j"."id" = "job_notes"."job_id") AND ("u"."id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own business" ON "public"."businesses" FOR SELECT USING (("id" = "public"."get_user_business_id"()));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view users in their business" ON "public"."users" FOR SELECT USING (("business_id" = "public"."get_user_business_id"()));



ALTER TABLE "public"."businesses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_line_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "media_all_access" ON "public"."media" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "notes_all_access" ON "public"."job_notes" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "time_all_access" ON "public"."time_entries" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."calculate_actual_labor_cost"("p_job_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_actual_labor_cost"("p_job_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_actual_labor_cost"("p_job_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_expenses_by_category"("p_job_id" "uuid", "p_category" "public"."expense_category") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_expenses_by_category"("p_job_id" "uuid", "p_category" "public"."expense_category") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_expenses_by_category"("p_job_id" "uuid", "p_category" "public"."expense_category") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_link" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_link" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_link" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_invoice_number"("p_business_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_invoice_number"("p_business_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invoice_number"("p_business_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_business_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_business_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_business_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_tech_job_assigned"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_tech_job_assigned"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_tech_job_assigned"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_recalculate_profit_on_expense"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_recalculate_profit_on_expense"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_recalculate_profit_on_expense"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_recalculate_profit_on_time_entry"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_recalculate_profit_on_time_entry"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_recalculate_profit_on_time_entry"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_job_profit_calculations"("p_job_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_job_profit_calculations"("p_job_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_job_profit_calculations"("p_job_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."businesses" TO "anon";
GRANT ALL ON TABLE "public"."businesses" TO "authenticated";
GRANT ALL ON TABLE "public"."businesses" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_line_items" TO "anon";
GRANT ALL ON TABLE "public"."invoice_line_items" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_line_items" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."job_expenses" TO "anon";
GRANT ALL ON TABLE "public"."job_expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."job_expenses" TO "service_role";



GRANT ALL ON TABLE "public"."job_notes" TO "anon";
GRANT ALL ON TABLE "public"."job_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."job_notes" TO "service_role";



GRANT ALL ON TABLE "public"."job_services" TO "anon";
GRANT ALL ON TABLE "public"."job_services" TO "authenticated";
GRANT ALL ON TABLE "public"."job_services" TO "service_role";



GRANT ALL ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT ALL ON TABLE "public"."media" TO "anon";
GRANT ALL ON TABLE "public"."media" TO "authenticated";
GRANT ALL ON TABLE "public"."media" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."time_entries" TO "anon";
GRANT ALL ON TABLE "public"."time_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."time_entries" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































