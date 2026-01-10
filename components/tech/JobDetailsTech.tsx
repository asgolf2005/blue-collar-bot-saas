'use client'

import { JobWithDetails } from '@/lib/types'
import { format } from 'date-fns'
import { ArrowLeft, Clock, AlertTriangle, FileText } from 'lucide-react'
import Link from 'next/link'
import StatusButtons from './StatusButtons'
import JobPricing from './JobPricing'
import TimeTracker from './TimeTracker'
import PhotoUpload from './PhotoUpload'
import SignatureCapture from './SignatureCapture'
import JobNotes from './JobNotes'
import CustomerDetailsCard from './CustomerDetailsCard'
import LocationSharing from './LocationSharing'

export default function JobDetailsTech({ job }: { job: JobWithDetails }) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'bg-primary/10 text-primary border-primary/20',
      on_the_way: 'bg-warning/10 text-warning border-warning/20',
      arrived: 'bg-info/10 text-info border-info/20',
      in_progress: 'bg-warning/10 text-warning border-warning/20',
      completed: 'bg-success/10 text-success border-success/20',
      cancelled: 'bg-danger/10 text-danger border-danger/20',
    }
    return colors[status] || 'bg-surface-100 text-muted border-surface-200'
  }

  return (
    <div>
      {/* Back Link */}
      <Link href="/tech/today" className="inline-flex items-center text-muted hover:text-ink mb-4 text-sm transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Today
      </Link>

      {/* Job Header Card */}
      <div className="bg-surface-50/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-ink">
                {job.customer?.name || 'Unknown Customer'}
              </h1>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor(job.status)}`}>
                {job.status.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1.5 text-muted" />
                {format(new Date(job.scheduled_start), 'EEEE, MMMM d')} at {format(new Date(job.scheduled_start), 'h:mm a')}
              </div>
              {job.urgency && job.urgency !== 'normal' && (
                <div className="flex items-center text-danger">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  {job.urgency}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Job Description */}
        {job.description && (
          <div className="bg-surface-100 rounded-xl p-4 border border-surface-200">
            <div className="flex items-center mb-2">
              <FileText className="w-4 h-4 text-muted mr-2" />
              <span className="text-sm font-medium text-surface-600">Job Description</span>
            </div>
            <p className="text-surface-600">{job.description}</p>
          </div>
        )}
      </div>

      {/* Two Column Layout for larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Customer Details with Map */}
          {job.customer && (
            <CustomerDetailsCard customer={job.customer} showMap={true} />
          )}

          {/* Status Update */}
          <StatusButtons
            jobId={job.id}
            currentStatus={job.status}
            customerAddress={job.customer?.address ?? undefined}
          />

          {/* Location Sharing - Show when job is active */}
          {['on_the_way', 'arrived', 'in_progress'].includes(job.status) && (
            <LocationSharing jobId={job.id} autoStart={job.status === 'on_the_way'} />
          )}

          {/* Time Tracking */}
          <TimeTracker jobId={job.id} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Job Pricing */}
          <JobPricing
            jobId={job.id}
            initialData={{
              labor_hours: job.labor_hours ?? undefined,
              labor_rate: job.labor_rate ?? undefined,
              parts_cost: job.parts_cost ?? undefined,
              total_cost: job.total_cost ?? undefined,
            }}
          />

          {/* Photo Upload - Proof of Work */}
          <PhotoUpload
            jobId={job.id}
            existingPhotos={job.media || []}
          />

          {/* Customer Signature */}
          <SignatureCapture
            jobId={job.id}
            existingSignature={job.customer_signature}
          />
        </div>
      </div>

      {/* Full Width Section */}
      <div className="mt-6">
        {/* Job Notes */}
        <JobNotes jobId={job.id} />
      </div>
    </div>
  )
}
