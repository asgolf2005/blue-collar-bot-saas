# Blue Collar Bot SaaS - Deployment Guide

Complete step-by-step guide to deploy your Blue Collar Bot SaaS platform.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Local Development](#local-development)
4. [n8n Integration](#n8n-integration)
5. [Production Deployment](#production-deployment)
6. [Adding Users](#adding-users)

---

## Prerequisites

Before you begin, ensure you have:
- Node.js 18+ installed
- A Supabase account (https://supabase.com)
- A Vercel account (https://vercel.com) for deployment
- Your existing n8n workflow ready

---

## Supabase Setup

### 1. Create a Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Choose an organization and give your project a name
4. Set a strong database password (save this!)
5. Choose a region close to your users
6. Click "Create new project"

### 2. Run Database Migrations

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into the editor and click "Run"
5. Repeat for `supabase/migrations/002_rls_policies.sql`

### 3. Create Storage Bucket for Photos

1. In Supabase dashboard, go to **Storage**
2. Click "New bucket"
3. Name it `job-photos`
4. Make it **Public** (so photos can be viewed)
5. Click "Create bucket"

### 4. Set Storage Policies

In the Storage > Policies section for `job-photos`:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'job-photos');

-- Allow authenticated users to read photos
CREATE POLICY "Authenticated users can view photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'job-photos');

-- Allow public viewing (optional, for sharing)
CREATE POLICY "Public can view photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'job-photos');
```

### 5. Get Supabase Credentials

1. Go to **Project Settings > API**
2. Copy the following:
   - Project URL
   - Anon (public) key
   - Service role key (keep this secret!)

### 6. Create Your First Business

In Supabase SQL Editor, run:

```sql
INSERT INTO businesses (name, address, primary_calendar_id)
VALUES ('Your Business Name', '123 Main St, City, State', 'your-calendar-id@group.calendar.google.com');
```

Copy the returned `id` - you'll need this for creating users.

### 7. Create Admin User

First, sign up a user via Supabase Auth:

1. Go to **Authentication > Users**
2. Click "Add user"
3. Choose "Create new user"
4. Enter email and password
5. Click "Create user"
6. Copy the user's UUID

Then add them to your `users` table:

```sql
INSERT INTO users (id, business_id, email, name, phone, role)
VALUES (
  'USER-UUID-FROM-ABOVE',
  'BUSINESS-UUID-FROM-STEP-6',
  'admin@yourbusiness.com',
  'Admin Name',
  '1234567890',
  'admin'
);
```

---

## Local Development

### 1. Install Dependencies

```bash
cd blue-collar-bot-saas
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
N8N_WEBHOOK_SECRET=create-a-random-secret-here
```

### 3. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### 4. Test Login

1. Go to http://localhost:3000/login
2. Enter the admin email you created
3. Click "Send Magic Link"
4. Check your email and click the link
5. You should be redirected to the admin dashboard

---

## n8n Integration

### 1. Configure Webhook in Your n8n Workflow

In your existing n8n workflow that handles AI calls:

1. Add an HTTP Request node at the end
2. Configure it as follows:

**Method:** POST

**URL:** `https://your-deployment-url.vercel.app/api/webhooks/n8n`

**Authentication:** Header Auth
- Name: `Authorization`
- Value: `Bearer YOUR_N8N_WEBHOOK_SECRET`

**Body (JSON):**

```json
{
  "business_id": "YOUR-BUSINESS-UUID",
  "customer_name": "{{ $json.customer_name }}",
  "customer_phone": "{{ $json.customer_phone }}",
  "customer_email": "{{ $json.customer_email }}",
  "customer_address": "{{ $json.customer_address }}",
  "scheduled_start": "{{ $json.scheduled_start }}",
  "scheduled_end": "{{ $json.scheduled_end }}",
  "description": "{{ $json.description }}",
  "urgency": "{{ $json.urgency }}",
  "calendar_event_id": "{{ $json.calendar_event_id }}",
  "technician_id": null
}
```

### 2. Field Mapping

Map your n8n workflow fields to the webhook payload:

| n8n Field | Webhook Field | Required | Type |
|-----------|---------------|----------|------|
| Customer name from call | customer_name | Yes | string |
| Customer phone | customer_phone | Yes | string |
| Customer email | customer_email | No | string |
| Customer address | customer_address | No | string |
| Appointment start time | scheduled_start | Yes | ISO 8601 datetime |
| Appointment end time | scheduled_end | Yes | ISO 8601 datetime |
| Job description | description | No | string |
| Urgency level | urgency | No | string |
| Google Calendar Event ID | calendar_event_id | No | string |

### 3. Test the Integration

1. Make a test call to your AI receptionist
2. Book an appointment
3. Check the n8n workflow execution
4. Verify the job appears in your admin dashboard

---

## Production Deployment

### 1. Deploy to Vercel

#### Via Vercel CLI:

```bash
npm install -g vercel
vercel
```

Follow the prompts to link your project.

#### Via Vercel Dashboard:

1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your Git repository
4. Configure as follows:
   - Framework Preset: Next.js
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`

### 2. Configure Environment Variables in Vercel

In Vercel Project Settings > Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
N8N_WEBHOOK_SECRET=same-secret-as-local
```

### 3. Deploy

Click "Deploy" and wait for the build to complete.

### 4. Update n8n Webhook URL

Update your n8n HTTP Request node URL to:
```
https://your-app.vercel.app/api/webhooks/n8n
```

### 5. Configure Custom Domain (Optional)

1. In Vercel, go to Settings > Domains
2. Add your custom domain (e.g., app.yourbusiness.com)
3. Follow DNS configuration instructions
4. Update `NEXT_PUBLIC_SITE_URL` environment variable

---

## Adding Users

### Adding Technicians

1. Log in as admin
2. In Supabase Dashboard, go to Authentication > Users
3. Click "Add user" and create the technician's account
4. Copy the user UUID
5. In SQL Editor, run:

```sql
INSERT INTO users (id, business_id, email, name, phone, role)
VALUES (
  'TECH-USER-UUID',
  'YOUR-BUSINESS-UUID',
  'tech@yourbusiness.com',
  'Tech Name',
  '1234567890',
  'tech'
);
```

The technician can now log in at your app URL and access the mobile interface.

### Adding More Admins

Follow the same process but set `role` to `'admin'` instead of `'tech'`.

---

## Troubleshooting

### Users Can't See Data

Check RLS policies are enabled:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

All should show `rowsecurity = true`.

### Photos Not Uploading

1. Check storage bucket exists and is public
2. Verify storage policies are set correctly
3. Check browser console for CORS errors
4. Ensure NEXT_PUBLIC_SUPABASE_URL is correct in production

### n8n Webhook Failing

1. Check webhook URL is correct
2. Verify Authorization header is set
3. Check payload matches expected format
4. View Vercel function logs for errors

### Magic Links Not Working

1. In Supabase, go to Authentication > URL Configuration
2. Set Site URL to your production domain
3. Add redirect URLs for both production and local development

---

## Support

For issues or questions:
1. Check Supabase dashboard for error logs
2. Check Vercel function logs
3. Review n8n execution logs
4. Ensure all environment variables are set correctly

---

## Security Checklist

Before going live:

- [ ] Changed all default passwords
- [ ] Set strong N8N_WEBHOOK_SECRET
- [ ] SUPABASE_SERVICE_ROLE_KEY is not exposed in frontend code
- [ ] RLS policies are enabled on all tables
- [ ] Storage bucket policies are correct
- [ ] SSL/HTTPS enabled (automatic with Vercel)
- [ ] Email templates configured in Supabase
- [ ] Backup strategy in place for Supabase data

---

## Next Steps

After deployment:
1. Customize email templates in Supabase
2. Set up monitoring and alerts
3. Configure backup schedules
4. Train your team on the platform
5. Test the full flow from AI call to job completion
