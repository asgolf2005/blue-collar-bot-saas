# Codex Handoff: Fix Jobs Page View Toggle

## What's Broken

The day/week/all toggle on `/admin/jobs` doesn't work:
1. Clicking buttons changes URL but stats don't update
2. Pipeline always shows same jobs regardless of view
3. Only "DAY" ever appears selected

## What Needs to Change

### 1. Fix Server Component to Read searchParams

**File**: `app/admin/jobs/page.tsx`

The page receives `searchParams` but doesn't properly use them. The issue is likely caching or the way we're reading the params.

**Current broken code**:
```tsx
export default async function JobsPage({
  searchParams,
}: {
  searchParams?: { view?: string | string[] }
}) {
  // ...
  const view = resolveView(searchParams?.view) // This might not be working
```

**Fix needed**:
- Ensure `searchParams` is properly awaited (Next.js 15+ change)
- Add proper dynamic export
- Debug why view doesn't change

### 2. Change to Only Day/Week (Remove "all")

**Change** the toggle from 3 options to 2:
- Remove "all" option
- Only "day" and "week"

**Update**:
- Type: `type JobsView = 'day' | 'week'`
- UI toggle: Remove "all" button
- Default: 'week' instead of 'day'

### 3. Show All Pipeline Jobs for Period

Currently filtering is too restrictive. For the pipeline columns:
- **DAY view**: Show today's jobs (already working)
- **WEEK view**: Show Monday-Sunday jobs (this week)

The pipeline should show ALL jobs in the period, not filter further.

**Current code** (around line 104-116):
```tsx
const filteredJobs = (jobs || []).filter((job: any) => {
  if (view === 'all') return true
  // ... filtering logic
})
```

This is filtering the already-filtered jobs. The database query already filters by date, so we shouldn't filter again for the pipeline display.

**Fix**: Use `jobs` directly for the pipeline (they're already filtered by date from the query), or fix the client-side filter.

### 4. Update Database Query Per View

**Current**: Always fetches last 90 days, then filters client-side

**Should be**: 
- DAY: Query only today's jobs
- WEEK: Query this week's jobs (Mon-Sun)

This is more efficient and correct.

## Implementation Steps

1. **Fix searchParams reading** - Make sure it's awaited properly
2. **Remove "all" option** - Only day/week toggle
3. **Fix database query** - Query correct date range per view
4. **Fix statistics** - Stats should reflect the view
5. **Pipeline shows all queried jobs** - Don't double-filter

## Code Changes Needed

### Step 1: Fix Component Signature (Next.js 15)

```tsx
// Change from:
export default async function JobsPage({
  searchParams,
}: {
  searchParams?: { view?: string | string[] }
}) {

// To:
export default async function JobsPage(props: {
  searchParams?: Promise<{ view?: string | string[] }>
}) {
  const searchParams = await props.searchParams
```

### Step 2: Update Type and Default

```tsx
type JobsView = 'day' | 'week' // Remove 'all'

function resolveView(viewParam?: string | string[]): JobsView {
  const view = Array.isArray(viewParam) ? viewParam[0] : viewParam
  if (view === 'day' || view === 'week') {
    return view
  }
  return 'week' // Default to week instead of day
}
```

### Step 3: Fix Database Query

```tsx
const now = new Date()
let queryStart: Date
let queryEnd: Date | null = null

if (view === 'day') {
  queryStart = startOfDay(now)
  queryEnd = endOfDay(now)
} else {
  // week
  queryStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday
  queryEnd = endOfWeek(now, { weekStartsOn: 1 }) // Sunday
}

const { data: jobs, error: jobsError } = await supabase
  .from('jobs')
  .select(`
    *,
    customer:customers(*),
    technician:users(*),
    services:job_services(service:services(*))
  `)
  .eq('business_id', profile.business_id)
  .gte('scheduled_start', queryStart.toISOString())
  .lte('scheduled_start', queryEnd.toISOString()) // Add end date
  .order('scheduled_start', { ascending: true })
```

### Step 4: Remove Double Filtering

```tsx
// Remove the filteredJobs filtering - use jobs directly
// Since database already filtered by date

// Group jobs by status
const jobsByStatus = {
  scheduled: jobs?.filter(j => j.status === 'scheduled') || [],
  on_the_way: jobs?.filter(j => j.status === 'on_the_way') || [],
  in_progress: jobs?.filter(j => j.status === 'in_progress') || [],
  completed: jobs?.filter(j => j.status === 'completed') || []
}
```

### Step 5: Update UI Toggle

```tsx
<div className="flex items-center bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 p-1">
  {(['day', 'week'] as const).map((nextView) => ( // Remove 'all'
    <Link
      key={nextView}
      href={`/admin/jobs?view=${nextView}`}
      className={`px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-wide transition-all ${
        view === nextView
          ? 'bg-blue-600 dark:bg-cyan-500 text-white'
          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
      }`}
    >
      {nextView}
    </Link>
  ))}
</div>
```

### Step 6: Update Date Label

```tsx
const dateLabel = view === 'day'
  ? `TODAY: ${format(now, 'MMM d, yyyy').toUpperCase()}`
  : `THIS WEEK: ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`.toUpperCase()
```

## Testing

After fix:
1. `/admin/jobs` (no param) → Shows WEEK view by default
2. `/admin/jobs?view=day` → Shows only today's jobs
3. `/admin/jobs?view=week` → Shows Mon-Sun jobs
4. Statistics update correctly for each view
5. Pipeline shows all jobs for the selected period
6. Only "DAY" and "WEEK" buttons (no "ALL")

## Files to Modify

- `app/admin/jobs/page.tsx` - Main fixes
