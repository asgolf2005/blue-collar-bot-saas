'use client'

import { useMemo, useState } from 'react'
import { format, addDays, startOfWeek, endOfWeek, isSameDay, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns'
import { Calendar, Filter, ChevronRight, ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { JobWithDetails } from '@/lib/types'

interface TechnicianScheduleProps {
  jobs: JobWithDetails[]
  businessId: string
}

interface TechInfo {
  id: string
  name: string
  avatar?: string
  role: string
}

type ViewMode = 'day' | 'week' | 'fortnight'

const BUSINESS_HOURS = {
  start: 7, // 7 AM
  end: 19,  // 7 PM
}

export default function TechnicianSchedule({ jobs, businessId }: TechnicianScheduleProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const dayViewMaxHeight = 'min(70vh, 640px)'
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
    } else {
      // fortnight
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
      return {
        startDate: weekStart,
        endDate: addDays(weekStart, 13),
        days: Array.from({ length: 14 }, (_, i) => addDays(weekStart, i)),
      }
    }
  }, [selectedDate, viewMode])

  // Extract unique technicians
  const technicians = useMemo(() => {
    const techMap = new Map<string, TechInfo>()
    jobs.forEach(job => {
      if (job.technician && job.technician.role === 'tech') {
        if (!techMap.has(job.technician.id)) {
          techMap.set(job.technician.id, {
            id: job.technician.id,
            name: job.technician.full_name || 'Technician',
            avatar: job.technician.avatar_url,
            role: job.technician.business_role || 'Technician',
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
    } else {
      setSelectedDate(prev => addDays(prev, direction === 'next' ? 14 : -14))
    }
  }

  const handleJobClick = (jobId: string) => {
    router.push(`/admin/jobs/${jobId}`)
  }

  const getJobBlockStyle = (job: JobWithDetails) => {
    const urgency = job.urgency
    const isCompleted = job.status === 'completed'

    if (isCompleted) {
      return {
        bg: 'bg-[#34D399]',
        text: 'text-white',
        badge: 'bg-white/30',
      }
    } else if (urgency === 'high' || urgency === 'emergency') {
      return {
        bg: 'bg-[#93C5FD]',
        text: 'text-white',
        badge: 'bg-white/30',
      }
    } else if (job.description?.toLowerCase().includes('maintenance')) {
      return {
        bg: 'bg-[#A78BFA]',
        text: 'text-white',
        badge: 'bg-white/30',
      }
    } else {
      return {
        bg: 'bg-[#FBBF24]',
        text: 'text-[#78350F]',
        badge: 'bg-white/30',
      }
    }
  }

  const getJobPosition = (job: JobWithDetails, dayIndex: number) => {
    const jobStart = parseISO(job.scheduled_start!)
    const jobEnd = job.scheduled_end ? parseISO(job.scheduled_end) : addDays(jobStart, 0)

    const startHour = jobStart.getHours()
    const startMinute = jobStart.getMinutes()
    const endHour = jobEnd.getHours()
    const endMinute = jobEnd.getMinutes()

    // Calculate position as percentage of the day
    const startPercent = ((startHour - BUSINESS_HOURS.start) + (startMinute / 60)) / (BUSINESS_HOURS.end - BUSINESS_HOURS.start) * 100
    const duration = ((endHour - startHour) + ((endMinute - startMinute) / 60))
    const heightPercent = (duration / (BUSINESS_HOURS.end - BUSINESS_HOURS.start)) * 100

    return {
      top: `${Math.max(0, startPercent)}%`,
      height: `${Math.max(5, heightPercent)}%`,
      time: format(jobStart, 'h:mm a'),
    }
  }

  return (
    <div style={{ background: 'var(--bg-card)' }} className="rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 p-6 pb-0">
        <div>
          <h2 style={{
            fontSize: 'var(--text-5xl)',
            fontWeight: 'var(--font-bold)',
            color: 'var(--gray-900)',
            letterSpacing: 'var(--tracking-tight)',
          }}>
            Technician Schedule
          </h2>
          <p style={{
            fontSize: 'var(--text-md)',
            color: 'var(--gray-500)',
            marginTop: 'var(--spacing-1)',
          }}>
            {viewMode === 'day' ? 'Daily schedule with hourly time slots' :
             viewMode === 'week' ? 'Weekly schedule overview' :
             'Two-week schedule overview'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div style={{
            background: 'var(--gray-100)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-1)',
            display: 'flex',
            gap: 'var(--spacing-1)',
          }}>
            {(['day', 'week', 'fortnight'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-medium)',
                  background: viewMode === mode ? 'var(--bg-card)' : 'transparent',
                  color: viewMode === mode ? 'var(--gray-900)' : 'var(--gray-600)',
                  border: 'none',
                  boxShadow: viewMode === mode ? 'var(--shadow-xs)' : 'none',
                  transition: 'var(--transition-base)',
                }}
                className="cursor-pointer"
              >
                {mode === 'fortnight' ? '2 Weeks' : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateDate('prev')}
              style={{
                width: 'var(--button-md)',
                height: 'var(--button-md)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--gray-200)',
                background: 'var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronLeft style={{ width: 'var(--icon-sm)', height: 'var(--icon-sm)' }} />
            </button>

            <div style={{
              padding: '0 var(--spacing-3)',
              height: 'var(--button-md)',
              display: 'flex',
              alignItems: 'center',
              fontSize: 'var(--text-md)',
              fontWeight: 'var(--font-medium)',
              color: 'var(--gray-700)',
              minWidth: '180px',
              justifyContent: 'center',
            }}>
              <Calendar style={{ width: 'var(--icon-sm)', height: 'var(--icon-sm)', marginRight: 'var(--spacing-2)' }} />
              {viewMode === 'day' && format(selectedDate, 'MMMM d, yyyy')}
              {viewMode === 'week' && `${format(days[0], 'MMM d')} - ${format(days[6], 'MMM d, yyyy')}`}
              {viewMode === 'fortnight' && `${format(days[0], 'MMM d')} - ${format(days[13], 'MMM d, yyyy')}`}
            </div>

            <button
              onClick={() => navigateDate('next')}
              style={{
                width: 'var(--button-md)',
                height: 'var(--button-md)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--gray-200)',
                background: 'var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronRight style={{ width: 'var(--icon-sm)', height: 'var(--icon-sm)' }} />
            </button>
          </div>

          {/* Filter Button */}
          <button
            style={{
              height: 'var(--button-md)',
              padding: '0 var(--spacing-3)',
              background: 'var(--bg-card)',
              border: '1px solid var(--gray-200)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-md)',
              fontWeight: 'var(--font-medium)',
              color: 'var(--gray-700)',
              transition: 'var(--transition-base)',
            }}
            className="flex items-center gap-2 hover:border-[#3B82F6]/40"
          >
            <Filter style={{ width: 'var(--icon-sm)', height: 'var(--icon-sm)' }} />
            Filter
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6 pt-5">
        {viewMode === 'day' ? (
          // DAY VIEW - Hourly time slots
          <div
            className="flex gap-1 custom-scrollbar"
            style={{
              maxHeight: dayViewMaxHeight,
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingRight: 'var(--spacing-2)',
            }}
          >
            {/* Time Column */}
            <div style={{ width: '80px', paddingRight: 'var(--spacing-2)' }}>
              <div style={{ height: '50px' }} /> {/* Header spacer */}
              {timeSlots.map(hour => (
                <div
                  key={hour}
                  style={{
                    height: '60px',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--gray-500)',
                    paddingTop: 'var(--spacing-1)',
                  }}
                >
                  {format(new Date().setHours(hour, 0), 'h a')}
                </div>
              ))}
            </div>

            {/* Technicians Column */}
            <div style={{ width: '200px', paddingRight: 'var(--spacing-4)', borderRight: '1px solid var(--gray-100)' }}>
              <div style={{ height: '50px', paddingBottom: 'var(--spacing-3)', marginBottom: 'var(--spacing-3)' }}>
                <p style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-semibold)',
                  color: 'var(--gray-400)',
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--tracking-wide)',
                }}>
                  Technicians
                </p>
              </div>

              {technicians.map(tech => (
                <div key={tech.id} style={{ height: `${timeSlots.length * 60}px`, position: 'relative', borderBottom: '1px solid var(--gray-100)' }}>
                  <div style={{
                    position: 'sticky',
                    top: 0,
                    background: 'var(--bg-card)',
                    padding: 'var(--spacing-2) 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                    zIndex: 10,
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-full)',
                      background: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-semibold)',
                      color: 'white',
                    }}>
                      {tech.name.charAt(0)}
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--gray-900)' }}>
                      {tech.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Schedule Grid */}
            <div style={{ flex: 1, position: 'relative' }}>
              {/* Day Header */}
              <div style={{
                height: '50px',
                paddingBottom: 'var(--spacing-3)',
                marginBottom: 'var(--spacing-3)',
                textAlign: 'center',
              }}>
                <div style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-semibold)',
                  color: 'var(--gray-900)',
                }}>
                  {format(selectedDate, 'EEEE, MMM d')}
                </div>
              </div>

              {/* Grid Lines */}
              <div style={{ position: 'absolute', top: '50px', left: 0, right: 0, bottom: 0 }}>
                {timeSlots.map((hour, idx) => (
                  <div
                    key={hour}
                    style={{
                      height: '60px',
                      borderTop: idx === 0 ? '1px solid var(--gray-100)' : 'none',
                      borderBottom: '1px solid var(--gray-100)',
                    }}
                  />
                ))}
              </div>

              {/* Technician Rows with Jobs */}
              {technicians.map((tech, techIdx) => {
                const techJobs = viewJobs.filter(j => j.technician?.id === tech.id)

                return (
                  <div
                    key={tech.id}
                    style={{
                      height: `${timeSlots.length * 60}px`,
                      position: 'relative',
                      borderBottom: techIdx < technicians.length - 1 ? '1px solid var(--gray-100)' : 'none',
                    }}
                  >
                    {techJobs.map(job => {
                      const position = getJobPosition(job, 0)
                      const style = getJobBlockStyle(job)
                      const customerName = job.customer?.name || 'Customer'
                      const jobDescription = job.description || 'Service Call'

                      return (
                        <div
                          key={job.id}
                          style={{
                            position: 'absolute',
                            top: position.top,
                            left: '8px',
                            right: '8px',
                            height: position.height,
                            minHeight: '40px',
                            borderRadius: 'var(--radius-lg)',
                            padding: '8px 10px',
                            boxShadow: 'var(--shadow-md)',
                            transition: 'var(--transition-base)',
                            zIndex: 5,
                          }}
                          className={`${style.bg} ${style.text} cursor-pointer hover:scale-[1.02]`}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleJobClick(job.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              handleJobClick(job.id)
                            }
                          }}
                        >
                          <div style={{
                            fontSize: 'var(--text-sm)',
                            fontWeight: 'var(--font-semibold)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {position.time}
                          </div>
                          <div style={{
                            fontSize: 'var(--text-sm)',
                            fontWeight: 'var(--font-semibold)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {customerName}
                          </div>
                          <div style={{
                            fontSize: 'var(--text-xs)',
                            opacity: 0.9,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {jobDescription}
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
          // WEEK/FORTNIGHT VIEW - Day columns
          <div className="flex gap-1">
            {/* Technicians Column */}
            <div style={{ width: '200px', paddingRight: 'var(--spacing-4)', borderRight: '1px solid var(--gray-100)' }}>
              <div style={{ paddingBottom: 'var(--spacing-3)', marginBottom: 'var(--spacing-3)' }}>
                <p style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-semibold)',
                  color: 'var(--gray-400)',
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--tracking-wide)',
                }}>
                  Technicians
                </p>
              </div>

              {technicians.map(tech => (
                <div
                  key={tech.id}
                  style={{
                    height: '60px',
                    padding: 'var(--spacing-2) 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-3)',
                  }}
                >
                  <div style={{
                    width: 'var(--avatar-md)',
                    height: 'var(--avatar-md)',
                    borderRadius: 'var(--radius-full)',
                    border: '2px solid var(--gray-100)',
                    background: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'var(--text-lg)',
                    fontWeight: 'var(--font-semibold)',
                    color: 'white',
                  }}>
                    {tech.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 'var(--text-md)',
                      fontWeight: 'var(--font-semibold)',
                      color: 'var(--gray-900)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {tech.name}
                    </div>
                    <div style={{
                      fontSize: 'var(--text-sm)',
                      color: 'var(--gray-500)',
                    }}>
                      {tech.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {/* Days Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${days.length}, minmax(80px, 1fr))`,
                gap: 'var(--spacing-1)',
                paddingBottom: 'var(--spacing-3)',
                marginBottom: 'var(--spacing-3)',
                borderBottom: '1px solid var(--gray-100)',
              }}>
                {days.map((day, idx) => {
                  const isToday = isSameDay(day, new Date())
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6

                  return (
                    <div key={idx} style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: 'var(--text-xs)',
                        fontWeight: 'var(--font-semibold)',
                        color: isWeekend ? 'var(--gray-300)' : 'var(--gray-400)',
                        textTransform: 'uppercase',
                        letterSpacing: 'var(--tracking-wide)',
                      }}>
                        {format(day, 'EEE')}
                      </div>
                      <div style={{
                        fontSize: 'var(--text-md)',
                        fontWeight: 'var(--font-semibold)',
                        color: isWeekend ? 'var(--gray-300)' : isToday ? 'white' : 'var(--gray-700)',
                        marginTop: 'var(--spacing-1)',
                        background: isToday ? 'var(--blue-500)' : 'transparent',
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-full)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {format(day, 'd')}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Job Rows */}
              {technicians.map(tech => (
                <div
                  key={tech.id}
                  style={{
                    height: '60px',
                    display: 'grid',
                    gridTemplateColumns: `repeat(${days.length}, minmax(80px, 1fr))`,
                    gap: 'var(--spacing-1)',
                    alignItems: 'center',
                  }}
                >
                  {days.map((day, dayIdx) => {
                    const dayJobs = viewJobs.filter(j =>
                      j.technician?.id === tech.id &&
                      isSameDay(parseISO(j.scheduled_start!), day)
                    )
                    const isPast = day < startOfDay(new Date())

                    if (dayJobs.length > 0) {
                      const job = dayJobs[0] // Show first job
                      const style = getJobBlockStyle(job)
                      const customerName = job.customer?.name || 'Customer'
                      const time = format(parseISO(job.scheduled_start!), 'h:mm a')

                      return (
                        <div
                          key={dayIdx}
                          style={{
                            height: '52px',
                            borderRadius: 'var(--radius-xl)',
                            padding: '8px 10px',
                            boxShadow: 'var(--shadow-md)',
                            transition: 'var(--transition-base)',
                            position: 'relative',
                          }}
                          className={`${style.bg} ${style.text} cursor-pointer hover:scale-[1.02]`}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleJobClick(job.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              handleJobClick(job.id)
                            }
                          }}
                        >
                          <div style={{
                            fontSize: 'var(--text-xs)',
                            fontWeight: 'var(--font-semibold)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {time}
                          </div>
                          <div style={{
                            fontSize: 'var(--text-xs)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            opacity: 0.9,
                          }}>
                            {customerName}
                          </div>
                          {dayJobs.length > 1 && (
                            <div style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              background: 'rgba(0,0,0,0.2)',
                              fontSize: '9px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'var(--font-bold)',
                            }}>
                              +{dayJobs.length - 1}
                            </div>
                          )}
                        </div>
                      )
                    }

                    return (
                      <div
                        key={dayIdx}
                        style={{
                          height: '52px',
                          borderRadius: 'var(--radius-md)',
                        }}
                        className={isPast ? 'diagonal-stripes' : ''}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
