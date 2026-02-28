'use client'

import { JobNote } from '@/lib/types'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { showToast } from '@/lib/utils/toast'
import { Loader2, Mic, SendHorizontal } from '@/components/ui/icons'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'

interface JobNotesProps {
  jobId: string
  isCustomerView?: boolean
  embedded?: boolean
}

function formatRelativeTimeSafe(value: string | null | undefined) {
  if (!value) return 'Unknown time'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return formatDistanceToNow(date, { addSuffix: true })
}

export default function JobNotes({ jobId, isCustomerView = false, embedded = false }: JobNotesProps) {
  const router = useRouter()

  const [notes, setNotes] = useState<JobNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [visibleToCustomer, setVisibleToCustomer] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [transcribing, setTranscribing] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pointerIsDownRef = useRef(false)
  const ignoreClickRef = useRef(false)
  const { isSupported, isRecording, recordingMs, error, startRecording, stopRecording, clearError } =
    useVoiceRecorder({ maxDurationMs: 75_000 })

  const canSubmit = newNote.trim().length > 0 && !submitting && !transcribing
  const recordingDuration = useMemo(() => {
    const seconds = Math.floor(recordingMs / 1000)
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [recordingMs])
  const dictationStatus = isRecording
    ? `Recording ${recordingDuration}. Release to transcribe.`
    : transcribing
      ? 'Transcribing note...'
      : ''

  const prependNote = useCallback((note: JobNote) => {
    setNotes((previous) => [note, ...previous])
  }, [])

  const loadNotes = useCallback(async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/notes`)
      const data = await response.json()

      if (data.notes) {
        const filtered = data.notes.filter(
          (note: JobNote) => note?.metadata?.source !== 'troubleshoot_ai'
        )
        setNotes(filtered)
      }
    } catch (error) {
      console.error('Error loading notes:', error)
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    void loadNotes()
  }, [loadNotes])

  const saveNote = useCallback(
    async (content: string) => {
      const response = await fetch(`/api/jobs/${jobId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          is_visible_to_customer: visibleToCustomer,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add note')
      }

      if (data.note) {
        prependNote(data.note)
        router.refresh()
      }
    },
    [jobId, prependNote, router, visibleToCustomer]
  )

  const handleSubmitNote = async () => {
    const trimmed = newNote.trim()
    if (!trimmed || transcribing) return

    setSubmitting(true)
    try {
      await saveNote(trimmed)
      setNewNote('')
      showToast.success('Note added.')
    } catch (error) {
      console.error('Error adding note:', error)
      showToast.error(error instanceof Error ? error.message : 'Failed to add note')
    } finally {
      setSubmitting(false)
    }
  }

  const autoResizeTextarea = useCallback(() => {
    if (!textareaRef.current) return
    textareaRef.current.style.height = '0px'
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`
  }, [])

  useEffect(() => {
    autoResizeTextarea()
  }, [autoResizeTextarea, newNote])

  const processDictation = useCallback(
    async (blob: Blob | null) => {
      if (!blob || blob.size === 0) {
        showToast.error('No audio captured. Hold the mic and try again.')
        return
      }

      setTranscribing(true)
      clearError()

      try {
        const formData = new FormData()
        const file = new File([blob], `note-${Date.now()}.webm`, {
          type: blob.type || 'audio/webm',
        })
        formData.append('audio', file)
        formData.append('jobId', jobId)
        formData.append('mode', 'transcript')

        const response = await fetch('/api/ai/voice-notes', {
          method: 'POST',
          body: formData,
        })
        const data = (await response.json()) as { transcript?: string; error?: string }
        if (!response.ok) {
          throw new Error(data.error || 'Voice transcription failed')
        }

        const transcript = data.transcript?.trim()
        if (!transcript) {
          throw new Error('No transcript returned')
        }

        setNewNote((prev) => (prev ? `${prev}\n${transcript}` : transcript))
        showToast.success('Dictation added to note.')
      } catch (dictationError) {
        console.error('Dictation failed:', dictationError)
        showToast.error(dictationError instanceof Error ? dictationError.message : 'Voice transcription failed')
      } finally {
        setTranscribing(false)
      }
    },
    [clearError, jobId]
  )

  const startHoldDictation = useCallback(async () => {
    if (submitting || transcribing) return
    pointerIsDownRef.current = true
    const started = await startRecording()
    if (!started) {
      pointerIsDownRef.current = false
    }
  }, [startRecording, submitting, transcribing])

  const stopHoldDictation = useCallback(async () => {
    if (!isRecording) return
    pointerIsDownRef.current = false
    const blob = await stopRecording()
    await processDictation(blob)
  }, [isRecording, processDictation, stopRecording])

  const toggleDictationFallback = useCallback(async () => {
    if (submitting || transcribing) return

    if (!isRecording) {
      await startHoldDictation()
      return
    }

    pointerIsDownRef.current = false
    const blob = await stopRecording()
    await processDictation(blob)
  }, [isRecording, processDictation, startHoldDictation, stopRecording, submitting, transcribing])

  const getNoteColor = (noteType: string) => {
    switch (noteType) {
      case 'status_change':
      case 'photo_added':
      case 'system':
        return 'bg-slate-50/50 dark:bg-slate-800/30 ring-1 ring-slate-200/50 dark:ring-slate-700/50 backdrop-blur'
      default:
        return 'bg-white/70 dark:bg-slate-900/40 ring-1 ring-slate-200/80 dark:ring-slate-700/80 backdrop-blur-md shadow-sm'
    }
  }

  return (
    <div className={embedded ? 'space-y-4' : 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2rem] ring-1 ring-slate-200/50 dark:ring-slate-800/50 p-5 shadow-xl'}>
      {!embedded && (
        <div className="mb-4">
          <h2 className="font-display-soft text-xl font-bold tracking-tight text-slate-900 dark:text-white">Notes & Activity</h2>
        </div>
      )}

      {isCustomerView && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Updates shared by your technician will appear here.
        </p>
      )}

      {!isCustomerView && (
        <div className="mb-5 rounded-[2rem] bg-white/50 p-4 ring-1 ring-slate-200/50 dark:bg-slate-950/20 dark:ring-slate-800/50 shadow-inner">
          <div className="rounded-[1.5rem] bg-white/80 px-2 py-2 shadow-sm ring-1 ring-slate-200/80 transition-all focus-within:ring-2 focus-within:ring-cyan-500/50 dark:bg-slate-900/80 dark:ring-slate-700/80">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                data-test="note-input"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note about this job..."
                className="min-h-[96px] max-h-[220px] flex-1 resize-none bg-transparent px-4 py-3 font-sans text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-400"
                disabled={submitting || transcribing}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault()
                    if (canSubmit) {
                      void handleSubmitNote()
                    }
                  }
                }}
              />

              <div className="mb-1 flex shrink-0 items-center gap-1.5 rounded-[1.2rem] bg-slate-100/90 p-1.5 ring-1 ring-slate-200/80 dark:bg-slate-800/90 dark:ring-slate-700/80">
                <button
                  type="button"
                  data-test="add-note"
                  onPointerDown={(event) => {
                    event.preventDefault()
                    ignoreClickRef.current = true
                    void startHoldDictation()
                  }}
                  onPointerUp={(event) => {
                    event.preventDefault()
                    ignoreClickRef.current = true
                    void stopHoldDictation()
                  }}
                  onPointerCancel={() => {
                    ignoreClickRef.current = true
                    pointerIsDownRef.current = false
                    void stopHoldDictation()
                  }}
                  onClick={() => {
                    if (ignoreClickRef.current) {
                      ignoreClickRef.current = false
                      return
                    }
                    void toggleDictationFallback()
                  }}
                  disabled={!isSupported || submitting || transcribing}
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl text-slate-700 transition-all hover:scale-105 disabled:opacity-45 dark:text-slate-200 ${isRecording
                      ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] text-white'
                      : 'hover:bg-slate-200 dark:hover:bg-slate-700 bg-white dark:bg-slate-900 ring-1 ring-slate-200/50 dark:ring-slate-700/50'
                    }`}
                  aria-label={isRecording ? 'Stop dictation' : 'Hold to dictate note'}
                >
                  {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                </button>

                <button
                  type="button"
                  data-test="save-note"
                  onClick={() => void handleSubmitNote()}
                  disabled={!canSubmit}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500 text-slate-950 transition-all hover:scale-105 disabled:opacity-45 dark:bg-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.5)]"
                  aria-label="Add note"
                >
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between px-2">
            <button
              type="button"
              onClick={() => setVisibleToCustomer(!visibleToCustomer)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all ${visibleToCustomer
                  ? 'bg-cyan-500/10 text-cyan-700 ring-1 ring-cyan-500/30 dark:bg-cyan-400/10 dark:text-cyan-300'
                  : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700/80'
                }`}
            >
              <span>{visibleToCustomer ? 'Visible to customer' : 'Internal only'}</span>
            </button>

            {dictationStatus ? (
              <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {dictationStatus}
              </span>
            ) : <span />}
          </div>

          {!isSupported && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Voice input is unavailable in this browser.
            </p>
          )}

          {error && <p className="mt-2 text-xs text-red-600 dark:text-red-300">{error}</p>}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <p className="text-sm">Loading activity...</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <p className="text-sm">No notes or activity yet</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[22rem] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`rounded-2xl p-4 transition-all hover:-translate-y-0.5 ${getNoteColor(note.note_type)}`}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="font-sans text-sm font-bold tracking-wide text-slate-900 dark:text-slate-100 truncate">
                  {note.user?.full_name || 'System'}
                </span>
                <div className="flex items-center gap-2">
                  {!note.is_visible_to_customer && (
                    <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-slate-200/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                      Internal
                    </span>
                  )}
                  <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    {formatRelativeTimeSafe(note.created_at)}
                  </span>
                </div>
              </div>

              <p className="font-sans text-[13px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{note.content}</p>

              {note.note_type === 'status_change' && note.metadata?.new_status && (
                <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-800/50 px-2.5 py-1.5 rounded-lg inline-block">
                  Status: <span className="font-bold">{note.metadata.old_status}</span>
                  {' -> '}
                  <span className="font-bold">{note.metadata.new_status}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
