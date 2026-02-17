'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  parseISO,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  eachDayOfInterval,
  differenceInMinutes,
  addHours,
  addMinutes,
  isToday,
  isPast,
} from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  MapPin,
  Clock3,
  Users2,
  Filter,
  X,
} from '@/components/ui/icons'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

// ========================================
// TYPES
// ========================================
interface Job {
  id: string
  status: string
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

// ========================================
// DESIGN SYSTEM - Apple/Google Calendar Aesthetic
// ========================================

const TECH_COLORS = [
  { name: 'cyan', bg: 'bg-cyan-500', light: 'bg-cyan-50 dark:bg-cyan-400/10', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800' },
  { name: 'purple', bg: 'bg-purple-500', light: 'bg-purple-50 dark:bg-purple-400/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  { name: 'emerald', bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-400/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  { name: 'amber', bg: 'bg-amber-500', light: 'bg-amber-50 dark:bg-amber-400/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  { name: 'rose', bg: 'bg-rose-500', light: 'bg-rose-50 dark:bg-rose-400/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800' },
  { name: 'teal', bg: 'bg-teal-500', light: 'bg-teal-50 dark:bg-teal-400/10', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800' },
  { name: 'indigo', bg: 'bg-indigo-500', light: 'bg-indigo-50 dark:bg-indigo-400/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
  { name: 'orange', bg: 'bg-orange-500', light: 'bg-orange-50 dark:bg-orange-400/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
]

const STATUS_CONFIG: Record<string, { dot: string; label: string; bg: string }> = {
  scheduled: { dot: 'bg-slate-400', label: 'Scheduled', bg: 'bg-slate-50 dark:bg-slate-700/70' },
  on_the_way: { dot: 'bg-amber-400', label: 'En Route', bg: 'bg-amber-50 dark:bg-amber-400/10' },
  arrived: { dot: 'bg-orange-400', label: 'Arrived', bg: 'bg-orange-50 dark:bg-orange-400/10' },
  in_progress: { dot: 'bg-cyan-400', label: 'In Progress', bg: 'bg-cyan-50 dark:bg-cyan-400/10' },
  completed: { dot: 'bg-emerald-400', label: 'Completed', bg: 'bg-emerald-50 dark:bg-emerald-400/10' },
  cancelled: { dot: 'bg-rose-400', label: 'Cancelled', bg: 'bg-rose-50 dark:bg-rose-400/10' },
}

const HOUR_HEIGHT = 48
const START_HOUR = 0
const END_HOUR = 23
const TOTAL_HOURS = END_HOUR - START_HOUR
const WEEK_DAYS = 7
const WEEK_LAST_DAY_OFFSET = WEEK_DAYS - 1

// ========================================
// UTILITY FUNCTIONS
// ========================================
function getTechColor(techId: string | null, index: number) {
  if (!techId) return TECH_COLORS[0]
  const hash = techId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return TECH_COLORS[hash % TECH_COLORS.length]
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

function getJobPosition(startTime: string, endTime: string | null) {
  const start = parseJobDate(startTime)
  const hour = start.getHours()
  const minute = start.getMinutes()
  
  // Allow hours before START_HOUR to show at top
  const effectiveHour = Math.max(START_HOUR, hour)
  const top = ((effectiveHour - START_HOUR) * HOUR_HEIGHT) + ((minute / 60) * HOUR_HEIGHT)
  
  const end = endTime ? parseJobDate(endTime) : addHours(start, 2)
  const duration = Math.max(30, differenceInMinutes(end, start))
  const height = Math.max(42, Math.min((duration / 60) * HOUR_HEIGHT, HOUR_HEIGHT * 5))
  
  return { top: Math.max(0, top), height, start }
}

// ========================================
// COMPONENTS
// ========================================

function JobCard({ 
  job, 
  techColor, 
  variant,
  isOverdue,
  isDragging,
  isDropMode,
  onDragStart,
  onDragEnd,
}: { 
  job: Job
  techColor: typeof TECH_COLORS[0]
  variant: PlannerVariant
  isOverdue: boolean
  isDragging?: boolean
  isDropMode?: boolean
  onDragStart?: (e: React.DragEvent, job: Job) => void
  onDragEnd?: () => void
}) {
  const { top, height, start } = getJobPosition(job.scheduled_start, job.scheduled_end)
  const status = STATUS_CONFIG[job.status] || STATUS_CONFIG.scheduled
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
  const [isHovered, setIsHovered] = useState(false)
  
  // Don't render if job is outside visible hours (except show at boundaries)
  if (start.getHours() < START_HOUR - 2 || start.getHours() > END_HOUR + 2) {
    return null
  }
  
  return (
    <div
      draggable={!!onDragStart}
      onDragStart={(e) => onDragStart?.(e, job)}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        absolute ${isBalanced ? 'left-1.5 right-1.5' : 'left-1 right-1'}
        ${cardRadius} overflow-hidden
        ${isBalanced ? 'border border-slate-200/90 dark:border-slate-700/70 shadow-sm' : ''}
        ${status.bg}
        transition-all duration-200
        hover:shadow-lg hover:scale-[1.01]
        ${onDragStart ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
        ${isDragging ? 'opacity-50' : ''}
        ${isDropMode && !isDragging ? 'pointer-events-none' : ''}
      `}
      style={{ 
        top: `${top}px`, 
        height: `${height}px`, 
        zIndex: isHovered ? 100 : 10,
      }}
    >
      <Link href={`/admin/jobs/${job.id}`} className="block h-full" draggable={false}>
        <div className={`h-full ${cardXPadding} ${cardYPadding} flex flex-col`}>
          <p className={`${customerTextSize} font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate`}>
            {job.customer_name}
          </p>

          {showDescription && job.description && (
            <p className={`mt-1 ${isMinimal ? 'text-[10px]' : 'text-[11px]'} text-slate-600 dark:text-slate-300 truncate`}>
              {job.description.length > 40 ? `${job.description.slice(0, 40)}...` : job.description}
            </p>
          )}

          {showAddress && job.address && (
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-300 truncate flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
              {job.address.length > 30 ? `${job.address.slice(0, 30)}...` : job.address}
            </p>
          )}

          {!compactCard && (
            <div className="mt-auto pt-1.5 flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className={`w-5 h-5 rounded-full ${techColor.bg} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-[9px] text-white font-bold">
                    {techDisplayName.charAt(0) || '?'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-600 dark:text-slate-300 truncate">
                  {isBalanced ? techDisplayName : techFirstName}
                </span>
              </div>
              {isOverdue && (
                <span className="text-[9px] font-medium text-rose-600 dark:text-rose-300">Late</span>
              )}
            </div>
          )}
        </div>
      </Link>
    </div>
  )
}

function WeekView({ 
  currentDate, 
  jobs, 
  technicians,
  variant,
  onJobMove,
}: { 
  currentDate: Date
  jobs: Job[]
  technicians: Technician[]
  variant: PlannerVariant
  onJobMove?: (jobId: string, newDate: Date, newHour: number) => void
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const days = Array.from({ length: WEEK_DAYS }, (_, i) => addDays(weekStart, i))
  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i)
  const [draggingJob, setDraggingJob] = useState<Job | null>(null)
  const [dragOverDayHour, setDragOverDayHour] = useState<{dayIndex: number, hour: number} | null>(null)
  const timeColumnClass =
    variant === 'minimal' ? 'w-10' : variant === 'balanced' ? 'w-14' : 'w-12'
  const dayHeaderPadding = variant === 'minimal' ? 'px-1.5 py-2.5' : variant === 'balanced' ? 'px-3 py-3.5' : 'px-2 py-3'
  const dayNumberSize = variant === 'minimal' ? 'text-base' : variant === 'balanced' ? 'text-xl' : 'text-lg'
  
  const handleDragStart = (e: React.DragEvent, job: Job) => {
    setDraggingJob(job)
    e.dataTransfer.setData('text/plain', job.id)
    e.dataTransfer.effectAllowed = 'move'
  }
  
  const handleDragEnd = () => {
    setDraggingJob(null)
    setDragOverDayHour(null)
  }
  
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
      <div className="flex-1 grid grid-cols-7 min-w-0 bg-white dark:bg-slate-900">
        {days.map((day, dayIndex) => {
          const dayJobs = jobs.filter(job => {
            const jobDate = parseJobDate(job.scheduled_start)
            return isSameDay(jobDate, day)
          })
          const isTodayDate = isToday(day)
          
          return (
            <div key={day.toISOString()} className={`min-w-0 border-r border-slate-100 dark:border-slate-800 last:border-r-0 ${isTodayDate ? 'bg-cyan-50/35 dark:bg-cyan-500/[0.08] ring-1 ring-inset ring-cyan-200/70 dark:ring-cyan-400/30' : ''}`}>
              {/* Header */}
              <div className={`${dayHeaderPadding} text-center border-b border-slate-100 dark:border-slate-800 ${isTodayDate ? 'bg-cyan-100/70 dark:bg-cyan-500/15 shadow-[inset_0_-1px_0_0_rgba(8,145,178,0.35)] dark:shadow-[inset_0_-1px_0_0_rgba(34,211,238,0.35)]' : ''}`}>
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-300 uppercase tracking-wide">{format(day, 'EEE')}</p>
                <p className={`${dayNumberSize} font-semibold mt-1 ${isTodayDate ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-800 dark:text-slate-100'}`}>
                  {format(day, 'd')}
                </p>
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
                      ${dragOverDayHour?.dayIndex === dayIndex && dragOverDayHour?.hour === START_HOUR + i ? 'bg-cyan-100/60 dark:bg-cyan-400/20' : ''}
                    `}
                    style={{ top: `${i * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOverDayHour({ dayIndex, hour: START_HOUR + i })
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
                {dayJobs.map(job => {
                  const techIndex = technicians.findIndex(t => t.id === job.technician_id)
                  const techColor = getTechColor(job.technician_id, techIndex)
                  const isOverdue = isPast(parseISO(job.scheduled_start)) && job.status === 'scheduled'
                  return (
                      <JobCard 
                        key={job.id} 
                        job={job} 
                        techColor={techColor} 
                        variant={variant}
                        isOverdue={isOverdue}
                        isDragging={draggingJob?.id === job.id}
                        isDropMode={Boolean(draggingJob)}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    />
                  )
                })}
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
  onJobMove,
}: { 
  currentDate: Date
  jobs: Job[]
  technicians: Technician[]
  variant: PlannerVariant
  onJobMove?: (jobId: string, newDate: Date, newHour: number) => void
}) {
  const dayJobs = useMemo(() => {
    return jobs
      .filter(job => isSameDay(parseJobDate(job.scheduled_start), currentDate))
      .sort((a, b) => parseJobDate(a.scheduled_start).getTime() - parseJobDate(b.scheduled_start).getTime())
  }, [jobs, currentDate])
  
  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i)
  const isTodayDate = isToday(currentDate)
  const [draggingJob, setDraggingJob] = useState<Job | null>(null)
  const [dragOverHour, setDragOverHour] = useState<number | null>(null)
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
  }
  
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
                ${dragOverHour === START_HOUR + i ? 'bg-cyan-100/60 dark:bg-cyan-400/20' : ''}
              `}
              style={{ top: `${i * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverHour(START_HOUR + i)
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
          {dayJobs.map(job => {
            const techIndex = technicians.findIndex(t => t.id === job.technician_id)
            const techColor = getTechColor(job.technician_id, techIndex)
            const isOverdue = isPast(parseISO(job.scheduled_start)) && job.status === 'scheduled'
            return (
              <JobCard 
                key={job.id} 
                job={job} 
                techColor={techColor} 
                variant={variant}
                isOverdue={isOverdue}
                isDragging={draggingJob?.id === job.id}
                isDropMode={Boolean(draggingJob)}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MonthView({
  currentDate,
  jobs,
  variant,
}: {
  currentDate: Date
  jobs: Job[]
  variant: PlannerVariant
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
              ${cellMinHeight} p-1.5 border-b border-r border-slate-50 dark:border-slate-800/70
              ${isToday(day) ? 'bg-cyan-50/35 dark:bg-cyan-500/[0.08] ring-1 ring-inset ring-cyan-200/70 dark:ring-cyan-400/30' : ''}
              ${!isCurrentMonth ? 'opacity-40 bg-slate-50 dark:bg-slate-800/60' : ''}
            `}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-medium ${isToday(day) ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-700 dark:text-slate-200'}`}>
                {format(day, 'd')}
              </span>
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
  const [scheduleDesign] = useState<ScheduleDesign>('planner_minimal')
  const [jobs, setJobs] = useState<Job[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [technicianFilter, setTechnicianFilter] = useState<string>('all')
  const [serviceFilter, setServiceFilter] = useState<string>('all')
  const [dateFromFilter, setDateFromFilter] = useState<string>('')
  const [dateToFilter, setDateToFilter] = useState<string>('')
  const [timeFromFilter, setTimeFromFilter] = useState<string>('')
  const [timeToFilter, setTimeToFilter] = useState<string>('')
  const [summaryScope, setSummaryScope] = useState<ScheduleView>('day')
  const [businessId, setBusinessId] = useState('')
  
  const supabase = useMemo(() => createClient(), [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setJobs([])
        setTechnicians([])
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user.id)
        .single()

      if (!profile?.business_id) {
        setJobs([])
        setTechnicians([])
        return
      }

      setBusinessId(profile.business_id)

      const { data: techsData } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('business_id', profile.business_id)
        .eq('role', 'tech')

      setTechnicians((techsData || []).map(t => ({ ...t, color: '' })))

      const { data: jobsData } = await supabase
        .from('jobs')
        .select('*')
        .eq('business_id', profile.business_id)
        .order('scheduled_start', { ascending: true })

      const { data: customersData } = await supabase
        .from('customers')
        .select('id, name')
        .eq('business_id', profile.business_id)

      const customerMap = new Map(customersData?.map(c => [c.id, c.name]))
      const techMap = new Map(techsData?.map(t => [t.id, t.full_name]))

      const jobIds = (jobsData || []).map((job) => job.id as string)
      const { data: jobServicesData = [] } = jobIds.length
        ? await supabase
            .from('job_services')
            .select('job_id, service_id')
            .in('job_id', jobIds)
        : { data: [] as Array<{ job_id: string; service_id: string }> }

      const serviceIds = Array.from(
        new Set((jobServicesData || []).map((row) => row.service_id).filter(Boolean))
      ) as string[]

      const { data: servicesData = [] } = serviceIds.length
        ? await supabase
            .from('services')
            .select('id, name')
            .eq('business_id', profile.business_id)
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
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [businessId, fetchData, supabase])
  
  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const dateFrom = dateFromFilter ? new Date(`${dateFromFilter}T00:00:00`) : null
    const dateTo = dateToFilter ? new Date(`${dateToFilter}T23:59:59`) : null

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
    technicianFilter,
    serviceFilter,
    dateFromFilter,
    dateToFilter,
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

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (searchQuery.trim()) count += 1
    if (statusFilter !== 'all') count += 1
    if (technicianFilter !== 'all') count += 1
    if (serviceFilter !== 'all') count += 1
    if (dateFromFilter) count += 1
    if (dateToFilter) count += 1
    if (timeFromFilter) count += 1
    if (timeToFilter) count += 1
    return count
  }, [
    searchQuery,
    statusFilter,
    technicianFilter,
    serviceFilter,
    dateFromFilter,
    dateToFilter,
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

    if (dateFromFilter || dateToFilter) {
      const range = [dateFromFilter || '...', dateToFilter || '...'].join(' to ')
      chips.push({
        key: 'date',
        label: `Date: ${range}`,
        onClear: () => {
          setDateFromFilter('')
          setDateToFilter('')
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
    technicianFilter,
    technicians,
    serviceFilter,
    dateFromFilter,
    dateToFilter,
    timeFromFilter,
    timeToFilter,
  ])

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setTechnicianFilter('all')
    setServiceFilter('all')
    setDateFromFilter('')
    setDateToFilter('')
    setTimeFromFilter('')
    setTimeToFilter('')
  }
  
  const handleJobMove = async (jobId: string, newDate: Date, newHour: number) => {
    const job = jobs.find(j => j.id === jobId)
    if (!job) return
    
    // Snap to dropped slot for predictable drag-and-drop placement.
    const oldStart = parseJobDate(job.scheduled_start)
    const newStart = buildLocalDateAtHour(newDate, newHour, 0)
    
    // Preserve exact duration in minutes (including non-hour boundaries).
    const rawDuration = job.scheduled_end
      ? differenceInMinutes(parseJobDate(job.scheduled_end), oldStart)
      : 120
    const duration = rawDuration > 0 ? rawDuration : 120
    const newEnd = addMinutes(newStart, duration)
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

  const summaryJobs = useMemo(() => {
    const dayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekEndExclusive = addDays(weekStart, WEEK_DAYS)
    const monthStart = startOfMonth(currentDate)
    const monthEndExclusive = addMonths(monthStart, 1)

    const matchesScope = (jobDate: Date) => {
      if (summaryScope === 'day') {
        return isSameDay(jobDate, dayStart)
      }
      if (summaryScope === 'week') {
        return jobDate >= weekStart && jobDate < weekEndExclusive
      }
      return jobDate >= monthStart && jobDate < monthEndExclusive
    }

    return filteredJobs
      .filter((job) => matchesScope(parseJobDate(job.scheduled_start)))
      .sort(
        (a, b) =>
          parseJobDate(a.scheduled_start).getTime() - parseJobDate(b.scheduled_start).getTime()
      )
  }, [filteredJobs, currentDate, summaryScope])

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

  const summaryHeading = summaryScope === 'day' ? "Day Summary" : summaryScope === 'week' ? 'Week Summary' : 'Month Summary'
  const summaryDateLabel = summaryScope === 'day'
    ? format(currentDate, 'MMM d, EEEE')
    : summaryScope === 'week'
      ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} - ${format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), WEEK_LAST_DAY_OFFSET), 'MMM d')}`
      : format(currentDate, 'MMMM yyyy')
  const summaryJobLabel = `${summaryJobs.length} ${summaryJobs.length === 1 ? 'job' : 'jobs'}`
  const maxTechLoad = technicianLoadSummary.reduce((max, tech) => Math.max(max, tech.count), 0) || 1
  const plannerVariant: PlannerVariant =
    scheduleDesign === 'planner_balanced'
      ? 'balanced'
      : scheduleDesign === 'planner_minimal'
        ? 'minimal'
        : 'classic'
  
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
      <div className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 p-4 shadow-[0_18px_50px_-30px_rgba(2,132,199,0.35)] dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-cyan-950/20 dark:shadow-[0_24px_60px_-35px_rgba(34,211,238,0.35)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_48%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_48%)]" />

        <div className="relative z-20 flex flex-col gap-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
                Schedule
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {activeFiltersCount
                  ? `${filteredJobs.length} of ${jobs.length} jobs shown`
                  : `${jobs.length} jobs across operations`}
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
                    className={`h-8 rounded-none px-3 text-xs font-medium capitalize shadow-none ${
                      index === 0 ? 'rounded-l-full' : ''
                    } ${index === 2 ? 'rounded-r-full' : ''} ${
                      index > 0 ? 'border-l border-slate-100 dark:border-slate-800' : ''
                    } ${
                      view === v
                        ? '!bg-cyan-600 dark:!bg-cyan-500 !text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {v}
                  </Button>
                ))}
              </div>

              <Link href="/admin/jobs/new">
                <Button
                  variant="glassPrimary"
                  size="sm"
                  className="rounded-full text-xs"
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  New
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[276px_minmax(0,1fr)] gap-4">
            <aside className="space-y-3">
              <details className="group rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70">
                <summary className="flex items-center justify-between gap-3 p-4 cursor-pointer select-none [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      {summaryHeading}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 truncate">{summaryDateLabel}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono rounded-full px-2 py-1 bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300 whitespace-nowrap">
                      {summaryJobLabel}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform duration-200 group-open:rotate-180" />
                  </div>
                </summary>

                <div className="border-t border-slate-200/70 dark:border-slate-800 px-4 pb-4">

              <div className="pt-3 mb-3 flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-100/70 p-1 dark:border-slate-700/70 dark:bg-slate-800/70">
                {(['day', 'week', 'month'] as const).map((scope) => (
                  <button type="button"
                    key={scope}
                    onClick={() => setSummaryScope(scope)}
                    className={`flex-1 rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-wide transition-colors ${
                      summaryScope === scope
                        ? 'bg-cyan-600 text-white dark:bg-cyan-500'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/70'
                    }`}
                  >
                    {scope}
                  </button>
                ))}
              </div>

              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {summaryJobs.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 px-3 py-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">No visits scheduled for this {summaryScope}.</p>
                  </div>
                ) : (
                  summaryJobs.slice(0, 6).map((job) => {
                    const status = STATUS_CONFIG[job.status] || STATUS_CONFIG.scheduled
                    const scheduledAt = parseJobDate(job.scheduled_start)
                    const accentClass =
                      job.status === 'completed'
                        ? 'border-l-emerald-400'
                        : job.status === 'in_progress'
                          ? 'border-l-cyan-400'
                          : job.status === 'on_the_way' || job.status === 'arrived'
                            ? 'border-l-amber-400'
                            : job.status === 'cancelled'
                              ? 'border-l-rose-400'
                              : 'border-l-slate-400'
                    return (
                      <Link
                        key={job.id}
                        href={`/admin/jobs/${job.id}`}
                        className={`block rounded-xl border border-slate-200/80 border-l-4 dark:border-slate-700/70 bg-white dark:bg-slate-800/40 px-3 py-2.5 hover:border-cyan-300 dark:hover:border-cyan-500/40 hover:shadow-sm transition-all ${accentClass}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums flex items-center gap-1">
                            <Clock3 className="w-3 h-3" />
                            {format(scheduledAt, 'MMM d, HH:mm')}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300">
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mt-1 truncate">
                          {job.customer_name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {job.technician_name || 'Unassigned'}
                        </p>
                      </Link>
                    )
                  })
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-slate-100/80 dark:bg-slate-800/70 p-2.5">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Booked</p>
                  <p className="text-lg font-semibold text-slate-800 dark:text-slate-100 mt-0.5">{summaryJobs.length}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-2.5">
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Done</p>
                  <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5">{completedSummaryCount}</p>
                </div>
                <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 p-2.5">
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-wide">Open</p>
                  <p className="text-lg font-semibold text-amber-700 dark:text-amber-300 mt-0.5">{unassignedSummaryCount}</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                  <Users2 className="w-3 h-3" />
                  Technician Load
                </p>
                <div className="space-y-1.5">
                  {technicianLoadSummary.map((tech) => (
                    <div
                      key={tech.id}
                      className="rounded-lg bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{tech.name}</span>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{tech.count}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/70">
                        <div
                          className="h-full rounded-full bg-cyan-500"
                          style={{ width: `${Math.max(16, Math.round((tech.count / maxTechLoad) * 100))}%` }}
                        />
                      </div>
                    </div>
                  ))}
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
                      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Filters
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                        {activeFiltersCount ? `${activeFiltersCount} active` : 'None active'}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform duration-200 group-open:rotate-180" />
                </summary>

                <div className="relative overflow-hidden border-t border-slate-200/70 dark:border-slate-800 px-4 pb-4 pt-4">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.10),transparent_55%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_55%)]" />

                  <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Filter Console
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 truncate">
                        {activeFiltersCount ? `${activeFiltersCount} active filters` : 'No filters applied'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={clearFilters}
                      disabled={!activeFiltersCount}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 px-3 py-1 text-[10px] font-mono uppercase tracking-wide text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      Clear all
                    </button>
                  </div>

                  {activeFilterChips.length > 0 && (
                    <div className="relative mt-3 flex flex-wrap gap-2">
                      {activeFilterChips.map((chip) => (
                        <button
                          key={chip.key}
                          type="button"
                          onClick={chip.onClear}
                          className="group inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/80 px-3 py-1.5 text-[11px] text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800/70"
                          title="Remove filter"
                        >
                          <span className="truncate max-w-[220px]">{chip.label}</span>
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors group-hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-slate-700">
                            <X className="w-3 h-3" />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="relative mt-4 grid gap-3">
                    <div className="rounded-2xl border border-slate-200/70 bg-white/75 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/55">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Who
                      </p>

                      <label className="block mt-2">
                        <span className="sr-only">Customer search</span>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Customer name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                          />
                        </div>
                      </label>

                      <label className="block mt-2">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          Technician
                        </span>
                        <select
                          value={technicianFilter}
                          onChange={(e) => setTechnicianFilter(e.target.value)}
                          className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                        >
                          <option value="all">All Technicians</option>
                          <option value="unassigned">Unassigned</option>
                          {technicians.map((tech) => (
                            <option key={tech.id} value={tech.id}>
                              {tech.full_name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="rounded-2xl border border-slate-200/70 bg-white/75 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/55">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        What
                      </p>

                      <label className="block mt-2">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          Service
                        </span>
                        <select
                          value={serviceFilter}
                          onChange={(e) => setServiceFilter(e.target.value)}
                          disabled={serviceOptions.length === 0}
                          className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:opacity-60"
                        >
                          <option value="all">All Services</option>
                          {serviceOptions.map((service) => (
                            <option key={service} value={service}>
                              {service}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="mt-2">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          Status
                        </p>
                        <div className="mt-1 grid grid-cols-2 gap-2">
                          {[
                            { key: 'all', label: 'All', dot: 'bg-slate-300 dark:bg-slate-600' },
                            { key: 'scheduled', label: STATUS_CONFIG.scheduled.label, dot: STATUS_CONFIG.scheduled.dot },
                            { key: 'on_the_way', label: STATUS_CONFIG.on_the_way.label, dot: STATUS_CONFIG.on_the_way.dot },
                            { key: 'arrived', label: STATUS_CONFIG.arrived.label, dot: STATUS_CONFIG.arrived.dot },
                            { key: 'in_progress', label: STATUS_CONFIG.in_progress.label, dot: STATUS_CONFIG.in_progress.dot },
                            { key: 'completed', label: STATUS_CONFIG.completed.label, dot: STATUS_CONFIG.completed.dot },
                            { key: 'cancelled', label: STATUS_CONFIG.cancelled.label, dot: STATUS_CONFIG.cancelled.dot },
                          ].map((s) => (
                            <button
                              key={s.key}
                              type="button"
                              onClick={() => setStatusFilter(s.key)}
                              className={`inline-flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs transition-colors ${
                                statusFilter === s.key
                                  ? 'border-cyan-300 bg-cyan-50 text-slate-900 shadow-sm dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-slate-100'
                                  : 'border-slate-200/80 bg-white/70 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/60'
                              }`}
                            >
                              <span className="truncate">{s.label}</span>
                              <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} aria-hidden="true" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/70 bg-white/75 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/55">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        When
                      </p>

                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Date From
                          </span>
                          <input
                            type="date"
                            value={dateFromFilter}
                            onChange={(e) => setDateFromFilter(e.target.value)}
                            className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Date To
                          </span>
                          <input
                            type="date"
                            value={dateToFilter}
                            onChange={(e) => setDateToFilter(e.target.value)}
                            className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                          />
                        </label>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Time From
                          </span>
                          <input
                            type="time"
                            value={timeFromFilter}
                            onChange={(e) => setTimeFromFilter(e.target.value)}
                            className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Time To
                          </span>
                          <input
                            type="time"
                            value={timeToFilter}
                            onChange={(e) => setTimeToFilter(e.target.value)}
                            className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                          />
                        </label>
                      </div>

                      <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 dark:border-slate-700/70 dark:bg-slate-900/50">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          Results
                        </span>
                        <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                          {filteredJobs.length} shown
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            </aside>

            <div className="space-y-3">
              <div className="relative z-0 bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-[0_16px_36px_-28px_rgba(30,41,59,0.45)] backdrop-blur-sm">
                {(scheduleDesign === 'planner_classic' ||
                  scheduleDesign === 'planner_balanced' ||
                  scheduleDesign === 'planner_minimal') && (
                  <>
                    {view === 'day' && (
                      <DayView
                        currentDate={currentDate}
                        jobs={filteredJobs}
                        technicians={technicians}
                        variant={plannerVariant}
                        onJobMove={handleJobMove}
                      />
                    )}
                    {view === 'week' && (
                      <WeekView
                        currentDate={currentDate}
                        jobs={filteredJobs}
                        technicians={technicians}
                        variant={plannerVariant}
                        onJobMove={handleJobMove}
                      />
                    )}
                    {view === 'month' && (
                      <MonthView currentDate={currentDate} jobs={filteredJobs} variant={plannerVariant} />
                    )}
                  </>
                )}
                {scheduleDesign === 'agenda' && (
                  <AgendaView currentDate={currentDate} view={view} jobs={filteredJobs} />
                )}
                {scheduleDesign === 'tech_board' && (
                  <TechnicianBoardView
                    currentDate={currentDate}
                    view={view}
                    jobs={filteredJobs}
                    technicians={technicians}
                  />
                )}
              </div>
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


