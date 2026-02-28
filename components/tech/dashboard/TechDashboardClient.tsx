'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { endOfDay, format, isSameDay, subDays, subMonths } from 'date-fns'
import { ChevronDown } from '@/components/ui/icons'

import DispatchJobCard from '@/components/tech/DispatchJobCard'
import TechAIAssistantPanel from '@/components/tech/TechAIAssistantPanel'

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
  services?: Array<{
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
  }> | null
}

interface WeekJob {
  scheduled_start: string
  scheduled_end: string | null
  status: string
}

interface PerformanceJob {
  status: string
  total_cost: number | null
  scheduled_start: string
}

interface TechDashboardClientProps {
  nowIso: string
  dispatchWindowJobs: Job[]
  todayJobs: Job[]
  weekJobs: WeekJob[]
  performanceJobs: PerformanceJob[]
  attentionJobs: Job[]
  userName: string
}

type PerformanceRangeKey = '7d' | '30d' | '6m' | 'all'

const PERFORMANCE_RANGE_OPTIONS: Array<{ key: PerformanceRangeKey; label: string }> = [
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: '6m', label: 'Last 6 Months' },
  { key: 'all', label: 'All Time' },
]

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
  const directService = Array.isArray(job.service) ? job.service[0] : job.service
  const relationService = job.services?.[0]?.service
  const mappedService = Array.isArray(relationService) ? relationService[0] : relationService
  const service = directService || mappedService

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
  helper?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
      {helper ? <p className="mt-1 font-sans text-xs text-slate-500 dark:text-slate-400">{helper}</p> : null}
    </div>
  )
}

