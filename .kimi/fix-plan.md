# Fix Plan: Supabase Realtime Sync

## Phase 1: Critical Fixes (Do These First)

### Fix 1: Add Realtime to Admin Jobs Page
**File**: `app/admin/jobs/page.tsx`
**Problem**: Page fetches static data but never subscribes to updates

**Changes**:
1. Import JobsRealtimeWrapper
2. Wrap content in JobsRealtimeWrapper
3. Pass businessId and initialJobs to wrapper

### Fix 2: Create Optimized useRealtimeJobs Hook
**File**: `hooks/useRealtimeJobsOptimized.ts` (NEW)
**Problem**: Current hooks have race conditions and over-fetch

**Features needed**:
- Intelligent state merging (not full refetch)
- Connection status tracking
- Automatic reconnection
- Proper cleanup

### Fix 3: Fix useRealtimeJobsWithRelations
**File**: `hooks/useRealtimeJobsWithRelations.ts`
**Problem**: Full refetch on every change is expensive

**Changes**:
- Merge updates intelligently
- Only refetch relations when needed
- Add loading state for updates

### Fix 4: Add Real Connection Status
**File**: `app/admin/jobs/page.tsx`
**Problem**: "LIVE" badge is just CSS animation

**Changes**:
- Use connection status from hook
- Show actual connection state
- Add reconnect button if disconnected

---

## Phase 2: Implementation Details

### Fix 1 Code: Admin Jobs Page

```tsx
// app/admin/jobs/page.tsx
import { JobsRealtimeWrapper } from '@/components/admin/JobsRealtimeWrapper'

// ... existing code ...

export default async function JobsPage() {
  // ... existing auth checks ...
  
  // ... existing data fetching ...

  return (
    <JobsRealtimeWrapper 
      businessId={profile.business_id} 
      initialJobs={jobs || []}
    >
      <JobsPageContent 
        initialJobs={jobs || []}
        recentJobs={recentJobs || []}
        businessId={profile.business_id}
      />
    </JobsRealtimeWrapper>
  )
}

// Extract content to client component
'use client'
function JobsPageContent({ 
  initialJobs, 
  recentJobs,
  businessId 
}: { 
  initialJobs: Job[]
  recentJobs: any[]
  businessId: string
}) {
  const { jobs, isConnected, connectionStatus, refetch } = useRealtimeJobsContext()
  
  // Use realtime jobs or fallback to initial
  const displayJobs = jobs.length > 0 ? jobs : initialJobs
  
  // Group by status
  const jobsByStatus = {
    scheduled: displayJobs.filter(j => j.status === 'scheduled'),
    on_the_way: displayJobs.filter(j => j.status === 'on_the_way'),
    in_progress: displayJobs.filter(j => j.status === 'in_progress'),
    completed: displayJobs.filter(j => j.status === 'completed')
  }

  return (
    <div className="space-y-6">
      {/* Header with REAL connection status */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full animate-pulse ${
          isConnected ? 'bg-emerald-500' : 'bg-red-500'
        }`} />
        <span className={`font-mono text-[10px] ${
          isConnected ? 'text-emerald-600' : 'text-red-600'
        }`}>
          {isConnected ? 'LIVE' : 'DISCONNECTED'}
        </span>
        {!isConnected && (
          <button onClick={refetch} className="text-xs underline">
            Retry
          </button>
        )}
      </div>
      
      {/* Rest of your JSX */}
    </div>
  )
}
```

### Fix 2 Code: New Optimized Hook

```tsx
// hooks/useRealtimeJobsOptimized.ts
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Job, JobStatus } from '@/lib/types'

interface UseRealtimeJobsOptimizedOptions {
  businessId: string
  technicianId?: string
  initialJobs?: Job[]
}

interface UseRealtimeJobsOptimizedReturn {
  jobs: Job[]
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  error: string | null
  refetch: () => Promise<void>
}

