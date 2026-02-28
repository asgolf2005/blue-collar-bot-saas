'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { addDays, endOfDay, format, startOfDay, subDays, isToday } from 'date-fns'
import { ConnectionStatus } from '@/components/admin/ConnectionStatus'
import { useRealtimeJobsContext } from '@/components/admin/JobsRealtimeProvider'
import { type ControlPreset } from '@/lib/ui/control-presets'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { showToast } from '@/lib/utils/toast'
import { Archive, ChevronLeft, ChevronRight, HardHat, Sparkles, Loader2, Clock3, Bot } from 'lucide-react'

interface JobInvoiceSummary {
  job_id: string
  status: string
  total: number | null
  paid_at: string | null
  due_date: string | null
}

interface JobsPageClientProps {
  uiPreset: ControlPreset
  technicianFilterId: string | null
  technicianFilterName: string | null
  jobInvoices: JobInvoiceSummary[]
  allTimeJobCount: number
}

const OpsTriageBoard = dynamic(
  () => import('@/components/admin/OpsTriageBoard').then((mod) => mod.OpsTriageBoard),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-slate-200/50 bg-white/60 p-4 dark:border-slate-800/50 dark:bg-slate-900/40 backdrop-blur-xl">
        <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">Loading Recent Updates...</p>
      </div>
    ),
  }
)

const JobsPipelineBoard = dynamic(
  () => import('@/components/admin/JobsPipelineBoard').then((mod) => mod.JobsPipelineBoard),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-slate-200/50 bg-white/60 p-8 text-center dark:border-slate-800/50 dark:bg-slate-900/40 backdrop-blur-xl">
        <div className="inline-block w-8 h-8 rounded-full border-t-2 border-r-2 border-indigo-500 animate-spin" />
        <p className="mt-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">Initiating spatial pipeline...</p>
      </div>
    ),
  }
)

