# Codex Handoff: UI/UX Improvements

## Overview
Three main improvements needed across the admin dashboard:
1. Pipeline filtering (day/week view)
2. Button redesign (single-line, glassmorphic)
3. Schedule page density & scrubbing improvements

---

## Task 1: Pipeline Jobs Filter (Day/Week View)

**File**: `app/admin/jobs/page.tsx`

### Current Behavior
- Shows jobs from last 90 days (line 52-68)
- All jobs mixed together in pipeline columns

### Required Changes

#### Add View Toggle & Date Filter
Add a toggle to switch between:
- **Day view**: Show only today's jobs (scheduled for today)
- **Week view**: Show this week's jobs (Monday-Sunday)
- **All**: Current behavior (last 90 days)

#### Implementation

**Step 1: Add state and filter logic**
```typescript
'use client'  // Change from async server component to client component

import { useState, useMemo } from 'react'
import { startOfWeek, endOfWeek, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns'

// Add view state
const [view, setView] = useState<'day' | 'week' | 'all'>('day') // Default to today

// Filter jobs based on view
const filteredJobs = useMemo(() => {
  if (!jobs) return []
  
  if (view === 'all') return jobs
  
  const now = new Date()
  
  if (view === 'day') {
    const dayStart = startOfDay(now)
    const dayEnd = endOfDay(now)
    return jobs.filter(job => {
      const jobDate = parseISO(job.scheduled_start)
      return isWithinInterval(jobDate, { start: dayStart, end: dayEnd })
    })
  }
  
  if (view === 'week') {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    return jobs.filter(job => {
      const jobDate = parseISO(job.scheduled_start)
      return isWithinInterval(jobDate, { start: weekStart, end: weekEnd })
    })
  }
  
  return jobs
}, [jobs, view])

// Use filteredJobs instead of jobs for grouping
const jobsByStatus = {
  scheduled: filteredJobs.filter(j => j.status === 'scheduled'),
  on_the_way: filteredJobs.filter(j => j.status === 'on_the_way'),
  in_progress: filteredJobs.filter(j => j.status === 'in_progress'),
  completed: filteredJobs.filter(j => j.status === 'completed')
}
```

**Step 2: Add view toggle UI in header**
Replace the current header (around line 104-122) with:
```tsx
{/* Header with View Toggle */}
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
  <div>
    <h1 className="font-display text-5xl sm:text-6xl text-slate-900 dark:text-white tracking-wide">
      OPERATIONS
    </h1>
    <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1 tracking-widest">
      {view === 'day' && `TODAY: ${format(new Date(), 'MMM d, yyyy').toUpperCase()}`}
      {view === 'week' && `THIS WEEK: ${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d')} - ${format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d')}`.toUpperCase()}
      {view === 'all' && 'LAST 90 DAYS'}
    </p>
  </div>
  
  <div className="flex items-center gap-3">
    {/* View Toggle */}
    <div className="flex items-center bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 p-1">
      {(['day', 'week', 'all'] as const).map((v) => (
        <button
          key={v}
          onClick={() => setView(v)}
          className={`px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-wide transition-all ${
            view === v 
              ? 'bg-blue-600 dark:bg-cyan-500 text-white' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          {v}
        </button>
      ))}
    </div>
    
    <Link href="/admin/jobs/new">
      <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white font-mono text-xs px-5 py-2.5 rounded-full transition-all whitespace-nowrap">
        <Plus className="w-4 h-4 mr-2" />
        NEW JOB
      </Button>
    </Link>
  </div>
</div>
```

---

## Task 2: Button Redesign (Single-Line, Glassmorphic)

**Problem**: Buttons like "+ NEW JOB" have icon and text on separate lines (see screenshot)

**Files to modify**:
- `app/admin/jobs/page.tsx` - Header buttons
- `components/ui/Button.tsx` - Base button component
- Any other admin pages with similar buttons

### Button Requirements

1. **Single line**: Icon and text on same row
2. **Glassmorphic style** (optional, modern look):
   - Semi-transparent background
   - Subtle backdrop blur
   - Border with slight opacity
   - Hover: More opaque + slight lift

3. **Pill shape**: `rounded-full` instead of `rounded-lg`

### Implementation

**Option A: Update existing Button component** (add glass variant)

Add to `components/ui/Button.tsx`:
```typescript
variant: {
  // ... existing variants
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
}
```

**Key CSS fixes for single-line buttons**:
```typescript
// In buttonVariants base styles, ensure:
[
  'relative inline-flex items-center justify-center gap-2', // Already there
  'whitespace-nowrap', // ADD THIS - prevents text wrapping
  'flex-nowrap', // ADD THIS - prevents flex wrapping
]
```

**Update all buttons in `app/admin/jobs/page.tsx`**:
```tsx
// Current (problematic):
<Button className="...">
  <Plus className="w-4 h-4 mr-2" />
  NEW JOB
</Button>

// Fixed (single line):
<Button 
  variant="glassPrimary" 
  className="font-mono text-xs px-5 py-2.5 rounded-full whitespace-nowrap"
  icon={<Plus className="w-4 h-4" />}
