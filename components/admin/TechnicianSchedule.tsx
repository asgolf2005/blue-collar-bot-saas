'use client'

import { useMemo, useState } from 'react'
import { format, addDays, startOfWeek, endOfWeek, isSameDay, isWithinInterval, startOfDay, endOfDay, parseISO, addWeeks } from 'date-fns'
import { Calendar, Filter, ChevronRight, ChevronLeft, Clock, MapPin, Wrench } from '@/components/ui/icons'
import { useRouter } from 'next/navigation'
import type { JobWithDetails } from '@/lib/types'

type JobStatus = 'scheduled' | 'on_the_way' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'

interface TechnicianScheduleProps {
  jobs: JobWithDetails[]
  businessId: string
}

interface TechInfo {
  id: string
  name: string
  avatar?: string
  role: string
  initials: string
}

type ViewMode = 'day' | 'week' | 'fortnight' | 'month'

const BUSINESS_HOURS = {
  start: 7, // 7 AM
  end: 19,  // 7 PM
}

// Status color mapping for Industrial Futurism theme
const STATUS_STYLES: Record<JobStatus, { border: string; glow: string; bg: string; text: string; label: string }> = {
  scheduled: {
    border: 'border-cyan-500',
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.3)]',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    label: 'Scheduled',
  },
  on_the_way: {
    border: 'border-amber-500',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    label: 'On the way',
  },
  arrived: {
    border: 'border-amber-500',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    label: 'Arrived',
  },
  in_progress: {
    border: 'border-blue-500',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.3)]',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    label: 'In progress',
  },
  completed: {
    border: 'border-emerald-500',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    label: 'Completed',
  },
  cancelled: {
    border: 'border-gray-600',
    glow: '',
    bg: 'bg-gray-500/10',
    text: 'text-gray-400',
    label: 'Cancelled',
  },
}

// Generate initials from full name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Format time range
function formatTimeRange(start: string, end?: string | null): string {
  const startTime = format(parseISO(start), 'h:mm a')
  if (!end) return startTime
  const endTime = format(parseISO(end), 'h:mm a')
  return `${startTime} - ${endTime}`
}

