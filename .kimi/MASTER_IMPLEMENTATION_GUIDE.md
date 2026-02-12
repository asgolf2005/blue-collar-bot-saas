# MASTER IMPLEMENTATION GUIDE
## For Codex - Complete All Tasks

---

## TASK 1: Fix Jobs Page View Toggle (URGENT)
**File**: `app/admin/jobs/page.tsx`

### Problem
- Clicking DAY/WEEK/ALL buttons doesn't update stats or pipeline
- Only "DAY" ever appears selected
- URL changes but content stays the same

### Root Cause
1. `searchParams` not properly awaited (Next.js 15 change)
2. Component caching issue
3. Double-filtering jobs

### Implementation

#### Step 1: Fix Component Signature
```tsx
// Change line 42-46 FROM:
export default async function JobsPage({
  searchParams,
}: {
  searchParams?: { view?: string | string[] }
}) {

// TO:
export default async function JobsPage(props: {
  searchParams?: Promise<{ view?: string | string[] }>
}) {
  const searchParams = await props.searchParams
```

#### Step 2: Add Dynamic Export (at top of file)
```tsx
// Add at line 1, BEFORE imports:
export const dynamic = 'force-dynamic'

// Then existing imports...
import { createClient } from '@/lib/supabase/server'
```

#### Step 3: Update Types (Remove 'all')
```tsx
// Line 32, change FROM:
type JobsView = 'day' | 'week' | 'all'

// TO:
type JobsView = 'day' | 'week'

// Line 34-40, change resolveView function:
function resolveView(viewParam?: string | string[]): JobsView {
  const view = Array.isArray(viewParam) ? viewParam[0] : viewParam
  if (view === 'day' || view === 'week') {
    return view
  }
  return 'week' // Default to week
}
```

#### Step 4: Fix Database Query
Replace lines 67-92 with:
```tsx
// Resolve view from URL or default to 'week'
const view = resolveView(searchParams?.view)

// Calculate date range based on view
const now = new Date()
let queryStart: Date
let queryEnd: Date

if (view === 'day') {
  queryStart = startOfDay(now)
  queryEnd = endOfDay(now)
} else {
  // week
  queryStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday
  queryEnd = endOfWeek(now, { weekStartsOn: 1 }) // Sunday
}

// Fetch jobs for the selected period
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
  .lte('scheduled_start', queryEnd.toISOString())
  .order('scheduled_start', { ascending: true })
  .limit(500)

if (jobsError) {
  console.error('Jobs query error:', jobsError)
}
```

#### Step 5: Remove Double Filtering
Replace lines 118-124 with:
```tsx
// Group ALL fetched jobs by status (no additional filtering)
const jobsByStatus = {
  scheduled: jobs?.filter(j => j.status === 'scheduled') || [],
  on_the_way: jobs?.filter(j => j.status === 'on_the_way') || [],
  in_progress: jobs?.filter(j => j.status === 'in_progress') || [],
  completed: jobs?.filter(j => j.status === 'completed') || []
}
```

#### Step 6: Update Date Label
Replace lines 138-141 with:
```tsx
const dateLabel = view === 'day'
  ? `TODAY: ${format(now, 'MMM d, yyyy').toUpperCase()}`
  : `THIS WEEK: ${format(queryStart, 'MMM d')} - ${format(queryEnd, 'MMM d')}`.toUpperCase()
```

#### Step 7: Update UI Toggle (Remove 'all')
Replace lines 147-161 with:
```tsx
<div className="flex items-center bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 p-1">
  {(['day', 'week'] as const).map((nextView) => (
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

---

## TASK 2: Fix Button Component (Single Line + Glassmorphic)
**File**: `components/ui/Button.tsx`

### Problem
- Buttons wrap text to multiple lines
- Need glassmorphic variant

### Implementation

#### Step 1: Add No-Wrap Classes
Line 24, add to base styles:
```tsx
// Find this array (around line 20-28):
[
  'relative inline-flex items-center justify-center gap-2',
  'font-medium transition-all duration-200 ease-out',
  'focus:outline-none focus:ring-2 focus:ring-offset-2',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
  'active:scale-[0.98]',
]

