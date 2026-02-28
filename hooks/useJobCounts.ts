'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface JobCounts {
  total: number
  byStatus: Record<string, number>
  completed: number
  active: number
  scheduled: number
  cancelled: number
}

interface UseJobCountsOptions {
  businessId: string
  refreshInterval?: number // milliseconds
}

export function useJobCounts({ businessId, refreshInterval }: UseJobCountsOptions) {
  const [counts, setCounts] = useState<JobCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchCounts = useCallback(async () => {
    if (!businessId) return

    try {
      setLoading(true)
      const supabase = createClient()

      // Fetch all jobs for the business
      const { data, error: queryError } = await supabase
        .from('jobs')
        .select('status')
        .eq('business_id', businessId)

      if (queryError) throw queryError

      const jobs = data || []
      const total = jobs.length

      // Calculate counts
      const byStatus: Record<string, number> = {}
      let completed = 0
      let active = 0
      let scheduled = 0
      let cancelled = 0

      for (const job of jobs) {
        const status = job.status || 'unknown'
        byStatus[status] = (byStatus[status] || 0) + 1

        switch (status) {
          case 'completed':
            completed++
            break
          case 'cancelled':
            cancelled++
            break
          case 'scheduled':
            scheduled++
            break
          case 'on_the_way':
          case 'arrived':
          case 'in_progress':
            active++
            break
        }
      }

      setCounts({
        total,
        byStatus,
        completed,
        active,
        scheduled,
        cancelled,
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch job counts'))
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    fetchCounts()

    if (refreshInterval) {
      const interval = setInterval(fetchCounts, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [fetchCounts, refreshInterval])

  return {
    counts,
    loading,
    error,
    refetch: fetchCounts,
  }
}
