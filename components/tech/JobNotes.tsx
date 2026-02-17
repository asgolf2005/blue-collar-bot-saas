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
        return 'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700'
      default:
        return 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700'
    }
  }

  return (
    <div className={embedded ? 'space-y-4' : 'bg-slate-50/90 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-800 p-4'}>
      {!embedded && (
        <div className="mb-4">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Notes & Activity</h2>
        </div>
      )}

      {isCustomerView && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Updates shared by your technician will appear here.
        </p>
      )}

      {!isCustomerView && (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/40">
          <div className="rounded-[30px] border border-slate-300 bg-white px-2 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-end gap-1">
              <textarea
                ref={textareaRef}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note about this job..."
                className="min-h-[96px] max-h-[220px] flex-1 resize-none bg-transparent px-3 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-400"
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

              <div className="mb-1 flex shrink-0 items-center gap-1 rounded-full border border-slate-300 bg-slate-100/90 p-1 dark:border-slate-700 dark:bg-slate-800/90">
                <button
                  type="button"
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
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-full text-slate-700 transition-colors disabled:opacity-45 dark:text-slate-200 ${
                    isRecording
                      ? 'bg-red-500/20 text-red-200 hover:bg-red-500/30'
                      : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  aria-label={isRecording ? 'Stop dictation' : 'Hold to dictate note'}
                >
                  {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => void handleSubmitNote()}
                  disabled={!canSubmit}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white transition-colors hover:bg-slate-800 disabled:opacity-45 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                  aria-label="Add note"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setVisibleToCustomer(!visibleToCustomer)}
              className={`flex min-h-12 items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
                visibleToCustomer
                  ? 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300'
                  : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              <span>{visibleToCustomer ? 'Visible to customer' : 'Internal only'}</span>
            </button>

            <span className="text-xs text-slate-500 dark:text-slate-400">
              {isRecording
                ? `Recording ${recordingDuration}. Release to transcribe.`
                : transcribing
                ? 'Transcribing note...'
                : 'Hold the mic to dictate.'}
            </span>
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
        <div className="space-y-3 max-h-[22rem] overflow-y-auto pr-1">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`rounded-xl p-3 ${getNoteColor(note.note_type)}`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {note.user?.full_name || 'System'}
                </span>
                <div className="flex items-center gap-2">
                  {!note.is_visible_to_customer && (
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      Internal
                    </span>
                  )}
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{note.content}</p>

              {note.note_type === 'status_change' && note.metadata?.new_status && (
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded inline-block">
                  Status: <span className="font-medium">{note.metadata.old_status}</span>
                  {' -> '}
                  <span className="font-medium">{note.metadata.new_status}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
