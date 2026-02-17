'use client'

import { Job, Customer } from '@/lib/types'
import { format } from 'date-fns'
import Link from 'next/link'

interface JobWithCustomer extends Job {
  customer: Customer
}

export default function AppointmentCard({
  job,
  showHistory = false,
}: {
  job: JobWithCustomer
  showHistory?: boolean
}) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'bg-primary/10 text-primary border-primary/20',
      on_the_way: 'bg-warning/10 text-warning border-warning/20',
      arrived: 'bg-info/10 text-info border-info/20',
      in_progress: 'bg-warning/10 text-warning border-warning/20',
      completed: 'bg-success/10 text-success border-success/20',
      cancelled: 'bg-danger/10 text-danger border-danger/20',
    }
    return colors[status] || 'bg-surface-100 text-surface-600 border-surface-200'
  }

  const getStatusText = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: 'Scheduled',
      on_the_way: 'Technician On The Way',
      arrived: 'Technician Arrived',
      in_progress: 'Work In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    }
    return labels[status] || status
  }

  return (
    <Link href={`/customer/appointments/${job.id}`}>
      <div className="card hover:shadow-elevation-2 transition cursor-pointer">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-ink">
                {format(new Date(job.scheduled_start), 'EEEE, MMMM d, yyyy')}
              </span>
            </div>
            <div className="text-sm text-muted">
              {format(new Date(job.scheduled_start), 'h:mm a')} - {format(new Date(job.scheduled_end), 'h:mm a')}
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(job.status)}`}>
            {getStatusText(job.status)}
          </div>
        </div>

        {job.description && (
          <p className="text-surface-600 mb-3">{job.description}</p>
        )}

        {job.urgency && (
          <div className="inline-block px-2 py-1 bg-danger/10 text-danger text-xs font-medium rounded mb-3">
            {job.urgency}
          </div>
        )}

        {job.technician && (
          <div className="text-sm text-muted">
            <span className="font-medium">Technician:</span> {job.technician.full_name}
          </div>
        )}

        {showHistory && (
          <div className="mt-3 pt-3 border-t border-surface-200">
            <span className="text-primary text-sm font-medium">View details</span>
          </div>
        )}
      </div>
    </Link>
  )
}
