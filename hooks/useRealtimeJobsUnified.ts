'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
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

const JOBS_LIST_SELECT = `
  id,
  business_id,
  customer_id,
  technician_id,
  status,
  scheduled_start,
  scheduled_end,
  description,
  urgency,
  updated_at,
  customer:customers(id,name),
  technician:users(id,full_name),
  services:job_services(service:services(id,name))
`
const JOBS_WINDOW_PAST_DAYS = 14
const JOBS_WINDOW_FUTURE_DAYS = 60

function getOperationalWindowIso(now: Date) {
  const rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - JOBS_WINDOW_PAST_DAYS)
  const rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + JOBS_WINDOW_FUTURE_DAYS, 23, 59, 59, 999)
  return {
    rangeStartIso: rangeStart.toISOString(),
    rangeEndIso: rangeEnd.toISOString(),
  }
}

function hasJobChanged(prev: Job, next: Job): boolean {
  if (
    prev.status !== next.status ||
    prev.technician_id !== next.technician_id ||
    prev.customer_id !== next.customer_id ||
    prev.scheduled_start !== next.scheduled_start ||
    prev.scheduled_end !== next.scheduled_end ||
    prev.updated_at !== next.updated_at ||
    prev.description !== next.description ||
    prev.urgency !== next.urgency
  ) {
    return true
  }

  if (prev.customer?.id !== next.customer?.id || prev.customer?.name !== next.customer?.name) {
    return true
  }
  if (prev.technician?.id !== next.technician?.id || prev.technician?.full_name !== next.technician?.full_name) {
    return true
  }

  const prevServices = prev.services || []
  const nextServices = next.services || []
  if (prevServices.length !== nextServices.length) {
    return true
  }

  for (let i = 0; i < prevServices.length; i += 1) {
    const prevName = prevServices[i]?.service?.name
    const nextName = nextServices[i]?.service?.name
    if (prevName !== nextName) {
      return true
    }
  }

  return false
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
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  const mergeJobUpdate = useCallback((updatedJob: Job) => {
    setJobs((current) => {
      const index = current.findIndex((job) => job.id === updatedJob.id)
      if (index === -1) {
        setLastUpdate(new Date())
        return [...current, updatedJob]
      }

      const existing = current[index]
      const merged: Job = {
        ...existing,
        ...updatedJob,
        customer: updatedJob.customer || existing.customer,
        technician: updatedJob.technician || existing.technician,
        services: updatedJob.services || existing.services,
      }

      if (!hasJobChanged(existing, merged)) {
        return current
      }

      const next = [...current]
      next[index] = merged
      setLastUpdate(new Date())
      return next
    })
  }, [])

  const removeJob = useCallback((jobId: string) => {
    setJobs((current) => {
      if (!current.some((job) => job.id === jobId)) {
        return current
      }
      setLastUpdate(new Date())
      return current.filter((job) => job.id !== jobId)
    })
  }, [])

  const refetch = useCallback(async () => {
    if (!businessId) return

    setConnectionStatus('connecting')
    try {
      const { rangeStartIso, rangeEndIso } = getOperationalWindowIso(new Date())
      const { data, error: fetchError } = await supabase
        .from('jobs')
        .select(JOBS_LIST_SELECT)
        .eq('business_id', businessId)
        .or(
          `and(scheduled_start.gte.${rangeStartIso},scheduled_start.lte.${rangeEndIso}),and(scheduled_start.is.null,created_at.gte.${rangeStartIso})`
        )
        .order('scheduled_start', { ascending: true })
        .limit(900)

      if (fetchError) throw fetchError

      if (isMountedRef.current) {
        setJobs((data as unknown as Job[]) || [])
        setError(null)
        setLastUpdate(new Date())
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch jobs')
        setConnectionStatus('error')
      }
    }
  }, [businessId, supabase])

  useEffect(() => {
    setJobs(initialJobs)
  }, [initialJobs])

  useEffect(() => {
    isMountedRef.current = true
    if (!businessId) return

    const setupSubscription = () => {
      clearReconnectTimeout()
      setConnectionStatus('connecting')

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }

      const filter = `business_id=eq.${businessId}`
      const channel = supabase
        .channel(`jobs-unified:${businessId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'jobs',
            filter,
          },
          () => {
            void refetch()
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
          (payload) => {
            mergeJobUpdate(payload.new as Job)
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
          (payload) => {
            removeJob((payload.old as Job).id)
          }
        )
        .subscribe((status) => {
          if (!isMountedRef.current) return

          switch (status) {
            case 'SUBSCRIBED':
              setConnectionStatus('connected')
              setError(null)
              break
            case 'CLOSED':
              setConnectionStatus('disconnected')
              clearReconnectTimeout()
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
              clearReconnectTimeout()
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

    if (initialJobs.length === 0) {
      void refetch()
    }

    return () => {
      isMountedRef.current = false
      clearReconnectTimeout()
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [businessId, clearReconnectTimeout, initialJobs.length, mergeJobUpdate, refetch, removeJob, supabase])

  return {
    jobs,
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    error,
    refetch,
    lastUpdate,
  }
}
