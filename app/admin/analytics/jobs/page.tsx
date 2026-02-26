import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { ElementType } from 'react'
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  MapPin,
  Play,
  XCircle,
  Clock,
  Truck,
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
  description: string | null
  urgency: string | null
  customer_name: string
  technician_name: string
  service_name: string
}

const statusConfig: Record<string, { label: string; icon: ElementType; color: string; bg: string }> = {
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-400/10',
  },
  scheduled: {
    label: 'Scheduled',
    icon: Calendar,
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-400/10',
  },
  on_the_way: {
    label: 'En Route',
    icon: Truck,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-400/10',
  },
  arrived: {
    label: 'Arrived',
    icon: MapPin,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-400/10',
  },
  in_progress: {
    label: 'In Progress',
    icon: Play,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-400/10',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'text-slate-500 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800',
  },
}

const urgencyConfig: Record<string, { label: string; color: string }> = {
  emergency: { label: 'Emergency', color: 'text-rose-600 dark:text-rose-400' },
  high: { label: 'High', color: 'text-orange-600 dark:text-orange-400' },
  medium: { label: 'Medium', color: 'text-amber-600 dark:text-amber-400' },
  low: { label: 'Low', color: 'text-slate-500 dark:text-slate-400' },
}

export default async function JobsDetailPage({
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
  const selectedStatus = Array.isArray(params?.status) ? params?.status[0] : params?.status
  const dateRange = getDateRange(range)

  const jobsData = await fetchJobsInWindow({
    supabase,
    businessId,
    start: dateRange.start,
    end: dateRange.end,
  })
  const jobIds = jobsData.map((job) => job.id)
  const customerIds = Array.from(
    new Set(jobsData.map((job) => job.customer_id).filter((value): value is string => Boolean(value)))
  )
  const technicianIds = Array.from(
    new Set(jobsData.map((job) => job.technician_id).filter((value): value is string => Boolean(value)))
  )

  const [customerMap, userMap, jobServiceNames] = await Promise.all([
    fetchCustomerNames({ supabase, businessId, customerIds }),
    fetchUserNames({ supabase, businessId, userIds: technicianIds }),
    fetchServiceNamesByJob({ supabase, businessId, jobIds }),
  ])

  const allJobs: JobWithDetails[] = jobsData.map((job) => ({
    id: job.id,
    status: job.status,
    total_cost: job.total_cost,
    created_at: job.created_at,
    scheduled_start: job.scheduled_start,
    description: job.description,
    urgency: job.urgency,
    customer_name: job.customer_id ? customerMap.get(job.customer_id) || 'Unknown' : 'Unknown',
    technician_name: job.technician_id ? userMap.get(job.technician_id) || 'Unknown' : 'Unassigned',
    service_name: (jobServiceNames.get(job.id) || [])[0] || 'General Service',
  }))

  const filteredJobs = selectedStatus
    ? allJobs.filter((job) => job.status === selectedStatus)
    : allJobs

  const statusCounts: Record<string, number> = {}
  filteredJobs.forEach((job) => {
    const status = job.status || 'unknown'
    statusCounts[status] = (statusCounts[status] || 0) + 1
  })

  const statusBreakdown = Object.entries(statusCounts)
    .map(([status, count]) => ({
      status,
      count,
      config: statusConfig[status] || statusConfig.scheduled,
    }))
    .sort((a, b) => b.count - a.count)

  const recentJobs = [...filteredJobs]
    .sort((a, b) => new Date(b.scheduled_start || b.created_at).getTime() - new Date(a.scheduled_start || a.created_at).getTime())
    .slice(0, 5)

  const jobsByDay: { date: string; displayDate: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const count = filteredJobs.filter((job) => job.scheduled_start?.startsWith(dateStr)).length
    jobsByDay.push({
      date: dateStr,
      displayDate: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      count,
    })
  }

  const totalJobs = filteredJobs.length
  const maxDayCount = Math.max(...jobsByDay.map((day) => day.count), 1)

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
            JOBS BREAKDOWN
          </h1>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1">
            {formatDisplayDate(dateRange.start)} - {formatDisplayDate(dateRange.end)}
            {selectedStatus ? ` - ${statusConfig[selectedStatus]?.label || selectedStatus}` : ''}
          </p>
          {selectedStatus && (
            <Link
              href={`/admin/analytics/jobs?range=${range}`}
              className="inline-block mt-2 font-mono text-xs text-cyan-600 hover:text-cyan-700 dark:text-cyan-400"
            >
              Clear status filter
            </Link>
          )}
        </div>

        <div className="bg-cyan-50 dark:bg-cyan-400/10 rounded-xl px-6 py-4 border border-cyan-200 dark:border-cyan-400/20">
          <p className="font-mono text-xs text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Total Jobs</p>
          <p className="font-display text-3xl text-cyan-600 dark:text-cyan-400">{totalJobs}</p>
        </div>
      </div>

      <div className="admin-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-400/20 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h2 className="admin-section-title">By Status</h2>
            <p className="font-mono text-xs text-slate-500 dark:text-slate-400">Job distribution by current status</p>
          </div>
        </div>

        <div className="space-y-4">
          {statusBreakdown.length === 0 ? (
            <p className="font-mono text-sm text-slate-500 text-center py-8">No jobs found</p>
          ) : (
            statusBreakdown.map(({ status, count, config }) => {
              const Icon = config.icon
              const percentage = totalJobs > 0 ? (count / totalJobs) * 100 : 0
              const maxCount = statusBreakdown[0]?.count || 1
              const barWidth = (count / maxCount) * 100

              return (
                <div key={status} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      <Link
                        href={`/admin/analytics/jobs?range=${range}&status=${status}`}
                        className="font-mono text-sm text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400"
                      >
                        {config.label}
                      </Link>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-medium text-slate-900 dark:text-white">{count}</span>
                      <span className="font-mono text-xs text-slate-500 ml-2">({percentage.toFixed(0)}%)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${config.bg.replace('bg-', 'bg-').replace('dark:bg-', 'dark:bg-')}`}
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: 'currentColor',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="admin-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-400/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="admin-section-title">7 Days</h2>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">Jobs scheduled by day</p>
            </div>
          </div>

          <div className="space-y-3">
            {jobsByDay.map((day) => {
              const barWidth = maxDayCount > 0 ? (day.count / maxDayCount) * 100 : 0
              return (
                <div key={day.date} className="flex items-center gap-3">
                  <span className="font-mono text-xs text-slate-500 w-24">{day.displayDate}</span>
                  <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500 rounded flex items-center justify-end pr-2"
                      style={{ width: `${barWidth}%` }}
                    >
                      {day.count > 0 && (
                        <span className="font-mono text-xs text-white font-medium">{day.count}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-400/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="admin-section-title">Recent Jobs</h2>
                <p className="font-mono text-xs text-slate-500 dark:text-slate-400">Last 5 scheduled</p>
              </div>
            </div>
            <Link
              href="/admin/jobs"
              className="font-mono text-xs text-cyan-600 hover:text-cyan-700 dark:text-cyan-400"
            >
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {recentJobs.length === 0 ? (
              <p className="font-mono text-sm text-slate-500 text-center py-8">No recent jobs</p>
            ) : (
              recentJobs.map((job) => {
                const status = statusConfig[job.status] || statusConfig.scheduled
                const urgency = job.urgency ? urgencyConfig[job.urgency] : null
                const Icon = status.icon

                return (
                  <Link
                    key={job.id}
                    href={`/admin/jobs/${job.id}`}
                    className="block p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg ${status.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-4 h-4 ${status.color}`} />
                        </div>
                        <div>
                          <p className="font-mono text-sm text-slate-900 dark:text-white">
                            {job.customer_name}
                          </p>
                          <p className="font-mono text-xs text-slate-500">
                            {job.service_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${status.bg} ${status.color}`}>
                              {status.label}
                            </span>
                            {urgency && (
                              <span className={`text-[10px] ${urgency.color}`}>
                                {urgency.label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono text-xs text-slate-400">
                        {job.scheduled_start
                          ? new Date(job.scheduled_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : 'No date'}
                      </span>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
