'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ElementType } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Calendar,
  CheckCircle2,
  Loader2,
  PlayCircle,
  Truck,
  XCircle,
} from 'lucide-react'
import { showToast } from '@/lib/utils/toast'
import { cn } from '@/lib/utils'

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
  cardVariant?: JobCardVariant
  prismTypography?: PrismTypographyVariant
}

export type JobCardVariant = 'v1' | 'v2' | 'v3' | 'v4' | 'v5'
export type PrismTypographyVariant = 't1' | 't2' | 't3' | 't4' | 't5'

interface CardDesignClasses {
  card: string
  hover: string
  metaRow: string
  metaText: string
  titleWrap: string
  title: string
  footer: string
  techLabel: string
  techValue: string
  statusBase: string
  statusAssigned: string
  statusUnassigned: string
  syncBadge: string
}

interface PrismTypographyClasses {
  meta: string
  title: string
  tech: string
}

const CARD_DESIGNS: Record<JobCardVariant, CardDesignClasses> = {
  v1: {
    card: 'job-card-alloy rounded-[1.2rem] border border-slate-300/80 text-slate-900 dark:border-slate-600/75 dark:text-slate-100',
    hover: 'hover:-translate-y-[2px] hover:shadow-[0_18px_30px_-20px_rgba(15,23,42,0.75)] dark:hover:shadow-[0_20px_34px_-20px_rgba(2,6,23,0.9)]',
    metaRow: 'flex items-center gap-1.5',
    metaText: 'font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300',
    titleWrap: 'mt-1.5 min-h-[42px]',
    title: 'job-card-emboss font-sans text-[14px] font-semibold leading-[1.22] text-slate-900 dark:text-slate-100',
    footer: 'mt-2.5 grid grid-cols-[1fr_auto] items-end gap-2 border-t border-slate-400/45 pt-2.5 dark:border-slate-600/65',
    techLabel: 'font-mono text-[9px] uppercase tracking-[0.18em] text-slate-600 dark:text-slate-400',
    techValue: 'job-card-emboss-soft mt-0.5 truncate font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-800 dark:text-slate-200',
    statusBase: 'shrink-0 rounded-full border px-2.5 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.16em]',
    statusAssigned: 'border-emerald-400/45 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    statusUnassigned: 'border-rose-400/45 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    syncBadge: 'absolute right-2.5 top-2.5 inline-flex items-center justify-center rounded-full border border-slate-400/40 bg-white/90 px-1.5 py-0.5 dark:border-slate-500/50 dark:bg-slate-900/90',
  },
  v2: {
    card: 'rounded-[1.2rem] border border-white/70 bg-white/80 text-slate-900 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_14px_24px_-16px_rgba(14,116,144,0.32)] dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_24px_-16px_rgba(2,6,23,0.75)]',
    hover: 'hover:-translate-y-[2px] hover:border-cyan-300/70 dark:hover:border-cyan-400/35 hover:shadow-[0_20px_32px_-20px_rgba(6,182,212,0.45)]',
    metaRow: 'flex items-center gap-1.5',
    metaText: 'font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300',
    titleWrap: 'mt-1.5 min-h-[42px]',
    title: 'font-sans text-[14px] font-semibold leading-[1.22] text-slate-900 dark:text-slate-100',
    footer: 'mt-2.5 grid grid-cols-[1fr_auto] items-end gap-2 border-t border-slate-300/65 pt-2.5 dark:border-slate-700/70',
    techLabel: 'font-mono text-[9px] uppercase tracking-[0.18em] text-slate-600 dark:text-slate-400',
    techValue: 'mt-0.5 truncate font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-800 dark:text-slate-200',
    statusBase: 'shrink-0 rounded-full border px-2.5 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.16em]',
    statusAssigned: 'border-cyan-300/70 bg-cyan-50 text-cyan-700 dark:border-cyan-400/40 dark:bg-cyan-500/10 dark:text-cyan-300',
    statusUnassigned: 'border-amber-300/70 bg-amber-50 text-amber-700 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-300',
    syncBadge: 'absolute right-2.5 top-2.5 inline-flex items-center justify-center rounded-full border border-cyan-300/40 bg-white/90 px-1.5 py-0.5 dark:border-cyan-400/35 dark:bg-slate-900/90',
  },
  v3: {
    card: 'rounded-[1.1rem] border border-slate-500/60 bg-gradient-to-b from-slate-900 to-slate-950 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(2,6,23,0.7),0_16px_26px_-18px_rgba(2,6,23,0.9)]',
    hover: 'hover:-translate-y-[2px] hover:border-cyan-400/60 hover:shadow-[0_16px_30px_-16px_rgba(34,211,238,0.45)]',
    metaRow: 'flex items-center gap-1.5',
    metaText: 'font-mono text-[10px] uppercase tracking-[0.2em] text-slate-300',
    titleWrap: 'mt-1.5 min-h-[42px]',
    title: 'font-sans text-[14px] font-semibold leading-[1.22] text-white',
    footer: 'mt-2.5 grid grid-cols-[1fr_auto] items-end gap-2 border-t border-slate-700/80 pt-2.5',
    techLabel: 'font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400',
    techValue: 'mt-0.5 truncate font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-200',
    statusBase: 'shrink-0 rounded-full border px-2.5 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.16em]',
    statusAssigned: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-300',
    statusUnassigned: 'border-rose-400/50 bg-rose-500/10 text-rose-300',
    syncBadge: 'absolute right-2.5 top-2.5 inline-flex items-center justify-center rounded-full border border-slate-500/60 bg-slate-900/95 px-1.5 py-0.5',
  },
  v4: {
    card: 'rounded-[1.2rem] border border-slate-300/80 bg-gradient-to-br from-slate-50 via-white to-slate-200 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_14px_24px_-16px_rgba(59,130,246,0.25)] dark:border-slate-600/75 dark:bg-gradient-to-br dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 dark:text-slate-100 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_26px_-16px_rgba(2,6,23,0.8)]',
    hover: 'hover:-translate-y-[2px] hover:border-indigo-300/70 dark:hover:border-indigo-400/45 hover:shadow-[0_18px_30px_-18px_rgba(99,102,241,0.35)]',
    metaRow: 'flex items-center gap-1.5',
    metaText: 'font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300',
    titleWrap: 'mt-1.5 min-h-[42px]',
    title: 'font-sans text-[14px] font-semibold leading-[1.22] text-slate-900 dark:text-slate-100',
    footer: 'mt-2.5 grid grid-cols-[1fr_auto] items-end gap-2 border-t border-slate-300/70 pt-2.5 dark:border-slate-700/70',
    techLabel: 'font-mono text-[9px] uppercase tracking-[0.18em] text-slate-600 dark:text-slate-400',
    techValue: 'mt-0.5 truncate font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-800 dark:text-slate-200',
    statusBase: 'shrink-0 rounded-full border px-2.5 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.16em]',
    statusAssigned: 'border-indigo-300/70 bg-indigo-50 text-indigo-700 dark:border-indigo-400/40 dark:bg-indigo-500/10 dark:text-indigo-300',
    statusUnassigned: 'border-slate-300/80 bg-slate-100 text-slate-700 dark:border-slate-500/60 dark:bg-slate-800/90 dark:text-slate-300',
    syncBadge: 'absolute right-2.5 top-2.5 inline-flex items-center justify-center rounded-full border border-slate-300/70 bg-white/90 px-1.5 py-0.5 dark:border-slate-600/70 dark:bg-slate-900/90',
  },
  v5: {
    card: 'rounded-[0.95rem] border border-slate-300/90 bg-white text-slate-900 shadow-[0_10px_18px_-14px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100',
    hover: 'hover:-translate-y-[1px] hover:border-slate-400 dark:hover:border-slate-500',
    metaRow: 'flex items-center gap-1.5',
    metaText: 'font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400',
    titleWrap: 'mt-1.5 min-h-[42px]',
    title: 'font-sans text-[14px] font-semibold leading-[1.22] text-slate-900 dark:text-slate-100',
    footer: 'mt-2.5 grid grid-cols-[1fr_auto] items-end gap-2 border-t border-slate-200 pt-2.5 dark:border-slate-800',
    techLabel: 'font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500',
    techValue: 'mt-0.5 truncate font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-700 dark:text-slate-200',
    statusBase: 'shrink-0 rounded-full border px-2.5 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.16em]',
    statusAssigned: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300',
    statusUnassigned: 'border-rose-300/80 bg-rose-50 text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-300',
    syncBadge: 'absolute right-2.5 top-2.5 inline-flex items-center justify-center rounded-full border border-slate-300/80 bg-white px-1.5 py-0.5 dark:border-slate-600 dark:bg-slate-900',
  },
}

