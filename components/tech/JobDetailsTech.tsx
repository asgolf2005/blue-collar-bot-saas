'use client'

import { JobWithDetails } from '@/lib/types'
import { useState } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import StatusButtons from './StatusButtons'
import JobPricing from './JobPricing'
import TimeTracker from './TimeTracker'
import PhotoUpload from './PhotoUpload'
import SignatureCapture from './SignatureCapture'
import JobNotes from './JobNotes'
import CustomerDetailsCard from './CustomerDetailsCard'
import LocationSharing from './LocationSharing'
import TroubleshootChat from './TroubleshootChat'
import DirectionsPanel from './DirectionsPanel'

export default function JobDetailsTech({ job }: { job: JobWithDetails }) {
  const [isDirectionsOpen, setIsDirectionsOpen] = useState(false)

  const statusDot: Record<string, string> = {
    scheduled: 'bg-blue-500',
    on_the_way: 'bg-cyan-500',
    arrived: 'bg-violet-500',
    in_progress: 'bg-amber-500',
    completed: 'bg-emerald-500',
    cancelled: 'bg-slate-400 dark:bg-slate-500',
  }

  const statusLabel = job.status.replace(/_/g, ' ')
  const customerAddress = job.customer?.address?.trim() || ''
  const canOpenDirections = customerAddress.length > 0

  return (
    <div>
      {/* Back Link */}
      <Link
        href="/tech/today"
        className="mb-4 inline-flex items-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
      >
        Back to Today
      </Link>

      {/* Job Header Card */}
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.14),transparent_50%)] dark:opacity-80 dark:[background:radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.18),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-20 [background:linear-gradient(to_right,rgba(15,23,42,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.07)_1px,transparent_1px)] [background-size:28px_28px] dark:opacity-15 dark:[background:linear-gradient(to_right,rgba(148,163,184,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.10)_1px,transparent_1px)]" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`h-2.5 w-2.5 rounded-full ${statusDot[job.status] || statusDot.scheduled}`} aria-hidden="true" />
              <h1 className="min-w-0 truncate font-display-soft text-3xl tracking-wide text-slate-900 dark:text-white">
                {job.customer?.name || 'Unknown Customer'}
              </h1>
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {statusLabel}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
              <div>
                {format(new Date(job.scheduled_start), 'EEEE, MMMM d')} at {format(new Date(job.scheduled_start), 'h:mm a')}
              </div>
              {job.urgency && job.urgency !== 'normal' && (
                <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-200">
                  {job.urgency}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Job Description */}
        {job.description && (
          <div className="relative mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Job Description</div>
            <p className="text-sm text-slate-700 dark:text-slate-200">{job.description}</p>
          </div>
        )}
      </div>

      {/* Two Column Layout for larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Customer Details with Map */}
          {job.customer && (
            <CustomerDetailsCard
              customer={job.customer}
              showMap={true}
              onGetDirections={canOpenDirections ? () => setIsDirectionsOpen(true) : undefined}
            />
          )}

          {/* Status Update */}
          <StatusButtons
            jobId={job.id}
            currentStatus={job.status}
            customerAddress={customerAddress || undefined}
            onGetDirections={canOpenDirections ? () => setIsDirectionsOpen(true) : undefined}
          />

          {/* Location Sharing */}
          <LocationSharing
            jobId={job.id}
            autoStart={job.status === 'on_the_way'}
          />

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

          {/* Customer Signature (Optional) */}
          <details className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Customer signature</p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">Optional. Only capture if you need sign-off.</p>
              </div>
              <div className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="group-open:hidden">Show</span>
                <span className="hidden group-open:inline">Hide</span>
              </div>
            </summary>
            <div className="px-5 pb-5">
              <SignatureCapture jobId={job.id} existingSignature={job.customer_signature} />
            </div>
          </details>
        </div>
      </div>

      {/* Full Width Section */}
      <div className="mt-6">
        {/* Job Notes */}
        <JobNotes jobId={job.id} />

        <div className="mt-6">
          <TroubleshootChat jobId={job.id} />
        </div>
      </div>

      {canOpenDirections && (
        <DirectionsPanel
          isOpen={isDirectionsOpen}
          jobId={job.id}
          jobStatus={job.status}
          destinationAddress={customerAddress}
          customerName={job.customer?.name}
          onClose={() => setIsDirectionsOpen(false)}
        />
      )}
    </div>
  )
}
