'use client'

import { useState, useCallback, useEffect } from 'react'
import { 
  MapPin, 
  Clock, 
  Phone, 
  Navigation,
  CheckCircle2,
  Play,
  Briefcase,
  ChevronRight,
  AlertCircle,
  Menu
} from 'lucide-react'
import { useTechnicianJobsRealtime } from '@/hooks/useJobsRealtime'
import { RealtimeToastContainer, useRealtimeToasts } from '@/components/ui/RealtimeToast'
import type { Job, JobStatus } from '@/lib/types'

interface FieldViewProps {
  businessId: string
  technicianId: string
  technicianName: string
}

// Status configuration for visual indicators
const statusConfig: Record<JobStatus, { 
  label: string
  color: string
  bgColor: string
  icon: React.ReactNode 
}> = {
  scheduled: {
    label: 'Scheduled',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    icon: <Clock className="w-5 h-5" />,
  },
  on_the_way: {
    label: 'En Route',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    icon: <Navigation className="w-5 h-5" />,
  },
  arrived: {
    label: 'Arrived',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    icon: <MapPin className="w-5 h-5" />,
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    icon: <Play className="w-5 h-5" />,
  },
  completed: {
    label: 'Completed',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    icon: <CheckCircle2 className="w-5 h-5" />,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    icon: <AlertCircle className="w-5 h-5" />,
  },
}

// Action button configuration based on current status
const actionButtons: Record<JobStatus, { label: string; nextStatus: JobStatus; color: string }[]> = {
  scheduled: [
    { label: 'ARRIVE', nextStatus: 'arrived', color: 'bg-emerald-500 hover:bg-emerald-400' },
    { label: 'START', nextStatus: 'on_the_way', color: 'bg-amber-500 hover:bg-amber-400' },
  ],
  on_the_way: [
    { label: 'ARRIVE', nextStatus: 'arrived', color: 'bg-emerald-500 hover:bg-emerald-400' },
  ],
  arrived: [
    { label: 'START JOB', nextStatus: 'in_progress', color: 'bg-cyan-500 hover:bg-cyan-400' },
  ],
  in_progress: [
    { label: 'COMPLETE', nextStatus: 'completed', color: 'bg-emerald-500 hover:bg-emerald-400' },
  ],
  completed: [],
  cancelled: [],
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const diffMs = endDate.getTime() - startDate.getTime()
  const diffHrs = Math.round(diffMs / 3600000 * 10) / 10
  return `${diffHrs}h`
}

/**
 * CurrentJobCard - Large, touch-friendly card for active job
 */
function CurrentJobCard({ 
  job, 
  onStatusChange 
}: { 
  job: Job
  onStatusChange: (jobId: string, status: JobStatus) => void 
}) {
  const status = statusConfig[job.status]
  const actions = actionButtons[job.status]

  return (
    <div
      className="
        relative overflow-hidden rounded-2xl
        bg-gradient-to-br from-slate-800 to-slate-900
        border border-slate-700/50
        shadow-xl shadow-black/20
        animate-fade-in-up-300
      "
    >
      {/* Status Indicator Strip */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${status.bgColor.replace('/10', '')}`} />

      <div className="p-6">
        {/* Header: Status & Time */}
        <div className="flex items-center justify-between mb-4">
          <div className={`flex items-center gap-2 ${status.color}`}>
            {status.icon}
            <span className="text-sm font-semibold uppercase tracking-wider">
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">
              {formatTime(job.scheduled_start)}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-sm">
              {formatDuration(job.scheduled_start, job.scheduled_end)}
            </span>
          </div>
        </div>

        {/* Customer Info */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2 whitespace-normal break-words leading-tight">
            {job.customer?.name || 'Unknown Customer'}
          </h2>
          <div className="flex items-start gap-2 text-slate-400">
            <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-base whitespace-normal break-words leading-relaxed">
              {job.customer?.address || 'No address provided'}
            </p>
          </div>
          {job.customer?.phone && (
            <div className="flex items-center gap-2 text-slate-400 mt-2">
              <Phone className="w-4 h-4" />
              <a 
                href={`tel:${job.customer.phone}`}
                className="text-base text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {job.customer.phone}
              </a>
            </div>
          )}
        </div>

        {/* Job Description */}
        {job.description && (
          <div className="mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/30">
            <p className="text-sm text-slate-300 whitespace-normal break-words leading-relaxed">
              {job.description}
            </p>
          </div>
        )}

        {/* Action Buttons - Large touch targets (min 48px) */}
        <div className="flex gap-3">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={() => onStatusChange(job.id, action.nextStatus)}
              className={`
                flex-1 py-4 px-6 rounded-xl
                ${action.color}
                text-white font-bold text-base uppercase tracking-wider
                transition-all duration-300
                active:scale-95
                shadow-lg shadow-black/20
                min-h-[56px]
                flex items-center justify-center gap-2
              `}
            >
              {action.label}
            </button>
          ))}
          {actions.length === 0 && job.status === 'completed' && (
            <div className="flex-1 py-4 px-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-center">
              Job Completed
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * UpcomingJobCard - Compact card for upcoming jobs
 */
function UpcomingJobCard({ 
  job, 
  index 
}: { 
  job: Job
  index: number 
}) {
  return (
    <div
      className="
        flex items-center gap-4 p-4 rounded-xl
        bg-slate-800/50 border border-slate-700/30
        transition-all duration-300
        hover:bg-slate-800 hover:border-slate-600
        active:scale-[0.98]
        animate-fade-in-up-300
      "
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Time */}
      <div className="flex-shrink-0 w-16 text-center">
        <div className="text-lg font-bold text-white">
          {formatTime(job.scheduled_start)}
        </div>
        <div className="text-xs text-slate-500">
          {formatDuration(job.scheduled_start, job.scheduled_end)}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-slate-700" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold text-white whitespace-normal break-words leading-snug">
          {job.customer?.name || 'Unknown Customer'}
        </h3>
        <p className="text-sm text-slate-400 whitespace-normal break-words truncate">
          {job.customer?.address || 'No address'}
        </p>
      </div>

      {/* Arrow */}
      <ChevronRight className="w-5 h-5 text-slate-600 flex-shrink-0" />
    </div>
  )
}

/**
 * EmptyState - When no jobs scheduled
 */
function EmptyState() {
  return (
    <div
      className="
        flex flex-col items-center justify-center
        py-16 px-6 text-center
        animate-scale-in-300
      "
    >
      <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-6">
        <Briefcase className="w-10 h-10 text-slate-600" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">
        No Jobs Today
      </h3>
      <p className="text-base text-slate-400 whitespace-normal leading-relaxed max-w-xs">
        You don&apos;t have any jobs scheduled for today. Check back later or contact your dispatcher.
      </p>
    </div>
  )
}

/**
 * Header - Today's summary stats
 */
function FieldViewHeader({ 
  technicianName, 
  totalJobs, 
  completedJobs, 
  remainingJobs 
}: { 
  technicianName: string
  totalJobs: number
  completedJobs: number
  remainingJobs: number 
}) {
  return (
    <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      <div className="px-4 py-4">
        {/* Top Row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-sm text-slate-400 uppercase tracking-wider font-medium">
              Today&apos;s Jobs
            </h1>
            <p className="text-2xl font-bold text-white">
              {remainingJobs} remaining
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-white font-medium">{technicianName}</p>
              <p className="text-xs text-slate-500">
                {completedJobs}/{totalJobs} completed
              </p>
            </div>
            <button className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center">
              <Menu className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {totalJobs > 0 && (
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(completedJobs / totalJobs) * 100}%` }}
            />
          </div>
        )}
      </div>
    </header>
  )
}

