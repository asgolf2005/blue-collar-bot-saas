'use client'

import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, addDays, startOfDay, isToday as isDateToday } from 'date-fns'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Plus, Calendar, MapPin, PlayCircle, CheckCircle2, Clock } from 'lucide-react'

interface Customer {
  id: string
  name: string
}

interface Technician {
  id: string
  full_name: string
  email: string
}

interface Job {
  id: string
  title: string
  status: string
  scheduled_start: string
  scheduled_end: string
  description?: string
  customer?: Customer
  technician?: Technician
}

interface CalendarViewProps {
  jobs: Job[]
  businessId: string
}

type ViewMode = 'month' | 'week' | 'day'

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: React.ElementType }> = {
  scheduled: { 
    color: 'text-cyan-600 dark:text-cyan-400', 
    bg: 'bg-cyan-500',
    label: 'SCHEDULED',
    icon: Calendar
  },
  on_the_way: { 
    color: 'text-amber-600 dark:text-amber-400', 
    bg: 'bg-amber-500',
    label: 'EN ROUTE',
    icon: MapPin
  },
  in_progress: { 
    color: 'text-blue-600 dark:text-blue-400', 
    bg: 'bg-blue-500',
    label: 'IN PROGRESS',
    icon: PlayCircle
  },
  completed: { 
    color: 'text-emerald-600 dark:text-emerald-400', 
    bg: 'bg-emerald-500',
    label: 'COMPLETED',
    icon: CheckCircle2
  },
  cancelled: { 
    color: 'text-rose-600 dark:text-rose-400', 
    bg: 'bg-rose-500',
    label: 'CANCELLED',
    icon: Clock
  },
}

