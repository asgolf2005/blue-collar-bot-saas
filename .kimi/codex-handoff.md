# Codex Handoff: Supabase Realtime Sync Fix

> **Instructions for Codex**: Implement the fixes below in order. Each section has the file path and exact code changes.

---

## Overview

The admin jobs page shows static data instead of realtime updates. The "LIVE" indicator is fake (just CSS animation). We need to:
1. Add realtime subscription to admin/jobs page
2. Create optimized hook that merges updates (not full refetch)
3. Show real connection status

---

## Fix 1: Create Optimized Realtime Hook

**Create new file**: `hooks/useRealtimeJobsOptimized.ts`

```typescript
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Job } from '@/lib/types'

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

  const mergeJobUpdate = useCallback((updatedJob: Job) => {
    setJobs(current => {
      const index = current.findIndex(j => j.id === updatedJob.id)
      if (index === -1) {
        return [...current, updatedJob]
      }
      const existing = current[index]
      const merged = {
        ...existing,
        ...updatedJob,
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

  const refetch = useCallback(async () => {
    try {
      setConnectionStatus('connecting')
      let query = supabase
        .from('jobs')
        .select(`*, customer:customers(*), technician:users(*)`)
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

    const filter = `business_id=eq.${businessId}`
    
    const channel = supabase
      .channel(`jobs-optimized:${businessId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'jobs',
        filter,
      }, () => {
        refetch()
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'jobs',
        filter,
      }, (payload) => {
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

---

## Fix 2: Update JobsRealtimeProvider

**Modify**: `components/admin/JobsRealtimeProvider.tsx`

**Change the import** (line ~4):
```typescript
// Replace:
import { useJobsRealtime } from '@/hooks/useJobsRealtime'

// With:
import { useRealtimeJobsOptimized } from '@/hooks/useRealtimeJobsOptimized'
```

**Change the hook call** (around line 70):
```typescript
// Replace:
const { jobs, isConnected, error, connectionStatus, lastEvent, refetch } = useJobsRealtime({
  businessId,
  initialJobs,
  onStatusChange: handleStatusChange,
  onJobChange: handleJobChange,
})

// With:
const { jobs, isConnected, error, connectionStatus, refetch } = useRealtimeJobsOptimized({
  businessId,
  initialJobs,
})
```

**Update the context value** (remove lastEvent):
```typescript
const value: JobsRealtimeContextType = {
  jobs,
  isConnected,
  connectionStatus,
  error,
  lastEvent: null, // Remove this from context or keep for compatibility
  refetch,
  enableNotifications,
  setEnableNotifications,
}
```

---

## Fix 3: Add Realtime to Admin Jobs Page

**Modify**: `app/admin/jobs/page.tsx`

**Add import** at top:
```typescript
import { JobsRealtimeWrapper } from '@/components/admin/JobsRealtimeWrapper'
```

**Wrap the return content** (around line 102):
```tsx
// Replace the entire return statement with:

return (
  <JobsRealtimeWrapper businessId={profile.business_id} initialJobs={jobs || []}>
    <JobsPageContent 
      initialJobs={jobs || []}
      recentJobs={recentJobs || []}
      profile={profile}
    />
  </JobsRealtimeWrapper>
)
```

**Add the client component** at the bottom of the file:
```tsx
'use client'

import { useRealtimeJobsContext } from '@/components/admin/JobsRealtimeProvider'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Plus, Calendar, MapPin, CheckCircle2, PlayCircle, Building2, User } from 'lucide-react'

interface JobWithRelations extends Job {
  customer?: { name: string }
  technician?: { full_name: string }
}

function JobsPageContent({ 
  initialJobs, 
  recentJobs,
  profile
}: { 
  initialJobs: JobWithRelations[]
  recentJobs: any[]
  profile: any
}) {
  const { jobs, isConnected, connectionStatus, refetch } = useRealtimeJobsContext()
  
  const displayJobs = jobs.length > 0 ? jobs : initialJobs
  
  const jobsByStatus = {
    scheduled: displayJobs.filter(j => j.status === 'scheduled'),
    on_the_way: displayJobs.filter(j => j.status === 'on_the_way'),
    in_progress: displayJobs.filter(j => j.status === 'in_progress'),
    completed: displayJobs.filter(j => j.status === 'completed')
  }

  const now = new Date()
  const sysTime = now.toLocaleDateString('en-US', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  }).toUpperCase().replace(/,/g, '')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl sm:text-6xl text-slate-900 dark:text-white tracking-wide">
            OPERATIONS
          </h1>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1 tracking-widest">
            SYS.TIME: {sysTime}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* REAL Connection Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
            }`} />
            <span className={`font-mono text-[10px] ${
              isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
            {!isConnected && connectionStatus === 'error' && (
              <button 
                onClick={refetch}
                className="ml-2 text-[10px] underline text-slate-500 hover:text-slate-700"
              >
                Retry
              </button>
            )}
          </div>
          
          <Link href="/admin/jobs/new">
            <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white font-mono text-xs px-5 py-2.5 rounded-full transition-all">
              <Plus className="w-4 h-4 mr-2" />
              NEW JOB
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="SCHEDULED" value={jobsByStatus.scheduled.length} icon={Calendar} color="cyan" />
        <MetricCard label="EN ROUTE" value={jobsByStatus.on_the_way.length} icon={MapPin} color="amber" />
        <MetricCard label="IN PROGRESS" value={jobsByStatus.in_progress.length} icon={PlayCircle} color="blue" />
        <MetricCard label="COMPLETED" value={jobsByStatus.completed.length} icon={CheckCircle2} color="emerald" />
      </div>

      {/* Pipeline */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="font-display text-xl text-slate-900 dark:text-white tracking-wide">PIPELINE</h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">LIVE</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
              <PipelineColumn title="SCHEDULED" count={jobsByStatus.scheduled.length} color="cyan" icon={Calendar} jobs={jobsByStatus.scheduled} />
              <PipelineColumn title="EN ROUTE" count={jobsByStatus.on_the_way.length} color="amber" icon={MapPin} jobs={jobsByStatus.on_the_way} />
              <PipelineColumn title="IN PROGRESS" count={jobsByStatus.in_progress.length} color="blue" icon={PlayCircle} jobs={jobsByStatus.in_progress} />
              <PipelineColumn title="COMPLETED" count={jobsByStatus.completed.length} color="emerald" icon={CheckCircle2} jobs={jobsByStatus.completed} />
            </div>
          </div>
        </div>

        {/* Activity */}
        <div className="xl:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-full">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-display text-lg text-slate-900 dark:text-white tracking-wide">ACTIVITY</h2>
            </div>
            <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto">
              {recentJobs?.map((job: any) => (
                <div key={job.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-mono text-slate-600 dark:text-slate-400">
                      {(job.customer?.name || 'UN').substring(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs text-slate-900 dark:text-white truncate">
                        {job.customer?.name || 'Unknown'}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge status={job.status} />
                        <span className="font-mono text-[10px] text-slate-400">
                          {new Date(job.updated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ... keep existing MetricCard, PipelineColumn, StatusBadge functions ...
```

---

## Summary for Codex

1. **Create** `hooks/useRealtimeJobsOptimized.ts` - new optimized hook
2. **Modify** `components/admin/JobsRealtimeProvider.tsx` - use new hook
3. **Modify** `app/admin/jobs/page.tsx` - wrap with JobsRealtimeWrapper, add real connection status

**Key improvements**:
- Jobs page now receives realtime updates
- Connection status is real (not fake)
- Intelligent merging (not full refetch on every change)
- Retry button when disconnected

---

## After Implementing

Run these commands to verify:
```bash
npm run build
npm run lint
```

Then test by opening admin/jobs and changing a job status in Supabase dashboard.
