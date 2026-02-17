'use client'

import { Job, Customer } from '@/lib/types'
import { format } from 'date-fns'
import Link from 'next/link'

interface JobWithCustomer extends Job {
  customer?: Customer
}

export default function JobCard({ job }: { job: JobWithCustomer }) {
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { badge: string; border: string; dot: string; label: string }> = {
      scheduled: {
        badge: 'badge-scheduled',
        border: 'border-l-primary',
        dot: 'bg-primary',
        label: 'Scheduled'
      },
      on_the_way: {
        badge: 'badge-in-progress',
        border: 'border-l-warning',
        dot: 'bg-warning',
        label: 'On The Way'
      },
      arrived: {
        badge: 'badge-electric',
        border: 'border-l-info',
        dot: 'bg-info',
        label: 'Arrived'
      },
      in_progress: {
        badge: 'badge-in-progress',
        border: 'border-l-warning',
        dot: 'bg-warning',
        label: 'In Progress'
      },
      completed: {
        badge: 'badge-completed',
        border: 'border-l-success',
        dot: 'bg-success',
        label: 'Completed'
      },
      cancelled: {
        badge: 'badge-cancelled',
        border: 'border-l-danger',
        dot: 'bg-danger',
        label: 'Cancelled'
      },
    }
    return configs[status] || configs.scheduled
  }

  const statusConfig = getStatusConfig(job.status)

  return (
    <Link href={`/tech/jobs/${job.id}`}>
      <div className={`card-interactive border-l-4 ${statusConfig.border} group`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-surface-200 flex items-center justify-center text-primary font-semibold">
              {(job.customer?.name || 'C').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-ink group-hover:text-primary transition-colors">
                {job.customer?.name || 'Unknown Customer'}
              </h3>
              <div className="mt-0.5 text-sm text-muted">
                {format(new Date(job.scheduled_start), 'h:mm a')} - {format(new Date(job.scheduled_end), 'h:mm a')}
              </div>
            </div>
          </div>
          <div className="text-xs font-semibold text-muted group-hover:text-primary transition-colors">Open</div>
        </div>

        {/* Details */}
        <div className="space-y-2 mb-4">
          {job.customer?.address && (
            <div className="text-sm text-muted line-clamp-1">{job.customer?.address}</div>
          )}

          {job.customer?.phone && (
            <div className="text-sm">
              <a
                href={`tel:${job.customer?.phone}`}
                className="text-primary hover:text-primary/80 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {job.customer?.phone}
              </a>
            </div>
          )}
        </div>

        {job.description && (
          <p className="text-sm text-muted mb-4 line-clamp-2">{job.description}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-surface-200">
          <span className={`badge ${statusConfig.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
            {statusConfig.label}
          </span>

          {job.urgency && job.urgency !== 'normal' && (
            <span className="badge bg-danger/10 text-danger border-danger/30">
              {job.urgency}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
