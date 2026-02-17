'use client'
import { toReadableSentence, toTitleCase } from '@/lib/utils/text'

export interface PartAnalysis {
  partName: string
  likelyIssue: string
  replacementNeeded: boolean
  confidence: number
  keyObservations: string[]
  searchTerms: string[]
}

export interface PartServiceMatch {
  id: string
  name: string
  description: string | null
  base_price: number | null
  matchScore: number
}

interface PartAnalysisResultProps {
  analysis: PartAnalysis
  serviceMatches: PartServiceMatch[]
  onAddToInvoice: (service?: PartServiceMatch) => void
  busy?: boolean
}

export default function PartAnalysisResult({
  analysis,
  serviceMatches,
  onAddToInvoice,
  busy = false,
}: PartAnalysisResultProps) {
  const confidenceLabel =
    analysis.confidence >= 80 ? 'High Confidence' : analysis.confidence >= 60 ? 'Medium Confidence' : 'Low Confidence'
  const confidenceBar = Math.max(8, Math.min(100, analysis.confidence))
  const partTitle = toTitleCase(analysis.partName || 'Unknown component')
  const likelyIssue = toReadableSentence(analysis.likelyIssue || 'No issue details provided')
  const observations = analysis.keyObservations.map((item) => toReadableSentence(item)).filter(Boolean)
  const nextStep = analysis.replacementNeeded
    ? 'Replacement is likely the safest next step based on visible condition.'
    : 'Part may still be serviceable. Verify with a quick functional test before replacing.'

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Part Assessment</p>
          <h4 className="mt-1 text-base font-semibold text-slate-100">{partTitle}</h4>
          <p className="mt-1 text-xs text-slate-300">{confidenceLabel} ({analysis.confidence}%)</p>
        </div>
        {analysis.replacementNeeded ? (
          <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-200">
            Replacement likely
          </span>
        ) : (
          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-200">
            May be serviceable
          </span>
        )}
      </div>

      <div className="mt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-slate-300 transition-all duration-300" style={{ width: `${confidenceBar}%` }} />
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/60 p-3">
        <p className="text-xs uppercase tracking-[0.1em] text-slate-400">Likely Issue</p>
        <p className="mt-1 text-sm text-slate-200">{likelyIssue}</p>
      </div>

      {observations.length > 0 && (
        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/60 p-3">
          <p className="text-xs uppercase tracking-[0.1em] text-slate-400">What We Can Confirm</p>
          <ul className="mt-2 space-y-1 text-xs text-slate-300">
          {observations.map((observation) => (
            <li key={observation} className="flex items-start gap-2">
              <span className="mt-[0.35rem] h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
              <span>{observation}</span>
            </li>
          ))}
          </ul>
        </div>
      )}

      <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/60 p-3">
        <p className="text-xs uppercase tracking-[0.1em] text-slate-400">Reasoning</p>
        <p className="mt-1 text-sm text-slate-200">{nextStep}</p>
      </div>

      <div className="mt-3">
        <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Catalog Matches</p>
        {serviceMatches.length === 0 ? (
          <p className="mt-2 text-xs text-slate-300">No matching services found. Use manual search.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {serviceMatches.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() => onAddToInvoice(service)}
                disabled={busy}
                className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-left transition-colors hover:border-slate-500 hover:bg-slate-900 disabled:opacity-60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-100">{service.name}</p>
                  <p className="text-xs text-slate-400">
                    {typeof service.base_price === 'number'
                      ? `$${service.base_price.toFixed(2)} base`
                      : 'Price not set'}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-cyan-300">Add</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onAddToInvoice(undefined)}
        disabled={busy}
        className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700 disabled:opacity-60"
      >
        <span>Add Top Suggestion to Invoice Notes</span>
      </button>
    </div>
  )
}