/**
 * FieldView - Main mobile field technician view
 * 
 * Optimized for technicians in the field:
 * - Large touch targets (min 48px)
 * - Current job prominently displayed
 * - Upcoming jobs list below
 * - Real-time updates with toast notifications
 * - Swipe-friendly layout
 */
export function FieldView({ businessId, technicianId, technicianName }: FieldViewProps) {
  const { 
    todaysJobs, 
    currentJob, 
    upcomingJobs, 
    completedToday,
    isConnected,
    error,
    refetch 
  } = useTechnicianJobsRealtime(businessId, technicianId)
  
  const { toasts, dismissToast, showStatusChange } = useRealtimeToasts()
  const [isUpdating, setIsUpdating] = useState(false)

  // Handle status change
  const handleStatusChange = useCallback(async (jobId: string, newStatus: JobStatus) => {
    if (isUpdating) return
    
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      // Show confirmation toast
      showStatusChange(jobId, newStatus)
      
      // Refresh data
      await refetch()
    } catch (err) {
      console.error('Status update failed:', err)
    } finally {
      setIsUpdating(false)
    }
  }, [isUpdating, refetch, showStatusChange])

  const remainingJobs = todaysJobs.length - completedToday

  return (
    <div className="min-h-screen bg-slate-950">
      <FieldViewHeader
        technicianName={technicianName}
        totalJobs={todaysJobs.length}
        completedJobs={completedToday}
        remainingJobs={remainingJobs}
      />

      <main className="px-4 py-6 pb-24">
        {/* Connection Status */}
        {!isConnected && (
          <div
            className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 animate-fade-in-down"
          >
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-400 whitespace-normal">
              Offline mode. Changes will sync when connection is restored.
            </p>
          </div>
        )}

        {todaysJobs.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-6">
            {/* Current Active Job */}
            {currentJob && (
              <section>
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Current Job
                </h2>
                <CurrentJobCard
                  job={currentJob}
                  onStatusChange={handleStatusChange}
                />
              </section>
            )}

            {/* Upcoming Jobs */}
            {upcomingJobs.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Upcoming ({upcomingJobs.length})
                </h2>
                <div className="space-y-3">
                  {upcomingJobs.map((job, index) => (
                    <UpcomingJobCard
                      key={job.id}
                      job={job}
                      index={index}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Completed Jobs Summary */}
            {completedToday > 0 && (
              <section className="pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 animate-fade-in-up-300" style={{ animationDelay: '200ms' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {completedToday} job{completedToday !== 1 ? 's' : ''} completed
                      </p>
                      <p className="text-xs text-slate-500">
                        Great work today!
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Toast Notifications */}
      <RealtimeToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

export default FieldView
