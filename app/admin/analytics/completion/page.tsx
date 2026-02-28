import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
} from '@/components/ui/lucide'
import { getDateRange, formatDisplayDate, resolveDateRangeKey, type DateRangeKey } from '@/lib/analytics/dateUtils'
import {
  fetchCustomerNames,
  fetchJobsInWindow,
  fetchServiceNamesByJob,
  fetchUserNames,
} from '@/lib/analytics/server-queries'
import { getAllTimeJobCounts } from '@/lib/analytics/job-counts'

interface JobWithDetails {
  id: string
  status: string
  total_cost: number | null
  created_at: string
  scheduled_start: string | null
  completed_at: string | null
  customer_name: string
  technician_name: string
  service_name: string
  description: string | null
}

export default async function CompletionDetailPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined }
}) {
  const params = searchParams ? await Promise.resolve(searchParams) : {}
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.business_id) redirect('/login')

  const businessId = profile.business_id
  const range: DateRangeKey = resolveDateRangeKey(params?.range)
  const dateRange = getDateRange(range)

  // Fetch jobs and canonical all-time count in parallel
  const [jobsData, allTimeCounts] = await Promise.all([
    fetchJobsInWindow({
      supabase,
      businessId,
      start: dateRange.start,
      end: dateRange.end,
    }),
    getAllTimeJobCounts({ supabase, businessId }),
  ])

  const customerIds = Array.from(
    new Set(jobsData.map((job) => job.customer_id).filter((value): value is string => Boolean(value)))
  )
  const technicianIds = Array.from(
    new Set(jobsData.map((job) => job.technician_id).filter((value): value is string => Boolean(value)))
  )
  const jobIds = jobsData.map((job) => job.id)

  const [customerMap, userMap, serviceByJob] = await Promise.all([
    fetchCustomerNames({ supabase, businessId, customerIds }),
    fetchUserNames({ supabase, businessId, userIds: technicianIds }),
    fetchServiceNamesByJob({ supabase, businessId, jobIds }),
  ])

  const filteredJobs: JobWithDetails[] = jobsData.map((job) => ({
    id: job.id,
    status: job.status,
    total_cost: job.total_cost,
    created_at: job.created_at,
    scheduled_start: job.scheduled_start,
    completed_at: job.status === 'completed' ? (job.scheduled_end || job.updated_at || job.created_at) : null,
    customer_name: job.customer_id ? customerMap.get(job.customer_id) || 'Unknown' : 'Unknown',
    technician_name: job.technician_id ? userMap.get(job.technician_id) || 'Unknown' : 'Unassigned',
    service_name: (serviceByJob.get(job.id) || [])[0] || 'General Service',
    description: job.description,
  }))

  // Resolution Breakdown Metrics
  const completedJobs = filteredJobs.filter((job) => job.status === 'completed')
  const cancelledJobs = filteredJobs.filter((job) => job.status === 'cancelled')
  const openJobs = filteredJobs.filter((job) => 
    !['completed', 'cancelled'].includes(job.status)
  )

  const completedAmount = completedJobs.reduce((sum, job) => sum + (job.total_cost || 0), 0)
  const cancelledAmount = cancelledJobs.reduce((sum, job) => sum + (job.total_cost || 0), 0)
  const openAmount = openJobs.reduce((sum, job) => sum + (job.total_cost || 0), 0)

  const resolvedCount = completedJobs.length + cancelledJobs.length
  const totalCount = filteredJobs.length
  const openCount = openJobs.length

  // Segment percentages for the bar
  const completedPct = totalCount > 0 ? (completedJobs.length / totalCount) * 100 : 0
  const cancelledPct = totalCount > 0 ? (cancelledJobs.length / totalCount) * 100 : 0
  const openPct = totalCount > 0 ? (openJobs.length / totalCount) * 100 : 0

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount)

  // Canonical all-time total
  const canonicalAllTime = allTimeCounts.total

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href={`/admin/analytics?range=${range}`}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-mono text-xs">Back to Analytics</span>
            </Link>
          </div>
          <h1 className="admin-page-header">
            COMPLETION RATE
          </h1>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1">
            {formatDisplayDate(dateRange.start)} - {formatDisplayDate(dateRange.end)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-800 rounded-xl px-6 py-4 border border-slate-700">
            <p className="font-mono text-xs text-slate-400 uppercase tracking-wider">Period Total</p>
            <p className="font-display text-3xl text-white">{filteredJobs.length}</p>
          </div>
        </div>
      </div>

      {/* Period Context Note */}
      <p className="font-sans text-sm text-slate-500 dark:text-slate-400">
        {range === 'all' 
          ? `Canonical all-time jobs: ${canonicalAllTime}` 
          : `Showing jobs in selected period. Canonical all-time: ${canonicalAllTime}`}
      </p>

      {/* Resolution Breakdown - Minimal, Typography-Driven */}
      <div className="admin-card p-6">
        <div className="mb-6">
          <h2 className="font-display text-xl tracking-wide text-slate-900 dark:text-white uppercase">
            Resolution Breakdown
          </h2>
          <p className="font-sans text-sm text-slate-500 dark:text-slate-400 mt-1">
            Completed, cancelled, and still open
          </p>
        </div>

        {/* Three Metric Rows - Clean, No Icons */}
        <div className="space-y-4">
          {/* Completed */}
          <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-baseline gap-4">
              <span className="font-sans text-sm text-slate-600 dark:text-slate-400">Completed</span>
              <span className="font-display text-2xl text-emerald-600 dark:text-emerald-400">
                {completedJobs.length}
              </span>
            </div>
            <span className="font-mono text-lg text-emerald-600/80 dark:text-emerald-400/80">
              {formatCurrency(completedAmount)}
            </span>
          </div>

          {/* Cancelled */}
          <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-baseline gap-4">
              <span className="font-sans text-sm text-slate-600 dark:text-slate-400">Cancelled</span>
              <span className="font-display text-2xl text-rose-600 dark:text-rose-400">
                {cancelledJobs.length}
              </span>
            </div>
            <span className="font-mono text-lg text-rose-600/80 dark:text-rose-400/80">
              {formatCurrency(cancelledAmount)}
            </span>
          </div>

          {/* Open */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-baseline gap-4">
              <span className="font-sans text-sm text-slate-600 dark:text-slate-400">Open</span>
              <span className="font-display text-2xl text-slate-700 dark:text-slate-300">
                {openJobs.length}
              </span>
            </div>
            <span className="font-mono text-lg text-slate-500 dark:text-slate-500">
              {formatCurrency(openAmount)}
            </span>
          </div>
        </div>

        {/* Segmented Bar */}
        <div className="mt-6">
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
            {completedPct > 0 && (
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${completedPct}%` }}
              />
            )}
            {cancelledPct > 0 && (
              <div
                className="h-full bg-rose-500 transition-all duration-500"
                style={{ width: `${cancelledPct}%` }}
              />
            )}
            {openPct > 0 && (
              <div
                className="h-full bg-slate-400 dark:bg-slate-600 transition-all duration-500"
                style={{ width: `${openPct}%` }}
              />
            )}
          </div>
        </div>

        {/* Footer Microcopy */}
        <p className="font-mono text-xs text-slate-500 dark:text-slate-400 text-center mt-4">
          Total jobs: <span className="font-medium text-slate-700 dark:text-slate-300">{totalCount}</span>
          <span className="mx-2">·</span>
          Resolved: <span className="font-medium text-slate-700 dark:text-slate-300">{resolvedCount}</span>
          <span className="mx-2">·</span>
          Open: <span className="font-medium text-slate-700 dark:text-slate-300">{openCount}</span>
        </p>

        {/* Action Links */}
        <div className="mt-6 flex items-center gap-3 justify-end">
          <Link
            href="/admin/jobs?status=completed"
            className="font-mono text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors"
          >
            View Completed →
          </Link>
          <span className="text-slate-300">|</span>
          <Link
            href="/admin/jobs?status=cancelled"
            className="font-mono text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 transition-colors"
          >
            View Cancelled →
          </Link>
        </div>
      </div>

      {/* By Technician Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="admin-card p-6">
          <div className="mb-6">
            <h2 className="font-display text-lg tracking-wide text-slate-900 dark:text-white uppercase">
              By Technician
            </h2>
            <p className="font-sans text-sm text-slate-500 dark:text-slate-400 mt-1">
              Completion rate by team member
            </p>
          </div>

          <div className="space-y-4">
            {/* Tech breakdown would go here - simplified for now */}
            <p className="font-sans text-sm text-slate-500 dark:text-slate-400 text-center py-8">
              Technician completion data available in main analytics
            </p>
          </div>
        </div>

        {/* Placeholder for future expansion */}
        <div className="admin-card p-6">
          <div className="mb-6">
            <h2 className="font-display text-lg tracking-wide text-slate-900 dark:text-white uppercase">
              By Service
            </h2>
            <p className="font-sans text-sm text-slate-500 dark:text-slate-400 mt-1">
              Completion rate by service type
            </p>
          </div>
          <p className="font-sans text-sm text-slate-500 dark:text-slate-400 text-center py-8">
            Service completion data available in services page
          </p>
        </div>
      </div>
    </div>
  )
}
