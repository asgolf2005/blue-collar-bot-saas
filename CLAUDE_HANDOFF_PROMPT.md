# CLAUDE HANDOFF PROMPT - Analytics & Data Fix

## PROJECT OVERVIEW

**Blue Collar Bot CRM** - A field service management SaaS for trade businesses (plumbers, electricians, HVAC).

### Tech Stack
- **Frontend**: Next.js 16.1.0 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **UI Design**: "Industrial Futurism" - dark/light mode, glassmorphism, monospace fonts

### Project Structure
```
app/
  admin/
    analytics/
      page.tsx              # Main analytics server component
      revenue/              # Revenue breakdown drill-down page
      components/
        AnalyticsClient.tsx # Client-side interactivity
        RevenueChart.tsx    # Main revenue trend chart
        JobsByStatusChart.tsx
        TopTechniciansChart.tsx
        ServiceBreakdownTable.tsx
        DailyBreakdown.tsx  # Shows when clicking chart data point
    jobs/
    invoices/
    customers/
    schedule/
    services/
  api/                      # API routes
lib/
  supabase/                 # Supabase clients
  types.ts                  # TypeScript types
scripts/
  seed-comprehensive-data.sql  # Test data generator (already run)
```

---

## DATABASE SCHEMA (CRITICAL FOR ANALYTICS)

### Tables & Relationships
```sql
-- CORE TABLES
businesses (id, name, created_at)
users (id, business_id, role: 'admin'|'tech'|'customer', full_name)
customers (id, business_id, name, email, phone, address)
services (id, business_id, name, base_price)

-- JOBS
jobs (
  id, 
  business_id, 
  customer_id, 
  technician_id -> users.id,
  status: 'scheduled'|'on_the_way'|'arrived'|'in_progress'|'completed'|'cancelled',
  scheduled_start,
  scheduled_end,
  total_cost,        -- ESTIMATED cost, not actual revenue
  created_at
)

-- INVOICES (SOURCE OF TRUTH FOR REVENUE)
invoices (
  id,
  business_id,
  job_id -> jobs.id,
  customer_id,
  invoice_number,
  status: 'draft'|'sent'|'paid'|'overdue'|'cancelled',
  subtotal,
  tax,
  total,             -- ACTUAL revenue
  paid_at,           -- When payment received
  created_at,
  issue_date
)

-- LINKING TABLES
job_services (job_id, service_id, quantity)
invoice_line_items (invoice_id, service_id, type, quantity, unit_price, total)
```

### Current Test Data (Already Seeded)
- **50 Jobs**: 6 completed, 29 scheduled, 4 cancelled, etc.
- **30 Invoices**: ~9 paid (~$2,154), ~9 sent, ~6 draft, ~3 overdue, ~3 cancelled
- **20 Customers**
- **10 Services**

---

## CURRENT ANALYTICS ARCHITECTURE

### Data Flow
1. `app/admin/analytics/page.tsx` (Server Component)
   - Fetches jobs and invoices from Supabase
   - Calculates metrics
   - Passes data to `AnalyticsClient`

2. `app/admin/analytics/components/AnalyticsClient.tsx` (Client Component)
   - Displays metric cards (Revenue, Jobs, Completion, Avg Ticket)
   - Renders `RevenueChart`
   - Shows drill-down sections when data point clicked

3. `app/admin/analytics/components/RevenueChart.tsx`
   - Uses Recharts library
   - Shows AreaChart with revenue trend
   - Has `onDataPointClick` handler

### Current Calculation Logic (INCOMPLETE)
```typescript
// CURRENT (WRONG) - Mixing job estimates with invoice reality
const revenue = paidInvoices.reduce((sum, i) => sum + (i.total || 0), 0)  // Correct
const jobCount = jobs.length  // Should filter by date range
const avgTicket = paidInvoices.length > 0 ? Math.round(revenue / paidInvoices.length) : 0  // Wrong - should be per job
```

---

## BUGS & ISSUES TO FIX

### 1. **Revenue Chart Shows $0 Total/Average/Peak**
**File**: `app/admin/analytics/components/RevenueChart.tsx`
**Problem**: The stats calculation uses `data.reduce()` but the data might be empty or wrong.

**Expected**: Should show actual totals from the daily data points.