const PRISM_TYPOGRAPHY: Record<PrismTypographyVariant, PrismTypographyClasses> = {
  t1: {
    meta: 'font-mono text-[10px] tracking-[0.2em] uppercase text-slate-600 dark:text-slate-300',
    title: 'font-sans text-[15px] font-semibold tracking-[0.01em] text-slate-900 dark:text-slate-100',
    tech: 'font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700 dark:text-slate-300',
  },
  t2: {
    meta: 'font-mono text-[9px] tracking-[0.24em] uppercase text-slate-600 dark:text-slate-300',
    title: 'font-display text-[19px] leading-[1.05] tracking-[0.06em] uppercase text-slate-900 dark:text-slate-100',
    tech: 'font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700 dark:text-slate-300',
  },
  t3: {
    meta: 'font-sans text-[10px] tracking-[0.12em] uppercase text-slate-600 dark:text-slate-300',
    title: 'font-sans text-[16px] font-semibold tracking-[0.005em] text-slate-900 dark:text-slate-100',
    tech: 'font-sans text-[12px] font-medium tracking-[0.02em] text-slate-700 dark:text-slate-300',
  },
  t4: {
    meta: 'font-mono text-[9px] tracking-[0.22em] uppercase text-slate-600 dark:text-slate-300',
    title: 'font-display text-[17px] leading-[1.08] tracking-[0.08em] uppercase text-slate-900 dark:text-slate-100',
    tech: 'font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-slate-700 dark:text-slate-300',
  },
  t5: {
    meta: 'font-mono text-[9px] tracking-[0.2em] uppercase text-slate-600 dark:text-slate-300',
    title: 'font-mono text-[14px] font-bold tracking-[0.06em] uppercase text-slate-900 dark:text-slate-100',
    tech: 'font-mono text-[11px] font-semibold tracking-[0.12em] uppercase text-slate-700 dark:text-slate-300',
  },
}
const PIPELINE_STATUSES: PipelineStatus[] = [
  'scheduled',
  'on_the_way',
  'in_progress',
  'completed',
  'cancelled',
]

