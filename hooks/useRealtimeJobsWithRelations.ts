'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { JobWithDetails } from '@/lib/types'

interface UseRealtimeJobsWithRelationsOptions {
  businessId: string
  initialJobs: JobWithDetails[]
  technicianId?: string
  startDate?: Date
  endDate?: Date
}

interface UseRealtimeJobsWithRelationsReturn {
  jobs: JobWithDetails[]
  isConnected: boolean
  error: string | null
  isRefreshing: boolean
}

export function useRealtimeJobsWithRelations({
  businessId,
  initialJobs,
  technicianId,
  startDate,
  endDate,
}: UseRealtimeJobsWithRelationsOptions): UseRealtimeJobsWithRelationsReturn {
  const [jobs, setJobs] = useState<JobWithDetails[]>(initialJobs)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const supabase = createClient()
  const isMountedRef = useRef(true)
  const lastRefreshRef = useRef<number>(0)

  const jobsSelect = `
    *,
    customer:customers(*),
    technician:users(*),
    services:job_services(service:services(*)),
    media:media(*)
  `
  const fallbackSelect = `
    *,
    customer:customers(*),
    technician:users(*),
    media:media(*)
  `

  const fetchAllJobs = useCallback(
    async (selectClause: string) => {
      const pageSize = 1000
      let from = 0
      const allJobs: JobWithDetails[] = []

      while (true) {
        let query = supabase
          .from('jobs')
          .select(selectClause)
          .eq('business_id', businessId)
          .order('scheduled_start', { ascending: false })
          .range(from, from + pageSize - 1)

        if (technicianId) {
          query = query.eq('technician_id', technicianId)
        }

        if (startDate) {
          query = query.gte('scheduled_start', startDate.toISOString())
        }

        if (endDate) {
          query = query.lte('scheduled_start', endDate.toISOString())
        }

        const { data, error } = await query

        if (error) {
          return { data: null, error }
        }

        if (data && data.length > 0) {
          allJobs.push(...(data as unknown as JobWithDetails[]))
        }

        if (!data || data.length < pageSize) {
          break
        }

        from += pageSize
      }

      return { data: allJobs, error: null }
    },
    [businessId, supabase, technicianId, startDate, endDate]
  )

  // Fetch all jobs with relations
  const fetchJobsWithRelations = useCallback(async () => {
    if (!businessId) {
      return
    }
    // Debounce: Don't refetch if we just did within the last 500ms
    const now = Date.now()
    if (now - lastRefreshRef.current < 500) {
      return
    }
    lastRefreshRef.current = now

    setIsRefreshing(true)
    try {
      let { data, error: fetchError } = await fetchAllJobs(jobsSelect)

      if (fetchError) {
        const fallback = await fetchAllJobs(fallbackSelect)

        if (fallback.error) {
          throw fetchError
        }

        data = fallback.data
      }

      if (isMountedRef.current) {
        setJobs(data || [])
        setError(null)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch jobs')
      }
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false)
      }
    }
  }, [businessId, fetchAllJobs])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    let channel: RealtimeChannel | null = null

    const setupRealtimeSubscription = async () => {
      try {
        if (!businessId) {
          return
        }
        channel = supabase
          .channel(`jobs:business_id=eq.${businessId}`)
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
              schema: 'public',
              table: 'jobs',
              filter: `business_id=eq.${businessId}`,
            },
            (payload) => {
              // When any change occurs, refetch all jobs with relations
              fetchJobsWithRelations()
            }
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
  }, [businessId, fetchJobsWithRelations, supabase])

  // Initialize jobs from props
  useEffect(() => {
    setJobs(initialJobs)
  }, [initialJobs])

  useEffect(() => {
    if (initialJobs.length === 0) {
      fetchJobsWithRelations()
    }
  }, [fetchJobsWithRelations, initialJobs.length])

  return { jobs, isConnected, error, isRefreshing }
}
