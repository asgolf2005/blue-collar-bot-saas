# Changelog

All notable changes to the Blue Collar Bot SaaS project are documented here.

---

## [Unreleased]

### Planned Features
- Loading skeleton components
- Enhanced empty states with illustrations
- Keyboard shortcuts system (?, Cmd+N, G+J, etc.)
- Contextual action menus (3-dot menus)
- SMS notifications (Twilio)
- Stripe subscription management
- Audit logging system
- Two-factor authentication

---

## [2025-12-28] - Major UX & Database Fixes

### Added
- **Week Navigation Component** (`components/tech/WeekNavigation.tsx`)
  - Previous/Next week buttons
  - "This Week" quick jump
  - URL parameter-based navigation
- **Comprehensive Tech Stats Dashboard** (`app/tech/stats/page.tsx`)
  - Total earnings with weekly/monthly breakdown
  - Average hourly rate calculations
  - Completion rate percentage
  - Job statistics grid
  - Top 3 most common job types analysis
- **Storage Bucket Complete Setup** (migration `009_storage_complete_setup.sql`)
  - Media bucket with proper configuration
  - Simple RLS policies for authenticated users
  - Public read access for media

### Fixed
- **Customer Dropdown Contrast** - Complete redesign with custom component
  - Solid backgrounds instead of transparent
  - High contrast text colors in both modes
  - Proper z-indexing to prevent overlap
- **Input Field Visibility** - Enhanced `.input-premium` styling
  - Explicit color values for light/dark modes
  - Increased font weight for better readability
  - Comprehensive hover/focus states
- **Button Contrast** - Updated `.glass-btn-primary`
  - Solid colors instead of semi-transparent
  - Light mode: dark blue with white text
  - Dark mode: bright blue with dark text
- **Glassmorphic Sidebar** - Applied transparency to AdminNav
  - `bg-surface-50/70` with backdrop blur
  - Proper dark mode variants
- **Card Border Visibility** - Enhanced `.glass-card` borders
  - Light mode: 2px solid dark borders
  - Dark mode: subtle original borders maintained
- **Customer Creation Error** - Removed non-existent 'notes' column
- **Notification RLS Policy** - Added INSERT policy (migration `007_fix_notification_insert.sql`)
- **Photo Upload Storage** - Fixed bucket name mismatch (`job-photos` → `media`)
- **Week Navigation** - Added ability to switch between weeks in tech schedule

### Changed
- Moved outdated documentation to `docs/archive/`
- Created comprehensive `PROJECT_STATUS.md`
- Created detailed `SESSION_DEC28_2025.md`
- Updated `README.md` with documentation links

### Removed
- `nul` - Empty file
- `FIX_ERRORS_NOW.md` - Outdated
- `STORAGE_BUCKET_FIX.md` - Outdated
- `BUILD_STATUS.md` - Superseded by PROJECT_STATUS.md
- `codexupdates.md` - Minimal content, redundant

---

## [2025-12-27] - UX Features Implementation

### Added
- **Toast Notification System** (`lib/utils/toast.ts`, `components/providers/ToastProvider.tsx`)
  - Success, error, warning, info variants
  - Loading and promise toasts
  - Custom toasts with action buttons
  - Auto-dismiss functionality
  - Mobile responsive
- **Global Search (Cmd+K)** (`components/search/GlobalSearch.tsx`)
  - Search across jobs, customers, invoices
  - Keyboard navigation (arrow keys, Enter, Esc)
  - Real-time debounced search
  - Recent searches cache
  - Beautiful modal UI
- **Bulk Selection System** (`hooks/useBulkSelection.ts`, `components/ui/BulkActionBar.tsx`)
  - Reusable selection hook
  - Floating action bar
  - Bulk delete for jobs, customers, invoices
  - Bulk export to CSV for customers
  - Bulk send/mark paid for invoices
- API routes for bulk operations
  - `/api/jobs/bulk-delete`
  - `/api/customers/bulk-delete`
  - `/api/invoices/bulk-delete`
  - `/api/invoices/bulk-send`
  - `/api/invoices/bulk-mark-paid`

### Changed
- Updated `UX_FEATURES_STATUS.md` with completed features

---

## [2025-12-23] - Premium Design System Overhaul

### Added
- **Premium Glassmorphic Design System** (`app/globals.css`)
  - Multi-layered shadows and glows (674 lines)
  - Sophisticated border treatments
  - Underglow effects for cards
  - Premium input field styles
  - Alert/message box components
  - Loading state components (skeleton screens)
  - Premium table row hover effects
  - Premium badge variants
  - Ambient page background animations
- **Tech Dashboard** (`app/tech/dashboard/page.tsx`)
  - 4 premium stat cards (Next Project, Upcoming, Today, Performance)
  - Weekly jobs bar chart
  - Today's schedule list
  - Monthly circular progress indicator
  - Work notifications panel
  - Google Maps integration with route planning
- **Theme Toggle Integration**
  - Added to AdminNav (desktop sidebar and mobile menu)
  - Added to TechNav (top header)
  - Added to CustomerNav (top header)
  - Premium sun/moon icon with smooth transitions
- **Custom Scrollbar Styles** - Consistent across all browsers
- **Shared Components**
  - EmptyState component with variants
  - FormAlert component for success/danger/info/warning
  - LoadingState components (spinner, skeleton, card, table)

### Fixed
- **Dark Mode** - Removed hard-coded `className="light"` from root layout
- **Currency Display Bug** - Fixed 100x display error on invoices
  - Updated totalOutstanding calculation (divide by 100)
  - Updated totalPaid calculation (divide by 100)
  - Fixed invoice.total display