const VIRTUALIZATION_THRESHOLD = 24
const VIRTUAL_CARD_HEIGHT = 126
const VIRTUAL_OVERSCAN = 6

const STATUS_META: Record<
  PipelineStatus,
  {
    title: string
    color: 'cyan' | 'amber' | 'blue' | 'emerald' | 'slate'
    icon: ElementType
  }
> = {
  scheduled: { title: 'SCHEDULED', color: 'blue', icon: Calendar },
  on_the_way: { title: 'EN ROUTE', color: 'amber', icon: Truck },
  in_progress: { title: 'IN PROGRESS', color: 'cyan', icon: PlayCircle },
  completed: { title: 'COMPLETED', color: 'emerald', icon: CheckCircle2 },
  cancelled: { title: 'CANCELLED', color: 'slate', icon: XCircle },
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

export function JobsPipelineBoard({
  jobs,
  cardVariant = 'v1',
  prismTypography = 't1',
}: JobsPipelineBoardProps) {
  const groupedFromServer = useMemo(() => buildGroupedJobs(jobs), [jobs])
  const [jobsByStatus, setJobsByStatus] = useState(groupedFromServer)
  const [dragOverStatus, setDragOverStatus] = useState<PipelineStatus | null>(null)
  const [dragging, setDragging] = useState<{ jobId: string; fromStatus: PipelineStatus } | null>(null)
  const [pendingJobIds, setPendingJobIds] = useState<Set<string>>(new Set())
  const [collapsedCols, setCollapsedCols] = useState<Set<PipelineStatus>>(new Set())

  const toggleColumnCollapse = useCallback((status: PipelineStatus) => {
    setCollapsedCols(prev => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }, [])

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
            `Operation reassigned: ${movedLabel}`,
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
          showToast.success(`Operation reassigned: ${movedLabel}`)
        }
      } catch (error) {
        moveJobState(jobId, toStatus, fromStatus)
        showToast.error(error instanceof Error ? error.message : 'State resolution failed')
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
    <div
      data-test="job-list"
      className="flex gap-3 h-full min-h-[500px] w-full items-stretch relative"
    >
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
            cardVariant={cardVariant}
            prismTypography={prismTypography}
            isCollapsed={collapsedCols.has(statusKey)}
            onToggleCollapse={() => toggleColumnCollapse(statusKey)}
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
              if (dragging) {
                setDragOverStatus((current) => (current === statusKey ? current : statusKey))
              }
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
  cardVariant,
  prismTypography,
  isCollapsed,
  onToggleCollapse,
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
  cardVariant: JobCardVariant
  prismTypography: PrismTypographyVariant
  isCollapsed: boolean
  onToggleCollapse: () => void
  onCardDragStart: (jobId: string, fromStatus: PipelineStatus, event: DragEvent<HTMLDivElement>) => void
  onCardDragEnd: () => void
  onColumnDragOver: (event: DragEvent<HTMLDivElement>) => void
  onColumnDragLeave: () => void
  onColumnDrop: (event: DragEvent<HTMLDivElement>) => void
}) {
  const colors: Record<string, { text: string; bg: string; border: string; glow: string }> = {
    cyan: {
      text: 'text-cyan-600 dark:text-cyan-400',
      bg: 'bg-cyan-50/50 dark:bg-cyan-900/10',
      border: 'border-cyan-200/50 dark:border-cyan-400/20',
      glow: 'shadow-[0_0_15px_rgba(6,182,212,0.15)] dark:shadow-[0_0_15px_rgba(34,211,238,0.15)] ring-cyan-400/30 text-cyan-500'
    },
    amber: {
      text: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50/50 dark:bg-amber-900/10',
      border: 'border-amber-200/50 dark:border-amber-400/20',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)] dark:shadow-[0_0_15px_rgba(251,191,36,0.15)] ring-amber-400/30 text-amber-500'
    },
    blue: {
      text: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50/50 dark:bg-indigo-900/10',
      border: 'border-indigo-200/50 dark:border-indigo-400/20',
      glow: 'shadow-[0_0_15px_rgba(99,102,241,0.15)] dark:shadow-[0_0_15px_rgba(129,140,248,0.15)] ring-indigo-400/30 text-indigo-500'
    },
    emerald: {
      text: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50/50 dark:bg-emerald-900/10',
      border: 'border-emerald-200/50 dark:border-emerald-400/20',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)] dark:shadow-[0_0_15px_rgba(52,211,153,0.15)] ring-emerald-400/30 text-emerald-500'
    },
    slate: {
      text: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-100/50 dark:bg-slate-800/30',
      border: 'border-slate-200/50 dark:border-slate-600/30',
      glow: 'shadow-[0_0_15px_rgba(100,116,139,0.1)] dark:shadow-[0_0_15px_rgba(148,163,184,0.1)] ring-slate-400/30 text-slate-500'
    },
  }
  const c = colors[color]
  const dragBgByColor: Record<typeof color, string> = {
    cyan: 'from-cyan-500/5',
    amber: 'from-amber-500/5',
    blue: 'from-indigo-500/5',
    emerald: 'from-emerald-500/5',
    slate: 'from-slate-500/5',
  }
  const dragHeaderBgByColor: Record<typeof color, string> = {
    cyan: 'bg-cyan-50/50 dark:bg-cyan-500/10',
    amber: 'bg-amber-50/50 dark:bg-amber-500/10',
    blue: 'bg-indigo-50/50 dark:bg-indigo-500/10',
    emerald: 'bg-emerald-50/50 dark:bg-emerald-500/10',
    slate: 'bg-slate-100/60 dark:bg-slate-700/20',
  }
  const cardDesign = CARD_DESIGNS[cardVariant]
  const cardToneByColor: Record<typeof color, { line: string; dot: string; edge: string }> = {
    cyan: {
      line: 'from-cyan-400/80 via-cyan-300/45 to-transparent dark:from-cyan-300/60 dark:via-cyan-400/30',
      dot: 'bg-cyan-500 dark:bg-cyan-300',
      edge: 'from-cyan-300 to-cyan-500 dark:from-cyan-400 dark:to-cyan-600',
    },
    amber: {
      line: 'from-amber-400/80 via-amber-300/45 to-transparent dark:from-amber-300/60 dark:via-amber-400/30',
      dot: 'bg-amber-500 dark:bg-amber-300',
      edge: 'from-amber-300 to-amber-500 dark:from-amber-400 dark:to-amber-600',
    },
    blue: {
      line: 'from-blue-400/80 via-blue-300/45 to-transparent dark:from-blue-300/60 dark:via-blue-400/30',
      dot: 'bg-blue-500 dark:bg-blue-300',
      edge: 'from-blue-300 to-blue-500 dark:from-blue-400 dark:to-blue-600',
    },
    emerald: {
      line: 'from-emerald-400/80 via-emerald-300/45 to-transparent dark:from-emerald-300/60 dark:via-emerald-400/30',
      dot: 'bg-emerald-500 dark:bg-emerald-300',
      edge: 'from-emerald-300 to-emerald-500 dark:from-emerald-400 dark:to-emerald-600',
    },
    slate: {
      line: 'from-white/85 via-slate-300/60 to-transparent dark:from-white/20 dark:via-slate-500/30',
      dot: 'bg-slate-500 dark:bg-slate-300',
      edge: 'from-slate-300 to-slate-500 dark:from-slate-400 dark:to-slate-600',
    },
  }
  const cardGlowByColor: Record<typeof color, string> = {
    cyan: 'drop-shadow-none hover:drop-shadow-[0_0_14px_rgba(34,211,238,0.4)] hover:ring-1 hover:ring-cyan-400/70',
    amber: 'drop-shadow-none hover:drop-shadow-[0_0_14px_rgba(251,191,36,0.4)] hover:ring-1 hover:ring-amber-400/70',
    blue: 'drop-shadow-none hover:drop-shadow-[0_0_14px_rgba(59,130,246,0.4)] hover:ring-1 hover:ring-blue-400/70',
    emerald: 'drop-shadow-none hover:drop-shadow-[0_0_14px_rgba(16,185,129,0.4)] hover:ring-1 hover:ring-emerald-400/70',
    slate: 'drop-shadow-none hover:drop-shadow-[0_0_10px_rgba(148,163,184,0.28)] hover:ring-1 hover:ring-slate-400/60',
  }
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const updateViewportHeight = () => setViewportHeight(element.clientHeight)
    updateViewportHeight()
    window.addEventListener('resize', updateViewportHeight)
    return () => window.removeEventListener('resize', updateViewportHeight)
  }, [])

  const shouldVirtualize = jobs.length > VIRTUALIZATION_THRESHOLD
  const effectiveViewport = viewportHeight > 0 ? viewportHeight : 520
  const itemsPerViewport = Math.max(1, Math.ceil(effectiveViewport / VIRTUAL_CARD_HEIGHT))
  const startIndex = shouldVirtualize
    ? Math.max(0, Math.floor(scrollTop / VIRTUAL_CARD_HEIGHT) - VIRTUAL_OVERSCAN)
    : 0
  const endIndex = shouldVirtualize
    ? Math.min(jobs.length, startIndex + itemsPerViewport + VIRTUAL_OVERSCAN * 2)
    : jobs.length
  const visibleJobs = shouldVirtualize ? jobs.slice(startIndex, endIndex) : jobs
  const topSpacerHeight = shouldVirtualize ? startIndex * VIRTUAL_CARD_HEIGHT : 0
  const bottomSpacerHeight = shouldVirtualize ? Math.max(0, (jobs.length - endIndex) * VIRTUAL_CARD_HEIGHT) : 0

  return (
    <div
      className={cn(
        "flex flex-col rounded-[24px] border transition-all duration-200 relative overflow-hidden shrink-0",
        isCollapsed
          ? "w-14 items-center cursor-pointer hover:bg-white/60 dark:hover:bg-slate-800/80"
          : "w-[260px] sm:w-[280px] lg:w-[300px] xl:w-auto xl:flex-1 xl:min-w-0",
        dragOver && !isCollapsed
          ? `bg-white dark:bg-slate-800 ring-2 ${c.glow}`
          : "bg-white/40 dark:bg-slate-900/30 backdrop-blur-sm border-slate-200/50 dark:border-white/5 shadow-inner"
      )}
      onClick={isCollapsed ? onToggleCollapse : undefined}
      onDragOver={!isCollapsed ? onColumnDragOver : undefined}
      onDragLeave={!isCollapsed ? onColumnDragLeave : undefined}
      onDrop={!isCollapsed ? onColumnDrop : undefined}
    >
      {/* Background Glow */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-b opacity-0 duration-200 pointer-events-none transition-opacity",
        dragOver ? "opacity-100" : "opacity-0",
        `${dragBgByColor[color]} to-transparent`
      )} />

      <div className={cn(
        "flex items-center justify-between border-b shrink-0 relative z-10 transition-all duration-200",
        "border-slate-200/50 dark:border-white/5 backdrop-blur-md",
        dragOver && !isCollapsed ? dragHeaderBgByColor[color] : "bg-white/50 dark:bg-slate-800/50",
        isCollapsed ? "flex-col p-4 py-6 gap-6 h-full border-b-0 cursor-pointer" : "flex-row p-4"
      )}>
        <div className={cn("flex gap-2.5", isCollapsed ? "flex-col items-center" : "flex-row items-center")}>
          <div className={cn(
            "rounded-lg flex items-center justify-center transition-transform",
            dragOver && !isCollapsed ? "scale-110" : "",
            isCollapsed ? "w-8 h-8 rounded-xl shadow-sm cursor-pointer hover:scale-110" : "w-6 h-6",
            c.bg
          )}>
            <Icon className={cn(c.text, isCollapsed ? "w-4 h-4" : "w-3.5 h-3.5")} />
          </div>
          <span className={cn(
            "font-mono uppercase tracking-[0.2em] font-bold text-slate-600 dark:text-slate-300",
            isCollapsed ? "text-[10px] items-center flex gap-4 uppercase whitespace-nowrap [writing-mode:vertical-rl] rotate-180 mt-4" : "text-[10px]"
          )}>
            {title}
            {isCollapsed && (
              <span className={cn("inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] [writing-mode:horizontal-tb] -rotate-180 border", c.bg, c.border, c.text)}>
                {count}
              </span>
            )}
          </span>
        </div>
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800",
              c.text
            )}>{count}</span>
            <button
              onClick={onToggleCollapse}
              className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
            >
              <div className="w-1 h-3 border-l-2 border-r-2 border-current px-0.5" />
            </button>
          </div>
        )}
      </div>

      {!isCollapsed && (
        <div
          ref={scrollRef}
          className={cn(
            "flex-1 p-3 overflow-y-auto no-scrollbar space-y-3 relative z-10 transition-colors duration-300",
            dragOver ? `${c.bg}` : ""
          )}
          onScroll={(event) => {
            if (!shouldVirtualize) return
            setScrollTop(event.currentTarget.scrollTop)
          }}
        >
            {jobs.length === 0 ? (
              <div className="h-24 flex items-center justify-center">
                <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400/70 border border-dashed border-slate-300/50 dark:border-slate-700/50 rounded-xl px-4 py-2">
                  Empty Vector
                </span>
              </div>
            ) : (
              <>
                {topSpacerHeight > 0 && <div style={{ height: topSpacerHeight }} aria-hidden />}
                {visibleJobs.map((job) => {
                const currentStatus = normalizeStatus(job.status)
                const isPending = pendingJobIds.has(job.id)
                const scheduledText = job.scheduled_start
                  ? format(new Date(job.scheduled_start), 'HH:mm • EEE, MMM d')
                  : '--:--'
                const technicianName = job.technician?.full_name || 'Unassigned Technician'
                const isAssigned = Boolean(job.technician?.full_name)
                const isPrism = cardVariant === 'v4'
                const prismType = PRISM_TYPOGRAPHY[prismTypography]

                return (
                  <div
                    key={job.id}
                    data-test="job-card"
                    draggable={!isPending}
                    onDragStart={(event) => onCardDragStart(job.id, currentStatus, event as unknown as DragEvent<HTMLDivElement>)}
                    onDragEnd={onCardDragEnd}
                    className={cn(
                      "group/card relative overflow-hidden border transition-all duration-150 ease-out",
                      cardDesign.card,
                      cardGlowByColor[color],
                      isPending
                        ? "opacity-60 cursor-not-allowed"
                        : cn("cursor-grab active:cursor-grabbing", cardDesign.hover)
                    )}
                  >
                    <div className={cn('pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b', cardToneByColor[color].edge)} />
                    <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r", cardToneByColor[color].line)} />

                    <Link
                      href={`/admin/jobs/${job.id}`}
                      draggable={false}
                      className="relative block p-4 select-none"
                    >
                      {isPending && (
                        <span className={cardDesign.syncBadge}>
                          <Loader2 className="h-3 w-3 animate-spin text-slate-600 dark:text-slate-300" />
                          <span className="ml-1.5 font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-700 dark:text-slate-200">Syncing</span>
                        </span>
                      )}

                      <div className={cn(cardDesign.metaRow, isPrism ? prismType.meta : cardDesign.metaText)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", cardToneByColor[color].dot)} />
                        <span>{scheduledText}</span>
                      </div>

                      <div className={cardDesign.titleWrap}>
                        <p className={cn(cardDesign.title, isPrism && prismType.title)}>
                          {job.customer?.name || 'Unknown Entity'}
                        </p>
                      </div>

                      {isPrism ? (
                        <div className={cn(cardDesign.footer, 'grid-cols-1')}>
                          <p className={cn(cardDesign.techValue, prismType.tech)}>
                            {technicianName}
                          </p>
                        </div>
                      ) : (
                        <div className={cardDesign.footer}>
                          <div className="min-w-0">
                            <p className={cardDesign.techLabel}>
                              Technician
                            </p>
                            <p className={cardDesign.techValue}>
                              {technicianName}
                            </p>
                          </div>
                          <span className={cn(
                            cardDesign.statusBase,
                            isAssigned
                              ? cardDesign.statusAssigned
                              : cardDesign.statusUnassigned
                          )}>
                            {isAssigned ? 'Assigned' : 'Unassigned'}
                          </span>
                        </div>
                      )}
                    </Link>
                  </div>
                )
              })}
                {bottomSpacerHeight > 0 && <div style={{ height: bottomSpacerHeight }} aria-hidden />}
              </>
            )}
        </div>
      )}
    </div>
  )
}


