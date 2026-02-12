import { createClient } from '@/lib/supabase/server'
import {
  addHours,
  differenceInMinutes,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  startOfWeek,
} from 'date-fns'
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Briefcase,
  CircleAlert,
  Route,
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import WeekNavigation from '@/components/tech/WeekNavigation'

const resolveSingle = <T,>(value: T | T[] | null | undefined) =>
  Array.isArray(value) ? value[0] : value ?? undefined

const STATUS_META: Record<
  string,
  { label: string; chip: string; dot: string; rail: string }
> = {
  scheduled: {
    label: 'Scheduled',
    chip: 'bg-slate-100 text-slate-700 dark:bg-slate-700/70 dark:text-slate-300',
    dot: 'bg-slate-400',
    rail: 'before:bg-slate-400',
  },
  on_the_way: {
    label: 'En Route',
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    dot: 'bg-amber-400',
    rail: 'before:bg-amber-400',
  },
  arrived: {
    label: 'Arrived',
    chip: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
    dot: 'bg-orange-400',
    rail: 'before:bg-orange-400',
  },
  in_progress: {
    label: 'In Progress',
    chip: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
    dot: 'bg-cyan-400',
    rail: 'before:bg-cyan-400',
  },
  completed: {
    label: 'Completed',
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    dot: 'bg-emerald-400',
    rail: 'before:bg-emerald-400',
  },
  cancelled: {
    label: 'Cancelled',
    chip: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    dot: 'bg-rose-400',
    rail: 'before:bg-rose-400',
  },
}

function parseDateSafe(value: string | null | undefined, fallback: Date = new Date()) {
  if (!value) return fallback
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return fallback
  return parsed
}

