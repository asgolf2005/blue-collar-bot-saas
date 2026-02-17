'use client'

import Link from 'next/link'
import { differenceInMinutes, format } from 'date-fns'

import DispatchJobCard from '@/components/tech/DispatchJobCard'

interface Job {
  id: string
  scheduled_start: string
  scheduled_end: string
  status: string
  description: string | null
  urgency: string | null
  total_cost: number | null
  customer:
    | {
        id: string
        name: string
        phone: string | null
        address: string | null
      }
    | {
        id: string
        name: string
        phone: string | null
        address: string | null
      }[]
    | null
  service?:
    | {
        name: string
        category: string | null
      }
    | {
        name: string
        category: string | null
      }[]
    | null
    | undefined
}

interface WeekJob {
  scheduled_start: string
  status: string
}

interface MonthJob {
  status: string
  total_cost: number | null
}

interface TechDashboardClientProps {
  nextJob: Job | null
  todayJobs: Job[]
  upcomingJobs: Job[]
  weekJobs: WeekJob[]
  monthJobs: MonthJob[]
  attentionJobs: Job[]
  userName: string
}

type NormalizedJob = Omit<Job, 'customer' | 'service'> & {
  customer: {
    id: string
    name: string
    phone: string | null
    address: string | null
  }
  service: {
    name: string
    category: string | null
  }
}

const fallbackCustomer = { id: '', name: 'Unknown customer', phone: null, address: null }
const fallbackService = { name: 'General service', category: null }
const activeStatuses = new Set(['on_the_way', 'arrived', 'in_progress'])

const formatStatusLabel = (status: string) =>
  status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const normalizeJob = (job: Job): NormalizedJob => {
  const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer
  const service = Array.isArray(job.service) ? job.service[0] : job.service

  return {
    ...job,
    customer: customer || fallbackCustomer,
    service: service || fallbackService,
  }
}

function KpiCard({
  label,
  value,
  helper,
}: {
  label: string
  value: string | number
  helper: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-display text-3xl text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">{helper}</p>
    </div>
  )
}

