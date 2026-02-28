import {
  addDays,
  addMinutes,
  addMonths,
  differenceInMinutes,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

export interface Job {
  id: string
  status: string
  invoice_status?: string | null
  scheduled_start: string
  scheduled_end: string | null
  description: string | null
  customer_id: string
  customer_name: string
  technician_id: string | null
  technician_name: string | null
  address: string | null
  urgency: string | null
  service_names?: string[]
}

export interface Technician {
  id: string
  full_name: string
  color: string
}

export type ScheduleView = 'day' | 'week' | 'month'
export type PlannerVariant = 'classic' | 'balanced' | 'minimal'
export type ScheduleDesign =
  | 'planner_classic'
  | 'planner_balanced'
  | 'planner_minimal'
  | 'agenda'
  | 'tech_board'
export type ScheduleJobCardVariant = 'v8'

export interface ScheduleCardStyle {
  frame: string
  hover: string
  accent: string
  customer: string
  description: string
  address: string
  techPill: string
  techName: string
  alert: string
  useStatusSurface: boolean
  useTechGlow: boolean
}

export const SCHEDULE_CARD_STYLES: Record<ScheduleJobCardVariant, ScheduleCardStyle> = {
  v8: {
    frame: 'rounded-[1rem] border-indigo-200/80 bg-gradient-to-br from-white via-indigo-50/55 to-cyan-50/55 dark:border-indigo-500/35 dark:from-slate-900 dark:via-indigo-950/30 dark:to-cyan-950/20',
    hover: 'hover:-translate-y-1 hover:border-indigo-300 dark:hover:border-indigo-500/65 hover:shadow-[0_18px_34px_-20px_rgba(79,70,229,0.45)]',
    accent: 'w-[3px] opacity-100',
    customer: 'font-display uppercase tracking-[0.025em] text-slate-900 dark:text-slate-100',
    description: 'text-slate-700 dark:text-slate-200/85',
    address: 'text-slate-600 dark:text-slate-300/85',
    techPill: 'rounded-full border border-indigo-300/70 dark:border-indigo-500/50',
    techName: 'text-indigo-700 dark:text-indigo-200',
    alert: 'font-mono text-[9px] uppercase tracking-[0.14em] text-indigo-700 dark:text-indigo-200',
    useStatusSurface: false,
    useTechGlow: true,
  },
}

export const TECH_COLORS = [
  { name: 'cyan', bg: 'bg-cyan-500/20 backdrop-blur-md', light: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-300/50 dark:border-cyan-500/30', glow: 'shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-cyan-400/30' },
  { name: 'purple', bg: 'bg-purple-500/20 backdrop-blur-md', light: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300/50 dark:border-purple-500/30', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.15)] ring-purple-400/30' },
  { name: 'emerald', bg: 'bg-emerald-500/20 backdrop-blur-md', light: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300/50 dark:border-emerald-500/30', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-emerald-400/30' },
  { name: 'amber', bg: 'bg-amber-500/20 backdrop-blur-md', light: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300/50 dark:border-amber-500/30', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-amber-400/30' },
  { name: 'rose', bg: 'bg-rose-500/20 backdrop-blur-md', light: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300/50 dark:border-rose-500/30', glow: 'shadow-[0_0_15px_rgba(244,63,94,0.15)] ring-rose-400/30' },
  { name: 'teal', bg: 'bg-teal-500/20 backdrop-blur-md', light: 'bg-teal-50 dark:bg-teal-500/10', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-300/50 dark:border-teal-500/30', glow: 'shadow-[0_0_15px_rgba(20,184,166,0.15)] ring-teal-400/30' },
  { name: 'indigo', bg: 'bg-indigo-500/20 backdrop-blur-md', light: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-300/50 dark:border-indigo-500/30', glow: 'shadow-[0_0_15px_rgba(99,102,241,0.15)] ring-indigo-400/30' },
  { name: 'orange', bg: 'bg-orange-500/20 backdrop-blur-md', light: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300/50 dark:border-orange-500/30', glow: 'shadow-[0_0_15px_rgba(249,115,22,0.15)] ring-orange-400/30' },
] as const

export const STATUS_CONFIG: Record<string, { dot: string; label: string; bg: string }> = {
  scheduled: { dot: 'bg-slate-400', label: 'Scheduled', bg: 'bg-slate-100/40 dark:bg-slate-800/60 backdrop-blur-md' },
  on_the_way: { dot: 'bg-amber-400', label: 'En Route', bg: 'bg-amber-50/40 dark:bg-amber-900/30 backdrop-blur-md' },
  arrived: { dot: 'bg-orange-400', label: 'Arrived', bg: 'bg-orange-50/40 dark:bg-orange-900/30 backdrop-blur-md' },
  in_progress: { dot: 'bg-cyan-400', label: 'In Progress', bg: 'bg-cyan-50/40 dark:bg-cyan-900/30 backdrop-blur-md' },
  completed: { dot: 'bg-emerald-400', label: 'Completed', bg: 'bg-emerald-50/40 dark:bg-emerald-900/30 backdrop-blur-md' },
  cancelled: { dot: 'bg-rose-400', label: 'Cancelled', bg: 'bg-rose-50/40 dark:bg-rose-900/30 backdrop-blur-md' },
}

export const HOUR_HEIGHT = 48
export const START_HOUR = 0
export const END_HOUR = 23
export const TOTAL_HOURS = END_HOUR - START_HOUR
export const WEEK_DAYS = 7
export const WEEK_LAST_DAY_OFFSET = WEEK_DAYS - 1
export const DEFAULT_JOB_DURATION_MINUTES = 120
export const MAX_VISIBLE_OVERLAP_LANES = 3
export const DEFAULT_WEEK_DAY_SHARE = 1 / WEEK_DAYS
export const MIN_OTHER_DAY_SHARE = 0.08
export const MIN_FOCUSED_DAY_SHARE = 0.1
export const MAX_FOCUSED_DAY_SHARE = 1 - MIN_OTHER_DAY_SHARE * (WEEK_DAYS - 1)

export type JobIntervalEntry = {
  job: Job
  start: Date
  end: Date
  top: number
  height: number
}

export type DayJobPlacement = JobIntervalEntry & {
  lane: number
  laneCount: number
  clusterId: string
  hiddenByDensity: boolean
  hasTechConflict: boolean
}

export type DenseClusterIndicator = {
  clusterId: string
  top: number
  hiddenCount: number
}

export function getTechColor(techId: string | null, index: number) {
  if (!techId) return TECH_COLORS[0]
  const hash = techId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return TECH_COLORS[hash % TECH_COLORS.length]
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function buildWeekGridTemplateColumns(focusedDayIndex: number | null, focusedDayShare: number) {
  if (focusedDayIndex === null) {
    return 'repeat(7, minmax(0, 1fr))'
  }

  const clampedFocusShare = clamp(
    focusedDayShare,
    MIN_FOCUSED_DAY_SHARE,
    MAX_FOCUSED_DAY_SHARE
  )
  const otherShare = (1 - clampedFocusShare) / (WEEK_DAYS - 1)

  return Array.from({ length: WEEK_DAYS }, (_, index) =>
    index === focusedDayIndex
      ? `${(clampedFocusShare * 100).toFixed(4)}%`
      : `${(otherShare * 100).toFixed(4)}%`
  ).join(' ')
}

export function parseJobDate(dateStr: string): Date {
  const parsedIso = parseISO(dateStr)
  if (!Number.isNaN(parsedIso.getTime())) {
    return parsedIso
  }

  const parsedNative = new Date(dateStr)
  if (!Number.isNaN(parsedNative.getTime())) {
    return parsedNative
  }

  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
  if (!match) {
    return new Date()
  }

  const [, year, month, day, hour, minute] = match
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0,
    0
  )
}

export function getScheduleWindow(view: ScheduleView, anchor: Date): { start: Date; end: Date } {
  if (view === 'day') {
    return {
      start: startOfDay(addDays(anchor, -2)),
      end: endOfDay(addDays(anchor, 2)),
    }
  }

  if (view === 'month') {
    return {
      start: startOfDay(addDays(startOfMonth(anchor), -7)),
      end: endOfDay(addDays(endOfMonth(anchor), 7)),
    }
  }

  const weekStart = startOfWeek(anchor, { weekStartsOn: 0 })
  return {
    start: startOfDay(addDays(weekStart, -2)),
    end: endOfDay(addDays(weekStart, 8)),
  }
}

export function buildScheduleWindowFilter(start: Date, end: Date): string {
  const startIso = start.toISOString()
  const endIso = end.toISOString()
  return [
    `and(scheduled_start.gte.${startIso},scheduled_start.lte.${endIso})`,
    `and(scheduled_start.is.null,created_at.gte.${startIso},created_at.lte.${endIso})`,
  ].join(',')
}

export function isDateInWindow(value: string | null | undefined, start: Date, end: Date): boolean {
  if (!value) return false
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return false
  return parsed >= start && parsed <= end
}

export function getJobInterval(job: Pick<Job, 'scheduled_start' | 'scheduled_end'>): { start: Date; end: Date; durationMinutes: number } {
  const start = parseJobDate(job.scheduled_start)
  const defaultEnd = addMinutes(start, DEFAULT_JOB_DURATION_MINUTES)
  const parsedEnd = job.scheduled_end ? parseJobDate(job.scheduled_end) : defaultEnd
  const end = parsedEnd > start ? parsedEnd : defaultEnd
  const durationMinutes = Math.max(30, differenceInMinutes(end, start))
  return { start, end, durationMinutes }
}

export function intervalsOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && startB < endA
}

export function getJobPositionFromInterval(start: Date, end: Date) {
  const hour = start.getHours()
  const minute = start.getMinutes()
  const effectiveHour = Math.max(START_HOUR, hour)
  const top = ((effectiveHour - START_HOUR) * HOUR_HEIGHT) + ((minute / 60) * HOUR_HEIGHT)

  const duration = Math.max(30, differenceInMinutes(end, start))
  const height = Math.max(42, Math.min((duration / 60) * HOUR_HEIGHT, HOUR_HEIGHT * 5))

  return { top: Math.max(0, top), height }
}

export function getTechnicianConflictJobIds(entries: JobIntervalEntry[]) {
  const conflicts = new Set<string>()
  const byTech = new Map<string, JobIntervalEntry[]>()

  for (const entry of entries) {
    if (!entry.job.technician_id) continue
    const techJobs = byTech.get(entry.job.technician_id) || []
    techJobs.push(entry)
    byTech.set(entry.job.technician_id, techJobs)
  }

  for (const techJobs of byTech.values()) {
    const sorted = [...techJobs].sort((a, b) => a.start.getTime() - b.start.getTime())
    const active: JobIntervalEntry[] = []

    for (const entry of sorted) {
      for (let i = active.length - 1; i >= 0; i -= 1) {
        if (active[i].end <= entry.start) {
          active.splice(i, 1)
        }
      }

      if (active.length > 0) {
        conflicts.add(entry.job.id)
        for (const open of active) {
          conflicts.add(open.job.id)
        }
      }

      active.push(entry)
    }
  }

  return conflicts
}

export function buildDayJobLayout(dayJobs: Job[]): { placements: DayJobPlacement[]; denseIndicators: DenseClusterIndicator[] } {
  const entries = dayJobs
    .map((job) => {
      const { start, end } = getJobInterval(job)
      const { top, height } = getJobPositionFromInterval(start, end)
      return { job, start, end, top, height }
    })
    .sort((a, b) => {
      const startDiff = a.start.getTime() - b.start.getTime()
      if (startDiff !== 0) return startDiff
      return a.end.getTime() - b.end.getTime()
    })

  const conflictIds = getTechnicianConflictJobIds(entries)
  const placements: DayJobPlacement[] = []
  const denseIndicators: DenseClusterIndicator[] = []

  let clusterIndex = 0
  let clusterEntries: JobIntervalEntry[] = []
  let clusterEnd: Date | null = null

  const flushCluster = () => {
    if (clusterEntries.length === 0) return

    const laneByJob = new Map<string, number>()
    const active: Array<{ lane: number; end: Date }> = []
    let laneCount = 1

    for (const entry of clusterEntries) {
      for (let i = active.length - 1; i >= 0; i -= 1) {
        if (active[i].end <= entry.start) {
          active.splice(i, 1)
        }
      }

      const used = new Set(active.map((item) => item.lane))
      let lane = 0
      while (used.has(lane)) {
        lane += 1
      }

      laneByJob.set(entry.job.id, lane)
      active.push({ lane, end: entry.end })
      laneCount = Math.max(laneCount, lane + 1)
    }

    const clusterId = `cluster-${clusterIndex}`
    clusterIndex += 1
    let hiddenCount = 0
    let top = Number.POSITIVE_INFINITY

    for (const entry of clusterEntries) {
      const lane = laneByJob.get(entry.job.id) || 0
      const hiddenByDensity = lane >= MAX_VISIBLE_OVERLAP_LANES
      if (hiddenByDensity) hiddenCount += 1
      top = Math.min(top, entry.top)

      placements.push({
        ...entry,
        lane,
        laneCount,
        clusterId,
        hiddenByDensity,
        hasTechConflict: conflictIds.has(entry.job.id),
      })
    }

    if (hiddenCount > 0) {
      denseIndicators.push({
        clusterId,
        top: Number.isFinite(top) ? top : 0,
        hiddenCount,
      })
    }

    clusterEntries = []
    clusterEnd = null
  }

  for (const entry of entries) {
    if (clusterEntries.length === 0) {
      clusterEntries = [entry]
      clusterEnd = entry.end
      continue
    }

    if (clusterEnd && entry.start < clusterEnd) {
      clusterEntries.push(entry)
      if (entry.end > clusterEnd) clusterEnd = entry.end
      continue
    }

    flushCluster()
    clusterEntries = [entry]
    clusterEnd = entry.end
  }

  flushCluster()

  return { placements, denseIndicators }
}

export function findTechnicianOverlapsForWindow({
  jobs,
  movingJobId,
  technicianId,
  start,
  end,
}: {
  jobs: Job[]
  movingJobId: string
  technicianId: string | null
  start: Date
  end: Date
}) {
  if (!technicianId) return []

  return jobs.filter((job) => {
    if (job.id === movingJobId) return false
    if (job.technician_id !== technicianId) return false
    const { start: jobStart, end: jobEnd } = getJobInterval(job)
    return intervalsOverlap(start, end, jobStart, jobEnd)
  })
}

export function buildLocalDateAtHour(dayAnchor: Date, hour: number, minute = 0): Date {
  const clampedHour = Math.min(END_HOUR, Math.max(START_HOUR, hour))
  const clampedMinute = Math.min(59, Math.max(0, minute))
  return new Date(
    dayAnchor.getFullYear(),
    dayAnchor.getMonth(),
    dayAnchor.getDate(),
    clampedHour,
    clampedMinute,
    0,
    0
  )
}

export function getScheduleRange(currentDate: Date, view: ScheduleView): { start: Date; endExclusive: Date } {
  if (view === 'day') {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
    return { start, endExclusive: addDays(start, 1) }
  }

  if (view === 'week') {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    return { start, endExclusive: addDays(start, WEEK_DAYS) }
  }

  const start = startOfMonth(currentDate)
  return { start, endExclusive: addMonths(start, 1) }
}

export function getScheduleDays(currentDate: Date, view: ScheduleView): Date[] {
  if (view === 'day') {
    return [new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())]
  }

  if (view === 'week') {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    return Array.from({ length: WEEK_DAYS }, (_, i) => addDays(weekStart, i))
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  return eachDayOfInterval({ start: monthStart, end: monthEnd })
}

export function getDefaultSummaryDateRange(anchorDate: Date = new Date()) {
  const weekStart = startOfWeek(anchorDate, { weekStartsOn: 1 })
  return {
    from: format(weekStart, 'yyyy-MM-dd'),
    to: format(addDays(weekStart, WEEK_LAST_DAY_OFFSET), 'yyyy-MM-dd'),
  }
}

export function getJobPosition(startTime: string, endTime: string | null) {
  const start = parseJobDate(startTime)
  const fallbackEnd = addMinutes(start, DEFAULT_JOB_DURATION_MINUTES)
  const end = endTime ? parseJobDate(endTime) : fallbackEnd
  const validEnd = end > start ? end : fallbackEnd
  const { top, height } = getJobPositionFromInterval(start, validEnd)

  return { top, height, start }
}