// ADD:
[
  'relative inline-flex items-center justify-center gap-2',
  'font-medium transition-all duration-200 ease-out',
  'focus:outline-none focus:ring-2 focus:ring-offset-2',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
  'active:scale-[0.98]',
  'whitespace-nowrap',        // ADD THIS
  'flex-nowrap',              // ADD THIS
]
```

#### Step 2: Add Glass Variants
After line 68 (after ghost variant), add:
```tsx
glass: [
  'bg-white/80 dark:bg-slate-800/80',
  'backdrop-blur-sm',
  'border border-white/20 dark:border-slate-700/50',
  'text-slate-700 dark:text-slate-200',
  'shadow-sm',
  'hover:bg-white dark:hover:bg-slate-800',
  'hover:-translate-y-0.5',
  'hover:shadow-md',
  'focus:ring-slate-400/50',
],
glassPrimary: [
  'bg-blue-600/90 dark:bg-cyan-500/90',
  'backdrop-blur-sm',
  'border border-blue-400/30 dark:border-cyan-400/30',
  'text-white',
  'shadow-sm shadow-blue-500/20',
  'hover:bg-blue-600 dark:hover:bg-cyan-500',
  'hover:-translate-y-0.5',
  'hover:shadow-md',
  'focus:ring-blue-500/50',
],
```

---

## TASK 3: Schedule Page Improvements
**File**: `app/admin/schedule/page.tsx`

### Problem
- Too spacious, too much scrolling
- Need advanced scrubbing (1 day/week/month/year)

### Implementation

#### Step 1: Reduce Hour Height (More Density)
Line 82, change:
```tsx
// FROM:
const HOUR_HEIGHT = 80

// TO:
const HOUR_HEIGHT = 48
```

#### Step 2: Add Scrubbing Functions
After line 714, add:
```tsx
// Advanced scrubbing functions
const scrubBack = (type: 'day' | 'week' | 'month' | 'year') => {
  switch (type) {
    case 'day': setCurrentDate(addDays(currentDate, -1)); break
    case 'week': setCurrentDate(addDays(currentDate, -7)); break
    case 'month': setCurrentDate(subMonths(currentDate, 1)); break
    case 'year': setCurrentDate(subMonths(currentDate, 12)); break
  }
}

