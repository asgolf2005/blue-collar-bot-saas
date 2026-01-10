'use client'

import { format } from 'date-fns'
import { Calendar, Navigation, MapPin, Wrench, CheckCircle, XCircle } from 'lucide-react'
import type { JobStatus } from '@/lib/types'

interface TimelineStep {
  status: JobStatus
  label: string
  icon: React.ComponentType<{ className?: string }>
  timestamp?: string
}

interface JobStatusTimelineProps {
  currentStatus: JobStatus
  scheduledStart: string
  timestamps?: {
    scheduled?: string
    on_the_way?: string
    arrived?: string
    in_progress?: string
    completed?: string
    cancelled?: string
  }
  variant?: 'vertical' | 'horizontal'
}

export default function JobStatusTimeline({
  currentStatus,
  scheduledStart,
  timestamps = {},
  variant = 'vertical'
}: JobStatusTimelineProps) {
  const allSteps: TimelineStep[] = [
    { status: 'scheduled', label: 'Scheduled', icon: Calendar },
    { status: 'on_the_way', label: 'On the Way', icon: Navigation },
    { status: 'arrived', label: 'Arrived', icon: MapPin },
    { status: 'in_progress', label: 'In Progress', icon: Wrench },
    { status: 'completed', label: 'Completed', icon: CheckCircle },
  ]

  const statusOrder: JobStatus[] = ['scheduled', 'on_the_way', 'arrived', 'in_progress', 'completed']
  const currentIndex = currentStatus === 'cancelled' ? -1 : statusOrder.indexOf(currentStatus)

  const getStepState = (stepIndex: number) => {
    if (currentStatus === 'cancelled') {
      return stepIndex === 0 ? 'cancelled' : 'upcoming'
    }
    if (stepIndex < currentIndex) return 'completed'
    if (stepIndex === currentIndex) return 'current'
    return 'upcoming'
  }

  const getTimestamp = (status: JobStatus) => {
    if (status === 'scheduled') return scheduledStart
    return timestamps[status as keyof typeof timestamps]
  }

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return null
    try {
      return format(new Date(timestamp), 'MMM d, h:mm a')
    } catch {
      return null
    }
  }

  // Horizontal variant
  if (variant === 'horizontal') {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between relative">
          {/* Progress Line */}
          <div className="absolute left-0 right-0 top-5 h-1 bg-surface-200 -z-10" />
          <div
            className="absolute left-0 top-5 h-1 bg-primary transition-all duration-500 -z-10"
            style={{ width: currentStatus === 'cancelled' ? '0%' : `${(currentIndex / (allSteps.length - 1)) * 100}%` }}
          />

          {allSteps.map((step, index) => {
            const state = getStepState(index)
            const Icon = step.icon
            const timestamp = formatTimestamp(getTimestamp(step.status))

            return (
              <div key={step.status} className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    state === 'completed'
                      ? 'bg-primary border-primary text-white'
                      : state === 'current'
                      ? 'bg-white border-primary text-primary ring-4 ring-primary/15'
                      : state === 'cancelled'
                      ? 'bg-danger/10 border-danger/40 text-danger'
                      : 'bg-white border-surface-200 text-muted'
                  }`}
                >
                  {state === 'completed' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={`text-xs font-medium ${
                      state === 'current'
                        ? 'text-primary'
                      : state === 'completed'
                        ? 'text-ink'
                        : 'text-muted'
                    }`}
                  >
                    {step.label}
                  </p>
                  {timestamp && (
                    <p className="text-xs text-muted mt-0.5">{timestamp}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Vertical variant (default)
  return (
    <div className="relative">
      {allSteps.map((step, index) => {
        const state = getStepState(index)
        const Icon = step.icon
        const timestamp = formatTimestamp(getTimestamp(step.status))
        const isLast = index === allSteps.length - 1

        return (
          <div key={step.status} className="flex items-start">
            {/* Icon and Line */}
            <div className="flex flex-col items-center mr-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  state === 'completed'
                    ? 'bg-primary border-primary text-white'
                    : state === 'current'
                    ? 'bg-white border-primary text-primary ring-4 ring-primary/15'
                    : state === 'cancelled'
                    ? 'bg-danger/10 border-danger/40 text-danger'
                    : 'bg-white border-surface-200 text-muted'
                }`}
              >
                {state === 'completed' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : currentStatus === 'cancelled' && index === 0 ? (
                  <XCircle className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 h-12 ${
                    state === 'completed' ? 'bg-primary' : 'bg-surface-200'
                  }`}
                />
              )}
            </div>

            {/* Content */}
            <div className={`pb-8 ${isLast ? 'pb-0' : ''}`}>
              <div className="flex items-center">
                <h4
                  className={`font-medium ${
                    state === 'current'
                      ? 'text-primary'
                    : state === 'completed'
                      ? 'text-ink'
                      : 'text-muted'
                  }`}
                >
                  {step.label}
                </h4>
                {state === 'current' && (
                  <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                    Current
                  </span>
                )}
              </div>
              {timestamp && (
                <p className="text-sm text-muted mt-1">{timestamp}</p>
              )}
              {state === 'upcoming' && !timestamp && (
                <p className="text-sm text-muted mt-1 italic">Pending</p>
              )}
            </div>
          </div>
        )
      })}

      {/* Cancelled State */}
      {currentStatus === 'cancelled' && (
        <div className="flex items-start mt-4">
          <div className="flex flex-col items-center mr-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-danger/10 border-2 border-danger/40 text-danger">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h4 className="font-medium text-danger">Cancelled</h4>
            {timestamps.cancelled && (
              <p className="text-sm text-muted mt-1">
                {formatTimestamp(timestamps.cancelled)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
