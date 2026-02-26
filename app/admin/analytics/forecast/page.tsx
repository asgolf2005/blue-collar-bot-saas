import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AlertTriangle,
  CalendarDays,
  DollarSign,
  Gauge,
  TrendingDown,
  TrendingUp,
  Wrench,
} from '@/components/ui/lucide'
import type { ElementType } from 'react'
import {
  ADMIN_RANGE_OPTIONS,
  getDateRange,
  getRangeLookbackDays,
  resolveDateRangeKey,
  type DateRangeKey,
} from '@/lib/analytics/dateUtils'
import { calculateForecastData } from '@/lib/analytics/calculations'
import {
  InvoiceWithRelations,
  JobWithRelations,
} from '@/lib/analytics/types'
import { createClient } from '@/lib/supabase/server'
import {
  fetchInvoicesInWindow,
  fetchJobsInWindow,
  fetchOpenJobsInScheduledWindow,
} from '@/lib/analytics/server-queries'
import RangeMenuSelector from '../components/RangeMenuSelector'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function toneForRisk(value: number, highThreshold: number, mediumThreshold: number): string {
  if (value >= highThreshold) return 'text-rose-600 dark:text-rose-300'
  if (value >= mediumThreshold) return 'text-amber-600 dark:text-amber-300'
  return 'text-emerald-600 dark:text-emerald-300'
}

function confidenceBadge(confidence: 'low' | 'medium' | 'high'): string {
  if (confidence === 'high') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
  if (confidence === 'medium') return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
  return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
}

interface ActionItem {
  id: string
  title: string
  details: string
  impact: string
  owner: string
  timeline: string
  priority: 'high' | 'medium' | 'low'
}

function priorityClass(priority: ActionItem['priority']): string {
  if (priority === 'high') return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
  if (priority === 'medium') return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
  return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
}

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, value))
}

function DriverBar({
  label,
  valueLabel,
  helper,
  barPercent,
  barColor,
}: {
  label: string
  valueLabel: string
  helper: string
  barPercent: number
  barColor: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2">
        <p className="font-sans text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="font-display text-2xl text-slate-900 dark:text-white">{valueLabel}</p>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${clampPct(barPercent)}%` }} />
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">{helper}</p>
    </div>
  )
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  valueClass = 'text-slate-900 dark:text-white',
}: {
  label: string
  value: string
  detail: string
  icon: ElementType
  valueClass?: string
}) {
  return (
    <div className="admin-card p-5">
      <div className="flex items-center justify-between">
        <p className="font-sans text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <Icon className="w-4 h-4 text-cyan-500" />
      </div>
      <p className={`mt-2 font-display text-4xl ${valueClass}`}>{value}</p>
      <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  )
}

