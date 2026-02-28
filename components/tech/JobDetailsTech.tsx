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

function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string
  subtitle: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-3xl bg-white/40 shadow-sm ring-1 ring-slate-200/50 backdrop-blur-xl transition-all dark:bg-slate-900/40 dark:ring-slate-800/50"
    >
      <summary className="flex cursor-pointer items-center justify-between p-5 [&::-webkit-details-marker]:hidden">
        <div>
          <p className="font-bold text-slate-900 dark:text-slate-100">{title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <div className="rounded-full bg-slate-100 p-2 text-slate-500 transition-transform group-open:rotate-180 dark:bg-slate-800 dark:text-slate-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </summary>
      <div className="px-5 pb-5">{children}</div>
    </details>
  )
}

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
    <div className="pb-24">
      {/* Sticky Top Nav */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-white/70 px-4 py-3 backdrop-blur-2xl dark:border-slate-800/60 dark:bg-slate-950/70">
        <Link
          href="/tech/today"
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-700 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-cyan-400"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${statusDot[job.status] || statusDot.scheduled} shadow-[0_0_10px_currentColor]`} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Hero Customer Info */}
      <div className="px-4 pt-6">
        <h1 className="font-display-soft text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
          {job.customer?.name || 'Unknown Customer'}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5 font-medium">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {format(new Date(job.scheduled_start), 'EEE, MMM d')} at {format(new Date(job.scheduled_start), 'h:mm a')}
          </div>
          {job.urgency && job.urgency !== 'normal' && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-bold text-red-600 dark:bg-red-500/20 dark:text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              {job.urgency}
            </div>
          )}
        </div>

        {/* Spatial Metric Cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="overflow-hidden rounded-2xl bg-white/40 p-3 shadow-sm ring-1 ring-slate-200/50 backdrop-blur-xl dark:bg-slate-900/40 dark:ring-slate-800/50">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Time</p>
            <p className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
              {format(new Date(job.scheduled_start), 'h:mm a')}
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl bg-white/40 p-3 shadow-sm ring-1 ring-slate-200/50 backdrop-blur-xl dark:bg-slate-900/40 dark:ring-slate-800/50">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Value</p>
            <p className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-cyan-400">
              {typeof job.total_cost === 'number' ? `$${job.total_cost.toFixed(2)}` : '--'}
            </p>
          </div>
        </div>

        {/* Job Description */}
        {job.description && (
          <div className="mt-4 overflow-hidden rounded-2xl bg-cyan-50/50 p-4 shadow-sm ring-1 ring-cyan-100/50 backdrop-blur-xl dark:bg-cyan-950/20 dark:ring-cyan-900/30">
            <p className="text-sm font-medium leading-relaxed text-slate-700 dark:text-cyan-100/80">
              {job.description}
            </p>
          </div>
        )}
      </div>

      {/* Main Action & Data Sections */}
      <div className="mt-8 space-y-6 px-4">
        <CollapsibleSection title="Job Actions" subtitle="Update status and workflow controls" defaultOpen>
          <StatusButtons
            jobId={job.id}
            currentStatus={job.status}
            customerAddress={customerAddress || undefined}
            onGetDirections={canOpenDirections ? () => setIsDirectionsOpen(true) : undefined}
          />
        </CollapsibleSection>

        {job.customer && (
          <CollapsibleSection title="Customer Details" subtitle="Contact info, address and map">
            <CustomerDetailsCard
              customer={job.customer}
              showMap={true}
              onGetDirections={canOpenDirections ? () => setIsDirectionsOpen(true) : undefined}
            />
          </CollapsibleSection>
        )}

        <CollapsibleSection title="Live Location" subtitle="Share GPS updates while en route">
          <LocationSharing jobId={job.id} autoStart={job.status === 'on_the_way'} />
        </CollapsibleSection>

        <CollapsibleSection title="Time Tracking" subtitle="Clock in/out and review session history">
          <TimeTracker jobId={job.id} />
        </CollapsibleSection>

        <JobPricing
          jobId={job.id}
          initialData={{
            labor_hours: job.labor_hours ?? undefined,
            labor_rate: job.labor_rate ?? undefined,
            parts_cost: job.parts_cost ?? undefined,
            total_cost: job.total_cost ?? undefined,
          }}
        />

        <details className="group overflow-hidden rounded-3xl bg-white/40 shadow-sm ring-1 ring-slate-200/50 backdrop-blur-xl transition-all dark:bg-slate-900/40 dark:ring-slate-800/50">
          <summary className="flex cursor-pointer items-center justify-between p-5">
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100">Proof of Work</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Upload photos & media</p>
            </div>
            <div className="rounded-full bg-slate-100 p-2 text-slate-500 transition-transform group-open:rotate-180 dark:bg-slate-800 dark:text-slate-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </summary>
          <div className="px-5 pb-5">
            <PhotoUpload jobId={job.id} existingPhotos={job.media || []} />
          </div>
        </details>

        <details className="group overflow-hidden rounded-3xl bg-white/40 shadow-sm ring-1 ring-slate-200/50 backdrop-blur-xl transition-all dark:bg-slate-900/40 dark:ring-slate-800/50">
          <summary className="flex cursor-pointer items-center justify-between p-5">
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100">Customer Signature</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Capture final sign-off</p>
            </div>
            <div className="rounded-full bg-slate-100 p-2 text-slate-500 transition-transform group-open:rotate-180 dark:bg-slate-800 dark:text-slate-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </summary>
          <div className="px-5 pb-5">
            <SignatureCapture jobId={job.id} existingSignature={job.customer_signature} />
          </div>
        </details>

        <CollapsibleSection title="Notes & Activity" subtitle="Internal notes and customer-visible updates" defaultOpen>
          <JobNotes jobId={job.id} embedded />
        </CollapsibleSection>

        <CollapsibleSection title="AI Troubleshoot" subtitle="Diagnostics assistant for on-site issues">
          <TroubleshootChat jobId={job.id} />
        </CollapsibleSection>
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
