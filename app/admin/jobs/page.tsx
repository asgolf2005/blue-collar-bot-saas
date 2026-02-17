import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { JobsRealtimeWrapper } from '@/components/admin/JobsRealtimeWrapper'
import { ConnectionStatus } from '@/components/admin/ConnectionStatus'
import { JobsMetricsPanel } from '@/components/admin/JobsMetricsPanel'
import { JobsPipelineBoard } from '@/components/admin/JobsPipelineBoard'
import { DispatchAutopilotCard } from '@/components/admin/DispatchAutopilotCard'
import { LocalDateTimeText } from '@/components/ui/LocalDateTimeText'
import { endOfDay, endOfWeek, format, startOfDay, startOfWeek } from 'date-fns'

// Force dynamic rendering to handle searchParams changes
export const dynamic = 'force-dynamic'

// Types
interface Job {
  id: string
  title: string
  status: string
  scheduled_start: string
  scheduled_end: string
  customer?: {
    name: string
  }
  technician?: {
    full_name: string
  }
  updated_at: string
}

type JobsView = 'day' | 'week' | 'all'
type JobsTimingFilter = 'all' | 'upcoming' | 'past'

function resolveView(viewParam?: string | string[]): JobsView {
  const view = Array.isArray(viewParam) ? viewParam[0] : viewParam
  if (view === 'day' || view === 'week' || view === 'all') {
    return view
  }
  return 'week'
}

function resolveTimingFilter(timingParam?: string | string[]): JobsTimingFilter {
  const timing = Array.isArray(timingParam) ? timingParam[0] : timingParam
  if (timing === 'all' || timing === 'upcoming' || timing === 'past') {
    return timing
  }
  return 'all'
}

function resolveTechnicianFilter(technicianParam?: string | string[]): string | null {
  const technician = Array.isArray(technicianParam) ? technicianParam[0] : technicianParam
  if (!technician) return null
  const trimmed = technician.trim()
  return trimmed.length > 0 ? trimmed : null
}

async function fetchJobsForView({
  supabase,
  businessId,
  view,
  dateFilterStart,
  dateFilterEnd,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  businessId: string
  view: JobsView
  dateFilterStart: Date
  dateFilterEnd: Date
}) {
  const pageSize = 1000
  let from = 0
  const allJobs: any[] = []

  while (true) {
    let query = supabase
      .from('jobs')
      .select(`
        *,
        customer:customers(*),
        technician:users(*),
        services:job_services(service:services(*))
      `)
      .eq('business_id', businessId)
      .order('scheduled_start', { ascending: true })
      .range(from, from + pageSize - 1)

    if (view !== 'all') {
      query = query
        .gte('scheduled_start', dateFilterStart.toISOString())
        .lte('scheduled_start', dateFilterEnd.toISOString())
    }

    const { data, error } = await query
    if (error) {
      throw error
    }

    const batch = data || []
    allJobs.push(...batch)

    if (batch.length < pageSize) break
    from += pageSize

    // Safety guard for extremely large datasets
    if (from > 50000) break
  }

  return allJobs
}