>
  NEW JOB
</Button>
```

---

## Task 3: Schedule Page - Density & Scrubbing

**File**: `app/admin/schedule/page.tsx`

### Current Issues
1. **Too spacious**: Hour height is 80px (line 82), takes too much scrolling to see 6am-10pm
2. **Limited scrubbing**: Only Today, Prev, Next buttons (lines 704-714)

### Required Changes

#### A. Increase Density (Reduce Hour Height)

**Change line 82**:
```typescript
// From:
const HOUR_HEIGHT = 80

// To:
const HOUR_HEIGHT = 48  // Or 40 for even more compact
```

**Adjust job card heights proportionally** in DayView and WeekView components.

#### B. Add Advanced Scrubbing

Replace the simple prev/next with a dropdown/popover for quick jumps:

**Add new navigation component**:
```tsx
// Add import
import { ChevronDown, CalendarDays, Calendar, CalendarRange } from 'lucide-react'

// Add state
const [showScrubber, setShowScrubber] = useState(false)

// Replace goToPrevious/goToNext with advanced scrubbing
const scrubOptions = [
  { label: '1 Day', value: 'day', action: () => setCurrentDate(addDays(currentDate, view === 'day' ? 1 : view === 'week' ? 7 : 30)) },
  { label: '1 Week', value: 'week', action: () => setCurrentDate(addDays(currentDate, 7)) },
  { label: '1 Month', value: 'month', action: () => setCurrentDate(addMonths(currentDate, 1)) },
  { label: '1 Year', value: 'year', action: () => setCurrentDate(addMonths(currentDate, 12)) },
]

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
    case 'week': setCurrentDate(addDays(currentDate, 7)); break
    case 'month': setCurrentDate(addMonths(currentDate, 1)); break
    case 'year': setCurrentDate(addMonths(currentDate, 12)); break
  }
}
```

**Update the navigation UI** (around line 737-782):
```tsx
<div className="flex items-center gap-2">
  <button
    onClick={goToToday}
    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
  >
    Today
  </button>
  
  {/* Advanced Scrubber */}
  <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
    {/* Back Button with Dropdown */}
    <div className="relative group">
      <button 
        onClick={() => scrubBack('day')}
        className="p-1.5 hover:bg-slate-50 transition-colors border-r border-slate-100"
      >
        <ChevronLeft className="w-4 h-4 text-slate-500" />
      </button>
      {/* Quick scrub options on hover */}
      <div className="absolute top-full left-0 mt-1 hidden group-hover:block bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
        <button onClick={() => scrubBack('day')} className="block w-full text-left px-3 py-1 text-xs hover:bg-slate-50">- 1 Day</button>
        <button onClick={() => scrubBack('week')} className="block w-full text-left px-3 py-1 text-xs hover:bg-slate-50">- 1 Week</button>
        <button onClick={() => scrubBack('month')} className="block w-full text-left px-3 py-1 text-xs hover:bg-slate-50">- 1 Month</button>
        <button onClick={() => scrubBack('year')} className="block w-full text-left px-3 py-1 text-xs hover:bg-slate-50">- 1 Year</button>
      </div>
    </div>
    
    <span className="px-3 py-1.5 text-sm font-medium text-slate-700 min-w-[140px] text-center">
      {view === 'day' && format(currentDate, 'MMM d, yyyy')}
      {view === 'week' && `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} - ${format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 4), 'MMM d')}`}
      {view === 'month' && format(currentDate, 'MMMM yyyy')}
    </span>
    
    {/* Forward Button with Dropdown */}
    <div className="relative group">
      <button 
        onClick={() => scrubForward('day')}
        className="p-1.5 hover:bg-slate-50 transition-colors border-l border-slate-100"
      >
        <ChevronRight className="w-4 h-4 text-slate-500" />
      </button>
      <div className="absolute top-full right-0 mt-1 hidden group-hover:block bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
        <button onClick={() => scrubForward('day')} className="block w-full text-left px-3 py-1 text-xs hover:bg-slate-50">+ 1 Day</button>
        <button onClick={() => scrubForward('week')} className="block w-full text-left px-3 py-1 text-xs hover:bg-slate-50">+ 1 Week</button>
        <button onClick={() => scrubForward('month')} className="block w-full text-left px-3 py-1 text-xs hover:bg-slate-50">+ 1 Month</button>
        <button onClick={() => scrubForward('year')} className="block w-full text-left px-3 py-1 text-xs hover:bg-slate-50">+ 1 Year</button>
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

## Implementation Order

1. **Task 1**: Pipeline day/week filter (jobs page)
2. **Task 2**: Button component + apply to jobs page
3. **Task 3**: Schedule density + scrubbing

## Testing Checklist

- [ ] Jobs page shows day/week/all toggle
- [ ] Pipeline filters correctly for each view
- [ ] Buttons are single-line and look good
- [ ] Schedule page is more compact (6am-10pm visible without much scroll)
- [ ] Schedule scrubbing works (hover arrows for options)
- [ ] Build passes: `npm run build`
- [ ] No lint errors: `npm run lint`
