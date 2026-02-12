'use client'

import { useCallback, useEffect, useMemo, useState, type DragEvent, type ElementType } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Building2,
  Calendar,
  CheckCircle2,
  Loader2,
  MapPin,
  PlayCircle,
  User,
} from 'lucide-react'
import { showToast } from '@/lib/utils/toast'

type PipelineStatus = 'scheduled' | 'on_the_way' | 'in_progress' | 'completed' | 'cancelled'

interface PipelineJob {
  id: string
  status: string
  scheduled_start: string | null
  customer?: { name?: string | null } | null
  technician?: { full_name?: string | null } | null
}

interface JobsPipelineBoardProps {
  jobs: PipelineJob[]
}

const PIPELINE_STATUSES: PipelineStatus[] = [
  'scheduled',
  'on_the_way',
  'in_progress',
  'completed',
  'cancelled',
]

const STATUS_META: Record<
  PipelineStatus,
  {
    title: string
    color: 'cyan' | 'amber' | 'blue' | 'emerald' | 'slate'
    icon: ElementType
  }
> = {
  scheduled: { title: 'SCHEDULED', color: 'cyan', icon: Calendar },
  on_the_way: { title: 'EN ROUTE', color: 'amber', icon: MapPin },
  in_progress: { title: 'IN PROGRESS', color: 'blue', icon: PlayCircle },
  completed: { title: 'COMPLETED', color: 'emerald', icon: CheckCircle2 },
  cancelled: { title: 'CANCELLED', color: 'slate', icon: CheckCircle2 },
}

function normalizeStatus(status: string): PipelineStatus {
  if (status === 'arrived' || status === 'in_progress') return 'in_progress'
  if (status === 'on_the_way') return 'on_the_way'
  if (status === 'completed') return 'completed'
  if (status === 'cancelled') return 'cancelled'
  return 'scheduled'
}

function sortByScheduledTimeAsc(a: PipelineJob, b: PipelineJob): number {
  const aTime = a.scheduled_start ? new Date(a.scheduled_start).getTime() : 0
  const bTime = b.scheduled_start ? new Date(b.scheduled_start).getTime() : 0
  return aTime - bTime
}

function buildGroupedJobs(jobs: PipelineJob[]): Record<PipelineStatus, PipelineJob[]> {
  const grouped: Record<PipelineStatus, PipelineJob[]> = {
    scheduled: [],
    on_the_way: [],
    in_progress: [],
    completed: [],
    cancelled: [],
  }

  for (const job of jobs) {
    grouped[normalizeStatus(job.status)].push(job)
  }

  for (const status of PIPELINE_STATUSES) {
    grouped[status].sort(sortByScheduledTimeAsc)
  }

  return grouped
}

function parseDropPayload(raw: string): { jobId: string; fromStatus: PipelineStatus } | null {
  try {
    const parsed = JSON.parse(raw) as { jobId?: string; fromStatus?: string }
    if (!parsed.jobId || !parsed.fromStatus) return null
    if (!PIPELINE_STATUSES.includes(parsed.fromStatus as PipelineStatus)) return null
    return { jobId: parsed.jobId, fromStatus: parsed.fromStatus as PipelineStatus }
  } catch {
    return null
  }
}

