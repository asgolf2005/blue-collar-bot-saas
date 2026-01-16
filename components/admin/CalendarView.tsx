'use client'

import { JobWithDetails, User } from '@/lib/types'
import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, addDays, startOfDay } from 'date-fns'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Plus } from 'lucide-react'
import { useRealtimeJobsWithRelations } from '@/hooks/useRealtimeJobsWithRelations'
import { showToast } from '@/lib/utils/toast'

type ViewMode = 'month' | 'week' | 'day'

export default function CalendarView({ jobs: initialJobs, businessId }: { jobs: JobWithDetails[], businessId: string }) {
  // Real-time subscription for jobs
  const { jobs, isConnected } = useRealtimeJobsWithRelations({
    businessId,
    initialJobs,
  })
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [selectedTech, setSelectedTech] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [draggingJobId, setDraggingJobId] = useState<string | null>(null)
  const [dragOverDay, setDragOverDay] = useState<string | null>(null)

  // Get unique technicians for filter
  const technicians = useMemo(() => {
    const techMap = new Map<string, User>()
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
      const techMatch = selectedTech === 'all' || job.technician_id === selectedTech
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
    const map = new Map<string, JobWithDetails[]>()
    filteredJobs.forEach((job) => {
      const dayKey = format(new Date(job.scheduled_start), 'yyyy-MM-dd')
      if (!map.has(dayKey)) {
        map.set(dayKey, [])
      }
      map.get(dayKey)!.push(job)
    })
    // Sort jobs by time within each day
    map.forEach((jobs) => {
      jobs.sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime())
    })
    return map
  }, [filteredJobs])

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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'bg-blue-500',
      on_the_way: 'bg-yellow-500',
      arrived: 'bg-purple-500',
      in_progress: 'bg-orange-500',
      completed: 'bg-green-500',
      cancelled: 'bg-red-500',
    }
    return colors[status] || 'bg-gray-500'
  }

  const handleDragStart = (event: React.DragEvent, job: JobWithDetails) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        jobId: job.id,
        status: job.status,
        scheduledStart: job.scheduled_start,
        scheduledEnd: job.scheduled_end,
      })
    )
    setDraggingJobId(job.id)
  }

  const handleDragEnd = () => {
    setDraggingJobId(null)
    setDragOverDay(null)
  }

  const handleDragOver = (event: React.DragEvent, dayKey: string) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverDay(dayKey)
  }

  const handleDragLeave = (dayKey: string) => {
    if (dragOverDay === dayKey) {
      setDragOverDay(null)
    }
  }

  const handleDrop = async (event: React.DragEvent, day: Date) => {
    event.preventDefault()
    setDragOverDay(null)

    const payload = event.dataTransfer.getData('application/json')
    if (!payload) return

    let data: {
      jobId: string
      status: string
      scheduledStart: string
      scheduledEnd?: string | null
    }

    try {
      data = JSON.parse(payload)
    } catch (error) {
      return
    }

    const originalStart = new Date(data.scheduledStart)
    if (Number.isNaN(originalStart.getTime())) return

    const newStart = new Date(day)
    newStart.setHours(
      originalStart.getHours(),
      originalStart.getMinutes(),
      originalStart.getSeconds(),
      originalStart.getMilliseconds()
    )

    if (isSameDay(originalStart, newStart)) {
      return
    }

    let newEnd: string | undefined
    if (data.scheduledEnd) {
      const originalEnd = new Date(data.scheduledEnd)
      const durationMs = originalEnd.getTime() - originalStart.getTime()
      if (!Number.isNaN(durationMs) && durationMs > 0) {
        newEnd = new Date(newStart.getTime() + durationMs).toISOString()
      }
    }

    try {
      const response = await fetch('/api/jobs/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: data.jobId,
          status: data.status,
          scheduledStart: newStart.toISOString(),
          scheduledEnd: newEnd,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to reschedule job')
      }

      showToast.success('Job rescheduled')
    } catch (error) {
      showToast.error('Failed to reschedule job')
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left: View Mode Switcher */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition ${
                viewMode === 'month'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition ${
                viewMode === 'week'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition ${
                viewMode === 'day'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Day
            </button>
          </div>

          {/* Right: Filters and Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Technician Filter */}
            <select
              value={selectedTech}
              onChange={(e) => setSelectedTech(e.target.value)}
              className="input text-sm py-2"
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
              className="input text-sm py-2"
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
              className="btn btn-primary text-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Job
            </Link>
          </div>
        </div>
      </div>

      {/* Calendar Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900">
              {getViewTitle()}
            </h2>
            <button
              onClick={goToToday}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Today
            </button>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={goToPrevious}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNext}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className={`grid gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden ${
          viewMode === 'month' || viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-1'
        }`}>
          {/* Day Headers */}
          {viewMode !== 'day' && (
            <>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-700">
                  {day}
                </div>
              ))}
            </>
          )}

          {/* Calendar Days */}
          {calendarDays.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd')
            const dayJobs = jobsByDay.get(dayKey) || []
            const isCurrentMonth = viewMode !== 'month' || day.getMonth() === currentDate.getMonth()
            const isToday = isSameDay(day, new Date())
            const minHeight = viewMode === 'day' ? 'min-h-[400px]' : viewMode === 'week' ? 'min-h-[180px]' : 'min-h-[120px]'
            const isDragOver = dragOverDay === dayKey

            return (
              <div
                key={day.toISOString()}
                className={`bg-white ${minHeight} p-2 ${
                  !isCurrentMonth ? 'opacity-40' : ''
                } ${isToday ? 'ring-2 ring-inset ring-primary-500' : ''} ${
                  isDragOver ? 'ring-2 ring-inset ring-primary-300 bg-primary/5' : ''
                }`}
                onDragOver={(event) => handleDragOver(event, dayKey)}
                onDragLeave={() => handleDragLeave(dayKey)}
                onDrop={(event) => handleDrop(event, day)}
              >
                <div className={`text-sm font-medium mb-2 ${isToday ? 'text-primary-600' : 'text-gray-900'}`}>
                  {viewMode === 'month' && format(day, 'd')}
                  {viewMode === 'week' && format(day, 'EEE d')}
                  {viewMode === 'day' && format(day, 'EEEE, MMMM d, yyyy')}
                </div>
                <div className="space-y-1">
                  {dayJobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/admin/jobs/${job.id}`}
                      className={`block text-xs p-2 rounded text-white ${getStatusColor(job.status)} hover:opacity-90 transition group ${
                        draggingJobId === job.id ? 'opacity-60' : ''
                      }`}
                      title={`${job.customer.name} - ${job.description || 'No description'}`}
                      draggable
                      onDragStart={(event) => handleDragStart(event, job)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="font-medium truncate">
                        {format(new Date(job.scheduled_start), 'h:mm a')} - {job.customer.name}
                      </div>
                      {viewMode === 'day' && (
                        <div className="text-xs opacity-90 mt-1 truncate">
                          {job.description || 'No description'}
                        </div>
                      )}
                      {job.technician && viewMode !== 'month' && (
                        <div className="text-xs opacity-80 mt-1">
                          Tech: {job.technician.full_name || job.technician.email}
                        </div>
                      )}
                    </Link>
                  ))}
                  {dayJobs.length === 0 && viewMode === 'day' && (
                    <div className="text-center text-gray-400 text-sm py-8">
                      No jobs scheduled
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-4">
          <div className="flex items-center text-sm">
            <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
            <span>Scheduled</span>
          </div>
          <div className="flex items-center text-sm">
            <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
            <span>On the Way</span>
          </div>
          <div className="flex items-center text-sm">
            <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
            <span>Arrived</span>
          </div>
          <div className="flex items-center text-sm">
            <div className="w-3 h-3 bg-orange-500 rounded mr-2"></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center text-sm">
            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center text-sm ml-auto">
            <span className="text-gray-600">Total: {filteredJobs.length} jobs</span>
          </div>
        </div>
      </div>
    </div>
  )
}
