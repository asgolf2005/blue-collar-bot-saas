'use client'

import { useCallback, useEffect, useState } from 'react'
import { showToast } from '@/lib/utils/toast'
import { toReadableSentence } from '@/lib/utils/text'

type VerificationStatus = 'pass' | 'warning' | 'block'

interface CompletionRequirementResult {
  id: string
  label: string
  description: string
  hardFail: boolean
  passed: boolean
  confidence: number
  reason: string
}

interface CompletionVerificationResult {
  status: VerificationStatus
  summary: string
  warnings: string[]
  missingPhotoTypes: Array<'before' | 'after'>
  photoCounts: {
    before: number
    during: number
    after: number
  }
  requirements: CompletionRequirementResult[]
}

interface CompletionVerifierProps {
  jobId: string
  autoRun?: boolean
  onResult?: (result: CompletionVerificationResult) => void
}

export default function CompletionVerifier({ jobId, autoRun = false, onResult }: CompletionVerifierProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CompletionVerificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasAutoRun, setHasAutoRun] = useState(false)

  const runVerification = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/verify-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })

      const data = (await response.json()) as { result?: CompletionVerificationResult; error?: string }
      if (!response.ok || !data.result) {
        throw new Error(data.error || 'Completion verification failed')
      }

      setResult(data.result)
      onResult?.(data.result)

      if (data.result.status === 'pass') {
        showToast.success('Completion verification passed.')
      } else if (data.result.status === 'warning') {
        showToast.warning('Completion verification has warnings.')
      } else {
        showToast.error('Completion verification blocked completion.')
      }
    } catch (verifyError) {
      console.error('Completion verification failed:', verifyError)
      const message =
        verifyError instanceof Error
          ? verifyError.message
          : 'Completion verification failed. Please review manually.'
      setError(message)
      showToast.error(message)
    } finally {
      setLoading(false)
    }
  }, [jobId, onResult])

  useEffect(() => {
    if (!autoRun || hasAutoRun) return
    setHasAutoRun(true)
    void runVerification()
  }, [autoRun, hasAutoRun, runVerification])

  const statusStyles = {
    pass: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
    warning: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
    block: 'border-red-400/30 bg-red-500/10 text-red-200',
  } as const
  const statusLabel = {
    pass: 'Ready to Close',
    warning: 'Needs Review',
    block: 'Not Ready',
  } as const

  return (
    <div className="space-y-3 rounded-2xl border border-slate-700 bg-slate-950/40 p-4">
      <div>
        <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Completion Review</p>
        <p className="mt-1 text-xs text-slate-300">
          Checks whether the issue was clearly shown first and clearly resolved at the end.
        </p>
      </div>

      <button
        type="button"
        onClick={() => void runVerification()}
        disabled={loading}
        className="flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-600 bg-slate-800/80 px-3 py-3 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700 active:scale-[0.98] disabled:opacity-60"
      >
        <span>{loading ? 'Reviewing Completion...' : 'Review Job Completion'}</span>
      </button>

      {error && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className={`rounded-xl border px-3 py-2 text-sm ${statusStyles[result.status]}`}>
            <p className="font-semibold uppercase tracking-[0.08em]">Status: {statusLabel[result.status]}</p>
            <p className="mt-1">{toReadableSentence(result.summary)}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-xl border border-slate-700 bg-slate-950/40 px-2 py-2 text-slate-300">
              Before: <span className="font-semibold text-slate-100">{result.photoCounts.before}</span>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/40 px-2 py-2 text-slate-300">
              During: <span className="font-semibold text-slate-100">{result.photoCounts.during}</span>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/40 px-2 py-2 text-slate-300">
              After: <span className="font-semibold text-slate-100">{result.photoCounts.after}</span>
            </div>
          </div>

          {result.missingPhotoTypes.length > 0 && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              Missing required photo stage(s): {result.missingPhotoTypes.join(', ')}
            </div>
          )}

          {result.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {result.warnings.map((warning) => (
                <p key={warning}>{toReadableSentence(warning)}</p>
              ))}
            </div>
          )}

          <div className="space-y-2 text-xs text-slate-200">
            {result.requirements.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-2"
              >
                <span
                  className={`mt-0.5 inline-flex shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                    item.passed
                      ? 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                      : 'border border-amber-400/30 bg-amber-500/10 text-amber-300'
                  }`}
                >
                  {item.passed ? 'Pass' : 'Issue'}
                </span>
                <div>
                  <p className="font-semibold text-slate-100">{item.label}</p>
                  <p className="text-slate-300">{toReadableSentence(item.reason)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
