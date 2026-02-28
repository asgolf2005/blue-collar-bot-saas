'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  addDays,
  addHours,
  addMonths,
  addWeeks,
  differenceInMinutes,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isPast,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns'
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Search,
  X,
} from '@/components/ui/icons'

type ScheduleView = 'day' | 'week' | 'month'
type StatusKey =
  | 'scheduled'
  | 'on_the_way'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export interface TechScheduleJob {
  id: string
  status: string
  scheduled_start: string
  scheduled_end: string | null
  description: string | null
  total_cost?: number | null
  customer: {
    id: string
    name: string
    phone?: string | null
    address?: string | null
  } | null
  service_names?: string[]
}

const STATUS_CONFIG: Record<
  StatusKey,
  { dot: string; label: string; bg: string; rail: string; glow: string }
> = {
  scheduled: {
    dot: 'bg-slate-400',
    label: 'Scheduled',
    bg: 'bg-slate-50 dark:bg-slate-800/40 ring-1 ring-slate-200 dark:ring-slate-700/50',
    rail: 'before:bg-slate-400',
    glow: '',
  },
  on_the_way: {
    dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
    label: 'En Route',
    bg: 'bg-amber-400/10 dark:bg-amber-400/10 ring-1 ring-amber-400/30',
    rail: 'before:bg-amber-400',
    glow: 'shadow-[0_0_30px_rgba(251,191,36,0.15)] ring-1 ring-amber-400/30',
  },
  arrived: {
    dot: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]',
    label: 'Arrived',
    bg: 'bg-blue-400/10 dark:bg-blue-400/10 ring-1 ring-blue-400/30',
    rail: 'before:bg-blue-400',
    glow: 'shadow-[0_0_30px_rgba(96,165,250,0.15)] ring-1 ring-blue-400/30',
  },
  in_progress: {
    dot: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]',
    label: 'In Progress',
    bg: 'bg-cyan-400/10 dark:bg-cyan-400/10 ring-1 ring-cyan-400/30',
    rail: 'before:bg-cyan-400',
    glow: 'shadow-[0_0_30px_rgba(34,211,238,0.15)] ring-1 ring-cyan-400/30',
  },
  completed: {
    dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
    label: 'Completed',
    bg: 'bg-emerald-400/10 dark:bg-emerald-400/10 ring-1 ring-emerald-400/30',
    rail: 'before:bg-emerald-400',
    glow: 'shadow-[0_0_30px_rgba(52,211,153,0.15)] ring-1 ring-emerald-400/30',
  },
  cancelled: {
    dot: 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]',
    label: 'Cancelled',
    bg: 'bg-rose-400/10 dark:bg-rose-400/10 ring-1 ring-rose-400/30',
    rail: 'before:bg-rose-400',
    glow: '',
  },
}

const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ')

function parseJobDate(dateStr: string): Date {
  const parsed = new Date(dateStr)
  if (!Number.isNaN(parsed.getTime())) return parsed
  return new Date()
}

