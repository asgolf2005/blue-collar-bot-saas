'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { JobWithDetails } from '@/lib/types'
import { ADMIN_RANGE_OPTIONS, getRangeLookbackDays, type DateRangeKey } from '@/lib/analytics/dateUtils'
import { ADMIN_RANGE_TRACK_CLASS, adminRangeItemClass } from '@/lib/ui/admin-range'

const stages = [
  { key: 'scheduled', label: 'Scheduled', tone: 'text-primary' },
  { key: 'on_the_way', label: 'On the way', tone: 'text-info' },
  { key: 'in_progress', label: 'In progress', tone: 'text-warning' },
  { key: 'completed', label: 'Completed', tone: 'text-success' },
  { key: 'cancelled', label: 'Cancelled', tone: 'text-muted' },
] as const

export default function JobPipelineCard({ jobs }: { jobs: JobWithDetails[] }) {
  const [rangeKey, setRangeKey] = useState<DateRangeKey>('30d')
  const activeRange = ADMIN_RANGE_OPTIONS.find((item) => item.key === rangeKey) || ADMIN_RANGE_OPTIONS[2]

  const filteredJobs = useMemo(() => {
    if (activeRange.key === 'all') return jobs
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - getRangeLookbackDays(activeRange.key))

    return jobs.filter((job) => job.scheduled_start && new Date(job.scheduled_start) >= cutoff)
  }, [activeRange.key, jobs])

  return (
    <div className="clean-card">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-semibold text-ink">Job Pipeline</h2>
          <p className="text-sm text-muted">
            {activeRange.key === 'all'
              ? 'Status breakdown for all scheduled jobs'
              : `Status breakdown for the last ${getRangeLookbackDays(activeRange.key)} days`}
          </p>
        </div>
        <div className={ADMIN_RANGE_TRACK_CLASS}>
          {ADMIN_RANGE_OPTIONS.map((item) => (
            <button type="button"
              key={item.key}
              onClick={() => setRangeKey(item.key)}
              className={adminRangeItemClass(item.key === rangeKey)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {stages.map((stage) => {
          const stageJobs = filteredJobs.filter((job) => job.status === stage.key)
          return (
            <Link
              key={stage.key}
              href={stageJobs.length > 0 ? `/admin/jobs?status=${stage.key}` : '#'}
              className={`block rounded-lg border border-surface-200 bg-gradient-to-br from-white to-surface-50 p-4 transition ${
                stageJobs.length > 0
                  ? 'hover:border-primary/30 hover:shadow-md cursor-pointer'
                  : 'cursor-default'
              }`}
            >
              <div className={`text-xs font-bold uppercase tracking-wider ${stage.tone} truncate`}>
                {stage.label}
              </div>
              <div className="text-3xl font-bold text-ink mt-2">{stageJobs.length}</div>
              {stageJobs.length === 0 && (
                <div className="text-xs text-muted mt-2">Empty</div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