export default async function JobsPage(props: {
  searchParams?: Promise<{ view?: string | string[]; timing?: string | string[]; technician?: string | string[] }>
}) {
  const searchParams = (await props.searchParams) ?? {}
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('business_id, role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/tech/today')
  }

  // Resolve view from URL or default to 'week'
  const view = resolveView(searchParams?.view)
  const timingFilter = resolveTimingFilter(searchParams?.timing)
  const technicianFilterId = resolveTechnicianFilter(searchParams?.technician)

  // Calculate date range based on view and query only that period
  const now = new Date()
  let dateFilterStart = startOfWeek(now, { weekStartsOn: 1 })
  let dateFilterEnd = endOfWeek(now, { weekStartsOn: 1 })

  if (view === 'day') {
    dateFilterStart = startOfDay(now)
    dateFilterEnd = endOfDay(now)
  }

  // Fetch jobs based on selected view
  let jobs: any[] = []
  let jobsError: any = null
  try {
    jobs = await fetchJobsForView({
      supabase,
      businessId: profile.business_id,
      view,
      dateFilterStart,
      dateFilterEnd,
    })
  } catch (error) {
    jobsError = error
  }

  if (jobsError) {
    console.error('Jobs query error:', jobsError)
  }

  const filteredByTechnician = technicianFilterId
    ? jobs.filter((job) => job.technician_id === technicianFilterId)
    : jobs

  const nowMs = now.getTime()
  const allViewJobs = view === 'all'
    ? filteredByTechnician.filter((job) => {
        if (!job.scheduled_start) return timingFilter === 'all'
        const scheduledMs = new Date(job.scheduled_start).getTime()
        if (timingFilter === 'past') return scheduledMs < nowMs
        if (timingFilter === 'upcoming') return scheduledMs >= nowMs
        return true
      })
    : filteredByTechnician

  const technicianFilterName =
    technicianFilterId
      ? jobs.find((job) => job.technician_id === technicianFilterId)?.technician?.full_name || 'Selected technician'
      : null
  const technicianQuery = technicianFilterId ? `&technician=${encodeURIComponent(technicianFilterId)}` : ''

  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  // Group jobs by status
  const jobsByStatus = {
    scheduled: allViewJobs?.filter(j => j.status === 'scheduled') || [],
    on_the_way: allViewJobs?.filter(j => j.status === 'on_the_way') || [],
    in_progress: allViewJobs?.filter(j => j.status === 'in_progress' || j.status === 'arrived') || [],
    completed: allViewJobs?.filter(j => j.status === 'completed') || [],
    cancelled: allViewJobs?.filter(j => j.status === 'cancelled') || [],
  }

  // Fetch recent activity
  const { data: recentJobs } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers(name),
      technician:users(full_name)
    `)
    .eq('business_id', profile.business_id)
    .order('updated_at', { ascending: false })
    .limit(6)

  const dateLabel = view === 'day'
    ? `TODAY: ${format(now, 'MMM d, yyyy').toUpperCase()}`
    : view === 'week'
    ? `THIS WEEK: ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`.toUpperCase()
    : `ALL JOBS: CHRONOLOGICAL`

  return (
    <JobsRealtimeWrapper businessId={profile.business_id} initialJobs={(jobs as any) || []}>
      <div className="space-y-6">
      {/* Header - Minimal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl sm:text-6xl text-slate-900 dark:text-white tracking-wide">
            OPERATIONS
          </h1>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1 tracking-widest">
            {dateLabel}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 p-1">
            {(['day', 'week', 'all'] as const).map((nextView) => (
              <Link
                key={nextView}
                href={`/admin/jobs?view=${nextView}${technicianQuery}`}
                className={`px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-wide transition-all ${
                  view === nextView
                    ? 'bg-blue-600 dark:bg-cyan-500 text-white'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {nextView}
              </Link>
            ))}
          </div>

          <Link href="/admin/jobs/new">
            <Button
              variant="glassPrimary"
              className="font-mono text-xs px-5 py-2.5 rounded-full"
            >
              NEW JOB
            </Button>
          </Link>
        </div>
      </div>

      {technicianFilterId && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-mono text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300">
            Technician: {technicianFilterName}
          </span>
          <Link
            href={`/admin/jobs?view=${view}${view === 'all' ? `&timing=${timingFilter}` : ''}`}
            className="text-[11px] font-mono text-slate-500 underline decoration-dotted underline-offset-2 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Clear filter
          </Link>
        </div>
      )}

      <JobsMetricsPanel jobsByStatus={jobsByStatus as Record<'scheduled' | 'on_the_way' | 'in_progress' | 'completed', Job[]>} />

      <DispatchAutopilotCard />

      {view !== 'all' ? (
        <>
          {/* Pipeline - Clean 5-Column */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
            {/* Pipeline Columns */}
            <div className="xl:col-span-3">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h2 className="font-display text-xl text-slate-900 dark:text-white tracking-wide">PIPELINE</h2>
                  <ConnectionStatus autoRefresh />
                </div>
                
                <JobsPipelineBoard jobs={allViewJobs as any[]} />
              </div>
            </div>

            {/* Activity - Compact */}
            <div className="xl:col-span-1">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-full">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="font-display text-lg text-slate-900 dark:text-white tracking-wide">ACTIVITY</h2>
                </div>
                <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto">
                  {recentJobs?.map((job: any) => (
                    <div 
                      key={job.id} 
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-mono text-slate-600 dark:text-slate-400">
                          {(job.customer?.name || 'UN').substring(0, 1).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-xs text-slate-900 dark:text-white truncate">
                            {job.customer?.name || 'Unknown'}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <StatusBadge status={job.status} />
                            <span className="font-mono text-[10px] text-slate-400">
                              {new Date(job.updated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="font-display text-xl text-slate-900 dark:text-white tracking-wide">ALL JOBS (CHRONOLOGICAL)</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-700 p-1">
                {([
                  { key: 'all', label: 'All' },
                  { key: 'upcoming', label: 'Upcoming' },
                  { key: 'past', label: 'Past' },
                ] as const).map((option) => (
                  <Link
                    key={option.key}
                    href={`/admin/jobs?view=all&timing=${option.key}${technicianQuery}`}
                    className={`px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wide transition-all ${
                      timingFilter === option.key
                        ? 'bg-blue-600 dark:bg-cyan-500 text-white'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{allViewJobs.length} jobs</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left px-4 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date & Time</th>
                  <th className="text-left px-4 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Technician</th>
                  <th className="text-left px-4 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Service</th>
                </tr>
              </thead>
              <tbody>
                {allViewJobs.map((job: any) => (
                  <tr
                    key={job.id}
                    className="border-b border-slate-50 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                      <Link href={`/admin/jobs/${job.id}`} className="hover:text-cyan-600 dark:hover:text-cyan-400">
                        <LocalDateTimeText value={job.scheduled_start} fallback="No date" />
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                      {job.customer?.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                      {job.technician?.full_name || 'Unassigned'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {job.services?.[0]?.service?.name || 'General Service'}
                    </td>
                  </tr>
                ))}
                {allViewJobs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center font-mono text-xs text-slate-500 dark:text-slate-400">
                      No jobs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </JobsRealtimeWrapper>
  )
}

// Status Badge - Minimal
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    scheduled: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-400',
    on_the_way: 'bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400',
    arrived: 'bg-orange-100 text-orange-700 dark:bg-orange-400/10 dark:text-orange-400',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400',
    cancelled: 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300',
  }
  
  const label = status === 'on_the_way' ? 'EN ROUTE' : status.replace('_', ' ').toUpperCase()
  
  return (
    <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] ${colors[status] || colors.scheduled}`}>
      {label}
    </span>
  )
}

