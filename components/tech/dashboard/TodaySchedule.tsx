'use client'

import { format } from 'date-fns'
import Link from 'next/link'

interface Job {
  id: string
  scheduled_start: string
  scheduled_end: string
  status: string
  customer: {
    name: string
    phone: string | null
    address: string | null
  }
  service: {
    name: string
    category: string | null
  }
}

interface TodayScheduleProps {
  jobs: Job[]
}

const statusColors = {
  scheduled: { bg: 'bg-info/10', text: 'text-info', label: 'Scheduled' },
  in_progress: { bg: 'bg-warning/10', text: 'text-warning', label: 'In Progress' },
  completed: { bg: 'bg-success/10', text: 'text-success', label: 'Completed' },
  cancelled: { bg: 'bg-surface-100', text: 'text-surface-500', label: 'Cancelled' },
}

const serviceIcons = {
  plumbing: 'P',
  electrical: 'E',
  hvac: 'H',
  carpentry: 'C',
  painting: 'Paint',
  default: 'Svc'
}

export default function TodaySchedule({ jobs }: TodayScheduleProps) {
  return (
    <div className="rounded-3xl bg-white dark:bg-surface-900 p-6 shadow-elevation-premium-2 border border-surface-200 dark:border-white/10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-ink dark:text-surface-100 mb-1">Today&apos;s Schedule</h3>
          <p className="text-sm text-muted">{jobs.length} appointment{jobs.length !== 1 ? 's' : ''} scheduled</p>
        </div>
        <Link
          href="/tech/schedule"
          className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
        >
          View All
        </Link>
      </div>

      {jobs.length > 0 ? (
        <div className="space-y-3">
          {jobs.map((job, index) => {
            const status = statusColors[job.status as keyof typeof statusColors] || statusColors.scheduled
            const icon = serviceIcons[job.service.category?.toLowerCase() as keyof typeof serviceIcons] || serviceIcons.default

            return (
              <Link
                key={job.id}
                href={`/tech/jobs/${job.id}`}
                className="flex items-start gap-4 p-4 rounded-2xl border border-surface-200 dark:border-white/10 hover:border-primary/30 hover:bg-surface-50 dark:hover:bg-white/5 transition-all motion-base group"
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-2xl flex-shrink-0 group-hover:from-primary/20 group-hover:to-primary/10 transition-colors">
                  {icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-ink dark:text-surface-100 mb-1">{job.customer.name}</h4>
                      <p className="text-sm text-muted truncate">{job.service.name}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${status.bg} ${status.text} whitespace-nowrap`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
                    <div>{format(new Date(job.scheduled_start), 'HH:mm')} - {format(new Date(job.scheduled_end), 'HH:mm')}</div>
                    {job.customer.address && (
                      <div className="truncate max-w-[200px]">{job.customer.address}</div>
                    )}
                    {job.customer.phone && (
                      <div>{job.customer.phone}</div>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-surface-100 dark:bg-white/5 flex items-center justify-center text-3xl mx-auto mb-4">
            📅
          </div>
          <p className="text-muted mb-2">No jobs scheduled for today</p>
          <p className="text-sm text-muted/70">Enjoy your day off!</p>
        </div>
      )}
    </div>
  )
}
