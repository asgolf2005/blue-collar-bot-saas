'use client'

import { useState } from 'react'
import { 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Calendar,
  X,
  User,
  DollarSign,
  MapPin
} from '@/components/ui/lucide'

interface JobDetail {
  id: string
  time: string
  technician: string
  service: string
  amount: number
  status: 'done' | 'active' | 'soon'
  location?: string
}

interface DailyBreakdownProps {
  date: string
  displayDate: string
  revenue: number
  jobCount: number
  hours: number
  jobs: JobDetail[]
  onClose: () => void
}

const statusConfig = {
  done: {
    label: 'Done',
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-400/10',
    border: 'border-emerald-200 dark:border-emerald-400/20',
  },
  active: {
    label: 'Active',
    icon: ArrowRight,
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-400/10',
    border: 'border-cyan-200 dark:border-cyan-400/20',
  },
  soon: {
    label: 'Soon',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-400/10',
    border: 'border-amber-200 dark:border-amber-400/20',
  },
}

export default function DailyBreakdown({
  date,
  displayDate,
  revenue,
  jobCount,
  hours,
  jobs,
  onClose,
}: DailyBreakdownProps) {
  const [filter, setFilter] = useState<'all' | 'done' | 'active' | 'soon'>('all')
  const [selectedJob, setSelectedJob] = useState<string | null>(null)

  const filteredJobs = filter === 'all' 
    ? jobs 
    : jobs.filter(j => j.status === filter)

  const completedCount = jobs.filter(j => j.status === 'done').length

  return (
    <div className="admin-card overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-400/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h2 className="admin-section-title">
              DAILY BREAKDOWN
            </h2>
            <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
              {displayDate}
            </p>
          </div>
        </div>
        <button type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 p-5 border-b border-slate-200 dark:border-slate-800">
        <div className="text-center">
          <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Revenue</p>
          <p className="font-display text-2xl text-emerald-600 dark:text-emerald-400 mt-1">
            ${revenue.toLocaleString()}
          </p>
        </div>
        <div className="text-center border-x border-slate-200 dark:border-slate-800">
          <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Jobs</p>
          <p className="font-display text-2xl text-cyan-600 dark:text-cyan-400 mt-1">
            {jobCount}
          </p>
          <p className="font-mono text-[10px] text-slate-400">{completedCount} completed</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hours</p>
          <p className="font-display text-2xl text-amber-600 dark:text-amber-400 mt-1">
            {hours}
          </p>
          <p className="font-mono text-[10px] text-slate-400">Total Time</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-3 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {(['all', 'done', 'active', 'soon'] as const).map((f) => (
          <button type="button"
            key={f}
            onClick={() => setFilter(f)}
            className={`
              px-3 py-1.5 rounded-lg font-mono text-xs capitalize whitespace-nowrap transition-colors
              ${filter === f 
                ? 'bg-cyan-100 dark:bg-cyan-400/20 text-cyan-700 dark:text-cyan-300' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }
            `}
          >
            {f === 'all' ? 'All Jobs' : f}
            {f !== 'all' && (
              <span className="ml-1.5 text-[10px] opacity-70">
                ({jobs.filter(j => j.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Job List */}
      <div className="max-h-[400px] overflow-y-auto p-3 space-y-2">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-8">
            <p className="font-mono text-sm text-slate-500 dark:text-slate-400">
              No {filter !== 'all' ? filter : ''} jobs for this day
            </p>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const config = statusConfig[job.status]
            const StatusIcon = config.icon
            
            return (
              <div
                key={job.id}
                onClick={() => setSelectedJob(selectedJob === job.id ? null : job.id)}
                className={`
                  p-3 rounded-xl border transition-all cursor-pointer
                  ${selectedJob === job.id 
                    ? `${config.bg} ${config.border} ring-1 ring-offset-0` 
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  {/* Time */}
                  <div className="w-16 text-center">
                    <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                      {job.time}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <p className="font-mono text-sm text-slate-900 dark:text-white truncate">
                        {job.technician}
                      </p>
                    </div>
                    <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {job.service}
                    </p>
                  </div>

                  {/* Amount & Status */}
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <DollarSign className="w-3 h-3 text-slate-400" />
                      <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                        {job.amount}
                      </p>
                    </div>
                    <div className={`
                      flex items-center gap-1 justify-end mt-1 px-2 py-0.5 rounded-full ${config.bg}
                    `}>
                      <StatusIcon className={`w-3 h-3 ${config.color}`} />
                      <span className={`font-mono text-[10px] ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedJob === job.id && job.location && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="font-mono text-xs">{job.location}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button className="flex-1 py-2 bg-cyan-100 dark:bg-cyan-400/20 text-cyan-700 dark:text-cyan-300 rounded-lg font-mono text-xs hover:bg-cyan-200 dark:hover:bg-cyan-400/30 transition-colors">
                        View Job
                      </button>
                      <button className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-mono text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        Edit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}