export default async function AnalyticsForecastPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined }
}) {
  const params = searchParams ? await Promise.resolve(searchParams) : {}
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.business_id) redirect('/login')

  const businessId = profile.business_id
  const range: DateRangeKey = resolveDateRangeKey(params?.range)
  const selectedRange = ADMIN_RANGE_OPTIONS.find((option) => option.key === range) || ADMIN_RANGE_OPTIONS[2]
  const dateRange = getDateRange(range)
  const horizonDays = getRangeLookbackDays(range)
  const now = new Date()
  const horizonEnd = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000)

  const [currentJobsRaw, currentInvoicesRaw, futureOpenJobsRaw] = await Promise.all([
    fetchJobsInWindow({
      supabase,
      businessId,
      start: dateRange.start,
      end: dateRange.end,
    }),
    fetchInvoicesInWindow({
      supabase,
      businessId,
      start: dateRange.start,
      end: dateRange.end,
    }),
    fetchOpenJobsInScheduledWindow({
      supabase,
      businessId,
      start: now,
      end: horizonEnd,
    }),
  ])
  const { data: usersRows = [], error: usersError } = await supabase
    .from('users')
    .select('id, full_name, role')
    .eq('business_id', businessId)
  if (usersError) throw usersError
  const users = usersRows || []

  const usersMap = new Map(users.map((row) => [row.id, row.full_name || 'Unknown']))

  const currentJobs: JobWithRelations[] = currentJobsRaw.map((job) => ({
    id: job.id,
    status: (job.status || 'scheduled') as JobWithRelations['status'],
    total_cost: job.total_cost,
    created_at: job.created_at,
    scheduled_start: job.scheduled_start,
    scheduled_end: job.scheduled_end,
    completed_at: null,
    description: job.description,
    customer: null,
    technician: job.technician_id
      ? {
          id: job.technician_id,
          full_name: usersMap.get(job.technician_id) || 'Unknown',
        }
      : null,
    service: null,
  }))

  const futureOpenJobs: JobWithRelations[] = futureOpenJobsRaw.map((job) => ({
    id: job.id,
    status: (job.status || 'scheduled') as JobWithRelations['status'],
    total_cost: job.total_cost,
    created_at: job.created_at,
    scheduled_start: job.scheduled_start,
    scheduled_end: job.scheduled_end,
    completed_at: null,
    description: job.description,
    customer: null,
    technician: job.technician_id
      ? {
          id: job.technician_id,
          full_name: usersMap.get(job.technician_id) || 'Unknown',
        }
      : null,
    service: null,
  }))

  const allJobsById = new Map<string, JobWithRelations>()
  for (const job of [...currentJobs, ...futureOpenJobs]) allJobsById.set(job.id, job)
  const allJobs = Array.from(allJobsById.values())

  const currentInvoices: InvoiceWithRelations[] = currentInvoicesRaw.map((invoice) => ({
    id: invoice.id,
    status: (invoice.status || 'draft') as InvoiceWithRelations['status'],
    total: invoice.total || 0,
    subtotal: invoice.subtotal || 0,
    tax: invoice.tax || 0,
    created_at: invoice.created_at,
    paid_at: invoice.paid_at,
    issue_date: invoice.issue_date,
    due_date: invoice.due_date,
    customer: null,
    job: null,
  }))

  const techCount = users.filter((row) => row?.role === 'tech').length
  const forecast = calculateForecastData({
    currentJobs,
    allJobs,
    currentInvoices,
    techCount,
    rangeStart: dateRange.start,
    rangeEnd: dateRange.end,
    horizonDays,
  })

  const rangeQuery = `range=${range}`
  const delayScoreClass = toneForRisk(forecast.delayRiskScore, 70, 40)
  const cancelRiskClass = toneForRisk(forecast.cancellationRisk, 18, 10)
  const confidenceBase: Record<'low' | 'medium' | 'high', number> = { low: 34, medium: 64, high: 86 }
  const confidencePenalty = Math.min(
    18,
    Math.round(forecast.drivers.unassignedRate / 2) + Math.round(forecast.cancellationRisk / 2)
  )
  const confidenceBoost = forecast.drivers.completionRate >= 95 ? 4 : forecast.drivers.completionRate >= 90 ? 2 : 0
  const confidenceScore = Math.max(0, Math.min(100, confidenceBase[forecast.confidence] - confidencePenalty + confidenceBoost))

  const closedJobsInRange = currentJobs.filter((job) => job.status === 'completed' || job.status === 'cancelled').length
  const closedGap = Math.max(0, 80 - closedJobsInRange)
  const scheduledGap = Math.max(0, 30 - forecast.scheduledPipelineJobs)
  const unassignedGap = Math.max(0, forecast.drivers.unassignedRate - 10)
  const cancellationGap = Math.max(0, forecast.cancellationRisk - 5)
  const currentUnassignedJobs = Math.round((forecast.scheduledPipelineJobs * forecast.drivers.unassignedRate) / 100)
  const maxAllowedUnassignedJobs = Math.floor(forecast.scheduledPipelineJobs * 0.1)
  const assignmentsNeeded = Math.max(0, currentUnassignedJobs - maxAllowedUnassignedJobs)
  const cancellationsToPrevent = Math.max(0, Math.ceil((forecast.expectedJobVolume * cancellationGap) / 100))

  const pipelineCoveragePct = forecast.expectedJobVolume > 0
    ? Math.round((forecast.scheduledPipelineJobs / forecast.expectedJobVolume) * 100)
    : 0
  const projectedRevenuePerJob = forecast.expectedJobVolume > 0
    ? Math.round(forecast.projectedRevenue / forecast.expectedJobVolume)
    : 0
  const revenueAtRisk = Math.round((forecast.projectedRevenue * forecast.cancellationRisk) / 100)
  const delayAffectedJobs = Math.round((forecast.expectedJobVolume * forecast.delayRiskScore) / 100)
  const confidenceLiftPoints = Math.min(100 - confidenceScore, Math.round(closedGap / 8) + Math.round(scheduledGap / 4) + Math.round(unassignedGap / 2) + Math.round(cancellationGap / 2))
  const projectedConfidenceScore = Math.min(100, confidenceScore + confidenceLiftPoints)

  const actionItems: ActionItem[] = []
  if (scheduledGap > 0) {
    actionItems.push({
      id: 'pipeline-coverage',
      title: `Close pipeline gap (+${scheduledGap} jobs)`,
      details: `Forecast expects ${forecast.expectedJobVolume} jobs in the next ${forecast.horizonDays} days, but only ${forecast.scheduledPipelineJobs} are currently scheduled.`,
      impact: `Improves visibility by +${Math.min(20, scheduledGap)} pts and protects utilization.`,
      owner: 'Sales + Dispatch',
      timeline: 'This week',
      priority: 'high',
    })
  }
  if (assignmentsNeeded > 0) {
    actionItems.push({
      id: 'assignment-quality',
      title: `Assign ${assignmentsNeeded} open jobs now`,
      details: `${forecast.drivers.unassignedRate.toFixed(1)}% of forward jobs are unassigned. Bring this to <=10% to reduce delays.`,
      impact: `Expected lift: faster starts + lower delay risk score.`,
      owner: 'Dispatch',
      timeline: 'Next 24 hours',
      priority: 'high',
    })
  }
  if (cancellationsToPrevent > 0) {
    actionItems.push({
      id: 'cancellation-control',
      title: `Protect ~${cancellationsToPrevent} jobs from cancellation`,
      details: `Run reminder confirmations and ETA updates on at-risk appointments.`,
      impact: `Potential revenue protected: ~$${Math.round(cancellationsToPrevent * forecast.drivers.avgRevenuePerCompletedJob).toLocaleString()}.`,
      owner: 'Customer Ops',
      timeline: 'Next 72 hours',
      priority: 'medium',
    })
  }
  if (forecast.delayRiskScore >= 40) {
    actionItems.push({
      id: 'delay-pressure',
      title: 'Reduce delay pressure in active routes',
      details: `Delay risk is ${forecast.delayRiskScore.toFixed(1)}/100 across the current operating mix.`,
      impact: `Targets ~${delayAffectedJobs} jobs likely to absorb delay impact.`,
      owner: 'Field Ops',
      timeline: 'Daily standup',
      priority: forecast.delayRiskScore >= 70 ? 'high' : 'medium',
    })
  }
  if (closedGap > 0) {
    actionItems.push({
      id: 'history-coverage',
      title: `Increase closed-history depth (+${closedGap} jobs)`,
      details: 'Model confidence improves significantly when historical closed jobs are deep enough per selected period.',
      impact: `Potential confidence lift up to +${Math.min(18, Math.ceil(closedGap / 8))} points.`,
      owner: 'Analytics',
      timeline: 'This month',
      priority: 'low',
    })
  }
  if (actionItems.length === 0) {
    actionItems.push({
      id: 'steady-state',
      title: 'No immediate blockers',
      details: 'Coverage, assignment quality, and cancellation profile are currently healthy.',
      impact: 'Maintain current operating cadence and re-check weekly.',
      owner: 'Ops Leadership',
      timeline: 'Weekly review',
      priority: 'low',
    })
  }

  const safeguardedRevenue = forecast.projectedRevenue + Math.round(cancellationsToPrevent * forecast.drivers.avgRevenuePerCompletedJob)
  const stretchRevenue = safeguardedRevenue + Math.round(Math.max(0, scheduledGap) * forecast.drivers.avgRevenuePerCompletedJob * 0.8)

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl sm:text-6xl tracking-wide text-slate-900 dark:text-white">
            ANALYTICS
          </h1>
          <p className="font-mono text-xs tracking-widest text-slate-500 dark:text-slate-400 mt-1">
            Forecast Model - {selectedRange.label.toUpperCase()} Baseline - Next <span className="font-display">{forecast.horizonDays}</span> Days
          </p>
          <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
            <Link
              href={`/admin/analytics?${rangeQuery}`}
              className="rounded-full px-3 py-1.5 font-mono text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Overview
            </Link>
            <Link
              href={`/admin/analytics/forecast?${rangeQuery}`}
              className="rounded-full px-3 py-1.5 font-mono text-xs bg-cyan-600 dark:bg-cyan-500 text-white"
            >
              Forecast
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <RangeMenuSelector selectedRange={range} />
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 flex items-center gap-3">
            <div className="relative h-16 w-5 rounded-full border border-slate-300 dark:border-slate-700 bg-gradient-to-t from-rose-500 via-amber-400 to-emerald-500 overflow-hidden">
              <div
                className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border border-white/70 dark:border-slate-300/50 bg-white dark:bg-slate-900 shadow-sm"
                style={{ bottom: `calc(${confidenceScore}% - 6px)` }}
              />
            </div>
            <div>
              <p className="font-display text-2xl text-slate-900 dark:text-white leading-none">
                {confidenceScore}
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400 ml-1">/100</span>
              </p>
              <span className={`mt-1 inline-flex px-2 py-0.5 rounded-full border font-mono text-[10px] uppercase ${confidenceBadge(forecast.confidence)}`}>
                {forecast.confidence}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <MetricCard
          label="Projected Revenue"
          value={`$${forecast.projectedRevenue.toLocaleString()}`}
          detail={`Forecast horizon: ${forecast.horizonDays} days`}
          icon={DollarSign}
          valueClass="text-emerald-600 dark:text-emerald-400"
        />
        <MetricCard
          label="Expected Job Volume"
          value={`${forecast.expectedJobVolume}`}
          detail={`${forecast.scheduledPipelineJobs} already scheduled`}
          icon={CalendarDays}
        />
        <MetricCard
          label="Pipeline Coverage"
          value={`${pipelineCoveragePct}%`}
          detail="Scheduled jobs vs expected demand"
          icon={TrendingUp}
          valueClass={pipelineCoveragePct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : pipelineCoveragePct >= 60 ? 'text-amber-600 dark:text-amber-300' : 'text-rose-600 dark:text-rose-300'}
        />
        <MetricCard
          label="Delay Risk Score"
          value={`${forecast.delayRiskScore.toFixed(0)}`}
          detail="Score out of 100"
          icon={Gauge}
          valueClass={delayScoreClass}
        />
        <MetricCard
          label="Cancellation Risk"
          value={`${forecast.cancellationRisk.toFixed(1)}%`}
          detail={`~${forecast.predictedCancelledJobs} jobs at risk`}
          icon={TrendingDown}
          valueClass={cancelRiskClass}
        />
        <MetricCard
          label="Revenue at Risk"
          value={`$${revenueAtRisk.toLocaleString()}`}
          detail="Estimated from cancellation risk profile"
          icon={AlertTriangle}
          valueClass={revenueAtRisk > 0 ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-600 dark:text-emerald-400'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="admin-card p-5 xl:col-span-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-500" />
            <h2 className="admin-section-title">Forecast Drivers</h2>
          </div>
          <p className="font-sans text-sm text-slate-500 dark:text-slate-400 mt-1">
            Driver-based health checks for demand visibility, execution reliability, and revenue quality.
          </p>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
            <DriverBar
              label="Completion Rate"
              valueLabel={`${forecast.drivers.completionRate.toFixed(1)}%`}
              helper="Target: >= 90%"
              barPercent={forecast.drivers.completionRate}
              barColor="bg-gradient-to-r from-emerald-400 to-emerald-500"
            />
            <DriverBar
              label="Unassigned Pipeline"
              valueLabel={`${forecast.drivers.unassignedRate.toFixed(1)}%`}
              helper="Target: <= 10%"
              barPercent={100 - clampPct(forecast.drivers.unassignedRate)}
              barColor="bg-gradient-to-r from-amber-400 to-orange-500"
            />
            <DriverBar
              label="Capacity Utilization"
              valueLabel={`${forecast.drivers.utilizationPct.toFixed(1)}%`}
              helper="Target band: 70-90%"
              barPercent={forecast.drivers.utilizationPct}
              barColor="bg-gradient-to-r from-cyan-400 to-blue-500"
            />
            <DriverBar
              label="Historical Cancel Rate"
              valueLabel={`${forecast.drivers.historicalCancellationRate.toFixed(1)}%`}
              helper="Target: <= 5%"
              barPercent={100 - clampPct(forecast.drivers.historicalCancellationRate * 5)}
              barColor="bg-gradient-to-r from-rose-400 to-rose-500"
            />
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2">
              <p className="font-sans text-sm font-medium text-slate-600 dark:text-slate-300">Revenue per Planned Job</p>
              <p className="font-display text-3xl text-slate-900 dark:text-white">
                ${projectedRevenuePerJob.toLocaleString()}
              </p>
            </div>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Computed from projected revenue / expected job volume
            </p>
          </div>
        </div>

        <div className="admin-card p-5 xl:col-span-2">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-500" />
            <h2 className="admin-section-title">Action Queue</h2>
          </div>
          <p className="font-sans text-sm text-slate-500 dark:text-slate-400 mt-1">
            Highest-impact operations moves to improve forecast confidence and delivery outcomes.
          </p>

          <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Confidence Path</p>
              <p className="font-display text-xl text-slate-900 dark:text-white">
                {confidenceScore}
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400 mx-1">to</span>
                {projectedConfidenceScore}
              </p>
            </div>
            <p className="mt-1 font-sans text-xs text-slate-600 dark:text-slate-300">
              Executing current blockers can improve confidence by up to +{confidenceLiftPoints} points.
            </p>
          </div>

          <div className="mt-3 space-y-2.5">
            {actionItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-sans text-sm font-semibold text-slate-900 dark:text-white">{item.title}</p>
                  <span className={`px-2 py-0.5 rounded-full border font-mono text-[10px] uppercase ${priorityClass(item.priority)}`}>
                    {item.priority}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{item.details}</p>
                <p className="mt-2 text-xs text-slate-700 dark:text-slate-200">
                  <span className="font-mono text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mr-1">Impact:</span>
                  {item.impact}
                </p>
                <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <span>Owner: {item.owner}</span>
                  <span>{item.timeline}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="admin-card p-5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Baseline Scenario</p>
          <p className="mt-2 font-display text-3xl text-slate-900 dark:text-white">${forecast.projectedRevenue.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Current model output with existing risk profile.</p>
        </div>
        <div className="admin-card p-5 border-amber-200/70 dark:border-amber-500/30">
          <p className="font-mono text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-300">Safeguarded Scenario</p>
          <p className="mt-2 font-display text-3xl text-amber-700 dark:text-amber-300">${safeguardedRevenue.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Assumes cancellation prevention actions recover ~{cancellationsToPrevent} jobs.
          </p>
        </div>
        <div className="admin-card p-5 border-emerald-200/70 dark:border-emerald-500/30">
          <p className="font-mono text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-300">Stretch Scenario</p>
          <p className="mt-2 font-display text-3xl text-emerald-700 dark:text-emerald-300">${stretchRevenue.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Adds pipeline gap closure and cancellation safeguards on top of baseline.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Interpretation Notes</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          This forecast is driver-based and intended for operational planning. It is most reliable when history depth is healthy, forward pipeline visibility is high, and assignment quality is controlled.
        </p>
      </div>
    </div>
  )
}
