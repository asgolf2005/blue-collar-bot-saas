'use client'

/**
 * @deprecated Use useRealtimeJobsUnified instead.
 * This hook has issues with duplicate subscriptions and stale data.
 */
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Job, JobStatus } from '@/lib/types'

interface UseJobsRealtimeOptions {
  businessId: string
  technicianId?: string
  initialJobs?: Job[]
  enableToasts?: boolean
  onJobChange?: (job: Job, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void
  onStatusChange?: (jobId: string, newStatus: JobStatus, oldStatus: JobStatus | null) => void
}

interface UseJobsRealtimeReturn {
  jobs: Job[]
  isConnected: boolean
  error: string | null
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  lastEvent: { type: string; jobId: string; timestamp: Date } | null
  refetch: () => Promise<void>
}

/**
 * React hook for real-time job updates using Supabase Realtime
 * Provides instant WebSocket-style updates with automatic reconnection
 */
export function useJobsRealtime({
  businessId,
  technicianId,
  initialJobs = [],
  onJobChange,
  onStatusChange,
}: UseJobsRealtimeOptions): UseJobsRealtimeReturn {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')
  const [error, setError] = useState<string | null>(null)
  const [lastEvent, setLastEvent] = useState<{ type: string; jobId: string; timestamp: Date } | null>(null)
  
  const supabase = useMemo(() => createClient(), [])
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Initialize jobs from props
  useEffect(() => {
    setJobs(initialJobs)
  }, [initialJobs])

  // Handle job insert
  const handleInsert = useCallback((newJob: Job) => {
    setJobs((currentJobs) => {
      // Prevent duplicates
      if (currentJobs.some((j) => j.id === newJob.id)) {
        return currentJobs
      }
      return [...currentJobs, newJob]
    })
    
    setLastEvent({ type: 'INSERT', jobId: newJob.id, timestamp: new Date() })
    
    if (onJobChange) {
      onJobChange(newJob, 'INSERT')
    }
  }, [onJobChange])

  // Handle job update
  const handleUpdate = useCallback((updatedJob: Job, oldJob: Job) => {
    setJobs((currentJobs) =>
      currentJobs.map((j) => (j.id === updatedJob.id ? { ...j, ...updatedJob } : j))
    )
    
    setLastEvent({ type: 'UPDATE', jobId: updatedJob.id, timestamp: new Date() })
    
    // Check for status change
    if (updatedJob.status !== oldJob.status && onStatusChange) {
      onStatusChange(updatedJob.id, updatedJob.status, oldJob.status)
    }
    
    if (onJobChange) {
      onJobChange(updatedJob, 'UPDATE')
    }
  }, [onJobChange, onStatusChange])

  // Handle job delete
  const handleDelete = useCallback((deletedJob: Job) => {
    setJobs((currentJobs) => currentJobs.filter((j) => j.id !== deletedJob.id))
    
    setLastEvent({ type: 'DELETE', jobId: deletedJob.id, timestamp: new Date() })
    
    if (onJobChange) {
      onJobChange(deletedJob, 'DELETE')
    }
  }, [onJobChange])

  // Manual refetch function
  const refetch = useCallback(async () => {
    try {
      let query = supabase
        .from('jobs')
        .select('*')
        .eq('business_id', businessId)
        .order('scheduled_start', { ascending: true })
      
      if (technicianId) {
        query = query.eq('technician_id', technicianId)
      }
      
      const { data, error: fetchError } = await query
      
      if (fetchError) {
        throw fetchError
      }
      
      setJobs(data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs')
    }
  }, [businessId, technicianId, supabase])

  // Set up realtime subscription
  useEffect(() => {
    if (!businessId) return

    setConnectionStatus('connecting')
    
    // Build filter
    let filter = `business_id=eq.${businessId}`
    
    const channel = supabase
      .channel(`jobs-realtime:${businessId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'jobs',
          filter,
        },
        (payload) => handleInsert(payload.new as Job)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter,
        },
        (payload) => handleUpdate(payload.new as Job, payload.old as Job)
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'jobs',
          filter,
        },
        (payload) => handleDelete(payload.old as Job)
      )
      .subscribe((status) => {
        switch (status) {
          case 'SUBSCRIBED':
            setIsConnected(true)
            setConnectionStatus('connected')
            setError(null)
            break
          case 'CLOSED':
            setIsConnected(false)
            setConnectionStatus('disconnected')
            break
          case 'CHANNEL_ERROR':
            setIsConnected(false)
            setConnectionStatus('error')
            setError('Real-time connection error')
            break
          case 'TIMED_OUT':
            setIsConnected(false)
            setConnectionStatus('error')
            setError('Connection timed out')
            break
        }
      })

    channelRef.current = channel

    // Cleanup subscription on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [businessId, handleInsert, handleUpdate, handleDelete, supabase])

  return {
    jobs,
    isConnected,
    error,
    connectionStatus,
    lastEvent,
    refetch,
  }
}

/**
 * Hook specifically for technician field view
 * Filters jobs by assigned technician and today's date
 */
export function useTechnicianJobsRealtime(
  businessId: string,
  technicianId: string,
  initialJobs?: Job[]
) {
  const { jobs, ...rest } = useJobsRealtime({
    businessId,
    technicianId,
    initialJobs,
  })

  const { todaysJobs, currentJob, upcomingJobs, completedToday } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const jobsForToday = jobs
      .filter((job) => {
        const jobDate = new Date(job.scheduled_start)
        return jobDate >= today && jobDate < tomorrow && job.technician_id === technicianId
      })
      .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime())

    return {
      todaysJobs: jobsForToday,
      currentJob: jobsForToday.find((job) => job.status === 'in_progress' || job.status === 'arrived') || null,
      upcomingJobs: jobsForToday.filter((job) => job.status === 'scheduled' || job.status === 'on_the_way'),
      completedToday: jobsForToday.filter((job) => job.status === 'completed').length,
    }
  }, [jobs, technicianId])

  return {
    jobs,
    todaysJobs,
    currentJob,
    upcomingJobs,
    completedToday,
    ...rest,
  }
}
