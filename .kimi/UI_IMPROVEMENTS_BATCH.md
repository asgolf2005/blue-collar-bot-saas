# UI IMPROVEMENTS BATCH
## Tasks for Codex

---

## TASK 1: Make Pipeline Jobs Clickable
**File**: `app/admin/jobs/page.tsx`

### Requirement
Jobs in the pipeline columns should be clickable and navigate to job details.

### Implementation

Find the `PipelineColumn` component (around line 274) and the job card mapping (around line 329):

```tsx
// CURRENT (not clickable):
jobs.slice(0, 8).map((job) => (
  <div 
    key={job.id}
    className={`p-3 rounded-xl border ${c.border} ${c.bg} hover:shadow-sm transition-all cursor-pointer group`}
  >
    {/* job content */}
  </div>
))

// CHANGE TO (clickable Link):
import Link from 'next/link'

jobs.slice(0, 8).map((job) => (
  <Link
    key={job.id}
    href={`/admin/jobs/${job.id}`}
    className={`block p-3 rounded-xl border ${c.border} ${c.bg} hover:shadow-sm transition-all cursor-pointer group hover:scale-[1.02]`}
  >
    {/* job content - same as before */}
  </Link>
))
```

**Make sure `Link` is imported at the top of the file.**

---

## TASK 2: Make Metric Cards Clickable
**File**: `app/admin/jobs/page.tsx`

### Requirement
The metric cards (Scheduled, En Route, In Progress, Completed) should be clickable and filter/show jobs in that status.

### Implementation Options

**Option A: Expandable Section (Recommended)**
Clicking a metric card expands/collapses a section below showing jobs in that status.

**Option B: Filter + Scroll**
Clicking scrolls to the pipeline and filters to show only that status.

**Option C: Modal**
Clicking opens a modal with jobs in that status.

### Implementation (Option A - Expandable)

Add state for expanded status:
```tsx
'use client' // Add this at top if not already

import { useState } from 'react'

// Add state
const [expandedStatus, setExpandedStatus] = useState<string | null>(null)

// Update MetricCard to be clickable
function MetricCard({ 
  label, 
  value, 
  icon: Icon,
  color,
  onClick,
  isExpanded
}: { 
  label: string
  value: number
  icon: React.ElementType
  color: string
  onClick?: () => void
  isExpanded?: boolean
}) {
  const colors: Record<string, { light: string; dark: string }> = {
    cyan: { light: 'text-cyan-600', dark: 'dark:text-cyan-400' },
    amber: { light: 'text-amber-600', dark: 'dark:text-amber-400' },
    blue: { light: 'text-blue-600', dark: 'dark:text-blue-400' },
    emerald: { light: 'text-emerald-600', dark: 'dark:text-emerald-400' },
  }
  const c = colors[color]

  return (
    <button 
      onClick={onClick}
      className={`w-full text-left bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md transition-all ${
        isExpanded ? 'ring-2 ring-blue-500 dark:ring-cyan-500' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Icon className={`w-5 h-5 ${c.light} ${c.dark}`} />
        </div>
        <div>
          <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 tracking-wider">{label}</div>
          <div className={`font-display text-3xl ${c.light} ${c.dark}`}>{value}</div>
        </div>
      </div>
    </button>
  )
}
```

Update the metrics grid (around line 175):
```tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
  <MetricCard
    label="SCHEDULED"
    value={jobsByStatus.scheduled.length}
    icon={Calendar}
    color="cyan"
    onClick={() => setExpandedStatus(expandedStatus === 'scheduled' ? null : 'scheduled')}
    isExpanded={expandedStatus === 'scheduled'}
  />
  <MetricCard
    label="EN ROUTE"
    value={jobsByStatus.on_the_way.length}
    icon={MapPin}
    color="amber"
    onClick={() => setExpandedStatus(expandedStatus === 'on_the_way' ? null : 'on_the_way')}
    isExpanded={expandedStatus === 'on_the_way'}
  />
  <MetricCard
    label="IN PROGRESS"
    value={jobsByStatus.in_progress.length}
    icon={PlayCircle}
    color="blue"
    onClick={() => setExpandedStatus(expandedStatus === 'in_progress' ? null : 'in_progress')}
    isExpanded={expandedStatus === 'in_progress'}
  />
  <MetricCard
    label="COMPLETED"
    value={jobsByStatus.completed.length}
    icon={CheckCircle2}
    color="emerald"
    onClick={() => setExpandedStatus(expandedStatus === 'completed' ? null : 'completed')}
    isExpanded={expandedStatus === 'completed'}
  />
