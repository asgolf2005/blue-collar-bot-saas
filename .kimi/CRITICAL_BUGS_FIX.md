# CRITICAL BUGS FIX
## Option A - Priority Fixes for Codex

---

## BUG 1: Realtime Sync Broken
**Problem**: Data appears stale, requires manual refresh to see updates
**Root Cause**: Multiple competing hooks, no intelligent merging, subscriptions drop

### Files to Fix:

#### 1.1 Create Unified Realtime Hook
**Create**: `hooks/useRealtimeJobsUnified.ts`

```typescript
'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Job } from '@/lib/types'

interface UseRealtimeJobsUnifiedOptions {
  businessId: string
  initialJobs?: Job[]
}

interface UseRealtimeJobsUnifiedReturn {
  jobs: Job[]
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  error: string | null
  refetch: () => Promise<void>
  lastUpdate: Date | null
}

export function useRealtimeJobsUnified({
  businessId,
  initialJobs = [],
}: UseRealtimeJobsUnifiedOptions): UseRealtimeJobsUnifiedReturn {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  
  const supabase = useMemo(() => createClient(), [])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  // Intelligent merge: Update only changed job, preserve relations
  const mergeJobUpdate = useCallback((updatedJob: Job) => {
    setJobs(current => {
      const index = current.findIndex(j => j.id === updatedJob.id)
      
      if (index === -1) {
        // New job - add to list
        setLastUpdate(new Date())
        return [...current, updatedJob]
      }
      
      // Update existing - preserve relation data if not in update
      const existing = current[index]
      const merged = {
        ...existing,
        ...updatedJob,
        // Preserve these if not in the update
        customer: updatedJob.customer || existing.customer,
        technician: updatedJob.technician || existing.technician,
        services: updatedJob.services || existing.services,
      }
      
      // Only update if actually changed
      if (JSON.stringify(existing) === JSON.stringify(merged)) {
        return current
      }
      
      const newJobs = [...current]
      newJobs[index] = merged
      setLastUpdate(new Date())
      return newJobs
    })
  }, [])

  const removeJob = useCallback((jobId: string) => {
    setJobs(current => {
      const exists = current.some(j => j.id === jobId)
      if (!exists) return current
      setLastUpdate(new Date())
      return current.filter(j => j.id !== jobId)
    })
  }, [])

  // Full refetch with relations - only when needed
  const refetch = useCallback(async () => {
    if (!businessId) return
    
    setConnectionStatus('connecting')
    try {
      const { data, error: fetchError } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(*),
          technician:users(*),
          services:job_services(service:services(*))
        `)
        .eq('business_id', businessId)
        .order('scheduled_start', { ascending: true })
        .limit(500)

      if (fetchError) throw fetchError
      
      if (isMountedRef.current) {
        setJobs(data || [])
        setError(null)
        setLastUpdate(new Date())
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch')
        setConnectionStatus('error')
      }
    }
  }, [businessId, supabase])

  // Setup subscription with auto-reconnect
  useEffect(() => {
    isMountedRef.current = true
    
    if (!businessId) return

    const setupSubscription = () => {
      setConnectionStatus('connecting')
      
      const filter = `business_id=eq.${businessId}`
      
      const channel = supabase
        .channel(`jobs-unified:${businessId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'jobs',
          filter,
        }, () => {
          // For inserts, refetch to get relations
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
          if (!isMountedRef.current) return
          
          switch (status) {
            case 'SUBSCRIBED':
              setConnectionStatus('connected')
              setError(null)
              break
            case 'CLOSED':
              setConnectionStatus('disconnected')
              // Auto-reconnect after 3 seconds
              if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
              }
              reconnectTimeoutRef.current = setTimeout(() => {
                if (isMountedRef.current) {
                  setupSubscription()
                }
              }, 3000)
              break
            case 'CHANNEL_ERROR':
            case 'TIMED_OUT':
              setConnectionStatus('error')
              setError('Connection failed - retrying...')
              // Auto-reconnect after 5 seconds
              if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
              }
              reconnectTimeoutRef.current = setTimeout(() => {
                if (isMountedRef.current) {
                  setupSubscription()
                }
              }, 5000)
              break
          }
        })

      channelRef.current = channel
    }

    setupSubscription()

    return () => {
      isMountedRef.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [businessId, supabase, mergeJobUpdate, removeJob, refetch])

  return {
    jobs,
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    error,
    refetch,
    lastUpdate,
  }
}
```

#### 1.2 Update JobsRealtimeProvider
**File**: `components/admin/JobsRealtimeProvider.tsx`

Replace the hook import and usage:
```typescript
// Change FROM:
import { useJobsRealtime } from '@/hooks/useJobsRealtime'

// TO:
import { useRealtimeJobsUnified } from '@/hooks/useRealtimeJobsUnified'

// In the component, replace:
const { jobs, isConnected, error, connectionStatus, lastEvent, refetch } = useJobsRealtime({
  businessId,
  initialJobs,
  onStatusChange: handleStatusChange,
  onJobChange: handleJobChange,
})

// WITH:
const { jobs, isConnected, error, connectionStatus, refetch, lastUpdate } = useRealtimeJobsUnified({
  businessId,
  initialJobs,
})
```

#### 1.3 Deprecate Old Hooks
**Mark as deprecated** in these files (add comment at top):
- `hooks/useJobsRealtime.ts`
- `hooks/useRealtimeJobs.ts`
- `hooks/useRealtimeJobsWithRelations.ts`

Add at top of each file:
```typescript
/**
 * @deprecated Use useRealtimeJobsUnified instead
 * This hook has issues with duplicate subscriptions and stale data
 */
```

---

## BUG 2: Fake "LIVE" Indicator
**Problem**: Shows green dot even when disconnected
**Solution**: Use actual connection status from hook

### Fix in Jobs Page
**File**: `app/admin/jobs/page.tsx`

Replace the fake LIVE indicator (around line 161):
```tsx
// FROM (fake):
<div className="flex items-center gap-2">
  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
  <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">LIVE</span>
</div>

// TO (real, requires client component):
```

Create a client component for the indicator:
```tsx
'use client'

import { useRealtimeJobsContext } from '@/components/admin/JobsRealtimeProvider'

export function ConnectionStatus() {
  const { isConnected, connectionStatus, refetch } = useRealtimeJobsContext()
  
  if (connectionStatus === 'connecting') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">CONNECTING...</span>
      </div>
    )
  }
  
  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <span className="font-mono text-[10px] text-red-600 dark:text-red-400">OFFLINE</span>
        <button 
          onClick={refetch}
          className="ml-1 text-[10px] underline text-red-500 hover:text-red-700"
        >
          Retry
        </button>
      </div>
    )
  }
  
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">LIVE</span>
    </div>
  )
}
```

Use it in the page:
```tsx
import { ConnectionStatus } from '@/components/admin/ConnectionStatus'

// In JSX:
<ConnectionStatus />
```

---

## BUG 3: No Error Boundaries
**Problem**: App crashes completely when errors occur
**Solution**: Add React Error Boundaries

### Create Error Boundary Component
**Create**: `components/error/ErrorBoundary.tsx`

```typescript
'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo)
    // Could send to error reporting service here
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-lg text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <Button 
              onClick={this.handleRetry}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Retry
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

### Wrap Admin Layout
**File**: `app/admin/layout.tsx`

Wrap the children with ErrorBoundary:
```tsx
import { ErrorBoundary } from '@/components/error/ErrorBoundary'

// In the return:
<ErrorBoundary>
  <main className="lg:ml-[72px] min-h-screen pt-24 lg:pt-8 px-4 lg:px-6 pb-12 relative">
    <div className="max-w-7xl mx-auto">
      {children}
    </div>
  </main>
</ErrorBoundary>
```

---

## BUG 4: Related Data Stale
**Problem**: Customer/technician names don't update when changed
**Solution**: Already fixed in unified hook with intelligent merging

The `useRealtimeJobsUnified` hook preserves relation data:
```typescript
const merged = {
  ...existing,
  ...updatedJob,
  // Preserve these if not in the update
  customer: updatedJob.customer || existing.customer,
  technician: updatedJob.technician || existing.technician,
  services: updatedJob.services || existing.services,
}
```

---

## BUG 5: View Toggle Not Working
**Problem**: Jobs page view toggle doesn't filter correctly
**Solution**: Already fixed (see previous handoffs)

Ensure these are in place:
- `export const dynamic = 'force-dynamic'`
- `const searchParams = await props.searchParams`
- Proper date filtering in query

---

## IMPLEMENTATION ORDER

1. **Create `hooks/useRealtimeJobsUnified.ts`** - New unified hook
2. **Create `components/error/ErrorBoundary.tsx`** - Error handling
3. **Create `components/admin/ConnectionStatus.tsx`** - Real status indicator
4. **Update `components/admin/JobsRealtimeProvider.tsx`** - Use unified hook
5. **Update `app/admin/layout.tsx`** - Add error boundary
6. **Mark old hooks as deprecated** - Add comments
7. **Test everything** - Build and verify

---

## TESTING CHECKLIST

After implementing all fixes:

- [ ] Open `/admin/jobs`
- [ ] Change a job status in Supabase dashboard
- [ ] Job updates automatically within 2-3 seconds
- [ ] Connection status shows "LIVE" when connected
- [ ] Disconnect network → shows "OFFLINE" with retry button
- [ ] Reconnect network → returns to "LIVE"
- [ ] Customer name changes propagate to job cards
- [ ] Introduce a runtime error → shows error boundary instead of white screen
- [ ] Build passes: `npm run build`
- [ ] No console errors

---

## VERIFICATION STEPS

### Test Realtime
1. Open two browser windows
2. Change job status in window 1 (via Supabase dashboard)
3. Should update in window 2 automatically

### Test Error Boundary
1. Temporarily add `throw new Error('test')` in a component
2. Should show error UI instead of crash
3. Remove the error after testing

### Test Connection Status
1. Open browser dev tools → Network tab
2. Set to "Offline"
3. Status should change to "OFFLINE"
4. Set back to "Online"
5. Should reconnect and show "LIVE"
