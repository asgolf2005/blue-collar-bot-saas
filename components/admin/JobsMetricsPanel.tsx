'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Calendar, CheckCircle2, MapPin, PlayCircle } from '@/components/ui/icons'

type StatusKey = 'scheduled' | 'on_the_way' | 'in_progress' | 'completed'

interface JobSummary {
  id: string
  scheduled_start: string
  customer?: {
    name: string
  }
  technician?: {
    full_name: string
  }
}

export function JobsMetricsPanel({
  jobsByStatus,
}: {
  jobsByStatus: Record<StatusKey, JobSummary[]>
}) {
  const [expandedStatus, setExpandedStatus] = useState<StatusKey | null>(null)

  const labels: Record<StatusKey, string> = {
    scheduled: 'SCHEDULED',
    on_the_way: 'EN ROUTE',
    in_progress: 'IN PROGRESS',
    completed: 'COMPLETED',
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label={labels.scheduled}
          value={jobsByStatus.scheduled.length}
          icon={Calendar}
          color="cyan"
          onClick={() => setExpandedStatus(expandedStatus === 'scheduled' ? null : 'scheduled')}
          isExpanded={expandedStatus === 'scheduled'}
        />
        <MetricCard
          label={labels.on_the_way}
          value={jobsByStatus.on_the_way.length}
          icon={MapPin}
          color="amber"
          onClick={() => setExpandedStatus(expandedStatus === 'on_the_way' ? null : 'on_the_way')}
          isExpanded={expandedStatus === 'on_the_way'}
        />
        <MetricCard
          label={labels.in_progress}
          value={jobsByStatus.in_progress.length}
          icon={PlayCircle}
          color="blue"
          onClick={() => setExpandedStatus(expandedStatus === 'in_progress' ? null : 'in_progress')}
          isExpanded={expandedStatus === 'in_progress'}
        />
        <MetricCard
          label={labels.completed}
          value={jobsByStatus.completed.length}
          icon={CheckCircle2}
          color="emerald"
          onClick={() => setExpandedStatus(expandedStatus === 'completed' ? null : 'completed')}
          isExpanded={expandedStatus === 'completed'}
        />
      </div>

      {expandedStatus && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg text-slate-900 dark:text-white tracking-wide">
              {labels[expandedStatus]} JOBS
            </h3>
            <button
              type="button"
              onClick={() => setExpandedStatus(null)}
              className="font-mono text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {jobsByStatus[expandedStatus].map((job) => (
              <Link
                key={job.id}
                href={`/admin/jobs/${job.id}`}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-cyan-500 transition-colors"
              >
                {(() => {
                  const scheduled = new Date(job.scheduled_start)
                  return (
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {scheduled.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="font-mono text-sm text-slate-900 dark:text-white tabular-nums">
                        {scheduled.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                  )
                })()}
                <div className="font-mono text-xs text-slate-600 dark:text-slate-400 mt-1 truncate">
                  {job.customer?.name || 'Unknown'}
                </div>
                <div className="font-mono text-[10px] text-slate-500 dark:text-slate-500 mt-0.5 truncate">
                  {job.technician?.full_name || 'Unassigned'}
                </div>
              </Link>
            ))}
            {jobsByStatus[expandedStatus].length === 0 && (
              <p className="font-mono text-xs text-slate-500 col-span-full">No jobs in this status.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  onClick,
  isExpanded,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
  onClick: () => void
  isExpanded: boolean
}) {
  const colors: Record<string, { light: string; dark: string }> = {
    cyan: { light: 'text-cyan-600', dark: 'dark:text-cyan-400' },
    amber: { light: 'text-amber-600', dark: 'dark:text-amber-400' },
    blue: { light: 'text-blue-600', dark: 'dark:text-blue-400' },
    emerald: { light: 'text-emerald-600', dark: 'dark:text-emerald-400' },
  }
  const c = colors[color]

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-2xl border bg-white dark:bg-slate-900 p-5 transition-all ${
        isExpanded
          ? 'border-blue-500 dark:border-cyan-500 ring-1 ring-blue-500/40 dark:ring-cyan-500/40 shadow-[0_10px_24px_-18px_rgba(56,189,248,0.45)]'
          : 'border-slate-200 dark:border-slate-800 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
        <Icon className={`w-4 h-4 ${c.light} ${c.dark}`} />
      </div>
      <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{value}</p>
    </button>
  )
}