### 2. **Revenue Breakdown Page Shows $0**
**File**: `app/admin/analytics/revenue/page.tsx`
**Problem**: Filters by `created_at` date range which excludes seed data from 10 days ago.

**Expected**: Should show all paid invoice revenue with proper breakdowns by service and technician.

### 3. **Analytics Cards Show Wrong Numbers**
**File**: `app/admin/analytics/page.tsx`
**Current Issues**:
- Jobs count might not match actual data
- Revenue shows correct paid amount (~$2,154) but breakdown is wrong
- Completion rate calculated from jobs (should use invoice-paid jobs)
- Avg ticket calculation is invoice-based not job-based

**Expected**:
- Revenue: Sum of all paid invoice totals
- Jobs: Total job count (or jobs in period)
- Completion: % of jobs that are completed
- Avg Ticket: Revenue / number of completed jobs (or paid invoices)

### 4. **Click on Chart Dots Doesn't Work Reliably**
**File**: `app/admin/analytics/components/RevenueChart.tsx`
**Problem**: Dot click handler may not fire properly.

**Expected**: Clicking any data point should show `DailyBreakdown` component.

### 5. **Date Range Filtering is Broken**
**Files**: `app/admin/analytics/page.tsx`, `app/admin/analytics/revenue/page.tsx`
**Problem**: 
- Date calculations use `new Date()` which changes on every request
- 30-day filter excludes seed data from 10 days ago
- Need consistent date handling

**Expected**: 
- Default to 30 days but include ALL data if empty
- Or use broader default range (90 days)

---

## SPECIFIC FIXES NEEDED

### Fix 1: Correct Metric Calculations
In `app/admin/analytics/page.tsx`:
```typescript
// Revenue = sum of PAID invoice totals
const revenue = paidInvoices.reduce((sum, i) => sum + (i.total || 0), 0)

// Outstanding = sum of SENT + OVERDUE invoices  
const outstandingRevenue = invoiceData
  .filter(i => ['sent', 'overdue'].includes(i.status))
  .reduce((sum, i) => sum + (i.total || 0), 0)

// Jobs = total count
const jobCount = jobs.length

// Completed = jobs with status 'completed'
const completedCount = jobs.filter(j => j.status === 'completed').length

// Completion rate
const completionRate = jobCount > 0 ? Math.round((completedCount / jobCount) * 100) : 0

// Avg ticket = revenue / completed jobs (or paid invoices)
const avgTicket = completedCount > 0 ? Math.round(revenue / completedCount) : 0
```

### Fix 2: Fix Revenue Chart Data Generation
In `app/admin/analytics/page.tsx`:
```typescript
// generateDailyRevenueData should use invoices, not jobs
function generateDailyRevenueData(invoices: InvoiceData[], range: string): RevenueDataPoint[] {
  const { start, end } = getDateRange(range)
  const days: RevenueDataPoint[] = []
  
  const current = new Date(start)
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0]
    
    // Find invoices paid on this date (or created if not paid)
    const dayInvoices = invoices.filter(i => {
      const dateToUse = i.status === 'paid' && i.paid_at 
        ? i.paid_at.split('T')[0] 
        : i.created_at.split('T')[0]
      return dateToUse === dateStr
    })
    
    const dayRevenue = dayInvoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + (i.total || 0), 0)
    
    days.push({
      date: dateStr,
      displayDate: formatDisplayDate(current),
      revenue: Math.round(dayRevenue),
      jobs: dayInvoices.filter(i => i.status === 'paid').length,
      hours: 0, // Not tracked currently
    })
    
    current.setDate(current.getDate() + 1)
  }
  
  return days
}
```

### Fix 3: Fix Revenue Breakdown Page
In `app/admin/analytics/revenue/page.tsx`:
- Remove strict date filtering or broaden to 90 days
- Query invoices not jobs
- Join with jobs to get technician and service info
- Calculate breakdowns from paid invoices

### Fix 4: Fix Chart Click Handler
In `app/admin/analytics/components/RevenueChart.tsx`:
- Ensure dot click handler passes correct data
- Verify `DailyBreakdown` component receives proper props
- Add fallback if no jobs for that date

