'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, Loader2, Sparkles, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SlidingSegmentedControl } from '@/components/ui/SlidingSegmentedControl'
import { type ControlPreset, controlPresetClasses } from '@/lib/ui/control-presets'
import { showToast } from '@/lib/utils/toast'

interface DispatchRecommendation {
  jobId: string
  customerName: string
  scheduledStart: string | null
  currentStatus: string
  suggestedTechnicianId: string
  suggestedTechnicianName: string
  score: number
  confidence: 'high' | 'medium' | 'low'
  reasons: string[]
}

interface DispatchResponse {
  summary: {
    mode: 'preview' | 'apply'
    horizonDays: number
    unassignedJobs: number
    recommendations: number
    appliedCount?: number
    skippedCount?: number
    message?: string
  }
  recommendations: DispatchRecommendation[]
}

const HORIZON_OPTIONS = [3, 7, 14] as const

function confidenceTone(value: DispatchRecommendation['confidence']) {
  if (value === 'high') return 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20'
  if (value === 'medium') return 'text-amber-400 bg-amber-400/10 border border-amber-400/20'
  return 'text-slate-300 bg-slate-500/10 border border-slate-500/20'
}

function formatWhen(value: string | null) {
  if (!value) return 'No schedule'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No schedule'
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function DispatchAutopilotCard({
  uiPreset = 'option1',
  compact = false,
}: {
  uiPreset?: ControlPreset
  compact?: boolean
}) {
  const router = useRouter()
  const [horizonDays, setHorizonDays] = useState<(typeof HORIZON_OPTIONS)[number]>(7)
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [result, setResult] = useState<DispatchResponse | null>(null)
  const uiPresetClasses = controlPresetClasses[uiPreset]

  const hasRecommendations = useMemo(
    () => Boolean(result && result.recommendations.length > 0),
    [result]
  )

  const runAutopilot = async (mode: 'preview' | 'apply') => {
    if (mode === 'apply' && !hasRecommendations) {
      showToast.info('Run preview first to validate the plan')
      return
    }

    if (mode === 'apply') {
      const confirmed = window.confirm(
        `Apply auto-assignment to ${result?.recommendations.length || 0} jobs?`
      )
      if (!confirmed) return
    }

    if (mode === 'apply') setApplying(true)
    else setLoading(true)

    try {
      const response = await fetch('/api/dispatch/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, horizonDays }),
      })

      const payload = (await response.json().catch(() => null)) as DispatchResponse | { error?: string } | null
      if (!response.ok) {
        throw new Error((payload as { error?: string } | null)?.error || 'Failed to run dispatch autopilot')
      }

      const parsed = payload as DispatchResponse
      setResult(parsed)

      if (mode === 'apply') {
        const appliedCount = parsed.summary.appliedCount || 0
        showToast.success(`Autopilot applied: ${appliedCount} job${appliedCount === 1 ? '' : 's'} assigned`)
        router.refresh()
      } else {
        const suggestions = parsed.recommendations.length
        showToast.success(`Autopilot plan ready: ${suggestions} recommendation${suggestions === 1 ? '' : 's'}`)
      }
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to run dispatch autopilot')
    } finally {
      setLoading(false)
      setApplying(false)
    }
  }

  return (
    <div
      className={
        compact
          ? 'rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700/80 dark:bg-slate-900/80'
          : 'rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900'
      }
    >
      {compact ? (
        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-2 rounded-[2px] border border-cyan-300 bg-cyan-50 px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-400">
            <Bot className="h-3.5 w-3.5" />
            Smart Dispatch
          </div>

          <SlidingSegmentedControl
            options={HORIZON_OPTIONS.map((days) => ({ value: String(days), label: `${days}d` }))}
            value={String(horizonDays)}
            onChange={(next) => setHorizonDays(Number.parseInt(next, 10) as (typeof HORIZON_OPTIONS)[number])}
            ariaLabel="Dispatch horizon"
            groupClassName={`${uiPresetClasses.segmentedGroup} w-full`}
            indicatorClassName={uiPresetClasses.segmentedIndicator}
            buttonBaseClassName={`${uiPresetClasses.segmentedBase} px-2 py-1 text-center text-[11px] font-mono`}
            activeClassName={uiPresetClasses.segmentedActive}
            inactiveClassName={uiPresetClasses.segmentedInactive}
          />

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="glass"
              size="sm"
              className={`w-full justify-center text-xs font-semibold ${uiPresetClasses.previewAction}`}
              onClick={() => void runAutopilot('preview')}
              disabled={loading || applying}
              icon={loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            >
              {loading ? 'Planning...' : 'Preview'}
            </Button>
            <Button
              type="button"
              variant="glassPrimary"
              size="sm"
              className={`w-full justify-center text-xs font-semibold ${uiPresetClasses.commitAction}`}
              onClick={() => void runAutopilot('apply')}
              disabled={loading || applying || !hasRecommendations}
              icon={applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
            >
              {applying ? 'Applying...' : 'Apply'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-[2px] border border-cyan-300 bg-cyan-50 px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-400">
              <Bot className="h-3.5 w-3.5" />
              Smart Dispatch Autopilot
            </div>
            <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">Assign unassigned jobs in one pass</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Scores technicians by conflicts, workload, service fit, and customer history.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SlidingSegmentedControl
              options={HORIZON_OPTIONS.map((days) => ({ value: String(days), label: `${days}d` }))}
              value={String(horizonDays)}
              onChange={(next) => setHorizonDays(Number.parseInt(next, 10) as (typeof HORIZON_OPTIONS)[number])}
              ariaLabel="Dispatch horizon"
              groupClassName={uiPresetClasses.segmentedGroup}
              indicatorClassName={uiPresetClasses.segmentedIndicator}
              buttonBaseClassName={`${uiPresetClasses.segmentedBase} px-3 py-1 text-[11px] font-mono`}
              activeClassName={uiPresetClasses.segmentedActive}
              inactiveClassName={uiPresetClasses.segmentedInactive}
            />

            <Button
              type="button"
              variant="glass"
              size="sm"
              className={`text-xs font-semibold ${uiPresetClasses.previewAction}`}
              onClick={() => void runAutopilot('preview')}
              disabled={loading || applying}
              icon={loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            >
              {loading ? 'Planning...' : 'Preview Plan'}
            </Button>
            <Button
              type="button"
              variant="glassPrimary"
              size="sm"
              className={`text-xs font-semibold ${uiPresetClasses.commitAction}`}
              onClick={() => void runAutopilot('apply')}
              disabled={loading || applying || !hasRecommendations}
              icon={applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
            >
              {applying ? 'Applying...' : 'Apply Plan'}
            </Button>
          </div>
        </div>
      )}

      {result && (
        <div className={`${compact ? 'mt-3 space-y-2' : 'mt-4 space-y-3'}`}>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <span className="rounded-[2px] border border-slate-200 bg-slate-100 px-2.5 py-1 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {result.summary.unassignedJobs} unassigned
            </span>
            <span className="rounded-[2px] border border-cyan-300 bg-cyan-50 px-2.5 py-1 text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-400">
              {result.summary.recommendations} recommendations
            </span>
            {typeof result.summary.appliedCount === 'number' && (
              <span className="rounded-[2px] border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400">
                {result.summary.appliedCount} applied
              </span>
            )}
          </div>

          {result.recommendations.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
              {result.summary.message || 'No matching jobs for this horizon.'}
            </div>
          ) : (
            <details className="group rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80">
              <summary className="cursor-pointer list-none px-3 py-2 text-xs font-sans font-semibold uppercase tracking-wide text-cyan-700 transition-colors hover:text-cyan-800 dark:text-cyan-300 dark:hover:text-cyan-200">
                View plan ({result.recommendations.length})
              </summary>
              <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
                <div className="min-w-[560px]">
                  <div className="grid grid-cols-[2fr_1.5fr_1fr_3fr] gap-3 border-b border-slate-200 bg-white px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    <span>Customer</span>
                    <span>Technician</span>
                    <span>Confidence</span>
                    <span>Reasoning</span>
                  </div>
                  {result.recommendations.slice(0, compact ? 5 : 8).map((rec) => (
                    <div
                      key={rec.jobId}
                      className="grid grid-cols-[2fr_1.5fr_1fr_3fr] gap-3 border-b border-slate-100 bg-white px-3 py-2 last:border-b-0 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{rec.customerName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{formatWhen(rec.scheduledStart)}</p>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300">{rec.suggestedTechnicianName}</p>
                      <div>
                        <span className={`inline-flex rounded-[2px] px-2 py-0.5 text-[10px] font-mono uppercase ${confidenceTone(rec.confidence)}`}>
                          {rec.confidence}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{rec.reasons.join(' | ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