export default function TechDashboardClient({
  nowIso,
  dispatchWindowJobs,
  todayJobs,
  weekJobs,
  performanceJobs,
  attentionJobs,
  userName,
}: TechDashboardClientProps) {
  const now = useMemo(() => new Date(nowIso), [nowIso])
  const [performanceRange, setPerformanceRange] = useState<PerformanceRangeKey>('30d')
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false)
  const rangeMenuRef = useRef<HTMLDivElement | null>(null)
  const firstName = userName?.split(' ')[0] || 'Technician'
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const todayEndMs = useMemo(() => endOfDay(now).getTime(), [now])

  const dispatchWindow = useMemo(() => dispatchWindowJobs.map(normalizeJob), [dispatchWindowJobs])
  const today = useMemo(() => {
    const fromServer = todayJobs.map(normalizeJob)
    const fromWindow = dispatchWindow.filter((job) => isSameDay(new Date(job.scheduled_start), now))
    const merged = new Map<string, NormalizedJob>()
    for (const job of fromServer) {
      merged.set(job.id, job)
    }
    for (const job of fromWindow) {
      if (!merged.has(job.id)) {
        merged.set(job.id, job)
      }
    }
    return Array.from(merged.values()).sort(
      (a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
    )
  }, [dispatchWindow, now, todayJobs])

  const todayIds = useMemo(() => new Set(today.map((job) => job.id)), [today])
  const upcoming = useMemo(
    () =>
      dispatchWindow.filter((job) => {
        const startsAt = new Date(job.scheduled_start).getTime()
        return startsAt > todayEndMs && job.status !== 'cancelled' && !todayIds.has(job.id)
      }),
    [dispatchWindow, todayEndMs, todayIds]
  )
  const attention = useMemo(() => attentionJobs.map(normalizeJob), [attentionJobs])
  const nextDispatch = useMemo(() => {
    const nowMs = now.getTime()
    const openToday = today.filter((job) => !['completed', 'cancelled'].includes(job.status))
    const openPipeline = [...today, ...upcoming].filter((job) => !['completed', 'cancelled'].includes(job.status))

    const nextFutureToday = openToday.find((job) => new Date(job.scheduled_start).getTime() >= nowMs)
    if (nextFutureToday) return nextFutureToday

    const nextFuturePipeline = openPipeline.find((job) => new Date(job.scheduled_start).getTime() >= nowMs)
    if (nextFuturePipeline) return nextFuturePipeline

    const activeToday = openToday.find((job) => activeStatuses.has(job.status))
    if (activeToday) return activeToday

    return openToday[0] || openPipeline[0] || null
  }, [now, today, upcoming])
  const aiJobOptions = useMemo(
    () =>
      [...today, ...upcoming].slice(0, 24).map((job) => ({
        id: job.id,
        customerName: job.customer.name,
        serviceName: job.service.name,
        scheduledStart: job.scheduled_start,
        status: job.status,
        description: job.description,
      })),
    [today, upcoming]
  )

  useEffect(() => {
    if (!rangeMenuOpen) return

    const onMouseDown = (event: MouseEvent) => {
      if (!rangeMenuRef.current || rangeMenuRef.current.contains(event.target as Node)) return
      setRangeMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setRangeMenuOpen(false)
    }

    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [rangeMenuOpen])

  const todaySummary = useMemo(() => {
    let active = 0
    let completed = 0

    for (const job of today) {
      if (activeStatuses.has(job.status)) active += 1
      if (job.status === 'completed') completed += 1
    }

    return {
      todayActive: active,
      todayCompleted: completed,
    }
  }, [today])

  const performanceSummary = useMemo(() => {
    const rangeStart =
      performanceRange === '7d'
        ? subDays(now, 6)
        : performanceRange === '30d'
          ? subDays(now, 29)
          : performanceRange === '6m'
            ? subMonths(now, 6)
            : null

    let completed = 0
    let cancelled = 0
    let billed = 0
    let total = 0

    for (const job of performanceJobs) {
      const scheduledAt = job.scheduled_start ? new Date(job.scheduled_start) : null
      if (rangeStart && scheduledAt && scheduledAt < rangeStart) {
        continue
      }

      total += 1
      const cost = Number(job.total_cost) || 0
      if (job.status !== 'cancelled') {
        billed += cost
      }
      if (job.status === 'completed') {
        completed += 1
      } else if (job.status === 'cancelled') {
        cancelled += 1
      }
    }

    return {
      total,
      completed,
      cancelled,
      billed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }, [now, performanceJobs, performanceRange])

  const { todayActive, todayCompleted } = todaySummary
  const { total, completed, cancelled, billed, completionRate } = performanceSummary

  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now)
    date.setDate(now.getDate() - (6 - index))
    return date
  })

  const weekSeries = weekDates.map((date) => {
    let total = 0
    let completed = 0
    let completedHours = 0

    for (const job of weekJobs) {
      const jobDate = new Date(job.scheduled_start)
      if (jobDate.toDateString() !== date.toDateString()) continue
      total += 1
      if (job.status === 'completed') {
        completed += 1
        if (job.scheduled_end) {
          const startedAt = new Date(job.scheduled_start).getTime()
          const endedAt = new Date(job.scheduled_end).getTime()
          const durationHours = Math.max(0, (endedAt - startedAt) / (1000 * 60 * 60))
          if (Number.isFinite(durationHours)) {
            completedHours += durationHours
          }
        }
      }
    }

    return {
      label: format(date, 'EEE'),
      total,
      completed,
      completedHours: Number(completedHours.toFixed(1)),
      isToday: date.toDateString() === now.toDateString(),
    }
  })

  const weekMax = Math.max(...weekSeries.map((d) => d.total), 1)

  const todayDateLabel = format(now, 'EEEE, d MMM yyyy')

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-white to-slate-50 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:from-slate-900 dark:to-slate-950 dark:shadow-[0_8px_30px_rgba(34,211,238,0.06)]">
        <div className="absolute top-0 right-0 -m-16 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl dark:bg-cyan-500/20" />
        <div className="relative">
          <div className="flex items-center justify-between border-b border-slate-200/50 pb-3 dark:border-slate-800/50">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              {todayDateLabel}
            </p>
            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-cyan-700 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-300">
              {todayActive} Active
            </span>
          </div>

          <div className="pt-3">
            <h1 className="font-display-soft text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {greeting}, {firstName}
            </h1>

            <div className="mt-4 flex gap-2">
              <Link
                href="/tech/today"
                className="flex-1 rounded-full bg-cyan-500 py-3 text-center font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-colors hover:bg-cyan-400"
              >
                Open Workflow
              </Link>
              <Link
                href="/tech/schedule"
                className="flex-1 rounded-full bg-slate-900 py-3 text-center font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                Schedule ({today.length})
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 pb-2">
        <KpiCard
          label="Next"
          value={nextDispatch
            ? format(
              new Date(nextDispatch.scheduled_start),
              isSameDay(new Date(nextDispatch.scheduled_start), now) ? 'h:mm a' : 'EEE h:mm a'
            )
            : '--'}
        />
        <KpiCard label="Done" value={todayCompleted} />
      </section>

      <div className="space-y-4 xl:col-span-2">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
            <h2 className="font-display text-lg uppercase tracking-[0.1em] text-slate-900 dark:text-white">Today Queue</h2>
            <Link
              href="/tech/today"
              className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-600 transition-colors hover:text-cyan-500 dark:text-cyan-400"
            >
              Expand
            </Link>
          </div>

          {today.length === 0 ? (
            <div className="p-8 text-center">
              <p className="mt-3 font-sans text-sm text-slate-600 dark:text-slate-300">No jobs scheduled today.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {today.slice(0, 3).map((job) => (
                <DispatchJobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-xl uppercase tracking-[0.1em] text-slate-900 dark:text-white">Attention Required</h3>
          </div>
          {attention.length === 0 ? (
            <p className="mt-3 font-sans text-xs text-emerald-600 dark:text-emerald-400">
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
            <h3 className="font-display text-xl uppercase tracking-[0.1em] text-slate-900 dark:text-white">Performance Snapshot</h3>
            <div className="relative" ref={rangeMenuRef}>
              <button
                type="button"
                onClick={() => setRangeMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan-700 transition-colors hover:border-cyan-300 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-300"
              >
                {PERFORMANCE_RANGE_OPTIONS.find((option) => option.key === performanceRange)?.label || 'Last 30 Days'}
                <ChevronDown className={`h-3 w-3 transition-transform ${rangeMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {rangeMenuOpen ? (
                <div className="absolute right-0 top-full z-30 mt-2 w-44 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  {PERFORMANCE_RANGE_OPTIONS.map((option) => {
                    const active = option.key === performanceRange
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => {
                          setPerformanceRange(option.key)
                          setRangeMenuOpen(false)
                        }}
                        className={`w-full rounded-xl px-3 py-2 text-left font-sans text-xs font-semibold transition-colors ${active
                          ? 'bg-cyan-500 text-slate-950'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                          }`}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-end justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Completion Rate</p>
              <p className="font-display text-3xl text-slate-900 dark:text-slate-100">{completionRate}%</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Completed</p>
                <p className="mt-1 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {completed}/{total}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Cancelled</p>
                <p className="mt-1 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{cancelled}</p>
              </div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-400/25 dark:bg-emerald-400/10">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">Billed Value</p>
              <p className="mt-1 font-display text-2xl text-emerald-700 dark:text-emerald-300">${billed.toFixed(0)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl uppercase tracking-[0.1em] text-slate-900 dark:text-white">Workload Pulse (7d)</h3>
            <span className="text-xs font-mono text-blue-600 dark:text-cyan-300">7d</span>
          </div>
          <div className="mt-4 flex h-36 items-end gap-2">
            {weekSeries.map((day) => {
              const bookedHeight = Math.max((day.total / weekMax) * 100, day.total > 0 ? 12 : 2)
              const completedHeight = day.total > 0 ? (day.completed / day.total) * bookedHeight : 0

              return (
                <div key={day.label} className="flex flex-1 flex-col items-center gap-1">
                  <button
                    type="button"
                    aria-label={`${day.label}: ${day.completed} completed jobs, ${day.completedHours.toFixed(1)} hours worked`}
                    className="group relative flex h-28 w-full items-end rounded-xl bg-gradient-to-b from-cyan-50/80 to-cyan-100/60 p-1 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] ring-1 ring-cyan-200/70 touch-manipulation transition-all duration-200 hover:ring-cyan-300/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:from-cyan-950/40 dark:to-cyan-900/30 dark:ring-cyan-700/40 dark:hover:ring-cyan-500/40"
                    title={`${day.completed} completed jobs, ${day.completedHours.toFixed(1)}h worked`}
                  >
                    <div className="absolute inset-[4px] overflow-hidden rounded-lg bg-gradient-to-b from-cyan-100/80 to-cyan-200/60 dark:from-cyan-900/50 dark:to-cyan-950/45">
                      <div
                        className="absolute inset-x-0 bottom-0 rounded-lg bg-cyan-400/35 transition-all duration-700 dark:bg-cyan-400/30"
                        style={{ height: `${bookedHeight}%` }}
                      />
                      <div
                        className={`absolute inset-x-0 bottom-0 rounded-lg transition-all duration-700 ${day.isToday
                          ? 'bg-gradient-to-t from-blue-600 via-cyan-500 to-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.45)]'
                          : 'bg-gradient-to-t from-cyan-700/90 via-cyan-500/90 to-cyan-300/85 dark:from-cyan-500/85 dark:via-cyan-400/85 dark:to-cyan-200/80'
                          }`}
                        style={{ height: `${completedHeight}%` }}
                      />
                    </div>
                    <div className="pointer-events-none absolute bottom-[104%] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-700 opacity-0 shadow-sm transition-all duration-150 group-hover:-translate-y-1 group-hover:opacity-100 group-focus:-translate-y-1 group-focus:opacity-100 group-active:-translate-y-1 group-active:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      {day.completed} completed | {day.completedHours.toFixed(1)}h
                    </div>
                  </button>
                  <p className={`font-mono text-[10px] ${day.isToday ? 'text-blue-600 dark:text-cyan-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    {day.label}
                  </p>
                  <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{day.completed}/{day.total}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl uppercase tracking-[0.1em] text-slate-900 dark:text-white">Upcoming Dispatches</h3>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Pipeline</span>
          </div>
          {upcoming.length === 0 ? (
            <p className="mt-3 font-sans text-xs text-slate-500 dark:text-slate-400">No upcoming jobs in pipeline.</p>
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
      </div>
    </div>
  )
}
