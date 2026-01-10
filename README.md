# Blue Collar Bot - Tradie CRM + AI Receptionist SaaS

A complete SaaS platform for trade businesses featuring AI-powered phone receptionist integration, job management, and mobile technician interface.

---

## Documentation

**Start here:** [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) - Single source of truth for current state, history, and roadmap.

### Quick Links
- **[PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)** - Project overview, history, roadmap
- **[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** - Index of detailed docs
- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** - Current status snapshot
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment guide
- **[CHANGELOG.md](./CHANGELOG.md)** - Change history
- **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** - Feature implementation status
- **[UX_FEATURES_STATUS.md](./UX_FEATURES_STATUS.md)** - UX status

---


## Features

### Admin Dashboard
- **Job Management**: View, create, and manage all service jobs
- **Calendar View**: Visual calendar showing all scheduled appointments
- **Customer Database**: Manage customer information and history
- **Team Management**: Assign jobs to technicians
- **Business Settings**: Configure business details and integrations
- **Real-time Updates**: See job status changes as they happen

### Technician Mobile App
- **Today's Jobs**: Mobile-first view of daily schedule
- **Job Details**: Complete customer information and job description
- **Status Updates**: Update job status with one tap
  - On the way
  - Arrived
  - In progress
  - Completed
- **Photo Upload**: Take and upload job site photos
- **Quick Actions**: Call customer or navigate to address with one tap

### AI Receptionist Integration
- Automatic job creation from AI phone calls
- Customer database auto-population
- Google Calendar synchronization
- Smart duplicate detection

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, RLS)
- **Deployment**: Vercel
- **Integration**: n8n workflow automation

## Project Structure

```
blue-collar-bot-saas/
├── app/
│   ├── admin/              # Admin dashboard pages
│   │   ├── jobs/          # Job management
│   │   ├── calendar/      # Calendar view
│   │   ├── customers/     # Customer management
│   │   └── settings/      # Business settings
│   ├── tech/              # Technician mobile pages
│   │   ├── today/         # Today's jobs
│   │   └── jobs/[id]/     # Job details
│   ├── login/             # Authentication
│   └── api/               # API routes
│       ├── jobs/          # Job endpoints
│       ├── customers/     # Customer endpoints
│       └── webhooks/      # n8n integration
├── components/
│   ├── admin/             # Admin components
│   └── tech/              # Tech components
├── lib/
│   ├── supabase/          # Supabase clients
│   └── types.ts           # TypeScript types
├── supabase/
│   └── migrations/        # Database schema
└── middleware.ts          # Auth & routing
```

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo>
cd blue-collar-bot-saas
npm install
```

### 2. Set Up Supabase

Follow the complete guide in [DEPLOYMENT.md](./DEPLOYMENT.md)

Quick version:
1. Create Supabase project
2. Run migrations from `supabase/migrations/`
3. Create storage bucket `job-photos`
4. Get API keys

### 3. Configure Environment

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
N8N_WEBHOOK_SECRET=your-webhook-secret
```

### 4. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

## Database Schema

### Tables

- **businesses**: Business information and settings
- **users**: Admin and technician users (linked to Supabase Auth)
- **customers**: Customer database
- **jobs**: Service jobs/appointments
- **media**: Job photos and documents

### Security

Row Level Security (RLS) enforces:
- Admins can only access their business data
- Techs can only access their assigned jobs
- Automatic role-based access control

## API Endpoints

### Jobs
- `GET /api/jobs` - List jobs (filtered by role)
- `POST /api/jobs` - Create job (admin only)
- `POST /api/jobs/update-status` - Update job status
- `GET /api/jobs/today?tech_id=` - Today's jobs for technician

### Customers
- `GET /api/customers` - List customers (admin only)
- `POST /api/customers` - Create customer (admin only)

### Webhooks
- `POST /api/webhooks/n8n` - Receive jobs from n8n workflow

## n8n Integration

The platform integrates with your existing n8n AI caller workflow.

### Webhook Payload

```json
{
  "business_id": "uuid",
  "customer_name": "John Smith",
  "customer_phone": "+1234567890",
  "customer_email": "john@example.com",
  "customer_address": "123 Main St",
  "scheduled_start": "2024-03-15T09:00:00Z",
  "scheduled_end": "2024-03-15T10:00:00Z",
  "description": "Fix leaking tap",
  "urgency": "normal",
  "calendar_event_id": "google-calendar-event-id"
}
```

### Authentication

Include header:
```
Authorization: Bearer your-webhook-secret
```

## User Roles

### Admin
- Full access to dashboard
- Manage jobs, customers, settings
- Assign jobs to technicians
- View all business data

### Tech (Technician)
- Mobile-first interface
- View assigned jobs only
- Update job status
- Upload photos
- Access customer contact info

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions.

Quick deploy to Vercel:

```bash
npm install -g vercel
vercel
```

## Development

### Adding Features

The codebase follows Next.js App Router conventions:

- **Server Components**: Default for data fetching
- **Client Components**: For interactivity (marked with 'use client')
- **Server Actions**: Could be added for form handling
- **API Routes**: Located in `app/api/`

### Styling

Using TailwindCSS with custom utility classes:

- `.btn`, `.btn-primary`, `.btn-secondary`, etc.
- `.card` - White card with shadow
- `.badge`, `.badge-scheduled`, etc. - Status badges
- `.input`, `.label` - Form elements

### Type Safety

TypeScript types defined in `lib/types.ts`:

- `Business`, `User`, `Customer`, `Job`, `Media`
- `JobWithDetails` - Job with relations
- `UserRole`, `JobStatus`, `JobSource` - Enums

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use for your business

## Support

For deployment help, see [DEPLOYMENT.md](./DEPLOYMENT.md)

For issues, check:
- Supabase dashboard logs
- Vercel function logs
- Browser console
- Network requests

## Roadmap

Potential future features:
- [ ] SMS notifications to customers
- [ ] Invoice generation
- [ ] Recurring jobs/maintenance schedules
- [ ] Parts inventory tracking
- [ ] Customer portal for booking
- [ ] Analytics dashboard
- [ ] Multi-business support
- [ ] Mobile app (React Native)

---

Built with ❤️ for trade businesses