export default function TechDashboardClient({
  nextJob,
  todayJobs,
  upcomingJobs,
  weekJobs,
  monthJobs,
  attentionJobs,
  userName,
}: TechDashboardClientProps) {
  const now = new Date()
  const firstName = userName?.split(' ')[0] || 'Technician'
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  const today = todayJobs.map(normalizeJob)
  const upcoming = upcomingJobs.map(normalizeJob)
  const attention = attentionJobs.map(normalizeJob)
  const nextDispatch = nextJob ? normalizeJob(nextJob) : null

  const todayActive = today.filter((job) => activeStatuses.has(job.status)).length
  const todayCompleted = today.filter((job) => job.status === 'completed').length
  const dueSoon = today.filter((job) => {
    if (job.status !== 'scheduled') return false
    const minutes = differenceInMinutes(new Date(job.scheduled_start), now)
    return minutes >= 0 && minutes <= 120
  }).length

  const monthTotal = monthJobs.length
  const monthCompleted = monthJobs.filter((job) => job.status === 'completed').length
  const monthCancelled = monthJobs.filter((job) => job.status === 'cancelled').length
  const monthRevenue = monthJobs
    .filter((job) => job.status === 'completed')
    .reduce((sum, job) => sum + (Number(job.total_cost) || 0), 0)
  const monthCompletionRate = monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0

  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now)
    date.setDate(now.getDate() - (6 - index))
    return date
  })

  const weekSeries = weekDates.map((date) => {
    const dayJobs = weekJobs.filter((job) => {
      const jobDate = new Date(job.scheduled_start)
      return jobDate.toDateString() === date.toDateString()
    })

    return {
      label: format(date, 'EEE'),
      total: dayJobs.length,
      completed: dayJobs.filter((job) => job.status === 'completed').length,
      isToday: date.toDateString() === now.toDateString(),
    }
  })
  const weekMax = Math.max(...weekSeries.map((d) => d.total), 1)

  const todayDateLabel = format(now, 'EEEE, d MMM yyyy')

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_40%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.2),transparent_40%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Technician Command</p>
            <h1 className="mt-2 font-display text-4xl tracking-wide text-slate-900 dark:text-white sm:text-5xl">
              {greeting}, {firstName}
            </h1>
            <p className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{todayDateLabel}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {today.length} Jobs Today
              </span>
              <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan-700 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-300">
                {todayActive} Active Now
              </span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300">
                {attention.length} Needs Attention
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/tech/today"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-white transition-colors hover:bg-blue-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
            >
              Open Today
            </Link>
            <Link
              href="/tech/schedule"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Full Schedule
            </Link>
            <Link
              href="/tech/stats"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              My Performance
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Next Dispatch"
          value={nextDispatch ? format(new Date(nextDispatch.scheduled_start), 'h:mm a') : '--'}
          helper={nextDispatch ? `${nextDispatch.customer.name} - ${nextDispatch.service.name}` : 'No upcoming dispatch'}
        />
        <KpiCard label="Active Jobs" value={todayActive} helper={`${dueSoon} due in next 2 hours`} />
        <KpiCard label="Completed Today" value={todayCompleted} helper={`${today.length - todayCompleted} remaining`} />
        <KpiCard label="Upcoming (7d)" value={upcoming.length} helper="Scheduled from tomorrow onward" />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
              <div>
                <h2 className="font-display text-2xl tracking-wide text-slate-900 dark:text-white">Today Dispatch Queue</h2>
                <p className="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Tap any job to open full field workflow
                </p>
              </div>
              <Link
                href="/tech/today"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                View All
              </Link>
            </div>

            {today.length === 0 ? (
              <div className="p-8 text-center">
                <p className="mt-3 font-mono text-sm text-slate-600 dark:text-slate-300">No jobs scheduled today.</p>
              </div>
            ) : (
              <div className="space-y-3 p-4 sm:p-5">
                {today.map((job) => (
                  <DispatchJobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-xl tracking-wide text-slate-900 dark:text-white">Attention Required</h3>
            </div>
            {attention.length === 0 ? (
              <p className="mt-3 font-mono text-xs uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">
                No overdue active jobs. Operations are on track.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {attention.slice(0, 5).map((job) => (
                  <Link
                    key={job.id}
                    href={`/tech/jobs/${job.id}`}
                    className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-400/25 dark:bg-amber-400/10"
                  >
                    <div>
                      <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
                        {job.customer.name}
                      </p>
                      <p className="font-mono text-[11px] text-amber-700/80 dark:text-amber-300/80">
                        {format(new Date(job.scheduled_start), 'd MMM, h:mm a')} - {formatStatusLabel(job.status)}
                      </p>
                    </div>
                    <span className="text-xs font-mono text-amber-700 dark:text-amber-300">Open</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl tracking-wide text-slate-900 dark:text-white">Performance Snapshot</h3>
              <span className="text-xs font-mono text-cyan-600 dark:text-cyan-300">MTD</span>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-end justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Completion This Month</p>
                <p className="font-display text-3xl text-slate-900 dark:text-slate-100">{monthCompletionRate}%</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                  style={{ width: `${monthCompletionRate}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Completed</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {monthCompleted}/{monthTotal}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Cancelled</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{monthCancelled}</p>
                </div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-400/25 dark:bg-emerald-400/10">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">Completed Revenue</p>
                <p className="mt-1 font-display text-2xl text-emerald-700 dark:text-emerald-300">${monthRevenue.toFixed(0)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl tracking-wide text-slate-900 dark:text-white">Workload Pulse (7d)</h3>
              <span className="text-xs font-mono text-blue-600 dark:text-cyan-300">7d</span>
            </div>
            <div className="mt-4 flex h-36 items-end gap-2">
              {weekSeries.map((day) => (
                <div key={day.label} className="flex flex-1 flex-col items-center gap-1">
                  <div className="relative flex h-28 w-full items-end overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`w-full rounded-md ${
                        day.isToday
                          ? 'bg-gradient-to-t from-blue-600 to-cyan-500'
                          : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                      style={{ height: `${Math.max((day.total / weekMax) * 100, day.total > 0 ? 12 : 2)}%` }}
                    />
                  </div>
                  <p className={`font-mono text-[10px] ${day.isToday ? 'text-blue-600 dark:text-cyan-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    {day.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl tracking-wide text-slate-900 dark:text-white">Upcoming Dispatches</h3>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Next</span>
            </div>
            {upcoming.length === 0 ? (
              <p className="mt-3 font-mono text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">No upcoming jobs in next 7 days.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {upcoming.slice(0, 5).map((job) => (
                  <Link
                    key={job.id}
                    href={`/tech/jobs/${job.id}`}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-200">
                        {job.customer.name}
                      </p>
                      <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {format(new Date(job.scheduled_start), 'EEE d MMM, h:mm a')}
                      </p>
                    </div>
                    <span className="text-xs font-mono text-slate-400">Open</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-display text-xl tracking-wide text-slate-900 dark:text-white">Action Dock</h3>
            <div className="mt-3 space-y-2">
              <Link
                href="/tech/today"
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Open Active Jobs
              </Link>
              <Link
                href="/tech/schedule"
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Open Calendar
              </Link>
              <Link
                href="/tech/stats"
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                View My Stats
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
