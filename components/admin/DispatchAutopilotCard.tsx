'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, Loader2, Sparkles, UserCheck } from '@/components/ui/icons'
import { Button } from '@/components/ui/Button'
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
  if (value === 'high') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
  if (value === 'medium') return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
  return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300'
}

function formatWhen(value: string | null) {
  if (!value) return 'No schedule'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No schedule'
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function DispatchAutopilotCard() {
  const router = useRouter()
  const [horizonDays, setHorizonDays] = useState<(typeof HORIZON_OPTIONS)[number]>(7)
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [result, setResult] = useState<DispatchResponse | null>(null)

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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300">
            <Bot className="h-3.5 w-3.5" />
            Smart Dispatch Autopilot
          </div>
          <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Assign unassigned jobs in one pass</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Scores technicians by conflicts, workload, service fit, and customer history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-full border border-slate-200 p-1 dark:border-slate-700">
            {HORIZON_OPTIONS.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setHorizonDays(days)}
                className={`rounded-full px-3 py-1 text-[11px] font-mono transition-colors ${
                  horizonDays === days
                    ? 'bg-blue-600 text-white dark:bg-cyan-500'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="glass"
            size="sm"
            className="rounded-full text-xs"
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
            className="rounded-full text-xs"
            onClick={() => void runAutopilot('apply')}
            disabled={loading || applying || !hasRecommendations}
            icon={applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
          >
            {applying ? 'Applying...' : 'Apply Plan'}
          </Button>
        </div>
      </div>

      {result && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {result.summary.unassignedJobs} unassigned
            </span>
            <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
              {result.summary.recommendations} recommendations
            </span>
            {typeof result.summary.appliedCount === 'number' && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                {result.summary.appliedCount} applied
              </span>
            )}
          </div>

          {result.recommendations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
              {result.summary.message || 'No matching jobs for this horizon.'}
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {result.recommendations.slice(0, 8).map((rec) => (
                <div
                  key={rec.jobId}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{rec.customerName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{formatWhen(rec.scheduledStart)}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono uppercase ${confidenceTone(rec.confidence)}`}>
                      {rec.confidence}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-semibold">Assign:</span> {rec.suggestedTechnicianName}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{rec.reasons.join(' | ')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

