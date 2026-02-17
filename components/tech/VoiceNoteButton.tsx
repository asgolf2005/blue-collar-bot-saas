'use client'

import { useMemo, useRef, useState } from 'react'
import type { JobNote } from '@/lib/types'
import { showToast } from '@/lib/utils/toast'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import { AlertTriangle, CheckCircle2, Loader2, Mic, Sparkles } from '@/components/ui/icons'

interface VoiceNoteButtonProps {
  jobId: string
  isVisibleToCustomer: boolean
  onInsertNote: (content: string) => void
  onNoteSaved?: (note: JobNote) => void
}

interface VoiceNotesResponse {
  success: boolean
  transcript?: string
  formattedNote?: string
  error?: string
}

export default function VoiceNoteButton({
  jobId,
  isVisibleToCustomer,
  onInsertNote,
  onNoteSaved,
}: VoiceNoteButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [generatedNote, setGeneratedNote] = useState('')
  const [transcript, setTranscript] = useState('')
  const [saving, setSaving] = useState(false)
  const pointerIsDownRef = useRef(false)
  const ignoreClickRef = useRef(false)

  const { isSupported, isRecording, recordingMs, error, startRecording, stopRecording, clearError } =
    useVoiceRecorder({ maxDurationMs: 75_000 })

  const formattedDuration = useMemo(() => {
    const seconds = Math.floor(recordingMs / 1000)
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [recordingMs])

  const processRecording = async (blob: Blob | null) => {
    if (!blob || blob.size === 0) {
      showToast.error('No audio captured. Hold to record and try again.')
      return
    }

    setIsProcessing(true)
    clearError()

    try {
      const formData = new FormData()
      const filename = `voice-note-${Date.now()}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`
      const file = new File([blob], filename, { type: blob.type || 'audio/webm' })

      formData.append('audio', file)
      formData.append('jobId', jobId)
      formData.append('mode', 'job_note')

      const response = await fetch('/api/ai/voice-notes', {
        method: 'POST',
        body: formData,
      })
      const data = (await response.json()) as VoiceNotesResponse

      if (!response.ok) {
        throw new Error(data.error || 'Voice processing failed')
      }

      const note = (data.formattedNote || '').trim()
      if (!note) {
        throw new Error('No note content returned')
      }

      setGeneratedNote(note)
      setTranscript((data.transcript || '').trim())
      showToast.success('Voice note ready. Review then save or insert.')
    } catch (processError) {
      console.error('Voice note processing failed:', processError)
      showToast.error(processError instanceof Error ? processError.message : 'Voice note failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const beginHoldRecording = async () => {
    pointerIsDownRef.current = true
    const started = await startRecording()
    if (!started) {
      pointerIsDownRef.current = false
    }
  }

  const finishHoldRecording = async () => {
    if (!pointerIsDownRef.current || !isRecording) return
    pointerIsDownRef.current = false
    const blob = await stopRecording()
    await processRecording(blob)
  }

  const handleTapToggle = async () => {
    if (isProcessing) return

    if (!isRecording) {
      const started = await startRecording()
      if (started) {
        pointerIsDownRef.current = true
      }
      return
    }

    pointerIsDownRef.current = false
    const blob = await stopRecording()
    await processRecording(blob)
  }

  const saveGeneratedNote = async () => {
    const content = generatedNote.trim()
    if (!content) return

    setSaving(true)
    try {
      const response = await fetch(`/api/jobs/${jobId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          is_visible_to_customer: isVisibleToCustomer,
        }),
      })

      const data = (await response.json()) as { note?: JobNote; error?: string }
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save AI note')
      }

      if (data.note && onNoteSaved) {
        onNoteSaved(data.note)
      }

      setGeneratedNote('')
      setTranscript('')
      showToast.success('AI note saved to job.')
    } catch (saveError) {
      console.error('Save AI note failed:', saveError)
      showToast.error(saveError instanceof Error ? saveError.message : 'Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onPointerDown={(event) => {
          event.preventDefault()
          ignoreClickRef.current = true
          void beginHoldRecording()
        }}
        onPointerUp={(event) => {
          event.preventDefault()
          ignoreClickRef.current = true
          void finishHoldRecording()
        }}
        onPointerCancel={() => {
          pointerIsDownRef.current = false
          ignoreClickRef.current = true
        }}
        onClick={() => {
          if (ignoreClickRef.current) {
            ignoreClickRef.current = false
            return
          }
          // Pointer events cover mobile hold gesture; click is fallback.
          void handleTapToggle()
        }}
        disabled={!isSupported || isProcessing || saving}
        className={`ai-action-btn flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 ${
          isRecording
            ? 'border-red-400/50 text-red-200 shadow-[0_0_22px_rgba(248,113,113,0.38)] bg-red-500/15'
            : isProcessing
            ? 'animate-pulse-glow-cyan'
            : ''
        }`}
        aria-label={isRecording ? 'Stop voice recording' : 'Hold to record voice note'}
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRecording ? (
          <Mic className="h-4 w-4 animate-pulse" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        <span>
          {isRecording
            ? `Recording ${formattedDuration} (release to process)`
            : isProcessing
            ? 'Formatting voice note...'
            : 'Hold for Voice Note'}
        </span>
      </button>

      {!isSupported && (
        <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Voice recording not supported in this browser. Type your note manually.
        </p>
      )}

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      {generatedNote && (
        <div className="ai-assistant-panel glass-card-cyan rounded-2xl border border-cyan-400/25 bg-slate-900/40 p-3">
          <div className="mb-2 flex items-center gap-2 text-cyan-300">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.12em]">AI Assistant</span>
          </div>

          <p className="whitespace-pre-wrap text-sm text-slate-100">{generatedNote}</p>

          {transcript && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-slate-300">Show transcript</summary>
              <p className="mt-1 whitespace-pre-wrap rounded-lg border border-slate-700 bg-slate-950/50 p-2 text-xs text-slate-300">
                {transcript}
              </p>
            </details>
          )}

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => {
                onInsertNote(generatedNote)
                showToast.success('Inserted into note editor.')
              }}
              className="min-h-12 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-sm font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/20"
            >
              Use in Editor
            </button>
            <button
              type="button"
              onClick={() => void saveGeneratedNote()}
              disabled={saving}
              className="min-h-12 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Now'}
            </button>
            <button
              type="button"
              onClick={() => {
                setGeneratedNote('')
                setTranscript('')
              }}
              className="min-h-12 rounded-xl border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800/60"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {!generatedNote && (
        <div className="flex items-start gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>AI unavailable fallback: type notes manually if voice processing fails.</p>
        </div>
      )}
    </div>
  )
}
