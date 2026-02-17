'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import type { JobWithDetails } from '@/lib/types'

const ranges = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
] as const

const stages = [
  { key: 'scheduled', label: 'Scheduled', tone: 'text-primary' },
  { key: 'on_the_way', label: 'On the way', tone: 'text-info' },
  { key: 'in_progress', label: 'In progress', tone: 'text-warning' },
  { key: 'completed', label: 'Completed', tone: 'text-success' },
  { key: 'cancelled', label: 'Cancelled', tone: 'text-muted' },
] as const

export default function JobPipelineCard({ jobs }: { jobs: JobWithDetails[] }) {
  const [rangeKey, setRangeKey] = useState<(typeof ranges)[number]['key']>('30d')
  const activeRange = ranges.find((item) => item.key === rangeKey) || ranges[1]

  const filteredJobs = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - activeRange.days)

    return jobs.filter((job) => job.scheduled_start && new Date(job.scheduled_start) >= cutoff)
  }, [activeRange.days, jobs])

  return (
    <div className="clean-card">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-semibold text-ink">Job Pipeline</h2>
          <p className="text-sm text-muted">Status breakdown for the last {activeRange.days} days</p>
        </div>
        <div className="flex rounded-full border-2 border-surface-200 bg-surface-50 p-1">
          {ranges.map((item) => (
            <button type="button"
              key={item.key}
              onClick={() => setRangeKey(item.key)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition ${
                item.key === rangeKey
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
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
              className={`block rounded-2xl border-2 border-surface-200 bg-gradient-to-br from-white to-surface-50 p-4 transition ${
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