export function useRealtimeJobsOptimized({
  businessId,
  technicianId,
  initialJobs = [],
}: UseRealtimeJobsOptimizedOptions): UseRealtimeJobsOptimizedReturn {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const isSubscribed = useRef(false)

  // Intelligent merge: Update only changed job, preserve others
  const mergeJobUpdate = useCallback((updatedJob: Job) => {
    setJobs(current => {
      const index = current.findIndex(j => j.id === updatedJob.id)
      if (index === -1) {
        // New job - add to list
        return [...current, updatedJob]
      }
      // Update existing - preserve relation data if not in update
      const existing = current[index]
      const merged = {
        ...existing,
        ...updatedJob,
        // Preserve relation data if server didn't send it
        customer: updatedJob.customer || existing.customer,
        technician: updatedJob.technician || existing.technician,
      }
      const newJobs = [...current]
      newJobs[index] = merged
      return newJobs
    })
  }, [])

  const removeJob = useCallback((jobId: string) => {
    setJobs(current => current.filter(j => j.id !== jobId))
  }, [])

  // Refetch only when explicitly requested
  const refetch = useCallback(async () => {
    try {
      setConnectionStatus('connecting')
      let query = supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(*),
          technician:users(*)
        `)
        .eq('business_id', businessId)
        .order('scheduled_start', { ascending: true })
      
      if (technicianId) {
        query = query.eq('technician_id', technicianId)
      }

      const { data, error: fetchError } = await query
      
      if (fetchError) throw fetchError
      
      setJobs(data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    }
  }, [businessId, technicianId, supabase])

  useEffect(() => {
    if (!businessId || isSubscribed.current) return

    setConnectionStatus('connecting')
    isSubscribed.current = true

    let filter = `business_id=eq.${businessId}`
    
    const channel = supabase
      .channel(`jobs-optimized:${businessId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'jobs',
        filter,
      }, (payload) => {
        // For inserts, fetch full data with relations
        refetch()
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'jobs',
        filter,
      }, (payload) => {
        // For updates, merge intelligently
        mergeJobUpdate(payload.new as Job)
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'jobs',
        filter,
      }, (payload) => {
        removeJob((payload.old as Job).id)
      })
      .subscribe((status) => {
        switch (status) {
          case 'SUBSCRIBED':
            setConnectionStatus('connected')
            setError(null)
            break
          case 'CLOSED':
            setConnectionStatus('disconnected')
            isSubscribed.current = false
            break
          case 'CHANNEL_ERROR':
          case 'TIMED_OUT':
            setConnectionStatus('error')
            setError('Connection failed')
            isSubscribed.current = false
            break
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
        isSubscribed.current = false
      }
    }
  }, [businessId, supabase, mergeJobUpdate, removeJob, refetch])

  return {
    jobs,
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    error,
    refetch,
  }
}
```

### Fix 3 Code: Update Provider

```tsx
// components/admin/JobsRealtimeProvider.tsx
// Update to use new optimized hook

import { useRealtimeJobsOptimized } from '@/hooks/useRealtimeJobsOptimized'

// In JobsRealtimeProvider component, replace:
// const { jobs, isConnected, error, connectionStatus, lastEvent, refetch } = useJobsRealtime({

// With:
const { jobs, isConnected, error, connectionStatus, refetch } = useRealtimeJobsOptimized({
  businessId,
  initialJobs,
})
```

---

## Phase 3: Testing Checklist

- [ ] Open admin/jobs page
- [ ] Change job status in Supabase dashboard
- [ ] Verify UI updates within 2 seconds
- [ ] Check connection status indicator is accurate
- [ ] Disconnect network, verify "DISCONNECTED" shows
- [ ] Reconnect, verify "LIVE" returns
- [ ] Create new job via n8n/API, verify it appears
- [ ] Delete job, verify it disappears

---

## Files to Modify

| File | Action | Lines |
|------|--------|-------|
| `app/admin/jobs/page.tsx` | Add realtime wrapper | +15-20 |
| `hooks/useRealtimeJobsOptimized.ts` | Create new | +165 |
| `components/admin/JobsRealtimeProvider.tsx` | Use new hook | ~2 |

## Rollback Plan

If issues occur:
1. Revert `JobsRealtimeProvider` to original hook
2. Remove `JobsRealtimeWrapper` from jobs page
3. Original functionality remains intact