function parseMinutes(value: string): number | null {
  const v = value.trim()
  if (!v) return null
  const [hRaw, mRaw] = v.split(':')
  const h = Number(hRaw)
  const m = Number(mRaw)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

function getRange(date: Date, view: ScheduleView) {
  if (view === 'day') {
    const start = startOfDay(date)
    return { start, endExclusive: addDays(start, 1) }
  }
  if (view === 'week') {
    const start = startOfWeek(date, { weekStartsOn: 1 })
    return { start, endExclusive: addDays(start, 7) }
  }
  const start = startOfMonth(date)
  return { start, endExclusive: addMonths(start, 1) }
}

function rangeLabel(date: Date, view: ScheduleView) {
  if (view === 'day') return format(date, 'MMM d, yyyy')
  if (view === 'week') {
    const start = startOfWeek(date, { weekStartsOn: 1 })
    const end = endOfWeek(date, { weekStartsOn: 1 })
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d')}`
  }
  return format(date, 'MMMM yyyy')
}

function JobCard({ job }: { job: TechScheduleJob }) {
  const scheduled = parseJobDate(job.scheduled_start)
  const statusKey = (job.status as StatusKey) in STATUS_CONFIG ? (job.status as StatusKey) : 'scheduled'
  const status = STATUS_CONFIG[statusKey]
  const isOverdue = isPast(scheduled) && job.status === 'scheduled'
  const servicePreview = (job.service_names || []).slice(0, 2).join(', ')

  return (
    <Link
      href={`/tech/jobs/${job.id}`}
      className={cx(
        'group relative overflow-hidden block rounded-3xl bg-white/40 dark:bg-slate-900/40 px-5 py-4 backdrop-blur-xl',
        'hover:-translate-y-0.5 transition-all duration-300',
        'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5',
        status.rail,
        status.glow || 'ring-1 ring-slate-200/50 dark:ring-slate-800/50 shadow-sm',
        isOverdue && 'ring-1 ring-rose-300/60 dark:ring-rose-500/25'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <h3 className="text-base font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
          {job.customer?.name || 'Unknown Customer'}
        </h3>
        <span className={cx('inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest whitespace-nowrap', status.bg, 'text-slate-700 dark:text-white drop-shadow-sm')}>
          <span className={cx('w-1.5 h-1.5 rounded-full', status.dot)} />
          {status.label}
        </span>
      </div>

      <div className="flex items-center text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
        <Clock3 className="w-4 h-4 mr-1.5" />
        {format(scheduled, 'h:mm a')} - {format(job.scheduled_end ? parseJobDate(job.scheduled_end) : addHours(scheduled, 2), 'h:mm a')}
      </div>

      {job.customer?.address && (
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{job.customer.address}</p>
      )}

      {(job.description || servicePreview) && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
          {job.description || servicePreview}
        </p>
      )}
    </Link>
  )
}

function WeekView({
  date,
  jobs,
  onSelectDay,
}: {
  date: Date
  jobs: TechScheduleJob[]
  onSelectDay: (day: Date) => void
}) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  return (
    <div className="p-4 space-y-3">
      {days.map((day) => {
        const dayJobs = jobs.filter((j) => isSameDay(parseJobDate(j.scheduled_start), day))
        const isToday = isSameDay(day, new Date())
        return (
          <div
            key={day.toISOString()}
            className={cx(
              'rounded-[2rem] bg-white/40 dark:bg-slate-900/40 ring-1 ring-slate-200/50 dark:ring-slate-800/50 overflow-hidden backdrop-blur-xl',
              isToday && 'ring-2 ring-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.15)] ring-offset-2 ring-offset-transparent'
            )}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/20 dark:bg-slate-950/20">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  {format(day, 'EEEE')}
                </p>
                <button
                  type="button"
                  onClick={() => onSelectDay(day)}
                  className="text-base font-semibold text-slate-900 transition-colors hover:text-cyan-600 dark:text-slate-100 dark:hover:text-cyan-300"
                >
                  {format(day, 'MMM d')}
                </button>
              </div>
              <span className="text-xs font-mono rounded-full px-2.5 py-1 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {dayJobs.length} {dayJobs.length === 1 ? 'job' : 'jobs'}
              </span>
            </div>

            <div className="p-3">
              {dayJobs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/20 p-5 text-center">
                  <p className="text-xs font-mono uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">No jobs</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
                  {dayJobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MonthView({
  date,
  jobs,
  onSelectDay,
}: {
  date: Date
  jobs: TechScheduleJob[]
  onSelectDay: (day: Date) => void
}) {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  return (
    <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/30">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
        <div key={d} className="px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          {d}
        </div>
      ))}
      <div className="col-span-7 grid grid-cols-7 border-t border-slate-200 dark:border-slate-800">
        {days.map((day) => {
          const dayJobs = jobs.filter((j) => isSameDay(parseJobDate(j.scheduled_start), day))
          const isCurrentMonth = day.getMonth() === date.getMonth()
          const isToday = isSameDay(day, new Date())
          return (
            <div
              key={day.toISOString()}
              className={cx(
                'min-h-[120px] border-r border-b border-slate-200 dark:border-slate-800 p-2 bg-white/90 dark:bg-slate-900/70',
                !isCurrentMonth && 'bg-slate-50/60 dark:bg-slate-950/20',
                isToday && 'shadow-[inset_0_0_0_1px_rgba(34,211,238,0.35)]'
              )}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onSelectDay(day)}
                  className={cx(
                    'text-xs font-mono tabular-nums transition-colors hover:text-cyan-600 dark:hover:text-cyan-300',
                    isCurrentMonth ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'
                  )}
                >
                  {format(day, 'd')}
                </button>
                {dayJobs.length > 0 ? (
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{dayJobs.length}</span>
                ) : null}
              </div>

              <div className="mt-1 space-y-1">
                {dayJobs.slice(0, 3).map((job) => {
                  const scheduled = parseJobDate(job.scheduled_start)
                  const statusKey = (job.status as StatusKey) in STATUS_CONFIG ? (job.status as StatusKey) : 'scheduled'
                  const status = STATUS_CONFIG[statusKey]
                  return (
                    <Link
                      key={job.id}
                      href={`/tech/jobs/${job.id}`}
                      className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] bg-slate-50 dark:bg-slate-950/20 border border-slate-200/70 dark:border-slate-800/70 hover:border-cyan-300/70 dark:hover:border-cyan-500/40 transition-colors"
                    >
                      <span className={cx('h-1.5 w-1.5 rounded-full', status.dot)} />
                      <span className="text-slate-500 dark:text-slate-400 tabular-nums">{format(scheduled, 'H:mm')}</span>
                      <span className="truncate text-slate-700 dark:text-slate-200">{job.customer?.name || 'Unknown'}</span>
                    </Link>
                  )
                })}
                {dayJobs.length > 3 ? (
                  <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 px-2">
                    +{dayJobs.length - 3} more
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function TechScheduleClient({
  initialJobs,
  todayIso,
}: {
  initialJobs: TechScheduleJob[]
  todayIso: string
}) {
  const today = useMemo(() => new Date(todayIso), [todayIso])
  const [view, setView] = useState<ScheduleView>('week')
  const [currentDate, setCurrentDate] = useState<Date>(today)
  const [jumpDate, setJumpDate] = useState<string>(format(today, 'yyyy-MM-dd'))

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [serviceFilter, setServiceFilter] = useState<string>('all')
  const [dateFromFilter, setDateFromFilter] = useState<string>('')
  const [dateToFilter, setDateToFilter] = useState<string>('')
  const [timeFromFilter, setTimeFromFilter] = useState<string>('')
  const [timeToFilter, setTimeToFilter] = useState<string>('')

  useEffect(() => {
    setJumpDate(format(currentDate, 'yyyy-MM-dd'))
  }, [currentDate])

  const serviceOptions = useMemo(() => {
    const set = new Set<string>()
    for (const job of initialJobs) {
      for (const name of job.service_names || []) set.add(name)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [initialJobs])

  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const dateFrom = dateFromFilter ? new Date(`${dateFromFilter}T00:00:00`) : null
    const dateTo = dateToFilter ? new Date(`${dateToFilter}T23:59:59`) : null
    const timeFrom = parseMinutes(timeFromFilter)
    const timeTo = parseMinutes(timeToFilter)
    const { start, endExclusive } = getRange(currentDate, view)

    return initialJobs
      .filter((job) => {
        const scheduled = parseJobDate(job.scheduled_start)
        return scheduled >= start && scheduled < endExclusive
      })
      .filter((job) => {
        if (q && !(job.customer?.name || '').toLowerCase().includes(q)) return false
        if (statusFilter !== 'all' && job.status !== statusFilter) return false
        if (serviceFilter !== 'all' && !(job.service_names || []).some((name) => name === serviceFilter)) return false

        const scheduled = parseJobDate(job.scheduled_start)
        if (dateFrom && scheduled < dateFrom) return false
        if (dateTo && scheduled > dateTo) return false

        if (timeFrom !== null || timeTo !== null) {
          const mins = scheduled.getHours() * 60 + scheduled.getMinutes()
          if (timeFrom !== null && timeTo !== null) {
            if (timeFrom <= timeTo) {
              if (mins < timeFrom || mins > timeTo) return false
            } else if (mins < timeFrom && mins > timeTo) {
              return false
            }
          } else if (timeFrom !== null) {
            if (mins < timeFrom) return false
          } else if (timeTo !== null) {
            if (mins > timeTo) return false
          }
        }

        return true
      })
      .sort((a, b) => parseJobDate(a.scheduled_start).getTime() - parseJobDate(b.scheduled_start).getTime())
  }, [
    initialJobs,
    currentDate,
    view,
    searchQuery,
    statusFilter,
    serviceFilter,
    dateFromFilter,
    dateToFilter,
    timeFromFilter,
    timeToFilter,
  ])

  const completedCount = useMemo(
    () => filteredJobs.filter((job) => job.status === 'completed').length,
    [filteredJobs]
  )
  const activeCount = useMemo(
    () => filteredJobs.filter((job) => ['on_the_way', 'arrived', 'in_progress'].includes(job.status)).length,
    [filteredJobs]
  )
  const totalMinutes = useMemo(
    () =>
      filteredJobs.reduce((sum, job) => {
        const start = parseJobDate(job.scheduled_start)
        const end = job.scheduled_end ? parseJobDate(job.scheduled_end) : addHours(start, 2)
        const delta = differenceInMinutes(end, start)
        return sum + (delta > 0 ? delta : 120)
      }, 0),
    [filteredJobs]
  )
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (searchQuery.trim()) count += 1
    if (statusFilter !== 'all') count += 1
    if (serviceFilter !== 'all') count += 1
    if (dateFromFilter) count += 1
    if (dateToFilter) count += 1
    if (timeFromFilter) count += 1
    if (timeToFilter) count += 1
    return count
  }, [searchQuery, statusFilter, serviceFilter, dateFromFilter, dateToFilter, timeFromFilter, timeToFilter])

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setServiceFilter('all')
    setDateFromFilter('')
    setDateToFilter('')
    setTimeFromFilter('')
    setTimeToFilter('')
  }

  const goToday = () => setCurrentDate(today)
  const goPrev = () => setCurrentDate((d) => (view === 'day' ? subDays(d, 1) : view === 'week' ? subWeeks(d, 1) : subMonths(d, 1)))
  const goNext = () => setCurrentDate((d) => (view === 'day' ? addDays(d, 1) : view === 'week' ? addWeeks(d, 1) : addMonths(d, 1)))
  const openDay = (day: Date) => {
    setCurrentDate(day)
    setJumpDate(format(day, 'yyyy-MM-dd'))
    setView('day')
  }

  const applyJumpDate = () => {
    if (!jumpDate) return
    const parsed = new Date(`${jumpDate}T00:00:00`)
    if (Number.isNaN(parsed.getTime())) return
    openDay(parsed)
  }

  return (
    <div className="space-y-4 pb-12">
      <div className="relative">
        <div className="relative z-20 flex flex-col gap-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <h1 className="font-display-soft text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Schedule</h1>
              <p className="mt-1 font-sans text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-cyan-400">
                {activeFiltersCount
                  ? `${filteredJobs.length} jobs shown - ${totalHours}h`
                  : `${filteredJobs.length} jobs - ${totalHours}h`}
              </p>
            </div>

            <div className="relative z-40 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={goToday}
                className="inline-flex items-center justify-center rounded-2xl bg-white/40 px-4 py-2 ring-1 ring-slate-200/50 backdrop-blur-xl font-sans text-xs font-bold uppercase tracking-[0.12em] text-slate-700 transition-colors hover:bg-slate-50 dark:bg-slate-900/40 dark:ring-slate-800/50 dark:text-slate-200 dark:hover:bg-slate-800/60"
              >
                Today
              </button>

              <div className="flex items-center rounded-2xl bg-white/40 ring-1 ring-slate-200/50 backdrop-blur-xl dark:bg-slate-900/40 dark:ring-slate-800/50 overflow-hidden">
                <button type="button" onClick={goPrev} className="h-10 w-10 flex items-center justify-center border-r border-slate-200/20 text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 min-w-[170px] text-center">
                  {rangeLabel(currentDate, view)}
                </span>
                <button type="button" onClick={goNext} className="h-8 w-8 flex items-center justify-center border-l border-slate-100 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center rounded-2xl bg-white/40 ring-1 ring-slate-200/50 backdrop-blur-xl dark:bg-slate-900/40 dark:ring-slate-800/50 overflow-hidden p-1">
                {(['day', 'week', 'month'] as const).map((v, index) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    className={cx(
                      'h-8 rounded-xl px-4 font-sans text-xs font-bold uppercase tracking-widest transition-all',
                      view === v
                        ? 'bg-cyan-500 text-slate-950 shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <div className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-2 py-1 dark:border-slate-700 dark:bg-slate-900/80 md:inline-flex">
                <input
                  type="date"
                  value={jumpDate}
                  onChange={(e) => setJumpDate(e.target.value)}
                  className="rounded-full border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] text-slate-700 outline-none focus:border-cyan-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                />
                <button
                  type="button"
                  onClick={applyJumpDate}
                  className="rounded-full bg-cyan-500 px-2.5 py-1 font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-950 hover:bg-cyan-400"
                >
                  Jump
                </button>
              </div>

              <Link href="/tech/today" className="inline-flex items-center justify-center rounded-full bg-cyan-600 px-3 py-2 font-sans text-xs font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-400">
                Dispatch
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 2xl:grid-cols-[276px_minmax(0,1fr)] gap-4">
            <aside className="space-y-3">
              <details className="group rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70">
                <summary className="flex items-center justify-between gap-3 p-4 cursor-pointer select-none [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Summary</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 truncate">{rangeLabel(currentDate, view)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono rounded-full px-2 py-1 bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300 whitespace-nowrap">
                      {filteredJobs.length} jobs
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform duration-200 group-open:rotate-180" />
                  </div>
                </summary>
                <div className="border-t border-slate-200/70 dark:border-slate-800 px-4 pb-4 pt-3">
                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {filteredJobs.slice(0, 6).map((job) => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-slate-100/80 dark:bg-slate-800/70 p-2.5">
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Booked</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100 mt-0.5">{filteredJobs.length}</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-2.5">
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Done</p>
                      <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5">{completedCount}</p>
                    </div>
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 p-2.5">
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-wide">Active</p>
                      <p className="text-lg font-semibold text-amber-700 dark:text-amber-300 mt-0.5">{activeCount}</p>
                    </div>
                  </div>
                </div>
              </details>

              <details className="group rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70">
                <summary className="flex items-center justify-between gap-3 p-4 cursor-pointer select-none [&::-webkit-details-marker]:hidden">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300">
                      <Filter className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Filters</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                        {activeFiltersCount ? `${activeFiltersCount} active` : 'None active'}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="border-t border-slate-200/70 dark:border-slate-800 px-4 pb-4 pt-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search customer..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                    />
                  </div>
                  <select
                    value={serviceFilter}
                    onChange={(e) => setServiceFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  >
                    <option value="all">All Services</option>
                    {serviceOptions.map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  >
                    <option value="all">All Status</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="on_the_way">On the Way</option>
                    <option value="arrived">Arrived</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={dateFromFilter} onChange={(e) => setDateFromFilter(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
                    <input type="date" value={dateToFilter} onChange={(e) => setDateToFilter(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="time" value={timeFromFilter} onChange={(e) => setTimeFromFilter(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
                    <input type="time" value={timeToFilter} onChange={(e) => setTimeToFilter(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeFiltersCount > 0 && (
                      <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1 text-[10px] font-mono uppercase tracking-wide text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70">
                        <X className="w-3 h-3" />
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </details>
            </aside>

            <div className="space-y-4">
              <div className="relative z-0 bg-transparent overflow-hidden sm:overflow-visible">
                {view === 'month' ? (
                  <div className="rounded-[2rem] bg-white/40 dark:bg-slate-900/40 ring-1 ring-slate-200/50 dark:ring-slate-800/50 overflow-hidden backdrop-blur-xl">
                    <MonthView date={currentDate} jobs={filteredJobs} onSelectDay={openDay} />
                  </div>
                ) : view === 'week' ? (
                  <div className="space-y-4">
                    <WeekView date={currentDate} jobs={filteredJobs} onSelectDay={openDay} />
                  </div>
                ) : (
                  <div className="p-2 space-y-4">
                    {filteredJobs.length === 0 ? (
                      <div className="rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 p-10 text-center backdrop-blur-xl">
                        <p className="font-mono text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">No jobs match these filters.</p>
                      </div>
                    ) : (
                      filteredJobs.map((job) => <JobCard key={job.id} job={job} />)
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