export function JobsPipelineBoard({ jobs }: JobsPipelineBoardProps) {
  const groupedFromServer = useMemo(() => buildGroupedJobs(jobs), [jobs])
  const [jobsByStatus, setJobsByStatus] = useState(groupedFromServer)
  const [dragOverStatus, setDragOverStatus] = useState<PipelineStatus | null>(null)
  const [dragging, setDragging] = useState<{ jobId: string; fromStatus: PipelineStatus } | null>(null)
  const [pendingJobIds, setPendingJobIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setJobsByStatus(groupedFromServer)
  }, [groupedFromServer])

  const moveJobState = useCallback((jobId: string, fromStatus: PipelineStatus, toStatus: PipelineStatus) => {
    setJobsByStatus((prev) => {
      if (fromStatus === toStatus) return prev

      const sourceJobs = [...prev[fromStatus]]
      const sourceIndex = sourceJobs.findIndex((job) => job.id === jobId)
      if (sourceIndex === -1) return prev

      const [job] = sourceJobs.splice(sourceIndex, 1)
      const targetJobs = [...prev[toStatus], { ...job, status: toStatus }].sort(sortByScheduledTimeAsc)

      return {
        ...prev,
        [fromStatus]: sourceJobs,
        [toStatus]: targetJobs,
      }
    })
  }, [])

  const persistStatusChange = useCallback(
    async ({
      jobId,
      fromStatus,
      toStatus,
      withUndo,
    }: {
      jobId: string
      fromStatus: PipelineStatus
      toStatus: PipelineStatus
      withUndo: boolean
    }) => {
      if (fromStatus === toStatus) return

      moveJobState(jobId, fromStatus, toStatus)
      setPendingJobIds((prev) => {
        const next = new Set(prev)
        next.add(jobId)
        return next
      })

      try {
        const response = await fetch('/api/jobs/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, status: toStatus }),
        })

        if (!response.ok) {
          const payloadError = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(payloadError?.error || 'Failed to update job status')
        }

        const movedLabel = STATUS_META[toStatus].title.toLowerCase()
        if (withUndo) {
          showToast.withAction(
            `Job moved to ${movedLabel}`,
            {
              label: 'Undo',
              onClick: () => {
                void persistStatusChange({
                  jobId,
                  fromStatus: toStatus,
                  toStatus: fromStatus,
                  withUndo: false,
                })
              },
            },
            'info'
          )
        } else {
          showToast.success(`Job moved to ${movedLabel}`)
        }
      } catch (error) {
        moveJobState(jobId, toStatus, fromStatus)
        showToast.error(error instanceof Error ? error.message : 'Failed to update job status')
      } finally {
        setPendingJobIds((prev) => {
          const next = new Set(prev)
          next.delete(jobId)
          return next
        })
      }
    },
    [moveJobState]
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
      {PIPELINE_STATUSES.map((statusKey) => {
        const meta = STATUS_META[statusKey]
        return (
          <PipelineColumn
            key={statusKey}
            title={meta.title}
            count={jobsByStatus[statusKey].length}
            color={meta.color}
            icon={meta.icon}
            jobs={jobsByStatus[statusKey]}
            dragOver={dragOverStatus === statusKey}
            pendingJobIds={pendingJobIds}
            onCardDragStart={(jobId, fromStatus, event) => {
              const payload = JSON.stringify({ jobId, fromStatus })
              event.dataTransfer.setData('application/x-job-pipeline', payload)
              event.dataTransfer.effectAllowed = 'move'
              setDragging({ jobId, fromStatus })
            }}
            onCardDragEnd={() => {
              setDragging(null)
              setDragOverStatus(null)
            }}
            onColumnDragOver={(event) => {
              event.preventDefault()
              if (dragging) setDragOverStatus(statusKey)
            }}
            onColumnDragLeave={() => setDragOverStatus((current) => (current === statusKey ? null : current))}
            onColumnDrop={(event) => {
              event.preventDefault()
              const fromTransfer = parseDropPayload(event.dataTransfer.getData('application/x-job-pipeline'))
              const payload = fromTransfer || dragging
              setDragOverStatus(null)
              setDragging(null)
              if (payload) {
                void persistStatusChange({
                  jobId: payload.jobId,
                  fromStatus: payload.fromStatus,
                  toStatus: statusKey,
                  withUndo: true,
                })
              }
            }}
          />
        )
      })}
    </div>
  )
}

