import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Briefcase,
  Calendar,
  CheckCircle2,
  MapPin,
  AlertCircle,
  Play,
  User,
  XCircle,
  Clock,
  Truck,
} from '@/components/ui/lucide'
import { getDateRange, formatDisplayDate } from '@/lib/analytics/dateUtils'

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

function isWithinRange(value: string | null | undefined, start: Date, end: Date): boolean {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return date >= start && date <= end
}

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  completed: { 
    label: 'Completed', 
    icon: CheckCircle2, 
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-400/10'
  },
  scheduled: { 
    label: 'Scheduled', 
    icon: Calendar, 
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-400/10'
  },
  on_the_way: { 
    label: 'En Route', 
    icon: Truck, 
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-400/10'
  },
  arrived: { 
    label: 'Arrived', 
    icon: MapPin, 
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-400/10'
  },
  in_progress: { 
    label: 'In Progress', 
    icon: Play, 
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-400/10'
  },
  cancelled: { 
    label: 'Cancelled', 
    icon: XCircle, 
    color: 'text-slate-500 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800'
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

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.business_id) {
    redirect('/login')
  }

  const businessId = profile.business_id
  const rawRange = Array.isArray(params?.range) ? params?.range[0] : params?.range
  const validRanges = new Set(['7d', '30d', '90d', 'ytd'])
  const range = validRanges.has(rawRange || '') ? (rawRange as '7d' | '30d' | '90d' | 'ytd') : '30d'
  const selectedStatus = Array.isArray(params?.status) ? params?.status[0] : params?.status
  const dateRange = getDateRange(range as any)

  // Fetch all business data, then apply range filter in memory
  const { data: jobsData = [] } = await supabase
    .from('jobs')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  const { data: customersData = [] } = await supabase
    .from('customers')
    .select('id, name, address')
    .eq('business_id', businessId)

  const { data: usersData = [] } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('business_id', businessId)

  const { data: servicesData = [] } = await supabase
    .from('services')
    .select('id, name')
    .eq('business_id', businessId)

  const jobIds = (jobsData || []).map(job => job.id)
  const { data: jobServicesData = [] } = jobIds.length
    ? await supabase
        .from('job_services')
        .select('job_id, service_id')
        .in('job_id', jobIds)
    : { data: [] as Array<{ job_id: string; service_id: string }> }

  // Build lookup maps
  const customerMap = new Map((customersData || []).map(c => [c.id, { name: c.name, address: c.address }]))
  const userMap = new Map((usersData || []).map(u => [u.id, u.full_name]))
  const serviceMap = new Map((servicesData || []).map(s => [s.id, s.name]))
  const jobServiceNames = new Map<string, string[]>()

  ;(jobServicesData || []).forEach(row => {
    const serviceName = row.service_id ? serviceMap.get(row.service_id) : null
    if (!serviceName) return
    const existing = jobServiceNames.get(row.job_id) || []
    existing.push(serviceName)
    jobServiceNames.set(row.job_id, existing)
  })

  // Transform jobs with related data
  const allJobs: JobWithDetails[] = (jobsData || []).map((j: any) => {
    const customer = j.customer_id ? customerMap.get(j.customer_id) : null
    const serviceName = (jobServiceNames.get(j.id) || [])[0]

    return {
    id: j.id,
    status: j.status,
    total_cost: j.total_cost,
    created_at: j.created_at,
    scheduled_start: j.scheduled_start,
    description: j.description,
    urgency: j.urgency,
    customer_name: customer?.name || 'Unknown',
    technician_name: j.technician_id ? userMap.get(j.technician_id) || 'Unknown' : 'Unassigned',
    service_name: serviceName || 'General Service'
  }})

  const rangeFilteredJobs = allJobs.filter(job =>
    isWithinRange(job.scheduled_start || job.created_at, dateRange.start, dateRange.end)
  )

  const filteredJobs = selectedStatus
    ? rangeFilteredJobs.filter(job => job.status === selectedStatus)
    : rangeFilteredJobs
  
  // Calculate status breakdown
  const statusCounts: Record<string, number> = {}
  filteredJobs.forEach(job => {
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

  // Calculate recent jobs (last 5)
  const recentJobs = [...filteredJobs]
    .sort((a, b) => new Date(b.scheduled_start || b.created_at).getTime() - new Date(a.scheduled_start || a.created_at).getTime())
    .slice(0, 5)

  // Calculate jobs by day (last 7 days)
  const jobsByDay: { date: string; displayDate: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const count = filteredJobs.filter(j => j.scheduled_start?.startsWith(dateStr)).length
    jobsByDay.push({
      date: dateStr,
      displayDate: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      count,
    })
  }

  const totalJobs = filteredJobs.length
  const maxDayCount = Math.max(...jobsByDay.map(d => d.count), 1)

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
          <h1 className="font-display text-4xl sm:text-5xl text-slate-900 dark:text-white tracking-wide">
            JOBS BREAKDOWN
          </h1>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1">
            {formatDisplayDate(dateRange.start)} - {formatDisplayDate(dateRange.end)}
            {selectedStatus ? ` â€¢ ${statusConfig[selectedStatus]?.label || selectedStatus}` : ''}
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

      {/* Status Breakdown */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-400/20 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h2 className="font-display text-xl text-slate-900 dark:text-white">By Status</h2>
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
                          backgroundColor: 'currentColor'
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
        {/* Jobs by Day */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-400/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="font-display text-xl text-slate-900 dark:text-white">Last 7 Days</h2>
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

        {/* Recent Jobs */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-400/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="font-display text-xl text-slate-900 dark:text-white">Recent Jobs</h2>
                <p className="font-mono text-xs text-slate-500 dark:text-slate-400">Last 5 scheduled</p>
              </div>
            </div>
            <Link 
              href="/admin/jobs"
              className="font-mono text-xs text-cyan-600 hover:text-cyan-700 dark:text-cyan-400"
            >
              View All â†’
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
                          : 'No date'
                        }
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