export default function CalendarView({ jobs }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [selectedTech, setSelectedTech] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  // Get unique technicians for filter
  const technicians = useMemo(() => {
    const techMap = new Map<string, Technician>()
    jobs.forEach(job => {
      if (job.technician) {
        techMap.set(job.technician.id, job.technician)
      }
    })
    return Array.from(techMap.values())
  }, [jobs])

  // Filter jobs based on selected filters
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const techMatch = selectedTech === 'all' || job.technician?.id === selectedTech
      const statusMatch = selectedStatus === 'all' || job.status === selectedStatus
      return techMatch && statusMatch
    })
  }, [jobs, selectedTech, selectedStatus])

  // Calculate calendar days based on view mode
  const calendarDays = useMemo(() => {
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      const calendarStart = startOfWeek(monthStart)
      const calendarEnd = endOfWeek(monthEnd)
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate)
      const weekEnd = endOfWeek(currentDate)
      return eachDayOfInterval({ start: weekStart, end: weekEnd })
    } else {
      return [startOfDay(currentDate)]
    }
  }, [currentDate, viewMode])

  const jobsByDay = useMemo(() => {
    const map = new Map<string, Job[]>()
    filteredJobs.forEach((job) => {
      const dayKey = format(new Date(job.scheduled_start), 'yyyy-MM-dd')
      if (!map.has(dayKey)) {
        map.set(dayKey, [])
      }
      map.get(dayKey)!.push(job)
    })
    // Sort jobs by time within each day
    map.forEach((dayJobs) => {
      dayJobs.sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime())
    })
    return map
  }, [filteredJobs])

  // Job counts by status for mini stats
  const jobCounts = useMemo(() => ({
    scheduled: jobs.filter(j => j.status === 'scheduled').length,
    on_the_way: jobs.filter(j => j.status === 'on_the_way').length,
    in_progress: jobs.filter(j => j.status === 'in_progress').length,
    completed: jobs.filter(j => j.status === 'completed').length,
  }), [jobs])

  const goToPrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
    } else if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, -7))
    } else {
      setCurrentDate(addDays(currentDate, -1))
    }
  }

  const goToNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
    } else if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, 7))
    } else {
      setCurrentDate(addDays(currentDate, 1))
    }
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const getViewTitle = () => {
    if (viewMode === 'month') {
      return format(currentDate, 'MMMM yyyy')
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate)
      const weekEnd = endOfWeek(currentDate)
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
    } else {
      return format(currentDate, 'EEEE, MMMM d, yyyy')
    }
  }

  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

  return (
    <div className="space-y-4">
      {/* Mini Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStatCard
          label="SCHEDULED"
          value={jobCounts.scheduled}
          color="cyan"
          icon={Calendar}
        />
        <MiniStatCard
          label="EN ROUTE"
          value={jobCounts.on_the_way}
          color="amber"
          icon={MapPin}
        />
        <MiniStatCard
          label="IN PROGRESS"
          value={jobCounts.in_progress}
          color="blue"
          icon={PlayCircle}
        />
        <MiniStatCard
          label="COMPLETED"
          value={jobCounts.completed}
          color="emerald"
          icon={CheckCircle2}
        />
      </div>

      {/* Main Calendar Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Calendar Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Title & Navigation */}
            <div className="flex items-center gap-4">
              <h2 className="font-display text-2xl text-slate-900 dark:text-white tracking-wide">
                {getViewTitle()}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={goToToday}
                  className="px-3 py-1.5 text-xs font-mono font-medium bg-blue-600 hover:bg-blue-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white rounded-full transition-colors"
                >
                  TODAY
                </button>
                <button
                  onClick={goToPrevious}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Previous"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <button
                  onClick={goToNext}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Next"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
              </div>
            </div>

            {/* View Mode & Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1.5 text-xs font-mono rounded-md transition-all ${
                      viewMode === mode
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {mode.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Technician Filter */}
              <select
                value={selectedTech}
                onChange={(e) => setSelectedTech(e.target.value)}
                className="px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-cyan-500"
              >
                <option value="all">All Technicians</option>
                {technicians.map(tech => (
                  <option key={tech.id} value={tech.id}>
                    {tech.full_name || tech.email}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-cyan-500"
              >
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="on_the_way">On the Way</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {/* New Job Button */}
              <Link
                href="/admin/jobs/new"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-medium bg-blue-600 hover:bg-blue-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white rounded-full transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                NEW JOB
              </Link>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className={`grid ${viewMode === 'month' || viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-1'}`}>
          {/* Day Headers - Only for month/week view */}
          {(viewMode === 'month' || viewMode === 'week') && dayNames.map((day) => (
            <div 
              key={day} 
              className="px-2 py-3 text-center border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"
            >
              <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 tracking-wider">
                {day}
              </span>
            </div>
          ))}

          {/* Calendar Days */}
          {calendarDays.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd')
            const dayJobs = jobsByDay.get(dayKey) || []
            const isCurrentMonth = viewMode !== 'month' || day.getMonth() === currentDate.getMonth()
            const isToday = isDateToday(day)
            const isWeekend = day.getDay() === 0 || day.getDay() === 6

            // Calculate min height based on view mode
            const minHeight = viewMode === 'day' 
              ? 'min-h-[500px]' 
              : viewMode === 'week' 
                ? 'min-h-[200px]' 
                : 'min-h-[110px]'

            return (
              <div
                key={day.toISOString()}
                className={`
                  ${minHeight} p-2 border-b border-r border-slate-100 dark:border-slate-800
                  ${!isCurrentMonth ? 'bg-slate-50/50 dark:bg-slate-900/30' : 'bg-white dark:bg-slate-900'}
                  ${isWeekend && isCurrentMonth ? 'bg-slate-50/30 dark:bg-slate-800/20' : ''}
                  ${isToday ? 'ring-2 ring-inset ring-blue-500 dark:ring-cyan-500' : ''}
                  transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50
                `}
              >
                {/* Day Number */}
                <div className={`
                  font-mono text-sm mb-2 w-7 h-7 flex items-center justify-center rounded-full
                  ${isToday 
                    ? 'bg-blue-600 dark:bg-cyan-500 text-white' 
                    : 'text-slate-700 dark:text-slate-300'
                  }
                  ${!isCurrentMonth ? 'text-slate-400 dark:text-slate-600' : ''}
                `}>
                  {format(day, 'd')}
                </div>

                {/* Jobs List */}
                <div className="space-y-1">
                  {dayJobs.slice(0, viewMode === 'month' ? 3 : 8).map((job) => {
                    const config = statusConfig[job.status] || statusConfig.scheduled
                    return (
                      <Link
                        key={job.id}
                        href={`/admin/jobs/${job.id}`}
                        className="group block"
                      >
                        {viewMode === 'month' ? (
                          // Compact dot view for month
                          <div 
                            className="flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title={`${format(new Date(job.scheduled_start), 'h:mm a')} - ${job.customer?.name || 'Unknown'}`}
                          >
                            <div className={`w-2 h-2 rounded-full ${config.bg}`} />
                            <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 truncate">
                              {format(new Date(job.scheduled_start), 'h:mm a')}
                            </span>
                          </div>
                        ) : (
                          // Expanded card view for week/day
                          <div className={`
                            p-2 rounded-lg border transition-all hover:shadow-sm
                            ${job.status === 'scheduled' ? 'bg-cyan-50 dark:bg-cyan-400/5 border-cyan-200 dark:border-cyan-400/20' : ''}
                            ${job.status === 'on_the_way' ? 'bg-amber-50 dark:bg-amber-400/5 border-amber-200 dark:border-amber-400/20' : ''}
                            ${job.status === 'in_progress' ? 'bg-blue-50 dark:bg-blue-400/5 border-blue-200 dark:border-blue-400/20' : ''}
                            ${job.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-400/5 border-emerald-200 dark:border-emerald-400/20' : ''}
                            ${job.status === 'cancelled' ? 'bg-rose-50 dark:bg-rose-400/5 border-rose-200 dark:border-rose-400/20' : ''}
                          `}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${config.bg}`} />
                              <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                {format(new Date(job.scheduled_start), 'h:mm a')}
                              </span>
                            </div>
                            <div className="font-mono text-xs text-slate-900 dark:text-white truncate mt-1">
                              {job.customer?.name || 'Unknown'}
                            </div>
                            <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {job.technician?.full_name || 'Unassigned'}
                            </div>
                          </div>
                        )}
                      </Link>
                    )
                  })}
                  
                  {/* Show "+X more" indicator if there are more jobs */}
                  {viewMode === 'month' && dayJobs.length > 3 && (
                    <div className="px-1.5 py-0.5">
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                        +{dayJobs.length - 3} more
                      </span>
                    </div>
                  )}

                  {/* Empty state for day view */}
                  {dayJobs.length === 0 && viewMode === 'day' && (
                    <div className="flex flex-col items-center justify-center h-32 text-slate-400 dark:text-slate-600">
                      <Calendar className="w-8 h-8 mb-2 opacity-50" />
                      <span className="font-mono text-xs">No jobs scheduled</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer Legend */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
          <div className="flex flex-wrap items-center gap-4">
            {Object.entries(statusConfig).map(([status, config]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${config.bg}`} />
                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                  {config.label}
                </span>
              </div>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                Showing {filteredJobs.length} of {jobs.length} jobs
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Mini Stat Card Component
function MiniStatCard({ 
  label, 
  value, 
  color, 
  icon: Icon 
}: { 
  label: string
  value: number
  color: 'cyan' | 'amber' | 'blue' | 'emerald' | 'rose'
  icon: React.ElementType
}) {
  const colorStyles = {
    cyan: {
      icon: 'text-cyan-600 dark:text-cyan-400',
      bg: 'bg-cyan-100 dark:bg-cyan-400/10',
      value: 'text-cyan-600 dark:text-cyan-400'
    },
    amber: {
      icon: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-400/10',
      value: 'text-amber-600 dark:text-amber-400'
    },
    blue: {
      icon: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-400/10',
      value: 'text-blue-600 dark:text-blue-400'
    },
    emerald: {
      icon: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-400/10',
      value: 'text-emerald-600 dark:text-emerald-400'
    },
    rose: {
      icon: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-100 dark:bg-rose-400/10',
      value: 'text-rose-600 dark:text-rose-400'
    }
  }

  const styles = colorStyles[color]

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg ${styles.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${styles.icon}`} />
        </div>
        <div>
          <div className="font-mono text-[9px] text-slate-500 dark:text-slate-400 tracking-wider">{label}</div>
          <div className={`font-display text-2xl ${styles.value}`}>{value}</div>
        </div>
      </div>
    </div>
  )
}