</div>

{/* Expanded Jobs List */}
{expandedStatus && (
  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 animate-in slide-in-from-top-2">
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-display text-lg text-slate-900 dark:text-white">
        {expandedStatus.replace('_', ' ').toUpperCase()} JOBS
      </h3>
      <button 
        onClick={() => setExpandedStatus(null)}
        className="text-xs text-slate-500 hover:text-slate-700"
      >
        Close
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {jobsByStatus[expandedStatus as keyof typeof jobsByStatus]?.map((job: any) => (
        <Link
          key={job.id}
          href={`/admin/jobs/${job.id}`}
          className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-cyan-500 transition-colors"
        >
          <div className="font-mono text-sm text-slate-900 dark:text-white">
            {new Date(job.scheduled_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {job.customer?.name || 'Unknown'}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {job.technician?.full_name || 'Unassigned'}
          </div>
        </Link>
      ))}
      {jobsByStatus[expandedStatus as keyof typeof jobsByStatus]?.length === 0 && (
        <p className="text-sm text-slate-500 col-span-full">No jobs in this status</p>
      )}
    </div>
  </div>
)}
```

---

## TASK 3: Fix Customer View Error
**File**: `app/admin/customers/[id]/page.tsx`

### Error
`NEXT_HTTP_ERROR_FALLBACK;404` when clicking customer view button at `/admin/customers/1`

### Root Cause Analysis
The page exists but calls `notFound()` on line 51 when there's an error or no customer data. The complex Supabase query with relationships might be failing.

The problematic query (lines 29-48):
```tsx
const { data: customer, error } = await supabase
  .from('customers')
  .select(`
    *,
    jobs:jobs(
      id,
      status,
      scheduled_start,
      scheduled_end,
      description,
      total_cost,
      labor_hours,
      labor_rate,
      parts_cost,
      technician:users!jobs_technician_id_fkey(id, full_name)
    )
  `)
  .eq('id', id)
  .eq('business_id', profile.business_id)
  .single()
```

### Fix

**Option A: Simplify the query** (fetch jobs separately):
```tsx
// Fetch customer only
const { data: customer, error: customerError } = await supabase
  .from('customers')
  .select('*')
  .eq('id', id)
  .eq('business_id', profile.business_id)
  .single()

if (customerError || !customer) {
  notFound()
}

// Fetch jobs separately with simpler query
const { data: jobs, error: jobsError } = await supabase
  .from('jobs')
  .select(`
    id,
    status,
    scheduled_start,
    scheduled_end,
    description,
    total_cost,
    labor_hours,
    labor_rate,
    parts_cost,
    technician:users(id, full_name)
  `)
  .eq('customer_id', id)
  .eq('business_id', profile.business_id)

// Combine data
const customerWithJobs = {
  ...customer,
  jobs: jobs || []
}
```

**Option B: Fix the relationship syntax**:
The `users!jobs_technician_id_fkey` syntax might be wrong. Try:
```tsx
// Instead of:
technician:users!jobs_technician_id_fkey(id, full_name)

// Try:
technician_id,
technician:users(id, full_name)
```

Or remove the technician join entirely and fetch it separately.

### Also Check
Add error logging to see the actual error:
```tsx
if (error) {
  console.error('Customer fetch error:', error)
}
if (!customer) {
  console.error('Customer not found for id:', id)
}
```

### Quick Check
Look at `app/admin/customers/page.tsx` and find the "View" button to confirm URL:
```tsx
// Should be:
<Link href={`/admin/customers/${customer.id}`}>
  View
</Link>
```

---

## TASK 4: Fix Button Line Wrapping
**File**: `app/admin/services/page.tsx` and others

### Requirement
Buttons like "+ New Service" should be on one line. Elongate the button to prevent wrapping.

### Implementation

Look for buttons in services page and ensure:
1. `whitespace-nowrap` class
2. `flex-nowrap` class  
3. Sufficient width/min-width
4. Icon and text stay on same line

Example fix:
```tsx
// CURRENT (might wrap):
<Link
  href="/admin/services/new"
  className="..."
>
  <Plus className="w-4 h-4" />
  New Service
</Link>

// FIXED (single line):
<Link
  href="/admin/services/new"
  className="inline-flex items-center gap-2 whitespace-nowrap flex-nowrap px-5 py-2.5 ..."
>
  <Plus className="w-4 h-4 flex-shrink-0" />
  <span className="whitespace-nowrap">New Service</span>
</Link>
```

Or use the Button component:
```tsx
<Link href="/admin/services/new">
  <Button 
    variant="primary"
    size="sm"
    className="whitespace-nowrap flex-nowrap"
    icon={<Plus className="w-4 h-4" />}
  >
    New Service
  </Button>
</Link>
```

Check these files for similar button issues:
- `app/admin/services/page.tsx`
- `app/admin/customers/page.tsx`
- `app/admin/invoices/page.tsx`
- Any other admin list pages

---

## TASK 5: Fix Loading Skeleton
**File**: Multiple loading.tsx files

### User Request
"I don't like the loading skeleton" - Too complex/busy

### Fix (Simple Spinner)

Replace ALL loading.tsx files with simple spinner:

**Replace** `app/admin/jobs/loading.tsx`:
```tsx
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-3 border-slate-200 dark:border-slate-700 border-t-blue-600 dark:border-t-cyan-500 rounded-full animate-spin" />
    </div>
  )
}
```

**Replace** `app/admin/customers/loading.tsx`:
```tsx
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-3 border-slate-200 dark:border-slate-700 border-t-blue-600 dark:border-t-cyan-500 rounded-full animate-spin" />
    </div>
  )
}
```

**Replace** `app/admin/services/loading.tsx`:
```tsx
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-3 border-slate-200 dark:border-slate-700 border-t-blue-600 dark:border-t-cyan-500 rounded-full animate-spin" />
    </div>
  )
}
```

**Replace** `app/admin/invoices/loading.tsx`:
```tsx
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-3 border-slate-200 dark:border-slate-700 border-t-blue-600 dark:border-t-cyan-500 rounded-full animate-spin" />
    </div>
  )
}
```

**Also replace** these if they have skeletons:
- `app/admin/schedule/loading.tsx`
- `app/admin/calendar/loading.tsx`
- `app/admin/analytics/loading.tsx`
- `app/admin/settings/loading.tsx`
- `app/admin/jobs/new/loading.tsx`

And any tech/customer portal loading files that use skeletons:
- `app/tech/today/loading.tsx`
- `app/tech/dashboard/loading.tsx`
- `app/tech/schedule/loading.tsx`
- `app/tech/stats/loading.tsx`
- `app/tech/jobs/[id]/loading.tsx`
- `app/customer/loading.tsx`
- `app/customer/appointments/loading.tsx`
- `app/customer/invoices/loading.tsx`
- `app/customer/profile/loading.tsx`

### Alternative (Even Simpler)
If even the spinner is too much, use blank:
```tsx
export default function Loading() {
  return <div className="min-h-[400px]" />
}
```

Or with text:
```tsx
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[400px] text-slate-400">
      Loading...
    </div>
  )
}
```

---

## IMPLEMENTATION ORDER

1. **Task 4** (Button wrapping) - Quick CSS fix
2. **Task 1** (Pipeline clickable) - Add Link wrapper
3. **Task 2** (Metric cards clickable) - Add state + expandable section
4. **Task 3** (Customer view error) - Debug and fix
5. **Task 5** (Loading) - Replace skeletons

---

## FILES TO MODIFY

| File | Task |
|------|------|
| `app/admin/jobs/page.tsx` | 1, 2 (pipeline + metrics) |
| `app/admin/services/page.tsx` | 4 (button wrapping) |
| `app/admin/customers/page.tsx` | 4 (button wrapping) |
| `app/admin/invoices/page.tsx` | 4 (button wrapping) |
| `app/admin/customers/[id]/page.tsx` | 3 (fix or create) |
| `app/admin/loading.tsx` or `app/admin/jobs/loading.tsx` | 5 (loading) |

---

## VERIFICATION

- [ ] Pipeline job cards are clickable → go to job detail
- [ ] Metric cards are clickable → expand to show jobs
- [ ] Clicking "View" on customer → shows customer (no 404 error)
- [ ] "+ New Service" button is on one line
- [ ] Loading shows spinner instead of skeleton (or user's preference)
- [ ] Build passes: `npm run build`
