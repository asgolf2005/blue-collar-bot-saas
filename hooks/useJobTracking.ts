'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TechnicianLocation, Job } from '@/lib/types'

interface JobTrackingState {
  location: TechnicianLocation | null
  job: Job | null
  eta: number | null
  isLoading: boolean
  error: string | null
  isConnected: boolean
}

export function useJobTracking(jobId: string) {
  const [state, setState] = useState<JobTrackingState>({
    location: null,
    job: null,
    eta: null,
    isLoading: true,
    error: null,
    isConnected: false
  })

  const supabase = createClient()

  // Fetch initial location
  const fetchLocation = useCallback(async () => {
    try {
      const response = await fetch(`/api/technician/location?job_id=${jobId}`)
      if (response.ok) {
        const data = await response.json()
        setState(prev => ({ ...prev, location: data.location }))
      }
    } catch (error) {
      console.error('Error fetching location:', error)
    }
  }, [jobId])

  // Fetch initial job data
  const fetchJob = useCallback(async () => {
    try {
      const { data: job, error } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(*),
          technician:users!jobs_technician_id_fkey(*)
        `)
        .eq('id', jobId)
        .single()

      if (error) throw error

      setState(prev => ({
        ...prev,
        job: job,
        eta: job.eta_minutes,
        isLoading: false
      }))
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false
      }))
    }
  }, [jobId, supabase])

  useEffect(() => {
    // Initial fetch
    fetchJob()
    fetchLocation()

    // Subscribe to location updates
    const locationChannel = supabase
      .channel(`location-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'technician_locations',
          filter: `job_id=eq.${jobId}`
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setState(prev => ({ ...prev, location: null }))
          } else {
            setState(prev => ({ ...prev, location: payload.new as TechnicianLocation }))
          }
        }
      )
      .subscribe((status) => {
        setState(prev => ({ ...prev, isConnected: status === 'SUBSCRIBED' }))
      })

    // Subscribe to job status updates
    const jobChannel = supabase
      .channel(`job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          setState(prev => ({
            ...prev,
            job: { ...prev.job, ...payload.new } as Job,
            eta: (payload.new as any).eta_minutes
          }))
        }
      )
      .subscribe()

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(locationChannel)
      supabase.removeChannel(jobChannel)
    }
  }, [jobId, supabase, fetchJob, fetchLocation])

  // Refresh function for manual updates
  const refresh = useCallback(() => {
    fetchJob()
    fetchLocation()
  }, [fetchJob, fetchLocation])

  return {
    ...state,
    refresh
  }
}