export function JobsPageClient({
  uiPreset,
  technicianFilterId,
  technicianFilterName,
  jobInvoices,
  allTimeJobCount,
}: JobsPageClientProps) {
  const { jobs, refetch } = useRealtimeJobsContext()
  const [financeCollapsed, setFinanceCollapsed] = useState(false)
  const [dispatching, setDispatching] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  const uiPresetQuery = uiPreset === 'option1' ? '1' : uiPreset === 'option2' ? '2' : '3'

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const technicianScopedJobs = useMemo(
    () => (technicianFilterId ? jobs.filter((job) => job.technician_id === technicianFilterId) : jobs),
    [jobs, technicianFilterId]
  )

  const visibleJobs = useMemo(() => {
    const [start, end] = [
      startOfDay(selectedDate).getTime(),
      endOfDay(selectedDate).getTime()
    ]

    return technicianScopedJobs.filter((job) => {
      // STRICT DAILY SCOPE: Only show jobs explicitly scheduled for the selected day.
      if (!job.scheduled_start) return false
      const scheduledMs = new Date(job.scheduled_start).getTime()
      return Number.isFinite(scheduledMs) && scheduledMs >= start && scheduledMs <= end
    })
  }, [technicianScopedJobs, selectedDate])

  const jobsByStatus = useMemo(
    () => ({
      scheduled: visibleJobs.filter((j) => j.status === 'scheduled'),
      on_the_way: visibleJobs.filter((j) => j.status === 'on_the_way'),
      in_progress: visibleJobs.filter((j) => j.status === 'in_progress' || j.status === 'arrived'),
      completed: visibleJobs.filter((j) => j.status === 'completed'),
      cancelled: visibleJobs.filter((j) => j.status === 'cancelled'),
    }),
    [visibleJobs]
  )

  const invoiceByJobId = useMemo(() => {
    const map = new Map<string, JobInvoiceSummary>()
    for (const invoice of jobInvoices) {
      if (!map.has(invoice.job_id)) {
        map.set(invoice.job_id, invoice)
      }
    }
    return map
  }, [jobInvoices])

  const dayFinanceRows = useMemo(() => {
    return visibleJobs.map((job) => {
      const invoice = invoiceByJobId.get(job.id)
      const isActiveTravel = job.status === 'on_the_way' || job.status === 'arrived' || job.status === 'in_progress'
      const updatedMs = new Date(job.updated_at || job.scheduled_start || '').getTime()
      const activeDurationMs = isActiveTravel && Number.isFinite(updatedMs) ? Math.max(0, nowMs - updatedMs) : 0
      const startMs = new Date(job.scheduled_start || '').getTime()
      const endMs = job.scheduled_end ? new Date(job.scheduled_end).getTime() : NaN
      const fallbackEndMs = Number.isFinite(startMs) ? startMs + 2 * 60 * 60 * 1000 : NaN
      const resolvedEndMs = Number.isFinite(endMs) && endMs > startMs ? endMs : fallbackEndMs
      const plannedDurationMs =
        Number.isFinite(startMs) && Number.isFinite(resolvedEndMs)
          ? Math.max(30 * 60 * 1000, resolvedEndMs - startMs)
          : 0
      const amount = Number(invoice?.total ?? job.total_cost ?? 0)

      return {
        id: job.id,
        customerName: job.customer?.name || 'Unknown Client',
        status: job.status,
        scheduledStart: job.scheduled_start,
        invoiceStatus: invoice?.status || 'missing',
        amount,
        activeDurationMs,
        plannedDurationMs,
      }
    }).sort((a, b) => {
      const aTime = a.scheduledStart ? new Date(a.scheduledStart).getTime() : 0
      const bTime = b.scheduledStart ? new Date(b.scheduledStart).getTime() : 0
      return aTime - bTime
    })
  }, [visibleJobs, invoiceByJobId, nowMs])

  const financeSummary = useMemo(() => {
    return dayFinanceRows.reduce(
      (acc, row) => {
        if (row.invoiceStatus === 'paid') acc.paid += row.amount
        else if (row.invoiceStatus === 'missing') acc.uninvoiced += row.amount
        else acc.outstanding += row.amount
        if (row.status !== 'cancelled') {
          acc.workHours += row.plannedDurationMs / (1000 * 60 * 60)
        }
        return acc
      },
      { paid: 0, outstanding: 0, uninvoiced: 0, workHours: 0 }
    )
  }, [dayFinanceRows])

  const handleDayDispatch = async () => {
    if (dispatching) return

    const targetDate = format(selectedDate, 'yyyy-MM-dd')
    if (!window.confirm(`Run smart dispatch for ${targetDate}? This will auto-assign unassigned jobs for this day.`)) {
      return
    }

    setDispatching(true)
    try {
      const response = await fetch('/api/dispatch/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'apply', targetDate }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to run smart dispatch')
      }

      const applied = Number(payload?.summary?.appliedCount || 0)
      const recommendations = Number(payload?.summary?.recommendations || 0)

      if (applied > 0) {
        showToast.success(`Smart dispatch assigned ${applied} job${applied === 1 ? '' : 's'} for ${targetDate}`)
      } else {
        showToast.info(`No assignments applied for ${targetDate} (${recommendations} recommendations)`)
      }

      await refetch()
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Smart dispatch failed')
    } finally {
      setDispatching(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16 h-full flex flex-col">
      {/* Header Section */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between relative z-20 shrink-0">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-wider bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent drop-shadow-sm uppercase">
            Operations
          </h1>

          {/* Day Scrubber */}
          <div className="mt-3 flex items-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-white/10 p-1 w-fit shadow-lg shadow-slate-200/20 dark:shadow-black/20">
            <button
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              className="p-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-4 flex items-center justify-center min-w-[140px]">
              <div
                className="cursor-pointer group flex flex-col items-center"
                onClick={() => !isToday(selectedDate) && setSelectedDate(new Date())}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("w-1.5 h-1.5 rounded-full shadow-sm", isToday(selectedDate) ? "bg-indigo-500 dark:bg-cyan-400 shadow-indigo-500/50" : "bg-slate-300 dark:bg-slate-600")} />
                  <span className={cn(
                    "font-mono text-xs tracking-widest uppercase font-bold transition-colors",
                    isToday(selectedDate) ? "text-indigo-600 dark:text-cyan-400" : "text-slate-600 dark:text-slate-300 group-hover:text-indigo-500"
                  )}>
                    {isToday(selectedDate) ? "TODAY" : format(selectedDate, 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="p-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-lg p-2 rounded-3xl border border-slate-200/50 dark:border-white/10 shadow-xl shadow-slate-200/20 dark:shadow-indigo-500/10">
          {/* Inline Metrics */}
          <div className="flex bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-white/5 overflow-hidden">
            <MetricBadge label="SCHED" value={jobsByStatus.scheduled.length} color="indigo" />
            <MetricBadge label="ACTIVE" value={jobsByStatus.on_the_way.length + jobsByStatus.in_progress.length} color="cyan" />
            <MetricBadge label="DONE" value={jobsByStatus.completed.length} color="emerald" />
            <MetricBadge label="ALL TIME" value={allTimeJobCount} color="purple" />
          </div>

          <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />

          {/* New Actions */}
          <div className="flex items-center gap-2">
            <Link href="/admin/jobs/archive" prefetch={false}>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-mono text-[10px] tracking-widest uppercase font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Archive className="w-4 h-4" />
                Archive
              </button>
            </Link>

            <Link href="/admin/jobs/new" prefetch={false} className="shrink-0">
              <button className="relative group overflow-hidden bg-gradient-to-br from-indigo-500 to-cyan-500 text-white rounded-2xl px-6 py-2.5 font-mono text-xs uppercase tracking-widest font-bold shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95">
                <div className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-20 transition-opacity bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:animate-[shimmer_1.5s_infinite]" />
                <span className="relative z-10 flex items-center gap-2">
                  CREATE JOB
                </span>
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Filters Overlay */}
      <AnimatePresence>
        {technicianFilterId && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 relative z-10 shrink-0"
          >
            <span className="inline-flex items-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-[11px] font-mono tracking-wider font-bold text-cyan-600 dark:text-cyan-400 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.15)] flex gap-2">
              <HardHat className="w-4 h-4" />
              FOCUS: {technicianFilterName?.toUpperCase()}
            </span>
            <Link
              href={`/admin/jobs?ui=${uiPresetQuery}`}
              prefetch={false}
              className="text-[11px] font-mono tracking-widest text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors uppercase border-b border-dotted border-slate-400"
            >
              Clear Filter
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Standalone Pipeline Matrix */}
      <div className="relative z-10 min-h-[600px]">
        <div className="h-full bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-white/10 shadow-2xl shadow-slate-200/20 dark:shadow-indigo-500/5 rounded-[2.5rem] overflow-hidden relative group flex flex-col">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/0 to-slate-50/20 dark:from-indigo-500/5 dark:via-transparent dark:to-cyan-500/5 pointer-events-none" />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/50 px-8 py-6 dark:border-white/10 shrink-0">
            <h2 className="font-display text-xl font-bold tracking-[0.2em] text-slate-900 dark:text-white uppercase drop-shadow-sm flex items-center gap-3">
              <div className="w-2 h-8 rounded-full bg-gradient-to-b from-indigo-500 to-cyan-400" />
              PIPELINE MATRIX
            </h2>
            <div className="flex items-center gap-3 ml-8">
              <button
                type="button"
                data-testid="ai-dispatch-button"
                onClick={() => void handleDayDispatch()}
                disabled={dispatching}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-transparent text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:border-slate-600/50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                title="AI Dispatch"
              >
                {dispatching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
              </button>
              <div className="bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl px-4 py-2 border border-slate-200/50 dark:border-white/5 backdrop-blur-md">
                <ConnectionStatus />
              </div>
            </div>
          </div>

          <div className="relative z-10 flex-1 p-2 overflow-x-auto overflow-y-hidden">
            <JobsPipelineBoard jobs={visibleJobs} />
          </div>
        </div>
      </div>

      {/* Supporting Cards - 2 per row on desktop */}
      <div className="relative z-10 grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch content-auto">
        <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-white/10 shadow-xl shadow-slate-200/20 dark:shadow-indigo-500/5 rounded-[2.5rem] overflow-hidden relative p-5 min-h-[320px] content-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />
          <div className="relative z-10 h-full">
            <OpsTriageBoard selectedDate={selectedDate} />
          </div>
        </div>

        <div className={cn(
          "bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-white/10 shadow-xl shadow-slate-200/20 dark:shadow-indigo-500/5 rounded-[2.5rem] overflow-hidden relative flex flex-col transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]",
          financeCollapsed ? "h-[74px] flex-none shrink-0" : "min-h-[320px]",
          "content-auto"
        )}>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-100/50 to-transparent dark:from-indigo-500/5 dark:to-transparent pointer-events-none z-0" />

          <button
            onClick={() => setFinanceCollapsed(prev => !prev)}
            className="relative z-10 w-full h-[74px] flex items-center justify-between border-b border-slate-200/50 px-6 dark:border-white/10 shrink-0 hover:bg-white/20 dark:hover:bg-white/5 transition-colors"
          >
            <h2 className="font-display text-lg font-bold tracking-[0.2em] text-slate-900 dark:text-white uppercase drop-shadow-sm flex items-center gap-3">
              <div className="w-1.5 h-6 rounded-full bg-emerald-400" />
              DAILY OPS FINANCE
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-500 font-bold hover:text-emerald-400">
              {financeCollapsed ? 'EXPAND' : 'COLLAPSE'}
            </span>
          </button>

          <div className={cn(
            "relative z-10 flex-1 space-y-3 p-5 overflow-y-auto no-scrollbar transition-opacity duration-300",
            financeCollapsed ? "opacity-0 pointer-events-none delay-0" : "opacity-100 delay-200"
          )}>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/70 px-3 py-2 dark:border-emerald-400/20 dark:bg-emerald-500/10">
                <p className="font-mono text-[9px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Paid</p>
                <p className="font-display text-xl text-emerald-700 dark:text-emerald-300">${financeSummary.paid.toFixed(0)}</p>
              </div>
              <div className="rounded-xl border border-amber-200/60 bg-amber-50/70 px-3 py-2 dark:border-amber-400/20 dark:bg-amber-500/10">
                <p className="font-mono text-[9px] uppercase tracking-wider text-amber-700 dark:text-amber-300">Outstanding</p>
                <p className="font-display text-xl text-amber-700 dark:text-amber-300">${financeSummary.outstanding.toFixed(0)}</p>
              </div>
              <div className="rounded-xl border border-indigo-200/60 bg-indigo-50/70 px-3 py-2 dark:border-indigo-400/20 dark:bg-indigo-500/10">
                <p className="font-mono text-[9px] uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Uninvoiced</p>
                <p className="font-display text-xl text-indigo-700 dark:text-indigo-300">${financeSummary.uninvoiced.toFixed(0)}</p>
              </div>
              <div className="rounded-xl border border-cyan-200/60 bg-cyan-50/70 px-3 py-2 dark:border-cyan-400/20 dark:bg-cyan-500/10">
                <p className="font-mono text-[9px] uppercase tracking-wider text-cyan-700 dark:text-cyan-300">Total Work Hours</p>
                <p className="font-display text-xl text-cyan-700 dark:text-cyan-300">{financeSummary.workHours.toFixed(1)}h</p>
              </div>
            </div>

            {dayFinanceRows.map((row) => (
              <div
                key={row.id}
                className="group relative rounded-2xl bg-white dark:bg-slate-800/60 p-4 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/50 overflow-hidden cursor-default mb-3"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-emerald-100 to-cyan-100 dark:from-emerald-500/20 dark:to-cyan-500/20 text-emerald-700 dark:text-cyan-400 font-display font-bold text-lg shadow-inner">
                    {(row.customerName || 'UN').substring(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="truncate font-sans font-semibold text-[13px] tracking-wide text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors">
                      {row.customerName}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={row.status} />
                        <InvoiceBadge status={row.invoiceStatus} />
                      </div>
                      <span className="font-mono text-[11px] font-bold tracking-wider text-slate-600 dark:text-slate-300">
                        ${row.amount.toFixed(0)}
                      </span>
                    </div>
                    {row.activeDurationMs > 0 && (
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-cyan-200/60 bg-cyan-50/80 px-2 py-1 dark:border-cyan-400/20 dark:bg-cyan-500/10">
                        <Clock3 className="h-3 w-3 text-cyan-600 dark:text-cyan-300" />
                        <span className="font-mono text-[9px] uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                          Active {formatDuration(row.activeDurationMs)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {dayFinanceRows.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 opacity-50">
                <div className="w-12 h-12 rounded-full border border-dashed border-slate-400 dark:border-slate-600 mb-4 animate-spin-slow" />
                <p className="font-mono text-[10px] tracking-widest text-slate-500 uppercase text-center px-4">No billable jobs for selected day</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricBadge({ label, value, color }: { label: string, value: number, color: string }) {
  const themes: Record<string, string> = {
    indigo: "text-indigo-600 dark:text-indigo-400",
    cyan: "text-cyan-600 dark:text-cyan-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    purple: "text-purple-600 dark:text-purple-400",
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-r last:border-r-0 border-slate-200 dark:border-white/5">
      <span className="font-mono text-[10px] tracking-widest uppercase text-slate-500 dark:text-slate-400 font-medium">
        {label}
      </span>
      <span className={cn("font-display text-lg font-bold leading-none", themes[color] || themes.indigo)}>
        {value}
      </span>
    </div>
  )
}

function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours <= 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

function InvoiceBadge({ status }: { status: string }) {
  const tone = status === 'paid'
    ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-400/30'
    : status === 'sent' || status === 'overdue'
      ? 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-500/10 dark:border-amber-400/30'
      : status === 'draft'
        ? 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-300 dark:bg-indigo-500/10 dark:border-indigo-400/30'
        : 'text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-slate-500/10 dark:border-slate-500/30'

  const label = status === 'missing' ? 'NO INVOICE' : status.toUpperCase()

  return (
    <span className={cn("inline-flex items-center rounded-lg border px-2 py-1 font-mono text-[9px] uppercase tracking-wider font-bold", tone)}>
      {label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { colors: string, icon?: string }> = {
    scheduled: { colors: 'text-indigo-700 bg-indigo-50 border border-indigo-200 dark:text-indigo-300 dark:bg-indigo-500/10 dark:border-indigo-400/30' },
    on_the_way: { colors: 'text-amber-700 bg-amber-50 border border-amber-200 dark:text-amber-300 dark:bg-amber-400/10 dark:border-amber-400/30 line-through decoration-amber-500/50' },
    arrived: { colors: 'text-orange-700 bg-orange-50 border border-orange-200 dark:text-orange-300 dark:bg-orange-400/10 dark:border-orange-400/30' },
    in_progress: { colors: 'text-cyan-700 bg-cyan-50 border border-cyan-200 dark:text-cyan-300 dark:bg-cyan-400/10 dark:border-cyan-400/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]' },
    completed: { colors: 'text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-400/10 dark:border-emerald-400/30' },
    cancelled: { colors: 'text-slate-600 bg-slate-100 border border-slate-200 dark:text-slate-400 dark:bg-slate-500/10 dark:border-slate-500/30 opacity-75' },
  }

  const config = statusConfig[status] || statusConfig.scheduled
  const label = status === 'on_the_way' ? 'EN ROUTE' : status.replace('_', ' ').toUpperCase()

  return (
    <span className={cn(
      "inline-flex items-center justify-center rounded-lg px-2 py-1 font-mono text-[9px] tracking-widest font-bold uppercase transition-all",
      config.colors
    )}>
      {label}
    </span>
  )
}
