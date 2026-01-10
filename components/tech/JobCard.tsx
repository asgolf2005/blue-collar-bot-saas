'use client'

import { Job, Customer } from '@/lib/types'
import { format } from 'date-fns'
import Link from 'next/link'
import { Clock, MapPin, Phone, ChevronRight, AlertTriangle, User } from 'lucide-react'

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
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-surface-200 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-ink group-hover:text-primary transition-colors">
                {job.customer?.name || 'Unknown Customer'}
              </h3>
              <div className="flex items-center gap-2 mt-0.5 text-sm text-muted">
                <Clock className="w-3.5 h-3.5" />
                <span>{format(new Date(job.scheduled_start), 'h:mm a')}</span>
                <span className="text-surface-400">-</span>
                <span>{format(new Date(job.scheduled_end), 'h:mm a')}</span>
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-surface-600 group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>

        {/* Details */}
        <div className="space-y-2 mb-4">
          {job.customer?.address && (
            <div className="flex items-start text-sm text-muted">
              <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-muted" />
              <span className="line-clamp-1">{job.customer?.address}</span>
            </div>
          )}

          {job.customer?.phone && (
            <div className="flex items-center text-sm">
              <Phone className="w-4 h-4 mr-2 text-muted" />
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
              <AlertTriangle className="w-3 h-3" />
              {job.urgency}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
