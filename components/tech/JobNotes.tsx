'use client'

import { JobNote } from '@/lib/types'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Send, Clock, Eye, EyeOff, RefreshCw, Camera, Settings } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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

  const loadNotes = useCallback(async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/notes`)
      const data = await response.json()

      if (data.notes) {
        setNotes(data.notes)
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

  const handleSubmitNote = async () => {
    if (!newNote.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/jobs/${jobId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newNote,
          is_visible_to_customer: visibleToCustomer,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add note')
      }

      const data = await response.json()

      if (data.note) {
        setNotes([data.note, ...notes])
        setNewNote('')
        router.refresh()
      }
    } catch (error) {
      console.error('Error adding note:', error)
      alert('Failed to add note')
    } finally {
      setSubmitting(false)
    }
  }

  const getNoteIcon = (noteType: string) => {
    switch (noteType) {
      case 'status_change':
        return <RefreshCw className="w-4 h-4 text-cyan-500" />
      case 'photo_added':
        return <Camera className="w-4 h-4 text-sky-500" />
      case 'system':
        return <Settings className="w-4 h-4 text-slate-400" />
      default:
        return <MessageSquare className="w-4 h-4 text-slate-400" />
    }
  }

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
        <div className="flex items-center mb-4">
          <MessageSquare className="w-5 h-5 text-slate-500 dark:text-slate-400 mr-2" />
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Notes & Activity</h2>
        </div>
      )}

      {isCustomerView && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Updates shared by your technician will appear here.
        </p>
      )}

      {!isCustomerView && (
        <div className="mb-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note about this job..."
            className="w-full px-3 py-2.5 rounded-lg text-sm min-h-[88px] mb-3 transition bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/40"
            disabled={submitting}
          />

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setVisibleToCustomer(!visibleToCustomer)}
              className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition border ${
                visibleToCustomer
                  ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              {visibleToCustomer ? (
                <>
                  <Eye className="w-4 h-4" />
                  <span>Visible to customer</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span>Internal only</span>
                </>
              )}
            </button>

            <button
              onClick={handleSubmitNote}
              disabled={submitting || !newNote.trim()}
              className="flex items-center px-4 py-2 text-sm font-medium rounded-lg transition border disabled:opacity-50 disabled:cursor-not-allowed bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-600/30"
            >
              <Send className="w-4 h-4 mr-1.5" />
              {submitting ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30 animate-pulse" />
          <p className="text-sm">Loading activity...</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No notes or activity yet</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[22rem] overflow-y-auto pr-1">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`rounded-xl p-3 ${getNoteColor(note.note_type)}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getNoteIcon(note.note_type)}
                </div>
                <div className="flex-1 min-w-0">
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
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
