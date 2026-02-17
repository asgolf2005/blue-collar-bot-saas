'use client'

import { useState, useMemo } from 'react'
import type { JobWithDetails } from '@/lib/types'

const timePeriods = [
  { key: 'today', label: 'Today', days: 0 },
  { key: 'week', label: 'This Week', days: 7 },
  { key: 'month', label: 'This Month', days: 30 },
] as const

interface JobsOverviewProps {
  jobs: JobWithDetails[]
}

export default function JobsOverview({ jobs }: JobsOverviewProps) {
  const [period, setPeriod] = useState<(typeof timePeriods)[number]['key']>('today')
  const activePeriod = timePeriods.find((p) => p.key === period) || timePeriods[0]

  const stats = useMemo(() => {
    const now = new Date()

    const isInPeriod = (dateString?: string | null) => {
      if (!dateString) return false
      const date = new Date(dateString)

      if (activePeriod.key === 'today') {
        return (
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth() &&
          date.getDate() === now.getDate()
        )
      } else if (activePeriod.key === 'week') {
        const weekAgo = new Date(now)
        weekAgo.setDate(now.getDate() - 7)
        return date >= weekAgo && date <= now
      } else {
        const monthAgo = new Date(now)
        monthAgo.setDate(now.getDate() - 30)
        return date >= monthAgo && date <= now
      }
    }

    const periodJobs = jobs.filter((job) => isInPeriod(job.scheduled_start))
    const unassigned = periodJobs.filter((job) => !job.technician_id)
    const inProgress = periodJobs.filter((job) =>
      ['on_the_way', 'arrived', 'in_progress'].includes(job.status)
    )
    const overdue = jobs.filter((job) => {
      if (!job.scheduled_start) return false
      if (['completed', 'cancelled'].includes(job.status)) return false
      return new Date(job.scheduled_start) < now
    })

    return {
      scheduled: periodJobs.length,
      unassigned: unassigned.length,
      inProgress: inProgress.length,
      overdue: overdue.length,
    }
  }, [jobs, activePeriod.key])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-widest">
          {activePeriod.label}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted mr-2">{stats.scheduled} jobs scheduled</span>
          <div className="flex rounded-full border-2 border-surface-200 bg-surface-50 p-1">
            {timePeriods.map((item) => (
              <button type="button"
                key={item.key}
                onClick={() => setPeriod(item.key)}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
                  item.key === period
                    ? 'bg-white text-ink shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="clean-card p-5">
          <div className="text-xs text-muted uppercase tracking-widest">Scheduled</div>
          <div className="text-2xl font-bold text-ink mt-2">{stats.scheduled}</div>
          <div className="text-sm text-muted mt-2">Jobs on the calendar</div>
        </div>
        <div className="clean-card p-5">
          <div className="text-xs text-muted uppercase tracking-widest">Unassigned</div>
          <div className="text-2xl font-bold text-ink mt-2">{stats.unassigned}</div>
          <div className="text-sm text-muted mt-2">Need a technician</div>
        </div>
        <div className="clean-card p-5">
          <div className="text-xs text-muted uppercase tracking-widest">In Progress</div>
          <div className="text-2xl font-bold text-ink mt-2">{stats.inProgress}</div>
          <div className="text-sm text-muted mt-2">On the road or active</div>
        </div>
        <div className="clean-card p-5">
          <div className="text-xs text-muted uppercase tracking-widest">Overdue</div>
          <div className="text-2xl font-bold text-ink mt-2">{stats.overdue}</div>
          <div className="text-sm text-muted mt-2">Past start time</div>
        </div>
      </div>
    </div>
  )
}
