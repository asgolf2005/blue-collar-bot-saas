'use client'

import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Job, JobStatus } from '@/lib/types'

export type JobChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

export interface JobChangePayload {
  eventType: JobChangeEvent
  job: Job
  oldJob?: Job
}

export interface SubscribeToJobsOptions {
  businessId: string
  technicianId?: string
  onInsert?: (job: Job) => void
  onUpdate?: (job: Job, oldJob: Job) => void
  onDelete?: (job: Job) => void
  onAnyChange?: (payload: JobChangePayload) => void
}

/**
 * Subscribe to real-time job changes for a business
 * Uses Supabase Realtime for WebSocket-style instant updates
 */
export function subscribeToJobs(options: SubscribeToJobsOptions): RealtimeChannel {
  const { businessId, technicianId, onInsert, onUpdate, onDelete, onAnyChange } = options
  const supabase = createClient()

  // Realtime table filters support a single condition; apply technician filtering in callback.
  const filter = `business_id=eq.${businessId}`
  const matchesTechnician = (job: Job | undefined) =>
    !technicianId || job?.technician_id === technicianId

  const channel = supabase
    .channel(`jobs:business:${businessId}${technicianId ? `:tech:${technicianId}` : ''}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'jobs',
        filter,
      },
      (payload: RealtimePostgresChangesPayload<Job>) => {
        const job = payload.new as Job
        if (!matchesTechnician(job)) {
          return
        }
        
        if (onInsert) {
          onInsert(job)
        }
        
        if (onAnyChange) {
          onAnyChange({ eventType: 'INSERT', job })
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'jobs',
        filter,
      },
      (payload: RealtimePostgresChangesPayload<Job>) => {
        const job = payload.new as Job
        const oldJob = payload.old as Job
        const includeUpdate = matchesTechnician(job) || matchesTechnician(oldJob)
        if (!includeUpdate) {
          return
        }
        
        if (onUpdate) {
          onUpdate(job, oldJob)
        }
        
        if (onAnyChange) {
          onAnyChange({ eventType: 'UPDATE', job, oldJob })
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'jobs',
        filter,
      },
      (payload: RealtimePostgresChangesPayload<Job>) => {
        const job = payload.old as Job
        if (!matchesTechnician(job)) {
          return
        }
        
        if (onDelete) {
          onDelete(job)
        }
        
        if (onAnyChange) {
          onAnyChange({ eventType: 'DELETE', job })
        }
      }
    )
    .subscribe((status) => {
      console.log(`[Realtime Jobs] Subscription status: ${status}`)
    })

  return channel
}

/**
 * Subscribe to status changes only (for notifications/toasts)
 */
export function subscribeToJobStatusChanges(
  businessId: string,
  onStatusChange: (jobId: string, newStatus: JobStatus, oldStatus: JobStatus | null) => void
): RealtimeChannel {
  const supabase = createClient()

  return supabase
    .channel(`jobs-status:business:${businessId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'jobs',
        filter: `business_id=eq.${businessId}`,
      },
      (payload: RealtimePostgresChangesPayload<Job>) => {
        const newJob = payload.new as Job
        const oldJob = payload.old as Job
        
        if (newJob.status !== oldJob.status) {
          onStatusChange(newJob.id, newJob.status, oldJob.status)
        }
      }
    )
    .subscribe()
}

/**
 * Unsubscribe from a realtime channel
 */
export function unsubscribeFromJobs(channel: RealtimeChannel | null): void {
  if (channel) {
    const supabase = createClient()
    supabase.removeChannel(channel)
  }
}

/**
 * Get human-readable status change message
 */
export function getStatusChangeMessage(jobId: string, status: JobStatus): string {
  const statusMessages: Record<JobStatus, string> = {
    scheduled: `Job #${jobId.slice(0, 8)} scheduled`,
    on_the_way: `Technician en route to Job #${jobId.slice(0, 8)}`,
    arrived: `Technician arrived at Job #${jobId.slice(0, 8)}`,
    in_progress: `Job #${jobId.slice(0, 8)} now in progress`,
    completed: `Job #${jobId.slice(0, 8)} completed`,
    cancelled: `Job #${jobId.slice(0, 8)} cancelled`,
  }
  
  return statusMessages[status] || `Job #${jobId.slice(0, 8)} updated`
}
