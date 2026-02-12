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

      if (JSON.stringify(existing) === JSON.stringify(merged)) {
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
        setJobs((data as Job[]) || [])
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