function PipelineColumn({
  title,
  count,
  color,
  icon: Icon,
  jobs,
  dragOver,
  pendingJobIds,
  onCardDragStart,
  onCardDragEnd,
  onColumnDragOver,
  onColumnDragLeave,
  onColumnDrop,
}: {
  title: string
  count: number
  color: 'cyan' | 'amber' | 'blue' | 'emerald' | 'slate'
  icon: ElementType
  jobs: PipelineJob[]
  dragOver: boolean
  pendingJobIds: Set<string>
  onCardDragStart: (jobId: string, fromStatus: PipelineStatus, event: DragEvent<HTMLDivElement>) => void
  onCardDragEnd: () => void
  onColumnDragOver: (event: DragEvent<HTMLDivElement>) => void
  onColumnDragLeave: () => void
  onColumnDrop: (event: DragEvent<HTMLDivElement>) => void
}) {
  const colors: Record<string, { text: string; border: string; bg: string }> = {
    cyan: {
      text: 'text-cyan-600 dark:text-cyan-400',
      border: 'border-cyan-200 dark:border-cyan-400/30',
      bg: 'bg-cyan-50 dark:bg-cyan-400/5',
    },
    amber: {
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-400/30',
      bg: 'bg-amber-50 dark:bg-amber-400/5',
    },
    blue: {
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-400/30',
      bg: 'bg-blue-50 dark:bg-blue-400/5',
    },
    emerald: {
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-400/30',
      bg: 'bg-emerald-50 dark:bg-emerald-400/5',
    },
    slate: {
      text: 'text-slate-600 dark:text-slate-400',
      border: 'border-slate-200 dark:border-slate-600/40',
      bg: 'bg-slate-50 dark:bg-slate-700/20',
    },
  }
  const c = colors[color]

  return (
    <div
      className={`p-4 transition-colors ${dragOver ? 'bg-cyan-50/50 dark:bg-cyan-400/[0.08]' : ''}`}
      onDragOver={onColumnDragOver}
      onDragLeave={onColumnDragLeave}
      onDrop={onColumnDrop}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${c.text}`} />
          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 tracking-wider">{title}</span>
        </div>
        <span className={`font-display text-xl ${c.text}`}>{count}</span>
      </div>

      <div
        className={`space-y-2 max-h-[420px] overflow-y-auto pr-1 rounded-lg transition-all ${
          dragOver ? 'ring-1 ring-cyan-300/70 dark:ring-cyan-500/40 p-1' : ''
        }`}
      >
        {jobs.length === 0 ? (
          <div className="h-20 flex items-center justify-center text-slate-400 dark:text-slate-600 font-mono text-[10px]">
            No jobs
          </div>
        ) : (
          jobs.map((job) => {
            const currentStatus = normalizeStatus(job.status)
            const isPending = pendingJobIds.has(job.id)
            const scheduledText = job.scheduled_start
              ? format(new Date(job.scheduled_start), 'EEE, MMM d - h:mm a')
              : 'No schedule'

            return (
              <div
                key={job.id}
                draggable={!isPending}
                onDragStart={(event) => onCardDragStart(job.id, currentStatus, event)}
                onDragEnd={onCardDragEnd}
                className={`group rounded-xl border ${c.border} ${c.bg} shadow-[0_1px_2px_rgba(15,23,42,0.08)] dark:shadow-[0_1px_2px_rgba(2,6,23,0.45)] transition-all duration-150 ease-out ${
                  isPending
                    ? 'opacity-75 cursor-not-allowed'
                    : 'cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:border-cyan-300/70 dark:hover:border-cyan-400/45 hover:shadow-[0_12px_24px_-16px_rgba(6,182,212,0.55)]'
                }`}
              >
                <Link
                  href={`/admin/jobs/${job.id}`}
                  draggable={false}
                  className="relative block p-3"
                >
                  {isPending && (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-slate-800/80 px-1.5 py-0.5 text-[9px] font-mono text-white">
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      Saving
                    </span>
                  )}
                  <div className="font-mono text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {scheduledText}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-slate-900 dark:text-white">
                    <Building2 className="w-3 h-3 opacity-70" />
                    <span className="font-mono text-[12px] font-semibold truncate">{job.customer?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-slate-500 dark:text-slate-400">
                    <User className="w-3 h-3 opacity-70" />
                    <span className="font-mono text-[10px] truncate">{job.technician?.full_name || 'Unassigned'}</span>
                  </div>
                </Link>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
