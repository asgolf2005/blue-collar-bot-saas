import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  addDays,
  differenceInMinutes,
  endOfDay,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns'
import { BarChart3, Clock3, DollarSign, Gauge, Sparkles, TrendingUp } from '@/components/ui/lucide'

type MetricCardProps = {
  label: string
  value: string
  helper: string
}

function MetricCard({ label, value, helper }: MetricCardProps) {
  return (
    <div className="relative min-h-[120px] overflow-hidden rounded-[2rem] bg-white/30 p-4 shadow-sm ring-1 ring-slate-200/50 backdrop-blur-xl transition-all duration-300 group hover:ring-cyan-500/30 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)] dark:bg-slate-900/30 dark:ring-slate-800/50 sm:p-5">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-cyan-400/10 blur-2xl transition-all group-hover:bg-cyan-400/20" />
      <p className="relative font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="relative mt-2 break-words font-display-soft text-[1.7rem] font-bold leading-none tracking-tight text-slate-900 drop-shadow-sm dark:text-white sm:text-3xl">
        {value}
      </p>
      <p className="relative mt-1 line-clamp-2 font-sans text-[10px] font-medium text-slate-500 dark:text-slate-400/80 sm:text-[11px]">{helper}</p>
    </div>
  )
}

export default async function TechStatsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const {
    data: profile,
  } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'tech') {
    redirect('/tech/today')
  }

  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const monthStart = startOfMonth(now)
  const next14 = addDays(now, 14)

  const [
    { data: allJobs = [] },
    { data: weekJobs = [] },
    { data: monthJobs = [] },
    { data: futureJobs = [] },
  ] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, status, total_cost, scheduled_start, scheduled_end, description')
      .eq('technician_id', user.id)
      .order('scheduled_start', { ascending: false }),
    supabase
      .from('jobs')
      .select('id, status, scheduled_start, scheduled_end')
      .eq('technician_id', user.id)
      .gte('scheduled_start', weekStart.toISOString())
      .order('scheduled_start', { ascending: true }),
    supabase
      .from('jobs')
      .select('status, total_cost, scheduled_start, scheduled_end')
      .eq('technician_id', user.id)
      .gte('scheduled_start', monthStart.toISOString()),
    supabase
      .from('jobs')
      .select('id')
      .eq('technician_id', user.id)
      .gte('scheduled_start', now.toISOString())
      .lte('scheduled_start', next14.toISOString()),
  ])

  const safeAllJobs = allJobs || []
  const safeWeekJobs = weekJobs || []
  const safeMonthJobs = monthJobs || []
  const safeFutureJobs = futureJobs || []

  const completedJobs = safeAllJobs.filter((job) => job.status === 'completed')
  const completedThisWeek = safeWeekJobs.filter((job) => job.status === 'completed').length
  const completedThisMonth = safeMonthJobs.filter((job) => job.status === 'completed')
  const activeNow = safeAllJobs.filter((job) => ['on_the_way', 'arrived', 'in_progress'].includes(job.status)).length
  const cancellationCount = safeAllJobs.filter((job) => job.status === 'cancelled').length

  const totalRevenue = completedJobs.reduce((sum, job) => sum + (Number(job.total_cost) || 0), 0)
  const monthRevenue = completedThisMonth.reduce((sum, job) => sum + (Number(job.total_cost) || 0), 0)
  const avgJobValue = completedJobs.length > 0 ? totalRevenue / completedJobs.length : 0

  const totalMinutesWorked = completedJobs.reduce((sum, job) => {
    if (!job.scheduled_start || !job.scheduled_end) return sum
    const minutes = differenceInMinutes(new Date(job.scheduled_end), new Date(job.scheduled_start))
    return sum + (minutes > 0 ? minutes : 0)
  }, 0)
  const totalHoursWorked = totalMinutesWorked / 60
  const realizedHourly = totalHoursWorked > 0 ? totalRevenue / totalHoursWorked : 0

  const completionRate = safeAllJobs.length > 0 ? Math.round((completedJobs.length / safeAllJobs.length) * 100) : 0
  const reliabilityScore = Math.max(0, Math.round(completionRate - (cancellationCount / Math.max(safeAllJobs.length, 1)) * 100))

  const serviceBreakdown = completedJobs.reduce<Record<string, number>>((acc, job) => {
    const key = (job.description || 'General service').slice(0, 48)
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
  const topServices = Object.entries(serviceBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)

  const sevenDaySeries = Array.from({ length: 7 }, (_, idx) => {
    const day = subDays(startOfDay(now), 6 - idx)
    const dayEnd = endOfDay(day)
    const total = safeWeekJobs.filter((job) => {
      const time = new Date(job.scheduled_start)
      return time >= day && time <= dayEnd
    }).length
    const completed = safeWeekJobs.filter((job) => {
      const time = new Date(job.scheduled_start)
      return time >= day && time <= dayEnd && job.status === 'completed'
    }).length
    const completedHours = safeWeekJobs.reduce((sum, job) => {
      const time = new Date(job.scheduled_start)
      if (!(time >= day && time <= dayEnd && job.status === 'completed')) return sum
      if (!job.scheduled_end) return sum
      const startMs = new Date(job.scheduled_start).getTime()
      const endMs = new Date(job.scheduled_end).getTime()
      const duration = Math.max(0, (endMs - startMs) / (1000 * 60 * 60))
      return Number.isFinite(duration) ? sum + duration : sum
    }, 0)

    return {
      label: format(day, 'EEE'),
      total,
      completed,
      completedHours: Number(completedHours.toFixed(1)),
      isToday: format(day, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd'),
    }
  })
  const maxBars = Math.max(...sevenDaySeries.map((d) => d.total), 1)

  return (
    <div className="space-y-6 px-4 pb-24">
      <section className="relative overflow-hidden rounded-[2.5rem] bg-white/30 px-5 py-7 shadow-2xl ring-1 ring-slate-200/50 backdrop-blur-2xl dark:bg-slate-900/30 dark:ring-slate-800/50 sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.15),transparent_60%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.25),transparent_60%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-500 dark:text-cyan-400">Performance Intelligence</p>
            <h1 className="mt-2 font-display-soft text-4xl font-black tracking-tighter text-slate-900 dark:text-white sm:text-5xl">Telemetry</h1>
            <p className="mt-1 font-sans text-sm text-slate-600 dark:text-slate-300">
              Personal productivity, revenue quality, and delivery reliability in one board.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Completed"
              value={String(completedJobs.length)}
              helper={`${completedThisWeek} this week`}
            />
            <MetricCard
              label="Revenue"
              value={`$${totalRevenue.toFixed(0)}`}
              helper={`$${monthRevenue.toFixed(0)} this month`}
            />
            <MetricCard
              label="Hourly"
              value={`$${realizedHourly.toFixed(0)}/h`}
              helper={`${totalHoursWorked.toFixed(1)} logged hours`}
            />
            <MetricCard
              label="Reliability"
              value={`${reliabilityScore}%`}
              helper={`${safeFutureJobs.length} jobs queued next 14d`}
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white/30 p-5 shadow-xl ring-1 ring-slate-200/50 backdrop-blur-xl dark:bg-slate-900/30 dark:ring-slate-800/50 sm:p-6 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="font-display text-2xl uppercase tracking-[0.1em] text-slate-900 dark:text-white">7-Day Throughput</p>
              <p className="font-sans text-xs text-slate-500 dark:text-slate-400">Completed vs booked jobs by day</p>
            </div>
            <BarChart3 className="h-5 w-5 text-cyan-500" />
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[520px] grid-cols-7 gap-2">
              {sevenDaySeries.map((day) => {
                const totalHeight = Math.max((day.total / maxBars) * 100, day.total > 0 ? 12 : 0)
                const completedHeight = day.total > 0 ? (day.completed / day.total) * totalHeight : 0

                return (
                  <div key={day.label} className="group flex flex-col items-center gap-2">
                    <button
                      type="button"
                      aria-label={`${day.label}: ${day.completed} completed jobs, ${day.completedHours.toFixed(1)} hours worked`}
                      title={`${day.completed} completed jobs, ${day.completedHours.toFixed(1)}h worked`}
                      className="group relative flex h-40 w-full items-end justify-center rounded-2xl bg-gradient-to-b from-cyan-50/80 to-cyan-100/60 p-1.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] ring-1 ring-cyan-200/70 touch-manipulation transition-all duration-200 hover:ring-cyan-300/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:from-cyan-950/40 dark:to-cyan-900/30 dark:ring-cyan-700/45 dark:hover:ring-cyan-500/40"
                    >
                      <div className="relative h-full w-full overflow-hidden rounded-xl bg-gradient-to-b from-cyan-100/80 to-cyan-200/60 dark:from-cyan-900/50 dark:to-cyan-950/45">
                        <div
                          className="absolute inset-x-0 bottom-0 rounded-xl bg-cyan-400/35 transition-all duration-700 dark:bg-cyan-400/30"
                          style={{ height: `${totalHeight}%` }}
                        />
                        <div
                          className="absolute inset-x-0 bottom-0 rounded-xl bg-gradient-to-t from-cyan-700 via-cyan-500 to-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.55)] transition-all duration-700 ease-out dark:from-cyan-500/85 dark:via-cyan-400/85 dark:to-cyan-200/80"
                          style={{ height: `${completedHeight}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20" />
                        </div>
                      </div>
                      <div className="pointer-events-none absolute bottom-[104%] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-700 opacity-0 shadow-sm transition-all duration-150 group-hover:-translate-y-1 group-hover:opacity-100 group-focus:-translate-y-1 group-focus:opacity-100 group-active:-translate-y-1 group-active:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {day.completed} completed | {day.completedHours.toFixed(1)}h
                      </div>
                    </button>
                    <p className={`font-mono text-[11px] ${day.isToday ? 'text-cyan-600 dark:text-cyan-300' : 'text-slate-500 dark:text-slate-400'}`}>
                      {day.label}
                    </p>
                    <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{day.completed}/{day.total}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-white/30 p-5 shadow-xl ring-1 ring-slate-200/50 backdrop-blur-xl dark:bg-slate-900/30 dark:ring-slate-800/50 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-xl uppercase tracking-[0.1em] text-slate-900 dark:text-white">Ops Pulse</p>
              <Gauge className="h-5 w-5 text-cyan-500" />
            </div>
            <div className="space-y-3">
              <PulseRow icon={<TrendingUp className="h-4 w-4" />} label="Completion Rate" value={`${completionRate}%`} tone="cyan" />
              <PulseRow icon={<Clock3 className="h-4 w-4" />} label="Active Right Now" value={String(activeNow)} tone="amber" />
              <PulseRow icon={<DollarSign className="h-4 w-4" />} label="Average Job Value" value={`$${avgJobValue.toFixed(0)}`} tone="emerald" />
              <PulseRow icon={<Sparkles className="h-4 w-4" />} label="Cancelled Jobs" value={String(cancellationCount)} tone="rose" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2.5rem] bg-white/30 p-5 shadow-xl ring-1 ring-slate-200/50 backdrop-blur-xl dark:bg-slate-900/30 dark:ring-slate-800/50 sm:p-6">
            <p className="font-display text-xl uppercase tracking-[0.1em] text-slate-900 dark:text-white">Top Work Types</p>
            <p className="mt-1 font-sans text-xs text-slate-500 dark:text-slate-400">Based on completed job descriptions</p>

            {topServices.length === 0 ? (
              <p className="mt-4 font-sans text-sm text-slate-500 dark:text-slate-400">No completed jobs yet.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {topServices.map(([name, count], index) => (
                  <div key={`${name}-${index}`} className="flex items-center justify-between rounded-2xl bg-white/50 px-4 py-3 ring-1 ring-slate-200/50 transition-colors hover:bg-white/80 dark:bg-slate-950/20 dark:ring-slate-800/50 dark:hover:bg-slate-950/40">
                    <p className="truncate font-sans text-sm text-slate-700 dark:text-slate-200">{name}</p>
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function PulseRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode
  label: string
  value: string
  tone: 'cyan' | 'amber' | 'emerald' | 'rose'
}) {
  const toneClass =
    tone === 'cyan'
      ? 'border-cyan-300/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
      : tone === 'amber'
        ? 'border-amber-300/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
        : tone === 'emerald'
          ? 'border-emerald-300/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          : 'border-rose-300/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'

  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/50 px-4 py-3 ring-1 ring-slate-200/50 transition-colors hover:bg-white/80 dark:bg-slate-950/20 dark:ring-slate-800/50 dark:hover:bg-slate-950/40">
      <div className="flex items-center gap-3">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${toneClass} shadow-sm`}>
          {icon}
        </span>
        <span className="font-sans text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      </div>
      <span className="font-mono text-sm font-black tracking-tight text-slate-900 dark:text-white drop-shadow-sm">{value}</span>
    </div>
  )
}
