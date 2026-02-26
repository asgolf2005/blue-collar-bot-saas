'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  format,
  startOfWeek,
  startOfDay,
  endOfDay,
  addDays,
  isSameDay,
  parseISO,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  eachDayOfInterval,
  differenceInMinutes,
  addMinutes,
  isToday,
  isPast,
} from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  Search,
  MapPin,
  X,
} from '@/components/ui/icons'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { ActionButton, ActionFilterChip, ActionIconButton } from '@/components/ui/ActionSystem'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// ========================================
// TYPES
// ========================================
interface Job {
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

interface Technician {
  id: string
  full_name: string
  color: string
}

type ScheduleView = 'day' | 'week' | 'month'
type PlannerVariant = 'classic' | 'balanced' | 'minimal'
type ScheduleDesign =
  | 'planner_classic'
  | 'planner_balanced'
  | 'planner_minimal'
  | 'agenda'
  | 'tech_board'
type ScheduleJobCardVariant = 'v8'

interface ScheduleCardStyle {
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

const SCHEDULE_CARD_STYLES: Record<ScheduleJobCardVariant, ScheduleCardStyle> = {
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

// ========================================
// DESIGN SYSTEM - Apple/Google Calendar Aesthetic
// ========================================

const TECH_COLORS = [
  { name: 'cyan', bg: 'bg-cyan-500/20 backdrop-blur-md', light: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-300/50 dark:border-cyan-500/30', glow: 'shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-cyan-400/30' },
  { name: 'purple', bg: 'bg-purple-500/20 backdrop-blur-md', light: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300/50 dark:border-purple-500/30', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.15)] ring-purple-400/30' },
  { name: 'emerald', bg: 'bg-emerald-500/20 backdrop-blur-md', light: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300/50 dark:border-emerald-500/30', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-emerald-400/30' },
  { name: 'amber', bg: 'bg-amber-500/20 backdrop-blur-md', light: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300/50 dark:border-amber-500/30', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-amber-400/30' },
  { name: 'rose', bg: 'bg-rose-500/20 backdrop-blur-md', light: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300/50 dark:border-rose-500/30', glow: 'shadow-[0_0_15px_rgba(244,63,94,0.15)] ring-rose-400/30' },
  { name: 'teal', bg: 'bg-teal-500/20 backdrop-blur-md', light: 'bg-teal-50 dark:bg-teal-500/10', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-300/50 dark:border-teal-500/30', glow: 'shadow-[0_0_15px_rgba(20,184,166,0.15)] ring-teal-400/30' },
  { name: 'indigo', bg: 'bg-indigo-500/20 backdrop-blur-md', light: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-300/50 dark:border-indigo-500/30', glow: 'shadow-[0_0_15px_rgba(99,102,241,0.15)] ring-indigo-400/30' },
  { name: 'orange', bg: 'bg-orange-500/20 backdrop-blur-md', light: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300/50 dark:border-orange-500/30', glow: 'shadow-[0_0_15px_rgba(249,115,22,0.15)] ring-orange-400/30' },
]

const STATUS_CONFIG: Record<string, { dot: string; label: string; bg: string }> = {
  scheduled: { dot: 'bg-slate-400', label: 'Scheduled', bg: 'bg-slate-100/40 dark:bg-slate-800/60 backdrop-blur-md' },
  on_the_way: { dot: 'bg-amber-400', label: 'En Route', bg: 'bg-amber-50/40 dark:bg-amber-900/30 backdrop-blur-md' },
  arrived: { dot: 'bg-orange-400', label: 'Arrived', bg: 'bg-orange-50/40 dark:bg-orange-900/30 backdrop-blur-md' },
  in_progress: { dot: 'bg-cyan-400', label: 'In Progress', bg: 'bg-cyan-50/40 dark:bg-cyan-900/30 backdrop-blur-md' },
  completed: { dot: 'bg-emerald-400', label: 'Completed', bg: 'bg-emerald-50/40 dark:bg-emerald-900/30 backdrop-blur-md' },
  cancelled: { dot: 'bg-rose-400', label: 'Cancelled', bg: 'bg-rose-50/40 dark:bg-rose-900/30 backdrop-blur-md' },
}

const HOUR_HEIGHT = 48
const START_HOUR = 0
const END_HOUR = 23
const TOTAL_HOURS = END_HOUR - START_HOUR
const WEEK_DAYS = 7
const WEEK_LAST_DAY_OFFSET = WEEK_DAYS - 1
const DEFAULT_JOB_DURATION_MINUTES = 120
const MAX_VISIBLE_OVERLAP_LANES = 3
const DEFAULT_WEEK_DAY_SHARE = 1 / WEEK_DAYS
const MIN_OTHER_DAY_SHARE = 0.08
const MIN_FOCUSED_DAY_SHARE = 0.1
const MAX_FOCUSED_DAY_SHARE = 1 - MIN_OTHER_DAY_SHARE * (WEEK_DAYS - 1)

type JobIntervalEntry = {
  job: Job
  start: Date
  end: Date
  top: number
  height: number
}

type DayJobPlacement = JobIntervalEntry & {
  lane: number
  laneCount: number
  clusterId: string
  hiddenByDensity: boolean
  hasTechConflict: boolean
}

type DenseClusterIndicator = {
  clusterId: string
  top: number
  hiddenCount: number
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function getTechColor(techId: string | null, index: number) {
  if (!techId) return TECH_COLORS[0]
  const hash = techId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return TECH_COLORS[hash % TECH_COLORS.length]
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function buildWeekGridTemplateColumns(focusedDayIndex: number | null, focusedDayShare: number) {
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

// Parse timestamps with timezone awareness so drag/drop renders at the correct local slot.
function parseJobDate(dateStr: string): Date {
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

function getScheduleWindow(view: ScheduleView, anchor: Date): { start: Date; end: Date } {
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

function buildScheduleWindowFilter(start: Date, end: Date): string {
  const startIso = start.toISOString()
  const endIso = end.toISOString()
  return [
    `and(scheduled_start.gte.${startIso},scheduled_start.lte.${endIso})`,
    `and(scheduled_start.is.null,created_at.gte.${startIso},created_at.lte.${endIso})`,
  ].join(',')
}

function isDateInWindow(value: string | null | undefined, start: Date, end: Date): boolean {
  if (!value) return false
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return false
  return parsed >= start && parsed <= end
}

function getJobInterval(job: Pick<Job, 'scheduled_start' | 'scheduled_end'>): { start: Date; end: Date; durationMinutes: number } {
  const start = parseJobDate(job.scheduled_start)
  const defaultEnd = addMinutes(start, DEFAULT_JOB_DURATION_MINUTES)
  const parsedEnd = job.scheduled_end ? parseJobDate(job.scheduled_end) : defaultEnd
  const end = parsedEnd > start ? parsedEnd : defaultEnd
  const durationMinutes = Math.max(30, differenceInMinutes(end, start))
  return { start, end, durationMinutes }
}

function intervalsOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && startB < endA
}

function getJobPositionFromInterval(start: Date, end: Date) {
  const hour = start.getHours()
  const minute = start.getMinutes()

  // Allow hours before START_HOUR to show at top
  const effectiveHour = Math.max(START_HOUR, hour)
  const top = ((effectiveHour - START_HOUR) * HOUR_HEIGHT) + ((minute / 60) * HOUR_HEIGHT)

  const duration = Math.max(30, differenceInMinutes(end, start))
  const height = Math.max(42, Math.min((duration / 60) * HOUR_HEIGHT, HOUR_HEIGHT * 5))

  return { top: Math.max(0, top), height }
}

function getTechnicianConflictJobIds(entries: JobIntervalEntry[]) {
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

function buildDayJobLayout(dayJobs: Job[]): { placements: DayJobPlacement[]; denseIndicators: DenseClusterIndicator[] } {
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

function findTechnicianOverlapsForWindow({
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

function buildLocalDateAtHour(dayAnchor: Date, hour: number, minute = 0): Date {
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

function getScheduleRange(currentDate: Date, view: ScheduleView): { start: Date; endExclusive: Date } {
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

function getScheduleDays(currentDate: Date, view: ScheduleView): Date[] {
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

function getDefaultSummaryDateRange(anchorDate: Date = new Date()) {
  const weekStart = startOfWeek(anchorDate, { weekStartsOn: 1 })
  return {
    from: format(weekStart, 'yyyy-MM-dd'),
    to: format(addDays(weekStart, WEEK_LAST_DAY_OFFSET), 'yyyy-MM-dd'),
  }
}

function getJobPosition(startTime: string, endTime: string | null) {
  const start = parseJobDate(startTime)
  const fallbackEnd = addMinutes(start, DEFAULT_JOB_DURATION_MINUTES)
  const end = endTime ? parseJobDate(endTime) : fallbackEnd
  const validEnd = end > start ? end : fallbackEnd
  const { top, height } = getJobPositionFromInterval(start, validEnd)

  return { top, height, start }
}

// ========================================
// COMPONENTS
// ========================================

function JobCard({
  job,
  techColor,
  variant,
  cardVariant,
  isOverdue,
  lane = 0,
  laneCount = 1,
  hasTechConflict = false,
  positionTop,
  positionHeight,
  isFocused = false,
  isDragging,
  isDropMode,
  onDragStart,
  onDragEnd,
}: {
  job: Job
  techColor: typeof TECH_COLORS[0]
  variant: PlannerVariant
  cardVariant: ScheduleJobCardVariant
  isOverdue: boolean
  lane?: number
  laneCount?: number
  hasTechConflict?: boolean
  positionTop?: number
  positionHeight?: number
  isFocused?: boolean
  isDragging?: boolean
  isDropMode?: boolean
  onDragStart?: (e: React.DragEvent, job: Job) => void
  onDragEnd?: () => void
}) {
  const { top: fallbackTop, height: fallbackHeight, start } = getJobPosition(job.scheduled_start, job.scheduled_end)
  const top = positionTop ?? fallbackTop
  const height = positionHeight ?? fallbackHeight
  const status = STATUS_CONFIG[job.status] || STATUS_CONFIG.scheduled
  const cardStyle = SCHEDULE_CARD_STYLES[cardVariant] || SCHEDULE_CARD_STYLES.v8
  const techDisplayName = job.technician_name || 'Unassigned'
  const techFirstName = techDisplayName.split(' ')[0] || techDisplayName
  const isBalanced = variant === 'balanced'
  const isMinimal = variant === 'minimal'
  const compactCard = height < (isMinimal ? 70 : 64)
  const showDescription = height >= (isMinimal ? 82 : 72)
  const showAddress = height >= (isBalanced ? 90 : 94)
  const cardXPadding = isMinimal ? 'px-2' : isBalanced ? 'px-3' : 'px-2.5'
  const cardYPadding = isMinimal ? 'py-1.5' : isBalanced ? 'py-2.5' : 'py-2'
  const customerTextSize = isBalanced ? 'text-[15px]' : isMinimal ? 'text-[13px]' : 'text-sm'
  const cardRadius = isBalanced ? 'rounded-xl' : 'rounded-lg'
  const visibleLaneCount = Math.max(1, Math.min(laneCount, MAX_VISIBLE_OVERLAP_LANES))
  const laneWidthPercent = 100 / visibleLaneCount
  const laneLeftPercent = lane * laneWidthPercent
  const laneInlineStyle =
    visibleLaneCount > 1
      ? {
        left: `calc(${laneLeftPercent}% + 2px)`,
        width: `calc(${laneWidthPercent}% - 4px)`,
      }
      : {}
  const [isHovered, setIsHovered] = useState(false)

  // Don't render if job is outside visible hours (except show at boundaries)
  if (start.getHours() < START_HOUR - 2 || start.getHours() > END_HOUR + 2) {
    return null
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      data-schedule-job-id={job.id}
      data-test="event-block"
      draggable={!!onDragStart}
      onDragStart={(e: any) => onDragStart?.(e, job)}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'absolute overflow-hidden border group transition-all duration-300 ease-out',
        visibleLaneCount > 1 ? '' : isBalanced ? 'left-1.5 right-1.5' : 'left-1 right-1',
        cardRadius,
        cardStyle.frame,
        cardStyle.hover,
        hasTechConflict ? 'ring-1 ring-inset ring-rose-400/60 border-rose-200/80 dark:border-rose-500/40' : techColor.border,
        isFocused ? 'ring-2 ring-cyan-400/80 dark:ring-cyan-300/80 shadow-[0_0_0_1px_rgba(34,211,238,0.55)]' : '',
        cardStyle.useStatusSurface ? status.bg : '',
        cardStyle.useTechGlow ? techColor.glow : '',
        onDragStart ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        isDragging ? 'opacity-50 blur-[1px] grayscale-[0.5]' : '',
        isDropMode && !isDragging ? 'pointer-events-none' : ''
      )}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        zIndex: isHovered ? 100 : 10 + lane,
        ...laneInlineStyle,
      }}
    >
      {hasTechConflict && (
        <span className="absolute right-1.5 top-1.5 z-20 inline-flex h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_0_2px_rgba(255,255,255,0.75)] dark:shadow-[0_0_0_2px_rgba(15,23,42,0.9)]" />
      )}
      <div className={cn('absolute left-0 top-0 bottom-0 group-hover:opacity-100 transition-opacity', cardStyle.accent, techColor.bg.replace('/20 backdrop-blur-md', ''))} />
      <Link href={`/admin/jobs/${job.id}`} className="block h-full relative z-10" draggable={false}>
        <div className={`h-full ${cardXPadding} ${cardYPadding} flex flex-col`}>
          <p className={cn(customerTextSize, 'leading-tight truncate', cardStyle.customer)}>
            {job.customer_name}
          </p>

          {showDescription && job.description && (
            <p className={cn('mt-1 truncate', isMinimal ? 'text-[10px]' : 'text-[11px]', cardStyle.description)}>
              {job.description.length > 40 ? `${job.description.slice(0, 40)}...` : job.description}
            </p>
          )}

          {showAddress && job.address && (
            <p className={cn('mt-1 text-[10px] truncate flex items-center gap-1', cardStyle.address)}>
              <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
              {job.address.length > 30 ? `${job.address.slice(0, 30)}...` : job.address}
            </p>
          )}

          {!compactCard && (
            <div className="mt-auto pt-1.5 flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className={cn('w-5 h-5 flex items-center justify-center flex-shrink-0', cardStyle.techPill, techColor.bg)}>
                  <span className="text-[9px] text-white font-bold">
                    {techDisplayName.charAt(0) || '?'}
                  </span>
                </div>
                <span className={cn('text-[10px] truncate', cardStyle.techName)}>
                  {isBalanced ? techDisplayName : techFirstName}
                </span>
              </div>
              {isOverdue && (
                <span className={cardStyle.alert}>Late</span>
              )}
              {!isOverdue && hasTechConflict && (
                <span className={cardStyle.alert}>Overlap</span>
              )}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}

function WeekView({
  currentDate,
  jobs,
  technicians,
  variant,
  cardVariant,
  focusedJobId,
  onJobMove,
}: {
  currentDate: Date
  jobs: Job[]
  technicians: Technician[]
  variant: PlannerVariant
  cardVariant: ScheduleJobCardVariant
  focusedJobId?: string | null
  onJobMove?: (jobId: string, newDate: Date, newHour: number) => void
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const days = Array.from({ length: WEEK_DAYS }, (_, i) => addDays(weekStart, i))
  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i)
  const [draggingJob, setDraggingJob] = useState<Job | null>(null)
  const [dragOverDayHour, setDragOverDayHour] = useState<{ dayIndex: number, hour: number, hasConflict: boolean } | null>(null)
  const [focusedDayIndex, setFocusedDayIndex] = useState<number | null>(null)
  const [focusedDayShare, setFocusedDayShare] = useState<number>(DEFAULT_WEEK_DAY_SHARE)
  const [isResizingDay, setIsResizingDay] = useState(false)
  const weekGridRef = useRef<HTMLDivElement | null>(null)
  const liveFocusedShareRef = useRef<number>(DEFAULT_WEEK_DAY_SHARE)
  const resizeRafRef = useRef<number | null>(null)
  const resizeSessionRef = useRef<{
    dayIndex: number
    startX: number
    startShare: number
    containerWidth: number
  } | null>(null)
  const timeColumnClass =
    variant === 'minimal' ? 'w-10' : variant === 'balanced' ? 'w-14' : 'w-12'
  const dayHeaderPadding = variant === 'minimal' ? 'px-1.5 py-2.5' : variant === 'balanced' ? 'px-3 py-3.5' : 'px-2 py-3'
  const dayNumberSize = variant === 'minimal' ? 'text-base' : variant === 'balanced' ? 'text-xl' : 'text-lg'
  const hasFocusedDay = focusedDayIndex !== null
  const weekGridTemplateColumns = useMemo(() => {
    return buildWeekGridTemplateColumns(focusedDayIndex, focusedDayShare)
  }, [focusedDayIndex, focusedDayShare])

  useEffect(() => {
    liveFocusedShareRef.current = focusedDayShare
  }, [focusedDayShare])

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const session = resizeSessionRef.current
      if (!session) return

      const deltaShare = (event.clientX - session.startX) / Math.max(1, session.containerWidth)
      const nextShare = clamp(
        session.startShare + deltaShare,
        MIN_FOCUSED_DAY_SHARE,
        MAX_FOCUSED_DAY_SHARE
      )
      liveFocusedShareRef.current = nextShare

      if (resizeRafRef.current !== null) return
      resizeRafRef.current = window.requestAnimationFrame(() => {
        resizeRafRef.current = null
        if (!weekGridRef.current) return
        weekGridRef.current.style.gridTemplateColumns = buildWeekGridTemplateColumns(
          session.dayIndex,
          liveFocusedShareRef.current
        )
      })
    }

    const onPointerUp = () => {
      const session = resizeSessionRef.current
      if (!session) return

      if (resizeRafRef.current !== null) {
        window.cancelAnimationFrame(resizeRafRef.current)
        resizeRafRef.current = null
      }

      resizeSessionRef.current = null
      setIsResizingDay(false)
      setFocusedDayIndex(session.dayIndex)
      setFocusedDayShare(liveFocusedShareRef.current)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)

      if (resizeRafRef.current !== null) {
        window.cancelAnimationFrame(resizeRafRef.current)
        resizeRafRef.current = null
      }
    }
  }, [])

  const startDayResize = useCallback((event: React.PointerEvent, dayIndex: number) => {
    event.preventDefault()
    event.stopPropagation()

    const containerWidth = weekGridRef.current?.clientWidth ?? 0
    if (!containerWidth) return

    const activeFocusShare = clamp(
      focusedDayShare,
      MIN_FOCUSED_DAY_SHARE,
      MAX_FOCUSED_DAY_SHARE
    )
    const activeOtherShare = (1 - activeFocusShare) / (WEEK_DAYS - 1)
    const baseShare =
      focusedDayIndex === null
        ? DEFAULT_WEEK_DAY_SHARE
        : focusedDayIndex === dayIndex
          ? activeFocusShare
          : activeOtherShare
    const startShare = clamp(baseShare, MIN_FOCUSED_DAY_SHARE, MAX_FOCUSED_DAY_SHARE)
    resizeSessionRef.current = {
      dayIndex,
      startX: event.clientX,
      startShare,
      containerWidth,
    }

    setFocusedDayIndex(dayIndex)
    setFocusedDayShare(startShare)
    liveFocusedShareRef.current = startShare
    if (weekGridRef.current) {
      weekGridRef.current.style.gridTemplateColumns = buildWeekGridTemplateColumns(
        dayIndex,
        startShare
      )
    }
    setIsResizingDay(true)
  }, [focusedDayIndex, focusedDayShare])

  const resetDayColumnWidths = useCallback(() => {
    if (resizeRafRef.current !== null) {
      window.cancelAnimationFrame(resizeRafRef.current)
      resizeRafRef.current = null
    }
    resizeSessionRef.current = null
    setIsResizingDay(false)
    setFocusedDayIndex(null)
    setFocusedDayShare(DEFAULT_WEEK_DAY_SHARE)
    liveFocusedShareRef.current = DEFAULT_WEEK_DAY_SHARE
    if (weekGridRef.current) {
      weekGridRef.current.style.gridTemplateColumns = buildWeekGridTemplateColumns(
        null,
        DEFAULT_WEEK_DAY_SHARE
      )
    }
  }, [])

  const handleDragStart = (e: React.DragEvent, job: Job) => {
    setDraggingJob(job)
    e.dataTransfer.setData('text/plain', job.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggingJob(null)
    setDragOverDayHour(null)
  }

  const getDropConflicts = useCallback((job: Job, dayAnchor: Date, hour: number) => {
    const { durationMinutes } = getJobInterval(job)
    const newStart = buildLocalDateAtHour(dayAnchor, hour, 0)
    const newEnd = addMinutes(newStart, durationMinutes)
    return findTechnicianOverlapsForWindow({
      jobs,
      movingJobId: job.id,
      technicianId: job.technician_id,
      start: newStart,
      end: newEnd,
    })
  }, [jobs])

  const handleDrop = (dayIndex: number, hour: number, draggedJobId?: string) => {
    const nextJobId = draggedJobId || draggingJob?.id
    if (nextJobId) {
      onJobMove?.(nextJobId, days[dayIndex], hour)
    }
    setDraggingJob(null)
    setDragOverDayHour(null)
  }

  return (
    <div className="flex min-w-0 overflow-hidden">
      {/* Time column */}
      <div className={`${timeColumnClass} flex-shrink-0 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900`}>
        <div className="h-[70px] border-b border-slate-100 dark:border-slate-800" />
        <div className="relative" style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>
          {hours.map((hour, i) => (
            <div
              key={hour}
              className="absolute right-1 text-[10px] text-slate-400 dark:text-slate-400 font-medium tabular-nums"
              style={{ top: `${i * HOUR_HEIGHT - 5}px` }}
            >
              {format(new Date(2024, 0, 1, hour, 0, 0, 0), 'h a')}
            </div>
          ))}
        </div>
      </div>

      {/* Days */}
      <div
        ref={weekGridRef}
        className={`flex-1 grid min-w-0 bg-white dark:bg-slate-900 ${isResizingDay ? '' : '[transition:grid-template-columns_320ms_cubic-bezier(0.22,1,0.36,1)]'}`}
        style={{ gridTemplateColumns: weekGridTemplateColumns }}
      >
        {days.map((day, dayIndex) => {
          const dayJobs = jobs.filter(job => {
            const jobDate = parseJobDate(job.scheduled_start)
            return isSameDay(jobDate, day)
          })
          const { placements, denseIndicators } = buildDayJobLayout(dayJobs)
          const isTodayDate = isToday(day)
          const isFocused = focusedDayIndex === dayIndex
          const isCompressed = hasFocusedDay && !isFocused

          return (
            <div
              key={day.toISOString()}
              className={`min-w-0 border-r border-slate-100 dark:border-slate-800 last:border-r-0 transition-colors duration-300 ${isFocused
                ? 'bg-cyan-50/45 dark:bg-cyan-500/[0.12]'
                : isCompressed
                  ? 'bg-slate-50/50 dark:bg-slate-900/70'
                  : ''
                } ${isTodayDate ? 'ring-1 ring-inset ring-cyan-200/70 dark:ring-cyan-400/30' : ''}`}
            >
              {/* Header */}
              <div className={`relative ${dayHeaderPadding} text-center border-b border-slate-100 dark:border-slate-800 ${isTodayDate ? 'bg-cyan-100/70 dark:bg-cyan-500/15 shadow-[inset_0_-1px_0_0_rgba(8,145,178,0.35)] dark:shadow-[inset_0_-1px_0_0_rgba(34,211,238,0.35)]' : ''}`}>
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-300 uppercase tracking-wide">{format(day, 'EEE')}</p>
                <p className={`${dayNumberSize} font-semibold mt-1 ${isTodayDate ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-800 dark:text-slate-100'}`}>
                  {format(day, 'd')}
                </p>
                <button
                  type="button"
                  onPointerDown={(event) => startDayResize(event, dayIndex)}
                  onDoubleClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    resetDayColumnWidths()
                  }}
                  className={`absolute inset-y-0 right-0 w-2 translate-x-1/2 cursor-col-resize rounded-full border border-slate-300/80 bg-white/85 text-[9px] text-slate-500 opacity-30 transition-opacity hover:opacity-100 focus:opacity-100 dark:border-slate-600 dark:bg-slate-900/85 dark:text-slate-300 ${isResizingDay && isFocused ? 'opacity-100 border-cyan-400/80 bg-cyan-100/80 dark:border-cyan-500/80 dark:bg-cyan-900/60' : ''
                    }`}
                  title="Drag to resize day column. Double-click to reset all day widths."
                  aria-label={`Resize ${format(day, 'EEEE')} column`}
                >
                  <span className="pointer-events-none absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-current/80" />
                </button>
              </div>

              {/* Timeline */}
              <div className="relative" style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>
                {/* Hour drop zones */}
                {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                  <div
                    key={i}
                    className={`
                      absolute left-0 right-0 border-t border-slate-50 dark:border-slate-800/70 transition-colors
                      ${draggingJob ? 'z-20' : ''}
                      ${dragOverDayHour?.dayIndex === dayIndex && dragOverDayHour?.hour === START_HOUR + i
                        ? dragOverDayHour.hasConflict
                          ? 'bg-rose-100/70 dark:bg-rose-500/25'
                          : 'bg-cyan-100/60 dark:bg-cyan-400/20'
                        : ''}
                    `}
                    style={{ top: `${i * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      const hasConflict = draggingJob
                        ? getDropConflicts(draggingJob, day, START_HOUR + i).length > 0
                        : false
                      setDragOverDayHour({ dayIndex, hour: START_HOUR + i, hasConflict })
                    }}
                    onDragLeave={() => setDragOverDayHour(null)}
                    onDrop={(e) => {
                      e.preventDefault()
                      const draggedJobId = e.dataTransfer.getData('text/plain')
                      handleDrop(dayIndex, START_HOUR + i, draggedJobId)
                    }}
                  />
                ))}

                {/* Jobs */}
                <AnimatePresence>
                  {placements
                    .filter((placement) => !placement.hiddenByDensity)
                    .map((placement) => {
                      const job = placement.job
                      const techIndex = technicians.findIndex(t => t.id === job.technician_id)
                      const techColor = getTechColor(job.technician_id, techIndex)
                      const isOverdue = isPast(parseISO(job.scheduled_start)) && job.status === 'scheduled'
                      return (
                        <JobCard
                          key={job.id}
                          job={job}
                          techColor={techColor}
                          variant={variant}
                          cardVariant={cardVariant}
                          isOverdue={isOverdue}
                          lane={placement.lane}
                          laneCount={placement.laneCount}
                          hasTechConflict={placement.hasTechConflict}
                          positionTop={placement.top}
                          positionHeight={placement.height}
                          isFocused={focusedJobId === job.id}
                          isDragging={draggingJob?.id === job.id}
                          isDropMode={Boolean(draggingJob)}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                        />
                      )
                    })}
                </AnimatePresence>

                {denseIndicators.map((indicator) => (
                  <div
                    key={indicator.clusterId}
                    className="absolute right-1 z-30 rounded-md border border-cyan-300/80 bg-cyan-50/95 px-1.5 py-0.5 text-[9px] font-medium text-cyan-700 shadow-sm dark:border-cyan-500/40 dark:bg-cyan-900/70 dark:text-cyan-200"
                    style={{ top: `${Math.max(0, indicator.top)}px` }}
                    title={`${indicator.hiddenCount} overlapping jobs hidden`}
                  >
                    +{indicator.hiddenCount} more
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DayView({
  currentDate,
  jobs,
  technicians,
  variant,
  cardVariant,
  focusedJobId,
  onJobMove,
}: {
  currentDate: Date
  jobs: Job[]
  technicians: Technician[]
  variant: PlannerVariant
  cardVariant: ScheduleJobCardVariant
  focusedJobId?: string | null
  onJobMove?: (jobId: string, newDate: Date, newHour: number) => void
}) {
  const dayJobs = useMemo(() => {
    return jobs
      .filter(job => isSameDay(parseJobDate(job.scheduled_start), currentDate))
      .sort((a, b) => parseJobDate(a.scheduled_start).getTime() - parseJobDate(b.scheduled_start).getTime())
  }, [jobs, currentDate])
  const { placements: dayPlacements, denseIndicators } = useMemo(
    () => buildDayJobLayout(dayJobs),
    [dayJobs]
  )

  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i)
  const isTodayDate = isToday(currentDate)
  const [draggingJob, setDraggingJob] = useState<Job | null>(null)
  const [dragOverHour, setDragOverHour] = useState<{ hour: number; hasConflict: boolean } | null>(null)
  const timeColumnClass =
    variant === 'minimal' ? 'w-10' : variant === 'balanced' ? 'w-16' : 'w-14'

  const currentTimePos = useMemo(() => {
    if (!isTodayDate) return null
    const now = new Date()
    const hour = now.getHours()
    const minute = now.getMinutes()
    if (hour < START_HOUR || hour > END_HOUR) return null
    return ((hour - START_HOUR) * HOUR_HEIGHT) + ((minute / 60) * HOUR_HEIGHT)
  }, [isTodayDate])

  const handleDragStart = (e: React.DragEvent, job: Job) => {
    setDraggingJob(job)
    e.dataTransfer.setData('text/plain', job.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggingJob(null)
    setDragOverHour(null)
  }

  const getDropConflicts = useCallback((job: Job, dayAnchor: Date, hour: number) => {
    const { durationMinutes } = getJobInterval(job)
    const newStart = buildLocalDateAtHour(dayAnchor, hour, 0)
    const newEnd = addMinutes(newStart, durationMinutes)
    return findTechnicianOverlapsForWindow({
      jobs,
      movingJobId: job.id,
      technicianId: job.technician_id,
      start: newStart,
      end: newEnd,
    })
  }, [jobs])

  const handleDrop = (hour: number, draggedJobId?: string) => {
    const nextJobId = draggedJobId || draggingJob?.id
    if (nextJobId) {
      onJobMove?.(nextJobId, currentDate, hour)
    }
    setDraggingJob(null)
    setDragOverHour(null)
  }

  return (
    <div className="flex h-[calc(100vh-280px)] min-h-[500px]">
      {/* Timeline */}
      <div className="flex-1 flex overflow-y-auto bg-white dark:bg-slate-900">
        {/* Time column */}
        <div className={`${timeColumnClass} flex-shrink-0 border-r border-slate-100 dark:border-slate-800`}>
          <div className="relative" style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>
            {hours.map((hour, i) => (
              <div
                key={hour}
                className="absolute right-2 text-[10px] text-slate-400 dark:text-slate-400 font-medium tabular-nums"
                style={{ top: `${i * HOUR_HEIGHT - 5}px` }}
              >
                {format(new Date(2024, 0, 1, hour, 0, 0, 0), 'h a')}
              </div>
            ))}
          </div>
        </div>

        {/* Day column */}
        <div className="flex-1 relative" style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>
          {/* Hour drop zones */}
          {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
            <div
              key={i}
              className={`
                absolute left-0 right-0 border-t border-slate-50 dark:border-slate-800/70 transition-colors
                ${draggingJob ? 'z-20' : ''}
                ${dragOverHour?.hour === START_HOUR + i
                  ? dragOverHour.hasConflict
                    ? 'bg-rose-100/70 dark:bg-rose-500/25'
                    : 'bg-cyan-100/60 dark:bg-cyan-400/20'
                  : ''}
              `}
              style={{ top: `${i * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
              onDragOver={(e) => {
                e.preventDefault()
                const hasConflict = draggingJob
                  ? getDropConflicts(draggingJob, currentDate, START_HOUR + i).length > 0
                  : false
                setDragOverHour({ hour: START_HOUR + i, hasConflict })
              }}
              onDragLeave={() => setDragOverHour(null)}
              onDrop={(e) => {
                e.preventDefault()
                const draggedJobId = e.dataTransfer.getData('text/plain')
                handleDrop(START_HOUR + i, draggedJobId)
              }}
            />
          ))}

          {/* Current time */}
          {currentTimePos && (
            <div
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: `${currentTimePos}px` }}
            >
              <div className="h-px bg-red-400" />
              <div className="absolute left-0 -top-1 w-2 h-2 rounded-full bg-red-400" />
            </div>
          )}

          {/* Jobs */}
          <AnimatePresence>
            {dayPlacements
              .filter((placement) => !placement.hiddenByDensity)
              .map((placement) => {
                const job = placement.job
                const techIndex = technicians.findIndex(t => t.id === job.technician_id)
                const techColor = getTechColor(job.technician_id, techIndex)
                const isOverdue = isPast(parseISO(job.scheduled_start)) && job.status === 'scheduled'
                return (
                  <JobCard
                    key={job.id}
                    job={job}
                    techColor={techColor}
                    variant={variant}
                    cardVariant={cardVariant}
                    isOverdue={isOverdue}
                    lane={placement.lane}
                    laneCount={placement.laneCount}
                    hasTechConflict={placement.hasTechConflict}
                    positionTop={placement.top}
                    positionHeight={placement.height}
                    isFocused={focusedJobId === job.id}
                    isDragging={draggingJob?.id === job.id}
                    isDropMode={Boolean(draggingJob)}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                )
              })}
          </AnimatePresence>

          {denseIndicators.map((indicator) => (
            <div
              key={indicator.clusterId}
              className="absolute right-1 z-30 rounded-md border border-cyan-300/80 bg-cyan-50/95 px-1.5 py-0.5 text-[9px] font-medium text-cyan-700 shadow-sm dark:border-cyan-500/40 dark:bg-cyan-900/70 dark:text-cyan-200"
              style={{ top: `${Math.max(0, indicator.top)}px` }}
              title={`${indicator.hiddenCount} overlapping jobs hidden`}
            >
              +{indicator.hiddenCount} more
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MonthView({
  currentDate,
  jobs,
  variant,
  onSelectDay,
}: {
  currentDate: Date
  jobs: Job[]
  variant: PlannerVariant
  onSelectDay: (day: Date) => void
}) {
  const monthStart = startOfMonth(currentDate)
  const startDay = startOfWeek(monthStart, { weekStartsOn: 0 })
  const days = Array.from({ length: 42 }, (_, i) => addDays(startDay, i))
  const cellMinHeight =
    variant === 'minimal' ? 'min-h-[96px] md:min-h-[116px]' : variant === 'balanced' ? 'min-h-[132px] md:min-h-[152px]' : 'min-h-[112px] md:min-h-[136px]'

  return (
    <div className="grid grid-cols-7 bg-white dark:bg-slate-900">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
        <div key={d} className="p-2 text-center text-[10px] font-medium text-slate-400 dark:text-slate-400 uppercase tracking-wide border-b border-slate-100 dark:border-slate-800">
          {d}
        </div>
      ))}

      {days.map(day => {
        const dayJobs = jobs.filter(job => isSameDay(parseJobDate(job.scheduled_start), day))
        const isCurrentMonth = day.getMonth() === currentDate.getMonth()

        return (
          <div
            key={day.toISOString()}
            className={`
              ${cellMinHeight} cursor-pointer p-1.5 border-b border-r border-slate-50 transition-colors hover:bg-slate-50 dark:border-slate-800/70 dark:hover:bg-slate-800/70
              ${isToday(day) ? 'bg-cyan-50/35 dark:bg-cyan-500/[0.08] ring-1 ring-inset ring-cyan-200/70 dark:ring-cyan-400/30' : ''}
              ${!isCurrentMonth ? 'opacity-40 bg-slate-50 dark:bg-slate-800/60' : ''}
            `}
            onClick={() => onSelectDay(day)}
          >
            <div className="mb-1 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onSelectDay(day)}
                className={`rounded px-1 text-xs font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/70 ${isToday(day) ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-700 dark:text-slate-200'
                  }`}
                title={`Open ${format(day, 'MMM d')} day view`}
              >
                {format(day, 'd')}
              </button>
              {dayJobs.length > 0 && (
                <span className="text-[9px] text-slate-400 dark:text-slate-400">{dayJobs.length}</span>
              )}
            </div>

            <div className="space-y-0.5">
              {dayJobs.slice(0, 3).map((job, i) => {
                const status = STATUS_CONFIG[job.status] || STATUS_CONFIG.scheduled
                const start = parseJobDate(job.scheduled_start)
                return (
                  <Link
                    key={job.id}
                    href={`/admin/jobs/${job.id}`}
                    onClick={(event) => event.stopPropagation()}
                    className="flex items-center gap-1 text-[9px] truncate px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status.dot}`} />
                    <span className="text-slate-600 dark:text-slate-300 truncate">{format(start, 'h:mm')} {job.customer_name}</span>
                  </Link>
                )
              })}
              {dayJobs.length > 3 && (
                <p className="text-[9px] text-slate-400 dark:text-slate-400 pl-1">+{dayJobs.length - 3}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ========================================
// MAIN PAGE
// ========================================
export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<ScheduleView>('week')
  const scheduleDesign: ScheduleDesign = 'planner_minimal'
  const scheduleCardVariant: ScheduleJobCardVariant = 'v8'
  const [jobs, setJobs] = useState<Job[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('all')
  const [technicianFilter, setTechnicianFilter] = useState<string>('all')
  const [serviceFilter, setServiceFilter] = useState<string>('all')
  const [timeFromFilter, setTimeFromFilter] = useState<string>('')
  const [timeToFilter, setTimeToFilter] = useState<string>('')
  const [summaryDateFrom, setSummaryDateFrom] = useState<string>(() => getDefaultSummaryDateRange().from)
  const [summaryDateTo, setSummaryDateTo] = useState<string>(() => getDefaultSummaryDateRange().to)
  const [isMatchesPanelOpen, setIsMatchesPanelOpen] = useState(false)
  const [isMiniCalendarOpen, setIsMiniCalendarOpen] = useState(false)
  const [miniCalendarMonth, setMiniCalendarMonth] = useState<Date>(() => startOfMonth(new Date()))
  const [openContextMenu, setOpenContextMenu] = useState<null | 'tech' | 'status' | 'service' | 'invoice'>(null)
  const [focusedScheduleJobId, setFocusedScheduleJobId] = useState<string | null>(null)
  const [focusJumpKey, setFocusJumpKey] = useState(0)
  const [businessId, setBusinessId] = useState('')
  const contextMenuRef = useRef<HTMLDivElement | null>(null)
  const miniCalendarRef = useRef<HTMLDivElement | null>(null)
  const fetchDebounceRef = useRef<number | null>(null)
  const activeWindowRef = useRef<{ start: Date; end: Date } | null>(null)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let mounted = true

    const initializeBusiness = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          if (!mounted) return
          setJobs([])
          setTechnicians([])
          setLoading(false)
          return
        }

        const { data: profile } = await supabase
          .from('users')
          .select('business_id')
          .eq('id', user.id)
          .single()

        if (!mounted) return
        if (!profile?.business_id) {
          setJobs([])
          setTechnicians([])
          setLoading(false)
          return
        }

        setBusinessId(profile.business_id)
      } catch (error) {
        console.error('Failed to initialize schedule business context:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void initializeBusiness()

    return () => {
      mounted = false
    }
  }, [supabase])

  useEffect(() => {
    if (!businessId) return

    let mounted = true
    const fetchTechnicians = async () => {
      try {
        const { data: techRows, error } = await supabase
          .from('users')
          .select('id, full_name')
          .eq('business_id', businessId)
          .eq('role', 'tech')

        if (error) throw error
        if (!mounted) return
        setTechnicians((techRows || []).map((tech) => ({ ...tech, color: '' })))
      } catch (error) {
        console.error('Failed to fetch technicians for schedule:', error)
      }
    }

    void fetchTechnicians()
    return () => {
      mounted = false
    }
  }, [businessId, supabase])

  const fetchData = useCallback(async () => {
    if (!businessId) {
      setJobs([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const baseWindow = getScheduleWindow(view, currentDate)
      const parsedSummaryFrom = summaryDateFrom ? new Date(`${summaryDateFrom}T00:00:00`) : null
      const parsedSummaryTo = summaryDateTo ? new Date(`${summaryDateTo}T23:59:59.999`) : null
      const summaryFromValid = parsedSummaryFrom && !Number.isNaN(parsedSummaryFrom.getTime()) ? parsedSummaryFrom : null
      const summaryToValid = parsedSummaryTo && !Number.isNaN(parsedSummaryTo.getTime()) ? parsedSummaryTo : null

      const fetchWindowStart = summaryFromValid && summaryFromValid < baseWindow.start
        ? summaryFromValid
        : baseWindow.start
      const fetchWindowEnd = summaryToValid && summaryToValid > baseWindow.end
        ? summaryToValid
        : baseWindow.end
      activeWindowRef.current = { start: fetchWindowStart, end: fetchWindowEnd }

      const { data: jobsData } = await supabase
        .from('jobs')
        .select('*')
        .eq('business_id', businessId)
        .or(buildScheduleWindowFilter(fetchWindowStart, fetchWindowEnd))
        .order('scheduled_start', { ascending: true })

      const customerIds = Array.from(
        new Set((jobsData || []).map((job) => job.customer_id).filter(Boolean))
      ) as string[]
      const { data: customersData = [] } = customerIds.length
        ? await supabase
          .from('customers')
          .select('id, name')
          .eq('business_id', businessId)
          .in('id', customerIds)
        : { data: [] as Array<{ id: string; name: string }> }
      const customers = customersData ?? []

      const customerMap = new Map(customers.map((customer) => [customer.id, customer.name]))
      const techMap = new Map(technicians.map((tech) => [tech.id, tech.full_name]))

      const jobIds = (jobsData || []).map((job) => job.id as string)
      const { data: invoiceRows = [] } = jobIds.length
        ? await supabase
          .from('invoices')
          .select('job_id, status, created_at')
          .in('job_id', jobIds)
          .order('created_at', { ascending: false })
        : { data: [] as Array<{ job_id: string; status: string; created_at: string }> }
      const { data: jobServicesData = [] } = jobIds.length
        ? await supabase
          .from('job_services')
          .select('job_id, service_id')
          .in('job_id', jobIds)
        : { data: [] as Array<{ job_id: string; service_id: string }> }

      const invoiceStatusByJob = new Map<string, string>()
      for (const invoice of invoiceRows || []) {
        if (!invoice.job_id || invoiceStatusByJob.has(invoice.job_id)) continue
        invoiceStatusByJob.set(invoice.job_id, invoice.status || 'none')
      }

      const serviceIds = Array.from(
        new Set((jobServicesData || []).map((row) => row.service_id).filter(Boolean))
      ) as string[]

      const { data: servicesData = [] } = serviceIds.length
        ? await supabase
          .from('services')
          .select('id, name')
          .eq('business_id', businessId)
          .in('id', serviceIds)
        : { data: [] as Array<{ id: string; name: string }> }

      const serviceMap = new Map((servicesData || []).map((s) => [s.id, s.name]))
      const servicesByJob = new Map<string, string[]>()
      for (const row of jobServicesData || []) {
        const name = row.service_id ? serviceMap.get(row.service_id) : null
        if (!name) continue
        const existing = servicesByJob.get(row.job_id) || []
        existing.push(name)
        servicesByJob.set(row.job_id, existing)
      }

      const enrichedJobs = (jobsData || []).map(job => ({
        ...job,
        invoice_status: invoiceStatusByJob.get(job.id) || 'none',
        customer_name: customerMap.get(job.customer_id) || 'Unknown',
        technician_name: job.technician_id ? techMap.get(job.technician_id) || 'Unknown' : null,
        service_names: servicesByJob.get(job.id) || [],
      }))

      setJobs(enrichedJobs)
    } catch (error) {
      console.error('Failed to fetch schedule data:', error)
    } finally {
      setLoading(false)
    }
  }, [businessId, currentDate, view, summaryDateFrom, summaryDateTo, supabase, technicians])

  const queueFetchData = useCallback(() => {
    if (fetchDebounceRef.current) {
      window.clearTimeout(fetchDebounceRef.current)
    }
    fetchDebounceRef.current = window.setTimeout(() => {
      void fetchData()
    }, 260)
  }, [fetchData])

  useEffect(() => {
    if (!businessId) return
    void fetchData()
  }, [businessId, fetchData])

  useEffect(() => {
    if (!businessId) return

    const channel = supabase
      .channel(`schedule-jobs:${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          const windowState = activeWindowRef.current
          if (!windowState) {
            queueFetchData()
            return
          }

          const nextStart = (payload.new as { scheduled_start?: string | null } | null)?.scheduled_start
          const prevStart = (payload.old as { scheduled_start?: string | null } | null)?.scheduled_start
          const touchesActiveWindow =
            isDateInWindow(nextStart, windowState.start, windowState.end) ||
            isDateInWindow(prevStart, windowState.start, windowState.end)

          if (touchesActiveWindow || payload.eventType === 'DELETE') {
            queueFetchData()
          }
        }
      )
      .subscribe()

    return () => {
      if (fetchDebounceRef.current) {
        window.clearTimeout(fetchDebounceRef.current)
        fetchDebounceRef.current = null
      }
      supabase.removeChannel(channel)
    }
  }, [businessId, queueFetchData, supabase])

  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const dateFrom = summaryDateFrom ? new Date(`${summaryDateFrom}T00:00:00`) : null
    const dateTo = summaryDateTo ? new Date(`${summaryDateTo}T23:59:59.999`) : null

    const parseMinutes = (value: string): number | null => {
      const v = value.trim()
      if (!v) return null
      const [hRaw, mRaw] = v.split(':')
      const h = Number(hRaw)
      const m = Number(mRaw)
      if (!Number.isFinite(h) || !Number.isFinite(m)) return null
      return h * 60 + m
    }

    const timeFrom = parseMinutes(timeFromFilter)
    const timeTo = parseMinutes(timeToFilter)

    return jobs.filter((job) => {
      if (q && !job.customer_name.toLowerCase().includes(q)) return false
      if (statusFilter !== 'all' && job.status !== statusFilter) return false
      if (invoiceStatusFilter !== 'all' && (job.invoice_status || 'none') !== invoiceStatusFilter) return false

      if (technicianFilter !== 'all') {
        const jobTech = job.technician_id || 'unassigned'
        if (jobTech !== technicianFilter) return false
      }

      if (serviceFilter !== 'all') {
        const names = job.service_names || []
        if (!names.some((name) => name === serviceFilter)) return false
      }

      const scheduled = parseJobDate(job.scheduled_start)
      if (dateFrom && scheduled < dateFrom) return false
      if (dateTo && scheduled > dateTo) return false

      if (timeFrom !== null || timeTo !== null) {
        const mins = scheduled.getHours() * 60 + scheduled.getMinutes()

        if (timeFrom !== null && timeTo !== null) {
          if (timeFrom <= timeTo) {
            if (mins < timeFrom || mins > timeTo) return false
          } else {
            // Allow overnight wrap (e.g. 22:00 -> 04:00)
            if (mins < timeFrom && mins > timeTo) return false
          }
        } else if (timeFrom !== null) {
          if (mins < timeFrom) return false
        } else if (timeTo !== null) {
          if (mins > timeTo) return false
        }
      }

      return true
    })
  }, [
    jobs,
    searchQuery,
    statusFilter,
    invoiceStatusFilter,
    technicianFilter,
    serviceFilter,
    summaryDateFrom,
    summaryDateTo,
    timeFromFilter,
    timeToFilter,
  ])

  const serviceOptions = useMemo(() => {
    const set = new Set<string>()
    for (const job of jobs) {
      for (const name of job.service_names || []) set.add(name)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [jobs])

  const selectedTechnicianLabel = useMemo(() => {
    if (technicianFilter === 'all') return 'All Techs'
    if (technicianFilter === 'unassigned') return 'Unassigned'
    return technicians.find((tech) => tech.id === technicianFilter)?.full_name || 'Technician'
  }, [technicianFilter, technicians])

  const selectedStatusLabel = useMemo(() => {
    if (statusFilter === 'all') return 'All Statuses'
    return (STATUS_CONFIG[statusFilter] || STATUS_CONFIG.scheduled).label
  }, [statusFilter])

  const selectedInvoiceStatusLabel = useMemo(() => {
    if (invoiceStatusFilter === 'all') return 'All Invoices'
    if (invoiceStatusFilter === 'none') return 'No Invoice'
    return invoiceStatusFilter.charAt(0).toUpperCase() + invoiceStatusFilter.slice(1)
  }, [invoiceStatusFilter])

  const selectedServiceLabel = useMemo(() => {
    if (serviceFilter === 'all') return 'All Services'
    return serviceFilter
  }, [serviceFilter])

  const defaultSummaryRange = useMemo(
    () => getDefaultSummaryDateRange(currentDate),
    [currentDate]
  )

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (searchQuery.trim()) count += 1
    if (statusFilter !== 'all') count += 1
    if (invoiceStatusFilter !== 'all') count += 1
    if (technicianFilter !== 'all') count += 1
    if (serviceFilter !== 'all') count += 1
    if (summaryDateFrom !== defaultSummaryRange.from || summaryDateTo !== defaultSummaryRange.to) count += 1
    if (timeFromFilter) count += 1
    if (timeToFilter) count += 1
    return count
  }, [
    searchQuery,
    statusFilter,
    invoiceStatusFilter,
    technicianFilter,
    serviceFilter,
    summaryDateFrom,
    summaryDateTo,
    defaultSummaryRange,
    timeFromFilter,
    timeToFilter,
  ])

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onClear: () => void }> = []

    const q = searchQuery.trim()
    if (q) {
      chips.push({
        key: 'q',
        label: `Customer: ${q}`,
        onClear: () => setSearchQuery(''),
      })
    }

    if (statusFilter !== 'all') {
      chips.push({
        key: 'status',
        label: `Status: ${(STATUS_CONFIG[statusFilter] || STATUS_CONFIG.scheduled).label}`,
        onClear: () => setStatusFilter('all'),
      })
    }

    if (invoiceStatusFilter !== 'all') {
      chips.push({
        key: 'invoice',
        label: `Invoice: ${invoiceStatusFilter === 'none'
          ? 'No Invoice'
          : invoiceStatusFilter.charAt(0).toUpperCase() + invoiceStatusFilter.slice(1)
          }`,
        onClear: () => setInvoiceStatusFilter('all'),
      })
    }

    if (technicianFilter !== 'all') {
      const techName =
        technicianFilter === 'unassigned'
          ? 'Unassigned'
          : technicians.find((t) => t.id === technicianFilter)?.full_name || 'Technician'
      chips.push({
        key: 'tech',
        label: `Tech: ${techName}`,
        onClear: () => setTechnicianFilter('all'),
      })
    }

    if (serviceFilter !== 'all') {
      chips.push({
        key: 'service',
        label: `Service: ${serviceFilter}`,
        onClear: () => setServiceFilter('all'),
      })
    }

    if (summaryDateFrom !== defaultSummaryRange.from || summaryDateTo !== defaultSummaryRange.to) {
      const range = [summaryDateFrom || '...', summaryDateTo || '...'].join(' to ')
      chips.push({
        key: 'range',
        label: `Date: ${range}`,
        onClear: () => {
          setSummaryDateFrom(defaultSummaryRange.from)
          setSummaryDateTo(defaultSummaryRange.to)
        },
      })
    }

    if (timeFromFilter || timeToFilter) {
      const range = [timeFromFilter || '...', timeToFilter || '...'].join(' to ')
      chips.push({
        key: 'time',
        label: `Time: ${range}`,
        onClear: () => {
          setTimeFromFilter('')
          setTimeToFilter('')
        },
      })
    }

    return chips
  }, [
    searchQuery,
    statusFilter,
    invoiceStatusFilter,
    technicianFilter,
    technicians,
    serviceFilter,
    summaryDateFrom,
    summaryDateTo,
    defaultSummaryRange,
    timeFromFilter,
    timeToFilter,
  ])

  const filteredJobsPreview = useMemo(
    () => filteredJobs,
    [filteredJobs]
  )

  const jumpToJobOnSchedule = useCallback((job: Job) => {
    const scheduledAt = parseJobDate(job.scheduled_start)
    setCurrentDate(scheduledAt)
    if (view === 'month') {
      setView('week')
    }
    setFocusedScheduleJobId(job.id)
    setFocusJumpKey((prev) => prev + 1)
  }, [view])

  useEffect(() => {
    if (!focusedScheduleJobId) return

    const timer = window.setTimeout(() => {
      const node = document.querySelector(`[data-schedule-job-id="${focusedScheduleJobId}"]`) as HTMLElement | null
      if (!node) return

      node.scrollIntoView({ behavior: 'smooth', block: 'center' })
      node.animate(
        [
          { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(34,211,238,0.0)' },
          { transform: 'scale(1.01)', boxShadow: '0 0 0 4px rgba(34,211,238,0.28)' },
          { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(34,211,238,0.0)' },
        ],
        { duration: 850, easing: 'ease-out' }
      )
    }, 90)

    return () => window.clearTimeout(timer)
  }, [focusedScheduleJobId, currentDate, view, focusJumpKey])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenContextMenu(null)
        setIsMiniCalendarOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (contextMenuRef.current && target && !contextMenuRef.current.contains(target)) {
        setOpenContextMenu(null)
      }
      if (miniCalendarRef.current && target && !miniCalendarRef.current.contains(target)) {
        setIsMiniCalendarOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const clearFilters = () => {
    const defaults = getDefaultSummaryDateRange(currentDate)
    setSearchQuery('')
    setStatusFilter('all')
    setInvoiceStatusFilter('all')
    setTechnicianFilter('all')
    setServiceFilter('all')
    setSummaryDateFrom(defaults.from)
    setSummaryDateTo(defaults.to)
    setTimeFromFilter('')
    setTimeToFilter('')
    setOpenContextMenu(null)
  }

  const handleJobMove = async (jobId: string, newDate: Date, newHour: number) => {
    const job = jobs.find(j => j.id === jobId)
    if (!job) return

    // Snap to dropped slot for predictable drag-and-drop placement.
    const { start: oldStart } = getJobInterval(job)
    const newStart = buildLocalDateAtHour(newDate, newHour, 0)

    // Preserve exact duration in minutes (including non-hour boundaries).
    const rawDuration = job.scheduled_end
      ? differenceInMinutes(parseJobDate(job.scheduled_end), oldStart)
      : DEFAULT_JOB_DURATION_MINUTES
    const duration = rawDuration > 0 ? rawDuration : DEFAULT_JOB_DURATION_MINUTES
    const newEnd = addMinutes(newStart, duration)

    const conflicts = findTechnicianOverlapsForWindow({
      jobs,
      movingJobId: job.id,
      technicianId: job.technician_id,
      start: newStart,
      end: newEnd,
    })
    if (conflicts.length > 0) {
      const topConflicts = conflicts
        .slice(0, 3)
        .map((conflict) => `${format(parseJobDate(conflict.scheduled_start), 'MMM d h:mm a')} - ${conflict.customer_name}`)
      const more = conflicts.length > 3 ? `\n- +${conflicts.length - 3} more` : ''
      const proceed = window.confirm(
        `This creates an overlapping assignment for ${job.technician_name || 'this technician'}.\n\n` +
        `Conflicts:\n- ${topConflicts.join('\n- ')}${more}\n\n` +
        'Move this job anyway?'
      )
      if (!proceed) {
        return
      }
    }

    const scheduledStartIso = newStart.toISOString()
    const scheduledEndIso = newEnd.toISOString()

    // Update in Supabase and use returned values to avoid client/server time drift.
    const { data: updated, error } = await supabase
      .from('jobs')
      .update({
        scheduled_start: scheduledStartIso,
        scheduled_end: scheduledEndIso,
      })
      .eq('id', jobId)
      .select('scheduled_start, scheduled_end')
      .single()

    if (error) {
      console.error('Failed to move job:', error)
      return
    }

    const nextStart = updated?.scheduled_start || scheduledStartIso
    const nextEnd = updated?.scheduled_end || scheduledEndIso

    // Update local state
    setJobs(prev => prev.map(j =>
      j.id === jobId
        ? { ...j, scheduled_start: nextStart, scheduled_end: nextEnd }
        : j
    ))
  }

  type ScrubUnit = 'day' | 'week' | 'month' | 'year'
  const scrubOptions: Array<{ label: string; unit: ScrubUnit }> = [
    { label: '1 Day', unit: 'day' },
    { label: '1 Week', unit: 'week' },
    { label: '1 Month', unit: 'month' },
    { label: '1 Year', unit: 'year' },
  ]

  const scrubBack = (unit: ScrubUnit) => {
    setCurrentDate((prev) => {
      if (unit === 'day') return addDays(prev, -1)
      if (unit === 'week') return addDays(prev, -7)
      if (unit === 'month') return subMonths(prev, 1)
      return subMonths(prev, 12)
    })
  }

  const scrubForward = (unit: ScrubUnit) => {
    setCurrentDate((prev) => {
      if (unit === 'day') return addDays(prev, 1)
      if (unit === 'week') return addDays(prev, 7)
      if (unit === 'month') return addMonths(prev, 1)
      return addMonths(prev, 12)
    })
  }

  const defaultScrubUnit: ScrubUnit = view === 'day' ? 'day' : view === 'week' ? 'week' : 'month'

  const goToToday = () => setCurrentDate(new Date())

  const handleMiniCalendarSelect = useCallback((selectedDay: Date) => {
    setCurrentDate(selectedDay)
    setView('day')
    setIsMiniCalendarOpen(false)
  }, [])

  const summaryRange = useMemo(() => {
    const fallbackStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const fallbackEnd = addDays(fallbackStart, WEEK_LAST_DAY_OFFSET)

    const parsedStart = summaryDateFrom ? parseISO(`${summaryDateFrom}T00:00:00`) : fallbackStart
    const parsedEnd = summaryDateTo ? parseISO(`${summaryDateTo}T23:59:59.999`) : fallbackEnd

    const initialStart = Number.isNaN(parsedStart.getTime())
      ? new Date(fallbackStart.getFullYear(), fallbackStart.getMonth(), fallbackStart.getDate(), 0, 0, 0, 0)
      : new Date(parsedStart.getFullYear(), parsedStart.getMonth(), parsedStart.getDate(), 0, 0, 0, 0)
    const initialEnd = Number.isNaN(parsedEnd.getTime())
      ? new Date(fallbackEnd.getFullYear(), fallbackEnd.getMonth(), fallbackEnd.getDate(), 23, 59, 59, 999)
      : new Date(parsedEnd.getFullYear(), parsedEnd.getMonth(), parsedEnd.getDate(), 23, 59, 59, 999)

    if (initialStart <= initialEnd) {
      return { start: initialStart, end: initialEnd }
    }

    return { start: initialEnd, end: initialStart }
  }, [summaryDateFrom, summaryDateTo, currentDate])

  const summaryJobs = useMemo(() => {
    return filteredJobs
      .filter((job) => {
        const jobDate = parseJobDate(job.scheduled_start)
        return jobDate >= summaryRange.start && jobDate <= summaryRange.end
      })
      .sort(
        (a, b) =>
          parseJobDate(a.scheduled_start).getTime() - parseJobDate(b.scheduled_start).getTime()
      )
  }, [filteredJobs, summaryRange])

  const completedSummaryCount = useMemo(
    () => summaryJobs.filter((job) => job.status === 'completed').length,
    [summaryJobs]
  )

  const unassignedSummaryCount = useMemo(
    () => summaryJobs.filter((job) => !job.technician_id).length,
    [summaryJobs]
  )

  const technicianLoadSummary = useMemo(() => {
    const techLoadMap = new Map<string, { name: string; count: number }>()
    for (const job of summaryJobs) {
      const techId = job.technician_id || 'unassigned'
      const techName = job.technician_name || 'Unassigned'
      const existing = techLoadMap.get(techId) || { name: techName, count: 0 }
      existing.count += 1
      techLoadMap.set(techId, existing)
    }

    return Array.from(techLoadMap.entries())
      .map(([id, value]) => ({ id, ...value }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
  }, [summaryJobs])

  const plannerVariant: PlannerVariant = 'minimal'

  const miniCalendarDays = useMemo(() => {
    const monthStart = startOfMonth(miniCalendarMonth)
    const monthEnd = endOfMonth(miniCalendarMonth)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const gridEnd = addDays(startOfWeek(monthEnd, { weekStartsOn: 0 }), 6)
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [miniCalendarMonth])

  useEffect(() => {
    const nextMonth = startOfMonth(currentDate)
    setMiniCalendarMonth((prev) =>
      prev.getFullYear() === nextMonth.getFullYear() &&
        prev.getMonth() === nextMonth.getMonth()
        ? prev
        : nextMonth
    )
  }, [currentDate])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="h-6 w-40 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-20 rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="h-8 w-52 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="h-8 w-36 rounded-lg bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="h-[500px] rounded-lg bg-slate-100 dark:bg-slate-800/60" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl dark:border-white/5 dark:bg-slate-900/40">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-cyan-500/5" />
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-cyan-500/10 blur-[100px] mix-blend-screen" />

        <div className="relative z-20 flex flex-col gap-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-display font-medium text-slate-900 dark:text-white pb-1 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300">
                Dispatch Reality
              </h1>
              <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-slate-500 dark:text-cyan-400/80 mt-0.5 font-bold">
                {activeFiltersCount
                  ? `${filteredJobs.length} OF ${jobs.length} JOBS SHOWN`
                  : `${jobs.length} JOBS ACROSS OPERATIONS`}
              </p>
            </div>

            <div className="relative z-40 flex flex-wrap items-center gap-2">
              <Button
                variant="glass"
                size="sm"
                className="rounded-full text-xs"
                onClick={goToToday}
              >
                Today
              </Button>

              <div ref={miniCalendarRef} className="relative">
                <Button
                  variant="glass"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => setIsMiniCalendarOpen((prev) => !prev)}
                  icon={<CalendarDays className="w-3.5 h-3.5" />}
                >
                  Jump
                </Button>

                {isMiniCalendarOpen && (
                  <div className="absolute right-0 top-full z-[130] mt-2 w-[280px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    <div className="mb-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setMiniCalendarMonth((prev) => subMonths(prev, 1))}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/70"
                        aria-label="Previous month"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <p className="font-mono text-xs uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
                        {format(miniCalendarMonth, 'MMMM yyyy')}
                      </p>
                      <button
                        type="button"
                        onClick={() => setMiniCalendarMonth((prev) => addMonths(prev, 1))}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/70"
                        aria-label="Next month"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mb-1 grid grid-cols-7 gap-1">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, idx) => (
                        <div
                          key={`mini-day-label-${label}-${idx}`}
                          className="text-center font-mono text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500"
                        >
                          {label}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {miniCalendarDays.map((day) => {
                        const inCurrentMonth = day.getMonth() === miniCalendarMonth.getMonth()
                        const selected = isSameDay(day, currentDate)
                        const today = isToday(day)

                        return (
                          <button
                            key={`mini-day-${day.toISOString()}`}
                            type="button"
                            onClick={() => handleMiniCalendarSelect(day)}
                            className={`h-8 rounded-md text-xs font-medium transition-colors ${selected
                              ? 'bg-cyan-500 text-slate-950'
                              : today
                                ? 'border border-cyan-300 text-cyan-700 dark:border-cyan-500/40 dark:text-cyan-300'
                                : inCurrentMonth
                                  ? 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/70'
                                  : 'text-slate-400 hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-slate-800/50'
                              }`}
                            title={`Open ${format(day, 'MMM d, yyyy')}`}
                          >
                            {format(day, 'd')}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-visible">
                <div className="relative group">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => scrubBack(defaultScrubUnit)}
                    className="h-8 w-8 rounded-none rounded-l-lg border-r border-slate-100 p-0 text-slate-500 shadow-none hover:bg-slate-50 hover:text-slate-700 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </Button>
                  <div className="absolute top-full left-0 mt-1 hidden group-hover:block group-focus-within:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-[120] min-w-[120px]">
                    {scrubOptions.map((option) => (
                      <button type="button"
                        key={`back-${option.unit}`}
                        onClick={() => scrubBack(option.unit)}
                        className="block w-full text-left px-3 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      >
                        - {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <span className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 min-w-[170px] text-center">
                  {view === 'day' && format(currentDate, 'MMM d, yyyy')}
                  {view === 'week' &&
                    `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} - ${format(
                      addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), WEEK_LAST_DAY_OFFSET),
                      'MMM d'
                    )}`}
                  {view === 'month' && format(currentDate, 'MMMM yyyy')}
                </span>

                <div className="relative group">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => scrubForward(defaultScrubUnit)}
                    className="h-8 w-8 rounded-none rounded-r-lg border-l border-slate-100 p-0 text-slate-500 shadow-none hover:bg-slate-50 hover:text-slate-700 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </Button>
                  <div className="absolute top-full right-0 mt-1 hidden group-hover:block group-focus-within:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-[120] min-w-[120px]">
                    {scrubOptions.map((option) => (
                      <button type="button"
                        key={`forward-${option.unit}`}
                        onClick={() => scrubForward(option.unit)}
                        className="block w-full text-left px-3 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      >
                        + {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden">
                {(['day', 'week', 'month'] as const).map((v, index) => (
                  <Button
                    key={v}
                    variant={view === v ? 'glassPrimary' : 'ghost'}
                    size="sm"
                    onClick={() => setView(v)}
                    className={`h-8 rounded-none px-3 text-xs font-medium capitalize shadow-none ${index === 0 ? 'rounded-l-full' : ''
                      } ${index === 2 ? 'rounded-r-full' : ''} ${index > 0 ? 'border-l border-slate-100 dark:border-slate-800' : ''
                      } ${view === v
                        ? '!bg-cyan-600 dark:!bg-cyan-500 !text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                  >
                    {v}
                  </Button>
                ))}
              </div>

              <Link href="/admin/jobs/new" data-test="add-appointment">
                <Button
                  variant="glassPrimary"
                  size="sm"
                  data-test="add-appointment"
                  className="rounded-full text-xs"
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  New
                </Button>
              </Link>
            </div>
          </div>

          <section className="sticky top-2 z-[70] rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[220px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search customer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-200/80 bg-white pl-9 pr-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>

                <div ref={contextMenuRef} className="flex flex-wrap items-center gap-1.5 relative z-[100]">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenContextMenu((prev) => (prev === 'tech' ? null : 'tech'))}
                      className={`rounded-full border px-3 py-1.5 text-[10px] font-mono uppercase tracking-wide transition-colors ${technicianFilter !== 'all'
                        ? 'border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-500/15 dark:text-cyan-200'
                        : 'border-slate-200/80 bg-white/80 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800/70'
                        }`}
                    >
                      Tech: {selectedTechnicianLabel}
                    </button>
                    {openContextMenu === 'tech' && (
                      <div className="absolute left-0 top-full mt-1 z-[120] w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                        <button
                          type="button"
                          onClick={() => {
                            setTechnicianFilter('all')
                            setOpenContextMenu(null)
                          }}
                          className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70"
                        >
                          All Technicians
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTechnicianFilter('unassigned')
                            setOpenContextMenu(null)
                          }}
                          className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70"
                        >
                          Unassigned
                        </button>
                        {technicians.map((tech) => (
                          <button
                            key={`menu-tech-${tech.id}`}
                            type="button"
                            onClick={() => {
                              setTechnicianFilter(tech.id)
                              setOpenContextMenu(null)
                            }}
                            className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70"
                          >
                            {tech.full_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenContextMenu((prev) => (prev === 'status' ? null : 'status'))}
                      className={`rounded-full border px-3 py-1.5 text-[10px] font-mono uppercase tracking-wide transition-colors ${statusFilter !== 'all'
                        ? 'border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-500/15 dark:text-cyan-200'
                        : 'border-slate-200/80 bg-white/80 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800/70'
                        }`}
                    >
                      Status: {selectedStatusLabel}
                    </button>
                    {openContextMenu === 'status' && (
                      <div className="absolute left-0 top-full mt-1 z-[120] w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                        <button
                          type="button"
                          onClick={() => {
                            setStatusFilter('all')
                            setOpenContextMenu(null)
                          }}
                          className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70"
                        >
                          All Statuses
                        </button>
                        {[
                          'scheduled',
                          'on_the_way',
                          'arrived',
                          'in_progress',
                          'completed',
                          'cancelled',
                        ].map((statusKey) => (
                          <button
                            key={`menu-status-${statusKey}`}
                            type="button"
                            onClick={() => {
                              setStatusFilter(statusKey)
                              setOpenContextMenu(null)
                            }}
                            className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70"
                          >
                            {(STATUS_CONFIG[statusKey] || STATUS_CONFIG.scheduled).label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenContextMenu((prev) => (prev === 'service' ? null : 'service'))}
                      className={`rounded-full border px-3 py-1.5 text-[10px] font-mono uppercase tracking-wide transition-colors ${serviceFilter !== 'all'
                        ? 'border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-500/15 dark:text-cyan-200'
                        : 'border-slate-200/80 bg-white/80 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800/70'
                        }`}
                    >
                      Service: {selectedServiceLabel}
                    </button>
                    {openContextMenu === 'service' && (
                      <div className="absolute left-0 top-full mt-1 z-[120] w-64 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                        <button
                          type="button"
                          onClick={() => {
                            setServiceFilter('all')
                            setOpenContextMenu(null)
                          }}
                          className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70"
                        >
                          All Services
                        </button>
                        {serviceOptions.map((service) => (
                          <button
                            key={`menu-service-${service}`}
                            type="button"
                            onClick={() => {
                              setServiceFilter(service)
                              setOpenContextMenu(null)
                            }}
                            className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70"
                          >
                            {service}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenContextMenu((prev) => (prev === 'invoice' ? null : 'invoice'))}
                      className={`rounded-full border px-3 py-1.5 text-[10px] font-mono uppercase tracking-wide transition-colors ${invoiceStatusFilter !== 'all'
                        ? 'border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-500/15 dark:text-cyan-200'
                        : 'border-slate-200/80 bg-white/80 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800/70'
                        }`}
                    >
                      Invoice: {selectedInvoiceStatusLabel}
                    </button>
                    {openContextMenu === 'invoice' && (
                      <div className="absolute left-0 top-full mt-1 z-[120] w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                        {[
                          { key: 'all', label: 'All Invoices' },
                          { key: 'none', label: 'No Invoice' },
                          { key: 'draft', label: 'Draft' },
                          { key: 'sent', label: 'Sent' },
                          { key: 'overdue', label: 'Overdue' },
                          { key: 'paid', label: 'Paid' },
                          { key: 'cancelled', label: 'Cancelled' },
                        ].map((option) => (
                          <button
                            key={`menu-invoice-${option.key}`}
                            type="button"
                            onClick={() => {
                              setInvoiceStatusFilter(option.key)
                              setOpenContextMenu(null)
                            }}
                            className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <ActionIconButton
                    stylePreset="ambient"
                    intent={isMatchesPanelOpen ? 'primary' : 'secondary'}
                    size="md"
                    onClick={() => setIsMatchesPanelOpen((prev) => !prev)}
                    aria-label={isMatchesPanelOpen ? 'Hide matched jobs' : 'Show matched jobs'}
                    title={isMatchesPanelOpen ? 'Hide matched jobs' : 'Show matched jobs'}
                    icon={<Search className="h-4 w-4" />}
                  />
                  <ActionButton
                    stylePreset="industrial"
                    intent="danger"
                    size="sm"
                    onClick={clearFilters}
                    className="uppercase tracking-[0.1em]"
                  >
                    Clear All
                  </ActionButton>
                </div>
              </div>

              {activeFilterChips.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {activeFilterChips.map((chip) => (
                    <ActionFilterChip
                      key={`rail-${chip.key}`}
                      label={chip.label}
                      onRemove={chip.onClear}
                      stylePreset="ambient"
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-2 md:grid-cols-5">
            <div className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Jobs</p>
              <p className="font-display text-xl text-slate-800 dark:text-slate-100">{summaryJobs.length}</p>
            </div>
            <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/80 px-3 py-2 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Done</p>
              <p className="font-display text-xl text-emerald-700 dark:text-emerald-300">{completedSummaryCount}</p>
            </div>
            <div className="rounded-xl border border-amber-200/70 bg-amber-50/80 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
              <p className="text-[10px] font-mono uppercase tracking-widest text-amber-600 dark:text-amber-400">Open</p>
              <p className="font-display text-xl text-amber-700 dark:text-amber-300">{unassignedSummaryCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Filters</p>
              <p className="font-display text-xl text-slate-800 dark:text-slate-100">{activeFiltersCount}</p>
            </div>
            <div className="rounded-xl border border-cyan-200/70 bg-cyan-50/80 px-3 py-2 dark:border-cyan-500/30 dark:bg-cyan-500/10">
              <p className="text-[10px] font-mono uppercase tracking-widest text-cyan-700 dark:text-cyan-300">Top Tech Load</p>
              <p className="font-display text-xl text-cyan-700 dark:text-cyan-200">{technicianLoadSummary[0]?.count ?? 0}</p>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4">

            <div className="space-y-3">
              <div
                data-test="calendar"
                className="relative z-0 bg-white/40 dark:bg-slate-900/30 rounded-[28px] border border-white/20 dark:border-white/5 overflow-hidden shadow-2xl backdrop-blur-md"
              >
                <>
                  {view === 'day' && (
                    <DayView
                      currentDate={currentDate}
                      jobs={filteredJobs}
                      technicians={technicians}
                      variant={plannerVariant}
                      cardVariant={scheduleCardVariant}
                      focusedJobId={focusedScheduleJobId}
                      onJobMove={handleJobMove}
                    />
                  )}
                  {view === 'week' && (
                    <WeekView
                      currentDate={currentDate}
                      jobs={filteredJobs}
                      technicians={technicians}
                      variant={plannerVariant}
                      cardVariant={scheduleCardVariant}
                      focusedJobId={focusedScheduleJobId}
                      onJobMove={handleJobMove}
                    />
                  )}
                  {view === 'month' && (
                    <MonthView
                      currentDate={currentDate}
                      jobs={filteredJobs}
                      variant={plannerVariant}
                      onSelectDay={(selectedDay) => {
                        setCurrentDate(selectedDay)
                        setView('day')
                      }}
                    />
                  )}
                </>
              </div>

              {isMatchesPanelOpen && (
                <section className="rounded-2xl border border-slate-200/80 bg-white/85 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/75">
                  <div className="border-b border-slate-200/70 dark:border-slate-800 px-4 py-3">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Matching Jobs
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      {activeFiltersCount
                        ? `${filteredJobs.length} job${filteredJobs.length === 1 ? '' : 's'} selected by active filters`
                        : 'Apply filters to populate this list'}
                    </p>
                  </div>

                  <div className="p-3">
                    {!activeFiltersCount ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Set at least one filter to preview matching jobs and jump directly to them on the schedule.
                      </p>
                    ) : filteredJobs.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        No jobs match the current filters.
                      </p>
                    ) : (
                      <div className="max-h-[52vh] space-y-1.5 overflow-y-auto pr-1">
                        {filteredJobsPreview.map((job) => (
                          <button
                            key={`matched-job-${job.id}`}
                            type="button"
                            onClick={() => jumpToJobOnSchedule(job)}
                            className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200/70 bg-white/80 px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-slate-50 dark:border-slate-700/70 dark:bg-slate-900/60 dark:hover:bg-slate-800/70"
                          >
                            <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">
                              {job.customer_name}
                            </span>
                            <span className="shrink-0 text-[10px] text-slate-500 dark:text-slate-400">
                              {format(parseJobDate(job.scheduled_start), 'MMM d h:mm a')}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function AgendaView({
  currentDate,
  view,
  jobs,
}: {
  currentDate: Date
  view: ScheduleView
  jobs: Job[]
}) {
  const { start, endExclusive } = getScheduleRange(currentDate, view)
  const days = getScheduleDays(currentDate, view)

  const jobsByDay = useMemo(() => {
    const map = new Map<string, Job[]>()
    for (const day of days) {
      map.set(format(day, 'yyyy-MM-dd'), [])
    }

    for (const job of jobs) {
      const scheduled = parseJobDate(job.scheduled_start)
      if (scheduled < start || scheduled >= endExclusive) continue
      const key = format(scheduled, 'yyyy-MM-dd')
      const list = map.get(key) || []
      list.push(job)
      map.set(key, list)
    }

    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          parseJobDate(a.scheduled_start).getTime() - parseJobDate(b.scheduled_start).getTime()
      )
    }

    return map
  }, [days, endExclusive, jobs, start])

  return (
    <div className="p-3 sm:p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayJobs = jobsByDay.get(key) || []
          return (
            <div
              key={key}
              className="rounded-xl border border-slate-200/80 bg-white/85 p-3 dark:border-slate-700/70 dark:bg-slate-900/65"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {format(day, 'EEE, MMM d')}
                </p>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  {dayJobs.length}
                </span>
              </div>

              {dayJobs.length === 0 ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">No scheduled jobs</p>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {dayJobs.map((job) => {
                    const status = STATUS_CONFIG[job.status] || STATUS_CONFIG.scheduled
                    const startTime = parseJobDate(job.scheduled_start)
                    return (
                      <Link
                        key={job.id}
                        href={`/admin/jobs/${job.id}`}
                        data-test="event-block"
                        className="block rounded-lg border border-slate-200/80 bg-slate-50/80 px-2.5 py-2 transition-colors hover:bg-slate-100 dark:border-slate-700/70 dark:bg-slate-800/60 dark:hover:bg-slate-700/70"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                            {format(startTime, 'h:mm a')}
                          </p>
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-300">
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {job.customer_name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {job.technician_name || 'Unassigned'}
                        </p>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TechnicianBoardView({
  currentDate,
  view,
  jobs,
  technicians,
}: {
  currentDate: Date
  view: ScheduleView
  jobs: Job[]
  technicians: Technician[]
}) {
  const { start, endExclusive } = getScheduleRange(currentDate, view)

  const grouped = useMemo(() => {
    const map = new Map<string, { id: string; name: string; jobs: Job[] }>()

    for (const tech of technicians) {
      map.set(tech.id, { id: tech.id, name: tech.full_name, jobs: [] })
    }
    map.set('unassigned', { id: 'unassigned', name: 'Unassigned', jobs: [] })

    for (const job of jobs) {
      const scheduled = parseJobDate(job.scheduled_start)
      if (scheduled < start || scheduled >= endExclusive) continue
      const key = job.technician_id || 'unassigned'
      const existing =
        map.get(key) || {
          id: key,
          name: job.technician_name || 'Unassigned',
          jobs: [],
        }
      existing.jobs.push(job)
      map.set(key, existing)
    }

    const groups = Array.from(map.values())
      .map((group) => ({
        ...group,
        jobs: group.jobs.sort(
          (a, b) =>
            parseJobDate(a.scheduled_start).getTime() - parseJobDate(b.scheduled_start).getTime()
        ),
      }))
      .filter((group) => group.jobs.length > 0)
      .sort((a, b) => b.jobs.length - a.jobs.length)

    return groups
  }, [endExclusive, jobs, start, technicians])

  if (grouped.length === 0) {
    return (
      <div className="p-4">
        <div className="rounded-xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/70">
          <p className="text-sm text-slate-500 dark:text-slate-400">No jobs in this range.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {grouped.map((group) => (
          <div
            key={group.id}
            className="rounded-xl border border-slate-200/80 bg-white/85 p-3 dark:border-slate-700/70 dark:bg-slate-900/65"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{group.name}</p>
              <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-mono text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300">
                {group.jobs.length}
              </span>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {group.jobs.map((job) => {
                const status = STATUS_CONFIG[job.status] || STATUS_CONFIG.scheduled
                const scheduled = parseJobDate(job.scheduled_start)
                return (
                  <Link
                    key={job.id}
                    href={`/admin/jobs/${job.id}`}
                    data-test="event-block"
                    className="block rounded-lg border border-slate-200/80 bg-slate-50/80 px-2.5 py-2 transition-colors hover:bg-slate-100 dark:border-slate-700/70 dark:bg-slate-800/60 dark:hover:bg-slate-700/70"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                        {format(scheduled, 'EEE h:mm a')}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-300">
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {job.customer_name}
                    </p>
                    {job.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {job.description}
                      </p>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


