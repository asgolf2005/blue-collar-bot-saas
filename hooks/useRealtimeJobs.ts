'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface Job {
  id: string
  status: string
  description: string
  scheduled_start: string
  total?: number
  customer_id: string
  technician_id?: string
  service_id?: string
  business_id: string
  [key: string]: any
}

interface UseRealtimeJobsOptions {
  businessId: string
  initialJobs?: Job[]
  onJobChange?: (job: Job, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void
}

interface UseRealtimeJobsReturn {
  jobs: Job[]
  isConnected: boolean
  error: string | null
}

export function useRealtimeJobs({
  businessId,
  initialJobs = [],
  onJobChange,
}: UseRealtimeJobsOptions): UseRealtimeJobsReturn {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Update jobs state based on event type
  const handleJobChange = useCallback((payload: any, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => {
    const job = payload.new || payload.old

    // Call optional callback
    if (onJobChange) {
      onJobChange(job, eventType)
    }

    setJobs(currentJobs => {
      switch (eventType) {
        case 'INSERT':
          // Add new job if it doesn't exist
          if (currentJobs.some(j => j.id === job.id)) {
            return currentJobs
          }
          return [...currentJobs, job]

        case 'UPDATE':
          // Update existing job
          return currentJobs.map(j => j.id === job.id ? job : j)

        case 'DELETE':
          // Remove deleted job
          return currentJobs.filter(j => j.id !== job.id)

        default:
          return currentJobs
      }
    })
  }, [onJobChange])

  useEffect(() => {
    // Initialize jobs from props
    setJobs(initialJobs)
  }, [initialJobs])

  useEffect(() => {
    let channel: RealtimeChannel | null = null

    const setupRealtimeSubscription = async () => {
      try {
        // Create channel for jobs table filtered by business_id
        channel = supabase
          .channel(`jobs:business_id=eq.${businessId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'jobs',
              filter: `business_id=eq.${businessId}`,
            },
            (payload) => handleJobChange(payload, 'INSERT')
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'jobs',
              filter: `business_id=eq.${businessId}`,
            },
            (payload) => handleJobChange(payload, 'UPDATE')
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'jobs',
              filter: `business_id=eq.${businessId}`,
            },
            (payload) => handleJobChange(payload, 'DELETE')
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              setIsConnected(true)
              setError(null)
            } else if (status === 'CLOSED') {
              setIsConnected(false)
            } else if (status === 'CHANNEL_ERROR') {
              setIsConnected(false)
              setError('Failed to connect to real-time updates')
            }
          })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setIsConnected(false)
      }
    }

    setupRealtimeSubscription()

    // Cleanup function
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [businessId, handleJobChange, supabase])

  return { jobs, isConnected, error }
}
