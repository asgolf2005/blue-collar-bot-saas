'use client'

import { useMemo, useState } from 'react'
import type { JobWithDetails } from '@/lib/types'

const ranges = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
] as const

export default function TechnicianCoverageCard({
  jobs,
  technicians,
}: {
  jobs: JobWithDetails[]
  technicians: Array<{ id: string; full_name: string | null }>
}) {
  const [rangeKey, setRangeKey] = useState<(typeof ranges)[number]['key']>('30d')
  const activeRange = ranges.find((item) => item.key === rangeKey) || ranges[1]

  const { filteredJobs, techCounts } = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - activeRange.days)

    const inRange = jobs.filter((job) => job.scheduled_start && new Date(job.scheduled_start) >= cutoff)
    const counts = new Map<string, number>()

    inRange.forEach((job) => {
      if (!job.technician_id) return
      counts.set(job.technician_id, (counts.get(job.technician_id) || 0) + 1)
    })

    return { filteredJobs: inRange, techCounts: counts }
  }, [activeRange.days, jobs])

  const coverageList = useMemo(() => {
    return [...technicians]
      .map((tech) => ({
        id: tech.id,
        name: tech.full_name || 'Technician',
        count: techCounts.get(tech.id) || 0,
      }))
      .sort((a, b) => b.count - a.count)
  }, [technicians, techCounts])

  const maxCount = Math.max(1, ...coverageList.map((item) => item.count))
  const unassigned = filteredJobs.filter((job) => !job.technician_id).length

  return (
    <div className="clean-card">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-semibold text-ink">Technician Coverage</h2>
          <p className="text-sm text-muted">
            {filteredJobs.length} total jobs • {unassigned} unassigned
          </p>
        </div>
        <div className="flex rounded-full border-2 border-surface-200 bg-surface-50 p-1">
          {ranges.map((item) => (
            <button
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

      <div className="space-y-2.5">
        {coverageList.slice(0, 6).map((tech) => {
          const percentage = Math.round((tech.count / maxCount) * 100)
          return (
            <div
              key={tech.id}
              className="rounded-xl border-2 border-surface-200 bg-gradient-to-br from-white to-surface-50 px-4 py-3 transition hover:border-primary/30 hover:shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-ink">{tech.name}</span>
                <span className={`text-sm font-bold ${tech.count > 0 ? 'text-primary' : 'text-success'}`}>
                  {tech.count > 0 ? `${tech.count} jobs` : 'Available'}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-surface-200">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-primary to-primary-600 transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
        {coverageList.length === 0 && (
          <div className="text-sm text-muted">No technicians found</div>
        )}
      </div>
    </div>
  )
}