### Fix 5: Consistent Date Handling
Create a shared utility:
```typescript
// lib/analytics/dateUtils.ts
export function getDateRange(range: string): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  
  const start = new Date(end)
  const prevEnd = new Date(start)
  prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStart = new Date(prevEnd)
  
  switch (range) {
    case '7d':
      start.setDate(end.getDate() - 7)
      prevStart.setDate(prevEnd.getDate() - 7)
      break
    case '30d':
      start.setDate(end.getDate() - 30)
      prevStart.setDate(prevEnd.getDate() - 30)
      break
    case '90d':
      start.setDate(end.getDate() - 90)
      prevStart.setDate(prevEnd.getDate() - 90)
      break
    case 'ytd':
      start.setMonth(0, 1)
      prevStart.setFullYear(prevEnd.getFullYear() - 1, 0, 1)
      break
    default:
      start.setDate(end.getDate() - 30)
      prevStart.setDate(prevEnd.getDate() - 30)
  }
  
  start.setHours(0, 0, 0, 0)
  prevStart.setHours(0, 0, 0, 0)
  prevEnd.setHours(23, 59, 59, 999)
  
  return { start, end, prevStart, prevEnd }
}
```

---

## DESIGN SYSTEM NOTES

### Colors (Tailwind Classes)
- Primary: `cyan-500`, `cyan-600` (dark: `cyan-400`)
- Success: `emerald-500`, `emerald-600` (dark: `emerald-400`)
- Revenue/Emerald: `text-emerald-600 dark:text-emerald-400`
- Jobs/Cyan: `text-cyan-600 dark:text-cyan-400`
- Charts use specific hex: `#22d3ee` (cyan), `#22c55e` (emerald), etc.

### Typography
- Display headings: `font-display text-4xl/5xl` (industrial style)
- Mono labels: `font-mono text-xs`

### Components to Use
- Cards: `bg-white dark:bg-slate-900 rounded-2xl bordeo
r border-slate-200 dark:border-slate-800`
- Metric cards: `LiveMetricCard` component
- Charts: Recharts library
---

## VERIFICATION STEPS

After fixes, verify:

1. **Main Analytics Page** (`/admin/analytics`):
   - [ ] Revenue card shows ~$2,154 (paid invoice total)
   - [ ] Jobs card shows 50
   - [ ] Completion shows ~12% (6/50)
   - [ ] Avg ticket shows ~$359 ($2,154/6)
   - [ ] Chart shows daily revenue with non-zero values
   - [ ] Clicking chart dots shows DailyBreakdown

2. **Revenue Breakdown Page** (`/admin/analytics/revenue`):
   - [ ] Shows total revenue ~$2,154
   - [ ] Lists services with revenue breakdown
   - [ ] Lists technicians with revenue breakdown  
   - [ ] Shows daily breakdown table
   - [ ] Shows recent paid invoices

3. **No Console Errors**:
   - [ ] No React key warnings
   - [ ] No Supabase query errors
   - [ ] No hydration mismatches

---

## EXISTING FILES TO MODIFY

1. `app/admin/analytics/page.tsx` - Main server component
2. `app/admin/analytics/revenue/page.tsx` - Revenue drill-down
3. `app/admin/analytics/components/RevenueChart.tsx` - Chart component
4. `app/admin/analytics/components/AnalyticsClient.tsx` - Client wrapper
5. Create: `lib/analytics/dateUtils.ts` - Shared date utilities

---

## KEY INSIGHT

The fundamental issue is that **analytics should be based on INVOICES not JOBS**:
- Jobs have `total_cost` (estimate)
- Invoices have `total` (actual money)
- Revenue = sum of paid invoice totals
- Job metrics = count/status of jobs
- Don't mix the two!

Seed data created jobs with costs, but analytics should focus on the invoice revenue. The jobs provide context (which tech, which service) but the money comes from invoices.

---

## SUPABASE QUICK REFERENCE

To verify data exists:
```sql
-- Check invoice totals
SELECT status, COUNT(*), SUM(total) 
FROM invoices 
WHERE business_id = 'YOUR_UUID' 
GROUP BY status;

-- Check job counts
SELECT status, COUNT(*), SUM(total_cost)
FROM jobs 
WHERE business_id = 'YOUR_UUID'
GROUP BY status;
```

Replace `YOUR_UUID` with the actual business_id from `scripts/get-business-id.sql`.