export default function TechnicianSchedule({ jobs, businessId }: TechnicianScheduleProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [hoveredJob, setHoveredJob] = useState<string | null>(null)
  const router = useRouter()

  // Get date range based on view mode
  const { startDate, endDate, days } = useMemo(() => {
    if (viewMode === 'day') {
      return {
        startDate: startOfDay(selectedDate),
        endDate: endOfDay(selectedDate),
        days: [selectedDate],
      }
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
      return {
        startDate: weekStart,
        endDate: weekEnd,
        days: Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
      }
    } else if (viewMode === 'fortnight') {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
      return {
        startDate: weekStart,
        endDate: addDays(weekStart, 13),
        days: Array.from({ length: 14 }, (_, i) => addDays(weekStart, i)),
      }
    } else {
      // month view
      const monthStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
      return {
        startDate: monthStart,
        endDate: addWeeks(monthStart, 4),
        days: Array.from({ length: 28 }, (_, i) => addDays(monthStart, i)),
      }
    }
  }, [selectedDate, viewMode])

  // Extract unique technicians
  const technicians = useMemo(() => {
    const techMap = new Map<string, TechInfo>()
    jobs.forEach(job => {
      if (job.technician) {
        if (!techMap.has(job.technician.id)) {
          const name = job.technician.full_name || 'Technician'
          techMap.set(job.technician.id, {
            id: job.technician.id,
            name: name,
            avatar: (job.technician as unknown as { avatar_url?: string }).avatar_url,
            role: (job.technician as unknown as { business_role?: string }).business_role || 'Field Technician',
            initials: getInitials(name),
          })
        }
      }
    })
    return Array.from(techMap.values())
  }, [jobs])

  // Filter jobs in current view
  const viewJobs = useMemo(() => {
    return jobs.filter(job =>
      job.scheduled_start &&
      job.technician &&
      isWithinInterval(parseISO(job.scheduled_start), { start: startDate, end: endDate })
    )
  }, [jobs, startDate, endDate])

  // Generate time slots for day view (7 AM to 7 PM)
  const timeSlots = useMemo(() => {
    const slots = []
    for (let hour = BUSINESS_HOURS.start; hour <= BUSINESS_HOURS.end; hour++) {
      slots.push(hour)
    }
    return slots
  }, [])

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'day') {
      setSelectedDate(prev => addDays(prev, direction === 'next' ? 1 : -1))
    } else if (viewMode === 'week') {
      setSelectedDate(prev => addDays(prev, direction === 'next' ? 7 : -7))
    } else if (viewMode === 'fortnight') {
      setSelectedDate(prev => addDays(prev, direction === 'next' ? 14 : -14))
    } else {
      setSelectedDate(prev => addWeeks(prev, direction === 'next' ? 4 : -4))
    }
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  const handleJobClick = (jobId: string) => {
    router.push(`/admin/jobs/${jobId}`)
  }

  const getJobPosition = (job: JobWithDetails) => {
    const jobStart = parseISO(job.scheduled_start!)
    const jobEnd = job.scheduled_end ? parseISO(job.scheduled_end) : addDays(jobStart, 0)

    const startHour = jobStart.getHours()
    const startMinute = jobStart.getMinutes()
    const endHour = jobEnd.getHours()
    const endMinute = jobEnd.getMinutes()

    const startPercent = ((startHour - BUSINESS_HOURS.start) + (startMinute / 60)) / (BUSINESS_HOURS.end - BUSINESS_HOURS.start) * 100
    const duration = ((endHour - startHour) + ((endMinute - startMinute) / 60))
    const heightPercent = (duration / (BUSINESS_HOURS.end - BUSINESS_HOURS.start)) * 100

    return {
      top: `${Math.max(0, Math.min(startPercent, 95))}%`,
      height: `${Math.max(8, Math.min(heightPercent, 100 - startPercent))}%`,
    }
  }

  const getDateRangeLabel = () => {
    if (viewMode === 'day') {
      return format(selectedDate, 'MMMM d, yyyy')
    } else if (viewMode === 'week') {
      return `${format(days[0], 'MMM d')} - ${format(days[6], 'MMM d, yyyy')}`
    } else if (viewMode === 'fortnight') {
      return `${format(days[0], 'MMM d')} - ${format(days[13], 'MMM d, yyyy')}`
    } else {
      return `${format(days[0], 'MMM d')} - ${format(days[27], 'MMM d, yyyy')}`
    }
  }

  const today = new Date()

  return (
    <div className="w-full p-6">
      {/* Main Card */}
      <div className="relative bg-[#111827] rounded-lg overflow-hidden">
        {/* Blueprint Corner Accents */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500/50" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500/50" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-500/30" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500/30" />

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 border-b border-gray-800">
          {/* Left: Title & Subtitle */}
          <div>
            <h2 className="font-['Bebas_Neue'] text-4xl tracking-wide text-white uppercase">
              Technician Schedule
            </h2>
            <p className="font-mono text-sm text-gray-500 mt-1">
              Weekly dispatch overview
            </p>
          </div>

          {/* Right: Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle - Pill Buttons */}
            <div className="flex items-center bg-gray-900 rounded-full p-1 border border-gray-800">
              {(['day', 'week', 'fortnight', 'month'] as ViewMode[]).map(mode => (
                <button type="button"
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`
                    px-4 py-1.5 rounded-full text-sm font-mono transition-all duration-300
                    ${viewMode === mode 
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' 
                      : 'text-gray-400 hover:text-gray-200'
                    }
                  `}
                >
                  {mode === 'fortnight' ? '2 Weeks' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>

            {/* Date Navigation */}
            <div className="flex items-center gap-2 bg-gray-900 rounded-lg border border-gray-800 px-3 py-1.5">
              <button type="button"
                onClick={() => navigateDate('prev')}
                className="p-1.5 text-gray-400 hover:text-cyan-400 transition-colors duration-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-2 px-2">
                <Calendar className="w-4 h-4 text-cyan-500" />
                <span className="font-mono text-sm text-gray-300 whitespace-nowrap">
                  {getDateRangeLabel()}
                </span>
              </div>

              <button type="button"
                onClick={() => navigateDate('next')}
                className="p-1.5 text-gray-400 hover:text-cyan-400 transition-colors duration-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Today Button */}
            <button type="button"
              onClick={goToToday}
              className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-sm font-mono text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all duration-200"
            >
              Today
            </button>

            {/* Filter Button */}
            <button className="flex items-center gap-2 px-4 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-sm font-mono text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all duration-200">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>

        {/* Schedule Content */}
        <div className="p-6">
          {viewMode === 'day' ? (
            // DAY VIEW
            <div className="flex gap-4 overflow-x-auto">
              {/* Time Column */}
              <div className="flex-shrink-0 w-16">
                <div className="h-16" /> {/* Header spacer */}
                {timeSlots.map(hour => (
                  <div
                    key={hour}
                    className="h-16 font-mono text-xs text-gray-500 pt-1"
                  >
                    {format(new Date().setHours(hour, 0), 'h a')}
                  </div>
                ))}
              </div>

              {/* Technicians Sidebar */}
              <div className="flex-shrink-0 w-64 border-r border-gray-800 pr-4">
                <div className="h-16 flex items-end pb-3 mb-3">
                  <span className="font-mono text-xs text-gray-500 uppercase tracking-widest">
                    Technicians
                  </span>
                </div>

                {technicians.map(tech => (
                  <div 
                    key={tech.id} 
                    className="h-[720px] border-b border-gray-800/50 last:border-b-0"
                  >
                    <div className="sticky top-0 bg-[#111827] py-3 flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                        <span className="font-mono text-sm font-bold text-cyan-400">
                          {tech.initials}
                        </span>
                      </div>
                      {/* Name & Role */}
                      <div>
                        <div className="font-mono text-sm font-medium text-gray-200">
                          {tech.name}
                        </div>
                        <div className="font-mono text-xs text-gray-500">
                          {tech.role}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Schedule Grid */}
              <div className="flex-1 min-w-[600px] relative">
                {/* Day Header */}
                <div className="h-16 flex items-end pb-3 mb-3 text-center">
                  <div className={`w-full py-2 rounded-lg border ${isSameDay(selectedDate, today) ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-gray-800'}`}>
                    <div className="font-mono text-sm font-medium text-gray-200">
                      {format(selectedDate, 'EEEE')}
                    </div>
                    <div className={`font-mono text-xs ${isSameDay(selectedDate, today) ? 'text-cyan-400' : 'text-gray-500'}`}>
                      {format(selectedDate, 'MMM d')}
                    </div>
                  </div>
                </div>

                {/* Grid Lines */}
                <div className="absolute top-16 left-0 right-0 bottom-0">
                  {timeSlots.map((hour, idx) => (
                    <div
                      key={hour}
                      className="h-16 border-t border-gray-800/50 first:border-gray-700"
                    />
                  ))}
                </div>

                {/* Technician Rows with Jobs */}
                {technicians.map((tech, techIdx) => {
                  const techJobs = viewJobs.filter(j => j.technician?.id === tech.id)

                  return (
                    <div
                      key={tech.id}
                      className="h-[720px] relative border-b border-gray-800/50 last:border-b-0"
                    >
                      {techJobs.map(job => {
                        const position = getJobPosition(job)
                        const statusStyle = STATUS_STYLES[job.status as JobStatus] || STATUS_STYLES.scheduled
                        const isHovered = hoveredJob === job.id

                        return (
                          <div
                            key={job.id}
                            style={{
                              top: position.top,
                              height: position.height,
                            }}
                            className={`
                              absolute left-2 right-2 min-h-[48px] rounded-lg p-3 cursor-pointer
                              border ${statusStyle.border} ${statusStyle.bg}
                              transition-all duration-300
                              ${isHovered ? `scale-[1.02] ${statusStyle.glow} z-10` : 'hover:scale-[1.01]'}
                            `}
                            onMouseEnter={() => setHoveredJob(job.id)}
                            onMouseLeave={() => setHoveredJob(null)}
                            onClick={() => handleJobClick(job.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                handleJobClick(job.id)
                              }
                            }}
                          >
                            {/* Time */}
                            <div className={`font-mono text-xs font-medium ${statusStyle.text} mb-1`}>
                              <Clock className="w-3 h-3 inline mr-1" />
                              {formatTimeRange(job.scheduled_start!, job.scheduled_end)}
                            </div>
                            {/* Customer */}
                            <div className="font-mono text-sm font-medium text-gray-200 leading-tight">
                              {job.customer?.name || 'Unknown Customer'}
                            </div>
                            {/* Job Type */}
                            <div className="font-mono text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <Wrench className="w-3 h-3" />
                              {job.description || 'Service Call'}
                            </div>
                            {/* Status Badge */}
                            <div className={`mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-mono ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                              {statusStyle.label}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            // WEEK / FORTNIGHT / MONTH VIEW
            <div className="flex gap-4 overflow-x-auto">
              {/* Technicians Sidebar */}
              <div className="flex-shrink-0 w-72 border-r border-gray-800 pr-4 sticky left-0 bg-[#111827] z-20">
                <div className="h-20 flex items-end pb-3 mb-3">
                  <span className="font-mono text-xs text-gray-500 uppercase tracking-widest">
                    Technicians ({technicians.length})
                  </span>
                </div>

                {technicians.map(tech => (
                  <div
                    key={tech.id}
                    className="h-24 py-3 flex items-center gap-4 border-b border-gray-800/50 last:border-b-0"
                  >
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                      <span className="font-mono text-sm font-bold text-cyan-400">
                        {tech.initials}
                      </span>
                    </div>
                    {/* Name & Role */}
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm font-medium text-gray-200 whitespace-nowrap">
                        {tech.name}
                      </div>
                      <div className="font-mono text-xs text-gray-500 mt-0.5">
                        {tech.role}
                      </div>
                      {/* Job count for this period */}
                      <div className="font-mono text-xs text-cyan-500/70 mt-1">
                        {viewJobs.filter(j => j.technician?.id === tech.id).length} jobs
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="flex-1 min-w-max">
                {/* Days Header */}
                <div 
                  className="grid gap-1 mb-3"
                  style={{ 
                    gridTemplateColumns: `repeat(${days.length}, minmax(100px, 1fr))`,
                  }}
                >
                  {days.map((day, idx) => {
                    const isToday = isSameDay(day, today)
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6

                    return (
                      <div 
                        key={idx} 
                        className={`
                          h-20 p-2 text-center rounded-lg border transition-all duration-200
                          ${isToday 
                            ? 'border-cyan-500/50 bg-cyan-500/5' 
                            : isWeekend 
                              ? 'border-gray-800/50 bg-gray-900/30' 
                              : 'border-gray-800'
                          }
                        `}
                      >
                        <div className={`font-mono text-xs uppercase tracking-wider ${isWeekend ? 'text-gray-600' : 'text-gray-500'}`}>
                          {format(day, 'EEE')}
                        </div>
                        <div className={`font-mono text-lg font-medium mt-1 ${isToday ? 'text-cyan-400' : isWeekend ? 'text-gray-600' : 'text-gray-300'}`}>
                          {format(day, 'd')}
                        </div>
                        {isToday && (
                          <div className="font-mono text-[10px] text-cyan-500/70 uppercase tracking-wider mt-0.5">
                            Today
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Job Rows */}
                {technicians.map(tech => (
                  <div
                    key={tech.id}
                    className="grid gap-1 h-24 items-center border-b border-gray-800/50 last:border-b-0"
                    style={{ 
                      gridTemplateColumns: `repeat(${days.length}, minmax(100px, 1fr))`,
                    }}
                  >
                    {days.map((day, dayIdx) => {
                      const dayJobs = viewJobs.filter(j =>
                        j.technician?.id === tech.id &&
                        isSameDay(parseISO(j.scheduled_start!), day)
                      )
                      const isPast = day < startOfDay(today)

                      if (dayJobs.length > 0) {
                        return (
                          <div key={dayIdx} className="h-20 flex flex-col gap-1 overflow-y-auto">
                            {dayJobs.map(job => {
                              const statusStyle = STATUS_STYLES[job.status as JobStatus] || STATUS_STYLES.scheduled
                              const isHovered = hoveredJob === job.id

                              return (
                                <div
                                  key={job.id}
                                  onMouseEnter={() => setHoveredJob(job.id)}
                                  onMouseLeave={() => setHoveredJob(null)}
                                  onClick={() => handleJobClick(job.id)}
                                  className={`
                                    flex-1 min-h-[60px] rounded-lg p-2 cursor-pointer
                                    border ${statusStyle.border} ${statusStyle.bg}
                                    transition-all duration-300
                                    ${isHovered ? `scale-[1.02] ${statusStyle.glow} z-10` : 'hover:scale-[1.01]'}
                                  `}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault()
                                      handleJobClick(job.id)
                                    }
                                  }}
                                >
                                  {/* Time */}
                                  <div className={`font-mono text-[10px] font-medium ${statusStyle.text}`}>
                                    {format(parseISO(job.scheduled_start!), 'h:mm a')}
                                  </div>
                                  {/* Customer */}
                                  <div className="font-mono text-xs text-gray-200 leading-tight mt-1 whitespace-nowrap">
                                    {job.customer?.name || 'Unknown'}
                                  </div>
                                  {/* Job Type */}
                                  <div className="font-mono text-[10px] text-gray-500 mt-1 truncate">
                                    {job.description || 'Service'}
                                  </div>
                                  {/* Status Indicator */}
                                  <div className={`mt-1.5 w-2 h-2 rounded-full ${statusStyle.text.replace('text-', 'bg-')}`} />
                                </div>
                              )
                            })}
                          </div>
                        )
                      }

                      return (
                        <div
                          key={dayIdx}
                          className={`
                            h-20 rounded-lg border border-dashed
                            ${isPast ? 'border-gray-800/30 bg-gray-900/20' : 'border-gray-800/50'}
                          `}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="px-6 py-4 border-t border-gray-800 flex flex-wrap items-center gap-6">
          <span className="font-mono text-xs text-gray-500 uppercase tracking-wider">Status:</span>
          {Object.entries(STATUS_STYLES)
            .filter(([key]) => key !== 'cancelled')
            .map(([status, style]) => (
              <div key={status} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full border ${style.border} ${style.bg}`} />
                <span className={`font-mono text-xs ${style.text}`}>
                  {style.label}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