const scrubForward = (type: 'day' | 'week' | 'month' | 'year') => {
  switch (type) {
    case 'day': setCurrentDate(addDays(currentDate, 1)); break
    case 'case 'week': setCurrentDate(addDays(currentDate, 7)); break
    case 'month': setCurrentDate(addMonths(currentDate, 1)); break
    case 'year': setCurrentDate(addMonths(currentDate, 12)); break
  }
}
```

#### Step 3: Update Navigation UI
Replace the navigation section (around lines 737-782) with:
```tsx
<div className="flex items-center gap-2">
  <button
    onClick={goToToday}
    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
  >
    Today
  </button>
  
  {/* Advanced Scrubber with Dropdowns */}
  <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
    {/* Back Button with Hover Menu */}
    <div className="relative group">
      <button 
        onClick={() => scrubBack(view === 'day' ? 'day' : 'week')}
        className="p-1.5 hover:bg-slate-50 transition-colors border-r border-slate-100"
      >
        <ChevronLeft className="w-4 h-4 text-slate-500" />
      </button>
      <div className="absolute top-full left-0 mt-1 hidden group-hover:block bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 min-w-[100px]">
        <button onClick={() => scrubBack('day')} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">- 1 Day</button>
        <button onClick={() => scrubBack('week')} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">- 1 Week</button>
        <button onClick={() => scrubBack('month')} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">- 1 Month</button>
        <button onClick={() => scrubBack('year')} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">- 1 Year</button>
      </div>
    </div>
    
    <span className="px-3 py-1.5 text-sm font-medium text-slate-700 min-w-[140px] text-center">
      {view === 'day' && format(currentDate, 'MMM d, yyyy')}
      {view === 'week' && `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} - ${format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 4), 'MMM d')}`}
      {view === 'month' && format(currentDate, 'MMMM yyyy')}
    </span>
    
    {/* Forward Button with Hover Menu */}
    <div className="relative group">
      <button 
        onClick={() => scrubForward(view === 'day' ? 'day' : 'week')}
        className="p-1.5 hover:bg-slate-50 transition-colors border-l border-slate-100"
      >
        <ChevronRight className="w-4 h-4 text-slate-500" />
      </button>
      <div className="absolute top-full right-0 mt-1 hidden group-hover:block bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 min-w-[100px]">
        <button onClick={() => scrubForward('day')} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">+ 1 Day</button>
        <button onClick={() => scrubForward('week')} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">+ 1 Week</button>
        <button onClick={() => scrubForward('month')} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">+ 1 Month</button>
        <button onClick={() => scrubForward('year')} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">+ 1 Year</button>
      </div>
    </div>
  </div>
  
  {/* View Toggle */}
  <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
    {(['day', 'week', 'month'] as const).map((v) => (
      <button
        key={v}
        onClick={() => setView(v)}
        className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
          view === v 
            ? 'bg-slate-800 text-white' 
            : 'text-slate-600 hover:bg-slate-50'
        }`}
      >
        {v}
      </button>
    ))}
  </div>
  
  <Link
    href="/admin/jobs/new"
    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
  >
    <Plus className="w-3.5 h-3.5" />
    New
  </Link>
</div>
```

---

## TASK 4: Update Jobs Page Button
**File**: `app/admin/jobs/page.tsx`

### Update NEW JOB Button
Line 163-171, change:
```tsx
// FROM:
<Link href="/admin/jobs/new">
  <Button
    variant="glassPrimary"
    className="font-mono text-xs px-5 py-2.5 rounded-full"
    icon={<Plus className="w-4 h-4" />}
  >
    NEW JOB
  </Button>
</Link>

// TO (ensure single line):
<Link href="/admin/jobs/new">
  <Button
    variant="glassPrimary"
    size="sm"
    className="font-mono text-xs px-5 py-2.5 rounded-full whitespace-nowrap flex-nowrap"
    icon={<Plus className="w-4 h-4 flex-shrink-0" />}
  >
    <span className="whitespace-nowrap">NEW JOB</span>
  </Button>
</Link>
```

---

## VERIFICATION CHECKLIST

After implementing all tasks, verify:

### Jobs Page
- [ ] `/admin/jobs` shows WEEK view by default
- [ ] `/admin/jobs?view=day` shows only today's jobs
- [ ] `/admin/jobs?view=week` shows Mon-Sun jobs
- [ ] Stats update correctly (scheduled/en route/in progress/completed)
- [ ] Pipeline shows all jobs for selected period
- [ ] Only DAY and WEEK buttons (no ALL)
- [ ] NEW JOB button is single line, glassmorphic

### Schedule Page
- [ ] Hour height is compact (48px instead of 80px)
- [ ] Can see 6am-10pm with less scrolling
- [ ] Hovering arrow buttons shows 1 day/week/month/year options
- [ ] Scrubbing works in all directions

### Build
- [ ] `npm run build` passes
- [ ] `npm run lint` passes (or only existing errors)

---

## ORDER OF IMPLEMENTATION

1. **Fix Button Component** (`components/ui/Button.tsx`) - Add glass variants + nowrap
2. **Fix Jobs Page** (`app/admin/jobs/page.tsx`) - Fix view toggle, remove 'all', fix query
3. **Fix Schedule Page** (`app/admin/schedule/page.tsx`) - Reduce density, add scrubbing
4. **Run Build** - Verify everything works

---

## COMMON ISSUES & FIXES

### Issue: "searchParams is not iterable"
**Fix**: Make sure you're awaiting it: `const searchParams = await props.searchParams`

### Issue: "Cannot read property 'view' of undefined"
**Fix**: Use optional chaining: `searchParams?.view`

### Issue: "Build fails with type error"
**Fix**: Check that all imports are correct, especially date-fns functions

### Issue: "Buttons still wrapping"
**Fix**: Add both `whitespace-nowrap` AND `flex-nowrap` classes

---

Implement all tasks in order. Run build after each major change to catch errors early.
