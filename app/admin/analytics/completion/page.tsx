import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  User,
  Target,
  TrendingUp,
  XCircle,
} from '@/components/ui/lucide'
import { getDateRange, formatDisplayDate, resolveDateRangeKey, type DateRangeKey } from '@/lib/analytics/dateUtils'
import {
  fetchCustomerNames,
  fetchJobsInWindow,
  fetchServiceNamesByJob,
  fetchUserNames,
} from '@/lib/analytics/server-queries'

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

  const jobsData = await fetchJobsInWindow({
    supabase,
    businessId,
    start: dateRange.start,
    end: dateRange.end,
  })

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

  const totalJobs = filteredJobs.length
  const completedJobs = filteredJobs.filter((job) => job.status === 'completed')
  const cancelledJobs = filteredJobs.filter((job) => job.status === 'cancelled')
  const completionRate = totalJobs > 0 ? Math.round((completedJobs.length / totalJobs) * 100) : 0

  // Completion Breakdown metrics
  const completedAmount = completedJobs.reduce((sum, job) => sum + (job.total_cost || 0), 0)
  const cancelledAmount = cancelledJobs.reduce((sum, job) => sum + (job.total_cost || 0), 0)
  const resolvedCount = completedJobs.length + cancelledJobs.length
  const completedShare = resolvedCount > 0 ? Math.round((completedJobs.length / resolvedCount) * 100) : 0
  const cancelledShare = resolvedCount > 0 ? Math.round((cancelledJobs.length / resolvedCount) * 100) : 0

  const techStats = new Map<string, {
    name: string
    id: string
    completed: number
    total: number
    revenue: number
  }>()

  filteredJobs.forEach((job) => {
    const techId = job.technician_name.replace(/\s+/g, '-').toLowerCase()
    const techName = job.technician_name
    if (!techStats.has(techId)) {
      techStats.set(techId, { name: techName, id: techId, completed: 0, total: 0, revenue: 0 })
    }
    const tech = techStats.get(techId)!
    tech.total += 1
    if (job.status === 'completed') {
      tech.completed += 1
      tech.revenue += job.total_cost || 0
    }
  })

  const technicianBreakdown = Array.from(techStats.values()).sort((a, b) => b.completed - a.completed)
  // Removed: recent completed jobs list - replaced with Completion Breakdown

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount)

  return (
    <div className="space-y-6">
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
          <div className="bg-blue-50 dark:bg-blue-400/10 rounded-xl px-6 py-4 border border-blue-200 dark:border-blue-400/20">
            <p className="font-mono text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider">Completion</p>
            <p className="font-display text-3xl text-blue-600 dark:text-blue-400">{completionRate}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="admin-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-400/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase">Completed</p>
              <p className="font-display text-2xl text-slate-900 dark:text-white">{completedJobs.length}</p>
            </div>
          </div>
        </div>

        <div className="admin-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-400/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase">Total</p>
              <p className="font-display text-2xl text-slate-900 dark:text-white">{totalJobs}</p>
            </div>
          </div>
        </div>

        <div className="admin-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-400/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase">Rate</p>
              <p className="font-display text-2xl text-slate-900 dark:text-white">{completionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="admin-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-400/20 flex items-center justify-center">
              <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="admin-section-title">By Technician</h2>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">Completion rate by team member</p>
            </div>
          </div>

          <div className="space-y-4">
            {technicianBreakdown.length === 0 ? (
              <p className="font-mono text-sm text-slate-500 text-center py-8">No technician data</p>
            ) : (
              technicianBreakdown.map((tech) => {
                const rate = tech.total > 0 ? Math.round((tech.completed / tech.total) * 100) : 0
                const maxCompleted = Math.max(...technicianBreakdown.map((item) => item.completed), 1)
                const barWidth = (tech.completed / maxCompleted) * 100

                return (
                  <div key={tech.id} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-mono text-xs font-bold">
                          {tech.name.split(' ').map((name) => name[0]).join('')}
                        </div>
                        <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{tech.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-sm font-medium text-slate-900 dark:text-white">
                          {tech.completed}/{tech.total}
                        </span>
                        <span className="font-mono text-xs text-slate-500 ml-2">({rate}%)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-slate-500 w-16 text-right">
                        {formatCurrency(tech.revenue)}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <h2 className="admin-section-title">Completion Breakdown</h2>
                <p className="font-mono text-xs text-slate-500 dark:text-slate-400">Completed vs cancelled in selected period</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/jobs?status=completed"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-mono text-xs hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed Jobs
              </Link>
              <Link
                href="/admin/jobs?status=cancelled"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 font-mono text-xs hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancelled Jobs
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            {/* Completed row */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Completed</p>
                  <p className="font-display text-2xl text-slate-900 dark:text-white">{completedJobs.length}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs text-slate-500 dark:text-slate-400">Total Value</p>
                <p className="font-display text-xl text-emerald-600 dark:text-emerald-400">{formatCurrency(completedAmount)}</p>
              </div>
            </div>

            {/* Cancelled row */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-rose-50/50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <p className="font-mono text-xs text-rose-600 dark:text-rose-400 uppercase tracking-wider">Cancelled</p>
                  <p className="font-display text-2xl text-slate-900 dark:text-white">{cancelledJobs.length}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs text-slate-500 dark:text-slate-400">Total Value</p>
                <p className="font-display text-xl text-rose-600 dark:text-rose-400">{formatCurrency(cancelledAmount)}</p>
              </div>
            </div>

            {/* Stacked bar */}
            <div className="pt-2">
              <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${completedShare}%` }}
                />
                <div
                  className="h-full bg-rose-500 transition-all duration-500"
                  style={{ width: `${cancelledShare}%` }}
                />
              </div>
            </div>

            {/* Footer microcopy */}
            <p className="font-mono text-xs text-slate-500 dark:text-slate-400 text-center">
              Resolved jobs: <span className="font-medium text-slate-700 dark:text-slate-300">{resolvedCount}</span>
              <span className="mx-2">•</span>
              <span className="text-emerald-600 dark:text-emerald-400">{completedShare}% completed</span>
              <span className="mx-2">•</span>
              <span className="text-rose-600 dark:text-rose-400">{cancelledShare}% cancelled</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
