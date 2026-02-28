/**
 * Standardized job counting utilities
 * Ensures consistent job counts across all admin pages
 */

import { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export interface JobCounts {
  total: number
  byStatus: Record<string, number>
  byTechnician: Record<string, number>
  completed: number
  active: number
  scheduled: number
  cancelled: number
}

/**
 * Get ALL jobs count for a business (truly all time)
 * Use this for consistent "all time" metrics across all pages
 */
export async function getAllTimeJobCounts({
  supabase,
  businessId,
}: {
  supabase: SupabaseServerClient
  businessId: string
}): Promise<JobCounts> {
  // Single efficient query to get all jobs with status
  const { data, error } = await supabase
    .from('jobs')
    .select('status, technician_id')
    .eq('business_id', businessId)

  if (error) throw error

  const jobs = data || []
  const total = jobs.length

  // Calculate breakdowns
  const byStatus: Record<string, number> = {}
  const byTechnician: Record<string, number> = {}
  let completed = 0
  let active = 0
  let scheduled = 0
  let cancelled = 0

  for (const job of jobs) {
    // Count by status
    const status = job.status || 'unknown'
    byStatus[status] = (byStatus[status] || 0) + 1

    // Count by technician
    if (job.technician_id) {
      byTechnician[job.technician_id] = (byTechnician[job.technician_id] || 0) + 1
    }

    // Categorize
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

  return {
    total,
    byStatus,
    byTechnician,
    completed,
    active,
    scheduled,
    cancelled,
  }
}

/**
 * Get job counts within a specific date range
 * Uses scheduled_start date for filtering
 */
export async function getJobCountsInRange({
  supabase,
  businessId,
  start,
  end,
}: {
  supabase: SupabaseServerClient
  businessId: string
  start: Date
  end: Date
}): Promise<JobCounts> {
  const startIso = start.toISOString()
  const endIso = end.toISOString()

  // Query jobs within the scheduled date range
  // Falls back to created_at if scheduled_start is null
  const { data, error } = await supabase
    .from('jobs')
    .select('status, technician_id, scheduled_start, created_at')
    .eq('business_id', businessId)
    .or(
      `and(scheduled_start.gte.${startIso},scheduled_start.lte.${endIso}),and(scheduled_start.is.null,created_at.gte.${startIso},created_at.lte.${endIso})`
    )

  if (error) throw error

  const jobs = data || []
  const total = jobs.length

  // Same counting logic as above
  const byStatus: Record<string, number> = {}
  const byTechnician: Record<string, number> = {}
  let completed = 0
  let active = 0
  let scheduled = 0
  let cancelled = 0

  for (const job of jobs) {
    const status = job.status || 'unknown'
    byStatus[status] = (byStatus[status] || 0) + 1

    if (job.technician_id) {
      byTechnician[job.technician_id] = (byTechnician[job.technician_id] || 0) + 1
    }

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

  return {
    total,
    byStatus,
    byTechnician,
    completed,
    active,
    scheduled,
    cancelled,
  }
}

/**
 * Quick count for dashboards (lightweight query)
 */
export async function getQuickJobCount({
  supabase,
  businessId,
}: {
  supabase: SupabaseServerClient
  businessId: string
}): Promise<number> {
  const { count, error } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)

  if (error) throw error
  return count || 0
}
