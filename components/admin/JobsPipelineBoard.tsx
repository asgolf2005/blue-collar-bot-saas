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
  MapPin,
} from 'lucide-react'
import { showToast } from '@/lib/utils/toast'
import { cn } from '@/lib/utils'

type PipelineStatus = 'scheduled' | 'on_the_way' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'

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
  'arrived',
  'in_progress',
  'completed',
  'cancelled',
]

const VIRTUALIZATION_THRESHOLD = 24
const VIRTUAL_CARD_HEIGHT = 110
const VIRTUAL_OVERSCAN = 6

const STATUS_META: Record<
  PipelineStatus,
  {
    title: string
    color: 'cyan' | 'amber' | 'orange' | 'purple' | 'emerald' | 'slate'
    icon: ElementType
  }
> = {
  scheduled: { title: 'SCHEDULED', color: 'cyan', icon: Calendar },
  on_the_way: { title: 'EN ROUTE', color: 'amber', icon: Truck },
  arrived: { title: 'ARRIVED', color: 'orange', icon: MapPin },
  in_progress: { title: 'IN PROGRESS', color: 'purple', icon: PlayCircle },
  completed: { title: 'COMPLETED', color: 'emerald', icon: CheckCircle2 },
  cancelled: { title: 'CANCELLED', color: 'slate', icon: XCircle },
}

function normalizeStatus(status: string): PipelineStatus {
  if (status === 'arrived') return 'arrived'
  if (status === 'in_progress') return 'in_progress'
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
    arrived: [],
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
      data-testid="pipeline-board"
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
  color: 'cyan' | 'amber' | 'orange' | 'purple' | 'emerald' | 'slate'
  icon: ElementType
  jobs: PipelineJob[]
  dragOver: boolean
  pendingJobIds: Set<string>
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
    orange: {
      text: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50/50 dark:bg-orange-900/10',
      border: 'border-orange-200/50 dark:border-orange-400/20',
      glow: 'shadow-[0_0_15px_rgba(249,115,22,0.15)] dark:shadow-[0_0_15px_rgba(251,146,60,0.15)] ring-orange-400/30 text-orange-500'
    },
    purple: {
      text: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50/50 dark:bg-purple-900/10',
      border: 'border-purple-200/50 dark:border-purple-400/20',
      glow: 'shadow-[0_0_15px_rgba(147,51,234,0.15)] dark:shadow-[0_0_15px_rgba(192,132,252,0.15)] ring-purple-400/30 text-purple-500'
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
    orange: 'from-orange-500/5',
    purple: 'from-purple-500/5',
    emerald: 'from-emerald-500/5',
    slate: 'from-slate-500/5',
  }
  const dragHeaderBgByColor: Record<typeof color, string> = {
    cyan: 'bg-cyan-50/50 dark:bg-cyan-500/10',
    amber: 'bg-amber-50/50 dark:bg-amber-500/10',
    orange: 'bg-orange-50/50 dark:bg-orange-500/10',
    purple: 'bg-purple-50/50 dark:bg-purple-500/10',
    emerald: 'bg-emerald-50/50 dark:bg-emerald-500/10',
    slate: 'bg-slate-100/60 dark:bg-slate-700/20',
  }
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
    orange: {
      line: 'from-orange-400/80 via-orange-300/45 to-transparent dark:from-orange-300/60 dark:via-orange-400/30',
      dot: 'bg-orange-500 dark:bg-orange-300',
      edge: 'from-orange-300 to-orange-500 dark:from-orange-400 dark:to-orange-600',
    },
    purple: {
      line: 'from-purple-400/80 via-purple-300/45 to-transparent dark:from-purple-300/60 dark:via-purple-400/30',
      dot: 'bg-purple-500 dark:bg-purple-300',
      edge: 'from-purple-300 to-purple-500 dark:from-purple-400 dark:to-purple-600',
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
            isCollapsed ? "text-xs items-center flex gap-4 uppercase whitespace-nowrap [writing-mode:vertical-rl] rotate-180 mt-4" : "text-[10px]"
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
            "flex-1 p-3 overflow-y-auto no-scrollbar space-y-2 relative z-10 transition-colors duration-300",
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
                const technicianName = job.technician?.full_name
                const hasTechnician = Boolean(technicianName)

                return (
                  <div
                    key={job.id}
                    data-testid="job-card"
                    data-test="job-card"
                    draggable={!isPending}
                    onDragStart={(event) => onCardDragStart(job.id, currentStatus, event as unknown as DragEvent<HTMLDivElement>)}
                    onDragEnd={onCardDragEnd}
                    className={cn(
                      "admin-card admin-card-compact group/card relative overflow-hidden border transition-all duration-150 ease-out",
                      isPending
                        ? "opacity-60 cursor-not-allowed"
                        : "cursor-grab active:cursor-grabbing hover:-translate-y-[2px] hover:shadow-lg"
                    )}
                  >
                    {/* Status-colored edge accent */}
                    <div className={cn('pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b', cardToneByColor[color].edge)} />
                    <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r", cardToneByColor[color].line)} />

                    <Link
                      href={`/admin/jobs/${job.id}`}
                      prefetch={false}
                      draggable={false}
                      className="relative block p-3 select-none"
                    >
                      {/* Sync Badge */}
                      {isPending && (
                        <span className="absolute right-2.5 top-2.5 inline-flex items-center justify-center rounded-full border border-slate-300/70 bg-white/90 px-1.5 py-0.5 dark:border-slate-600/70 dark:bg-slate-900/90">
                          <Loader2 className="h-3 w-3 animate-spin text-slate-600 dark:text-slate-300" />
                          <span className="ml-1.5 font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-700 dark:text-slate-200">Sync</span>
                        </span>
                      )}

                      {/* Metadata Row - Timestamp */}
                      <div className="flex items-center gap-1.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full", cardToneByColor[color].dot)} />
                        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                          {scheduledText}
                        </span>
                      </div>

                      {/* Job Title */}
                      <div className="mt-1.5">
                        <p className="font-sans text-[13px] font-semibold leading-tight text-slate-900 dark:text-slate-100">
                          {job.customer?.name || 'Unknown Entity'}
                        </p>
                      </div>

                      {/* Technician Name - Plain text under title */}
                      {hasTechnician && (
                        <p className="mt-1 text-[12px] text-slate-600 dark:text-slate-400 leading-tight">
                          {technicianName}
                        </p>
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