export default async function TechSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const today = new Date()

  // If week param exists, use it; otherwise use current week
  const baseDate = params.week ? new Date(params.week) : today
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 })
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      id,
      status,
      description,
      scheduled_start,
      scheduled_end,
      customer:customers(id, name, email, phone, address)
    `)
    .eq('technician_id', user.id)
    .gte('scheduled_start', weekStart.toISOString())
    .lte('scheduled_start', weekEnd.toISOString())
    .order('scheduled_start', { ascending: true })

  const normalizedJobs = (jobs || []).map((job) => ({
    ...job,
    customer: resolveSingle(job.customer),
  }))

  const getJobsForDay = (date: Date) => {
    return normalizedJobs.filter(job =>
      isSameDay(new Date(job.scheduled_start), date)
    )
  }

  const totalJobs = normalizedJobs.length
  const completedJobs = normalizedJobs.filter((job) => job.status === 'completed').length
  const activeJobs = normalizedJobs.filter((job) =>
    job.status === 'scheduled' ||
    job.status === 'on_the_way' ||
    job.status === 'arrived' ||
    job.status === 'in_progress'
  ).length
  const totalMinutes = normalizedJobs.reduce((sum, job) => {
    const start = parseDateSafe(job.scheduled_start)
    const end = parseDateSafe(job.scheduled_end, addHours(start, 2))
    const delta = differenceInMinutes(end, start)
    return sum + (delta > 0 ? delta : 120)
  }, 0)
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_52%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_52%)]" />

      <div className="relative overflow-hidden rounded-[26px] border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50 to-cyan-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/20 p-5 shadow-[0_22px_50px_-34px_rgba(2,132,199,0.45)] dark:shadow-[0_24px_54px_-32px_rgba(34,211,238,0.35)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-cyan-200/25 blur-3xl dark:bg-cyan-500/20" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-indigo-200/20 blur-3xl dark:bg-indigo-500/15" />

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300 mb-2">
              FIELD COMMAND
            </p>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl border border-cyan-300/70 bg-cyan-50 dark:border-cyan-500/40 dark:bg-cyan-500/15 flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-cyan-600 dark:text-cyan-300" />
              </div>
              <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-slate-900 dark:text-white">
                SCHEDULE
              </h1>
            </div>
            <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400 tracking-wide">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </p>
          </div>
          <WeekNavigation currentWeekStart={weekStart} />
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            label="Total Jobs"
            value={totalJobs}
            icon={<Briefcase className="w-4 h-4 text-cyan-600 dark:text-cyan-300" />}
          />
          <SummaryCard
            label="Active"
            value={activeJobs}
            icon={<Route className="w-4 h-4 text-amber-600 dark:text-amber-300" />}
          />
          <SummaryCard
            label="Completed"
            value={completedJobs}
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />}
          />
          <SummaryCard
            label="Scheduled Hours"
            value={totalHours}
            icon={<Clock3 className="w-4 h-4 text-violet-600 dark:text-violet-300" />}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(['scheduled', 'on_the_way', 'arrived', 'in_progress', 'completed'] as const).map((statusKey) => (
            <span
              key={statusKey}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-wide ${STATUS_META[statusKey].chip}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[statusKey].dot}`} />
              {STATUS_META[statusKey].label}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {daysOfWeek.map((day) => {
          const dayJobs = getJobsForDay(day)
          const isToday = isSameDay(day, today)

          return (
            <div
              key={day.toISOString()}
              className={`rounded-2xl border overflow-hidden bg-white/90 dark:bg-slate-900/85 backdrop-blur-sm transition-all duration-200 ${
                isToday
                  ? 'border-cyan-300/80 dark:border-cyan-500/45 ring-1 ring-cyan-200/70 dark:ring-cyan-500/30 shadow-[0_0_0_1px_rgba(34,211,238,0.1),0_16px_28px_-20px_rgba(34,211,238,0.38)]'
                  : 'border-slate-200 dark:border-slate-800 shadow-sm hover:border-cyan-200/70 dark:hover:border-cyan-500/35'
              }`}
            >
              <div
                className={`px-4 py-3 border-b ${
                  isToday
                    ? 'bg-cyan-50/70 dark:bg-cyan-500/12 border-cyan-100 dark:border-cyan-500/25'
                    : 'bg-slate-50/80 dark:bg-slate-800/70 border-slate-100 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-900 dark:text-white tracking-tight">
                      {format(day, 'EEEE')}
                      {isToday && (
                        <span className="ml-2 text-[10px] font-mono bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-500/30">
                          Today
                        </span>
                      )}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{format(day, 'MMMM d, yyyy')}</p>
                  </div>
                  <div className={`text-lg font-bold ${isToday ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                    {dayJobs.length} {dayJobs.length === 1 ? 'job' : 'jobs'}
                  </div>
                </div>
              </div>

              <div className="p-4">
                {dayJobs.length === 0 ? (
                  <div className="text-center py-8 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                      <CircleAlert className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">No jobs scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dayJobs.map((job) => (
                      <Link
                        key={job.id}
                        href={`/tech/jobs/${job.id}`}
                        className={`group relative overflow-hidden block rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 px-3 py-3 hover:border-cyan-300 dark:hover:border-cyan-500/40 hover:shadow-[0_14px_26px_-22px_rgba(34,211,238,0.55)] hover:-translate-y-0.5 transition-all duration-150 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 ${STATUS_META[job.status]?.rail || STATUS_META.scheduled.rail}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-slate-900 dark:text-white">
                            {job.customer?.name || 'Unknown Customer'}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono ${STATUS_META[job.status]?.chip || STATUS_META.scheduled.chip}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[job.status]?.dot || STATUS_META.scheduled.dot}`} />
                            {STATUS_META[job.status]?.label || 'Scheduled'}
                          </span>
                        </div>

                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mb-1">
                          <Clock3 className="w-4 h-4 mr-1.5" />
                          {format(parseDateSafe(job.scheduled_start), 'h:mm a')} - {format(parseDateSafe(job.scheduled_end, addHours(parseDateSafe(job.scheduled_start), 2)), 'h:mm a')}
                        </div>

                        {job.customer?.address && (
                          <div className="flex items-start text-sm text-slate-500 dark:text-slate-400">
                            <MapPin className="w-4 h-4 mr-1.5 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-1">{job.customer.address}</span>
                          </div>
                        )}

                        {job.description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-1">
                            {job.description}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-800/55 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:shadow-none backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        {icon}
      </div>
      <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white tabular-nums">{value}</p>
    </div>
  )
}
