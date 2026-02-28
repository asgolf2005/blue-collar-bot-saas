'use client'

import { useMemo } from 'react'
import { format, formatDistanceToNow, isPast, isFuture } from 'date-fns'
import { Clock, Calendar, ChevronRight, MapPin, Users } from '@/components/ui/lucide'
import Link from 'next/link'
import type { JobWithDetails } from '@/lib/types'

interface UpcomingJobsProps {
  jobs: JobWithDetails[]
}

interface UpcomingJob {
  id: string
  title: string
  description: string
  startTime: Date
  endTime: Date
  address: string
  technicians: string[]
  isUrgent: boolean
  countdown?: string
}

export default function UpcomingJobs({ jobs }: UpcomingJobsProps) {
  const upcomingJobs = useMemo(() => {
    const now = new Date()

    return jobs
      .filter(job => job.scheduled_start && isFuture(new Date(job.scheduled_start)))
      .map(job => {
        const startTime = new Date(job.scheduled_start!)
        const endTime = job.scheduled_end ? new Date(job.scheduled_end) : startTime

        return {
          id: job.id,
          title: job.description || 'Service Call',
          description: job.customer?.name || 'Customer',
          startTime,
          endTime,
          address: job.customer?.address || 'No address',
          technicians: job.technician ? [job.technician.full_name || 'Tech'] : [],
          isUrgent: job.urgency === 'high' || job.urgency === 'emergency',
          countdown: formatDistanceToNow(startTime, { addSuffix: false }),
        }
      })
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .slice(0, 3) // Show top 3 upcoming jobs
  }, [jobs])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 style={{
          fontSize: 'var(--text-3xl)',
          fontWeight: 'var(--font-bold)',
          color: 'var(--gray-900)',
        }}>
          Upcoming Jobs
        </h2>

        <Link
          href="/admin/jobs"
          style={{
            fontSize: 'var(--text-md)',
            fontWeight: 'var(--font-medium)',
            color: 'var(--gray-500)',
            transition: 'var(--transition-base)',
          }}
          className="flex items-center gap-1 hover:text-[#111827]"
        >
          View all
          <ChevronRight style={{ width: 'var(--icon-sm)', height: 'var(--icon-sm)' }} />
        </Link>
      </div>

      {/* Job Cards */}
      <div className="space-y-3">
        {upcomingJobs.length === 0 ? (
          <div
            style={{
              background: 'var(--gray-50)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--spacing-6)',
              textAlign: 'center',
            }}
          >
            <Clock style={{ width: '32px', height: '32px', margin: '0 auto', color: 'var(--gray-400)' }} />
            <p style={{
              fontSize: 'var(--text-md)',
              color: 'var(--gray-500)',
              marginTop: 'var(--spacing-2)',
            }}>
              No upcoming jobs scheduled
            </p>
          </div>
        ) : (
          upcomingJobs.map((job, index) => (
            <Link
              key={job.id}
              href={`/admin/jobs/${job.id}`}
              style={{
                background: index === 0 && job.isUrgent ? 'var(--yellow-400)' : 'var(--gray-50)',
                borderRadius: 'var(--radius-2xl)',
                padding: 'var(--spacing-5)',
                position: 'relative',
                boxShadow: index === 0 && job.isUrgent ? 'var(--shadow-yellow)' : 'var(--shadow-sm)',
                transition: 'var(--transition-base)',
              }}
              className="block cursor-pointer hover:-translate-y-0.5 hover:shadow-lg"
            >
              {/* Countdown Badge (if first and urgent) */}
              {index === 0 && job.countdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    height: '24px',
                    padding: '4px 10px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--font-semibold)',
                    color: job.isUrgent ? 'var(--yellow-700)' : 'var(--gray-700)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-1)',
                  }}
                >
                  <span
                    className="animate-pulse"
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: 'var(--radius-full)',
                      background: job.isUrgent ? 'var(--red-500)' : 'var(--green-400)',
                    }}
                  />
                  in {job.countdown}
                </div>
              )}

              {/* Title */}
              <div style={{
                fontSize: 'var(--text-2xl)',
                fontWeight: 'var(--font-bold)',
                color: index === 0 && job.isUrgent ? 'var(--yellow-900)' : 'var(--gray-900)',
                marginBottom: 'var(--spacing-1)',
              }}>
                {job.title}
              </div>

              {/* Description */}
              <div style={{
                fontSize: 'var(--text-md)',
                color: index === 0 && job.isUrgent ? 'var(--yellow-800)' : 'var(--gray-500)',
                marginBottom: 'var(--spacing-4)',
              }}>
                {job.description}
              </div>

              {/* Info Pills */}
              <div className="flex flex-wrap gap-2 mb-4">
                {/* Time */}
                <div
                  style={{
                    background: index === 0 && job.isUrgent ? 'rgba(255, 255, 255, 0.7)' : 'white',
                    height: '32px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-1)',
                  }}
                >
                  <Clock
                    style={{
                      width: 'var(--icon-xs)',
                      height: 'var(--icon-xs)',
                      color: index === 0 && job.isUrgent ? 'var(--yellow-800)' : 'var(--gray-600)',
                    }}
                  />
                  <span style={{
                    fontSize: 'var(--text-base)',
                    fontWeight: 'var(--font-medium)',
                    color: index === 0 && job.isUrgent ? 'var(--yellow-900)' : 'var(--gray-700)',
                  }}>
                    {format(job.startTime, 'HH:mm')} - {format(job.endTime, 'HH:mm')}
                  </span>
                </div>

                {/* Date */}
                <div
                  style={{
                    background: index === 0 && job.isUrgent ? 'rgba(255, 255, 255, 0.7)' : 'white',
                    height: '32px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-1)',
                  }}
                >
                  <Calendar
                    style={{
                      width: 'var(--icon-xs)',
                      height: 'var(--icon-xs)',
                      color: index === 0 && job.isUrgent ? 'var(--yellow-800)' : 'var(--gray-600)',
                    }}
                  />
                  <span style={{
                    fontSize: 'var(--text-base)',
                    fontWeight: 'var(--font-medium)',
                    color: index === 0 && job.isUrgent ? 'var(--yellow-900)' : 'var(--gray-700)',
                  }}>
                    {format(job.startTime, 'MMMM d')}
                  </span>
                </div>

                {/* Location */}
                <div
                  style={{
                    background: index === 0 && job.isUrgent ? 'rgba(255, 255, 255, 0.7)' : 'white',
                    height: '32px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-1)',
                    maxWidth: '200px',
                  }}
                >
                  <MapPin
                    style={{
                      width: 'var(--icon-xs)',
                      height: 'var(--icon-xs)',
                      color: index === 0 && job.isUrgent ? 'var(--yellow-800)' : 'var(--gray-600)',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{
                    fontSize: 'var(--text-base)',
                    fontWeight: 'var(--font-medium)',
                    color: index === 0 && job.isUrgent ? 'var(--yellow-900)' : 'var(--gray-700)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {job.address}
                  </span>
                </div>
              </div>

              {/* Technicians */}
              {job.technicians.length > 0 && (
                <div className="flex items-center gap-2">
                  {job.technicians.slice(0, 3).map((tech, techIdx) => (
                    <div
                      key={techIdx}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-full)',
                        border: index === 0 && job.isUrgent ? '2px solid var(--yellow-400)' : '2px solid var(--gray-50)',
                        background: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--font-semibold)',
                        color: 'white',
                      }}
                    >
                      {tech.charAt(0)}
                    </div>
                  ))}

                  {job.technicians.length > 3 && (
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-full)',
                        background: index === 0 && job.isUrgent ? 'rgba(255, 255, 255, 0.7)' : 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--font-semibold)',
                        color: index === 0 && job.isUrgent ? 'var(--yellow-800)' : 'var(--gray-600)',
                      }}
                    >
                      +{job.technicians.length - 3}
                    </div>
                  )}
                </div>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  )
}


