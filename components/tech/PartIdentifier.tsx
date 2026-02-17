'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { showToast } from '@/lib/utils/toast'
import PartAnalysisResult, { type PartAnalysis, type PartServiceMatch } from '@/components/tech/PartAnalysisResult'

interface IdentifyPartResponse {
  success?: boolean
  analysis?: PartAnalysis
  serviceMatches?: PartServiceMatch[]
  error?: string
}

interface PartIdentifierProps {
  jobId: string
}

export default function PartIdentifier({ jobId }: PartIdentifierProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [analysis, setAnalysis] = useState<PartAnalysis | null>(null)
  const [serviceMatches, setServiceMatches] = useState<PartServiceMatch[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [savingSuggestion, setSavingSuggestion] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasResult = Boolean(analysis)

  const helperText = useMemo(() => {
    if (analyzing) return 'Analyzing part photo with AI vision...'
    if (hasResult) return 'Tap a suggestion to add it to invoice notes.'
    return 'Take a photo of the part to identify it and get replacement suggestions.'
  }, [analyzing, hasResult])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const identifyPart = async (file: File) => {
    setAnalyzing(true)
    setError(null)
    setAnalysis(null)
    setServiceMatches([])

    try {
      const formData = new FormData()
      formData.append('jobId', jobId)
      formData.append('image', file)

      const response = await fetch('/api/ai/identify-part', {
        method: 'POST',
        body: formData,
      })

      const data = (await response.json()) as IdentifyPartResponse
      if (!response.ok || !data.analysis) {
        throw new Error(data.error || 'Part identification failed')
      }

      setAnalysis(data.analysis)
      setServiceMatches(data.serviceMatches || [])
      showToast.success('Part identified successfully.')
    } catch (identifyError) {
      console.error('Part identification failed:', identifyError)
      const message =
        identifyError instanceof Error ? identifyError.message : 'Part identification failed. Use manual search.'
      setError(message)
      showToast.error(message)
    } finally {
      setAnalyzing(false)
    }
  }

  const addSuggestionToInvoiceNotes = async (service?: PartServiceMatch) => {
    if (!analysis) return

    const selectedService = service || serviceMatches[0]
    const contentLines = [
      'AI Part Suggestion',
      `Part: ${analysis.partName}`,
      `Issue: ${analysis.likelyIssue}`,
      `Replacement needed: ${analysis.replacementNeeded ? 'Yes' : 'Not confirmed'}`,
      `Confidence: ${analysis.confidence}%`,
      selectedService ? `Catalog match: ${selectedService.name}` : null,
      selectedService && typeof selectedService.base_price === 'number'
        ? `Suggested price: $${selectedService.base_price.toFixed(2)}`
        : null,
    ].filter(Boolean)

    setSavingSuggestion(true)
    try {
      const response = await fetch(`/api/jobs/${jobId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentLines.join('\n'),
          is_visible_to_customer: false,
        }),
      })

      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save part suggestion')
      }

      showToast.success('Part suggestion added to invoice notes.')
    } catch (saveError) {
      console.error('Save part suggestion failed:', saveError)
      showToast.error(saveError instanceof Error ? saveError.message : 'Failed to add suggestion')
    } finally {
      setSavingSuggestion(false)
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-700 bg-slate-950/40 p-4">
      <div>
        <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Part Check</p>
        <p className="mt-1 text-xs text-slate-300">{helperText}</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) return

          if (previewUrl) {
            URL.revokeObjectURL(previewUrl)
          }
          const objectUrl = URL.createObjectURL(file)
          setPreviewUrl(objectUrl)
          void identifyPart(file)
        }}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={analyzing}
        className="flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-600 bg-slate-800/80 px-3 py-3 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700 active:scale-[0.98] disabled:opacity-60"
      >
        <span>{analyzing ? 'Reviewing Photo...' : 'Analyze This Photo'}</span>
      </button>

      {previewUrl && (
        <div className="relative h-44 overflow-hidden rounded-xl border border-slate-700 bg-slate-950/60">
          <Image
            src={previewUrl}
            alt="Part preview"
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {error}
        </div>
      )}

      {analysis && (
        <PartAnalysisResult
          analysis={analysis}
          serviceMatches={serviceMatches}
          onAddToInvoice={addSuggestionToInvoiceNotes}
          busy={savingSuggestion}
        />
      )}

      {!analysis && !analyzing && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs text-slate-300">
          Manual fallback: search in pricing if AI is unavailable.
        </div>
      )}
    </div>
  )
}