### Changed
- **NewJobForm** - Complete premium redesign
  - Custom select dropdowns
  - Premium glass cards and inputs
  - FormAlert for errors
  - Service selection with premium styling
- **Navigation Components** - Added theme toggle to all portals
- Created `claudeupdates.md` for design updates tracking

---

## [2025-12-14] - Data Seeding

### Added
- Full month data seeding script (`seed-full-month-data.js`)
- Realistic job scheduling across 30 days
- Multiple technicians with varied schedules

---

## [2025-12-10] - Storage & Database Fixes

### Fixed
- Storage bucket RLS policies for photo uploads
- Time entries table creation
- Job notes table creation
- Customer signature field

---

## [2025-12-09] - Middleware & Features

### Added
- Enhanced routing middleware
- Two-factor authentication groundwork
- Tech features documentation

---

## [2025-12-06] - Major Feature Completions

### Added
- **Analytics Dashboard** - Complete business intelligence
- **Invoice System** - Professional invoicing with line items
- **Job Notes System** - Technician notes and documentation
- **Tech Mobile App** - Complete field technician workflow

### Changed
- Updated project completion documentation
- Created multiple "COMPLETE" status documents

---

## [2025-12-05] - Core Features

### Added
- **Customer Portal** - Self-service portal for customers
- **Services Management** - Service catalog with pricing
- Business onboarding flow
- Signup and login pages

### Changed
- Updated build status documentation
- Created services management documentation

---

## [2025-12-04] - Initial Release

### Added
- **Project Foundation**
  - Next.js 15+ with App Router
  - TypeScript configuration
  - TailwindCSS setup
  - Supabase integration
- **Database Schema**
  - Initial migrations (001-004)
  - Core tables (businesses, users, customers, jobs)
  - Row Level Security policies
- **Admin Dashboard**
  - Jobs management
  - Calendar view
  - Customer management
  - Settings page
- **Technician App**
  - Today's jobs view
  - Job details page
  - Status update functionality
- **API Routes**
  - Jobs endpoints
  - Customers endpoints
  - n8n webhook integration
- **Documentation**
  - README.md
  - DEPLOYMENT.md
  - SETUP_GUIDE.md
  - Project structure documentation

---

## Migration History

### Database Migrations (supabase/migrations/)
1. `001_initial_schema.sql` - Core tables
2. `002_rls_policies.sql` - Security policies
3. `003_enhanced_schema.sql` - Advanced features (services, invoices, subscriptions, notifications)
4. `004_enhanced_rls_policies.sql` - Enhanced security
5. `005_invoice_currency_fix.sql` - Currency handling standardization
6. `006_allow_techs_read_customers.sql` - Technician customer access
7. `007_fix_notification_insert.sql` - Notification RLS fix
8. `008_fix_storage_rls.sql` - Storage policies (superseded by 009)
9. `009_storage_complete_setup.sql` - Complete storage bucket configuration

---

## Technology Stack Evolution

### Current Stack
- **Frontend:** Next.js 15+, React 18+, TypeScript 5+
- **Styling:** TailwindCSS 3+ with custom design system
- **Backend:** Supabase (PostgreSQL 15+, Auth, Storage, Realtime)
- **Email:** Resend
- **Deployment:** Vercel
- **Integration:** n8n

### Planned Additions
- **SMS:** Twilio
- **Payments:** Stripe
- **Monitoring:** Sentry
- **Analytics:** Vercel Analytics

---

## Breaking Changes

### [2025-12-28]
- Storage bucket renamed from `job-photos` to `media`
- Customer `notes` field removed from database (was never in schema)

### [2025-12-23]
- Complete CSS class naming convention change
  - Old: `text-gray-*` → New: `text-ink`, `text-muted`
  - Old: `.card` → New: `.glass-card`
  - Old: `.input` → New: `.input-premium`

---

## Security Updates

### [2025-12-28]
- ✅ Fixed notification RLS policies (allow INSERT)
- ✅ Simplified storage RLS policies (authenticated users)
- ✅ Public read access for media bucket

### [2025-12-14]
- ✅ Enhanced RLS policies for all tables
- ✅ Technician read access to customer data

### [2025-12-04]
- ✅ Initial RLS policies implemented
- ✅ Multi-tenant data isolation
- ✅ Role-based access control

---

## Performance Improvements

### [2025-12-28]
- Optimized stats dashboard with server-side aggregations
- Improved input rendering with CSS instead of nested divs
- Debounced search for better performance

### [2025-12-27]
- Added debounced search (300ms) for global search
- Limited search results (5 per type)
- Optimistic UI updates for bulk actions

### [2025-12-23]
- Server-side rendering for dashboard
- Code splitting with dynamic imports
- Image optimization with Next.js Image

---

## Known Issues

### Current
- None critical

### Resolved
- ✅ [2025-12-28] Customer dropdown unreadable contrast
- ✅ [2025-12-28] Input fields low contrast
- ✅ [2025-12-28] Photo upload RLS errors
- ✅ [2025-12-28] Job creation notification errors
- ✅ [2025-12-28] Customer creation notes column error
- ✅ [2025-12-23] Dark mode not working (hard-coded light class)
- ✅ [2025-12-23] Invoice amounts showing 100x too high
- ✅ [2025-12-10] Storage bucket RLS blocking uploads

---

## Contributors

- Primary Development: Claude (AI Assistant)
- Project Owner: [Your Name]
- Design Inspiration: Stripe, Linear, Vercel, Notion

---

## License

MIT License - See LICENSE file for details

---

**Note:** This changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) principles and uses [Semantic Versioning](https://semver.org/).

**Legend:**
- **Added** - New features
- **Changed** - Changes to existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security improvements
