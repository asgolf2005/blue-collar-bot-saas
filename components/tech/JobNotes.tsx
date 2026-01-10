'use client'

import { JobNote } from '@/lib/types'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { MessageSquare, Send, Clock, Eye, EyeOff, RefreshCw, Camera, Settings } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface JobNotesProps {
  jobId: string
  isCustomerView?: boolean
}

export default function JobNotes({ jobId, isCustomerView = false }: JobNotesProps) {
  const router = useRouter()
  const supabase = createClient()

  const [notes, setNotes] = useState<JobNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [visibleToCustomer, setVisibleToCustomer] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadNotes()
  }, [jobId])

  const loadNotes = async () => {
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
  }

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
        return <RefreshCw className="w-4 h-4 text-primary" />
      case 'photo_added':
        return <Camera className="w-4 h-4 text-info" />
      case 'system':
        return <Settings className="w-4 h-4 text-muted" />
      default:
        return <MessageSquare className="w-4 h-4 text-muted" />
    }
  }

  const getNoteColor = (noteType: string) => {
    switch (noteType) {
      case 'status_change':
        return 'bg-surface-100 border border-surface-200'
      case 'photo_added':
        return 'bg-surface-100 border border-surface-200'
      case 'system':
        return 'bg-surface-100 border border-surface-200'
      default:
        return 'bg-surface-50 border border-surface-200'
    }
  }

  return (
    <div className="bg-surface-50/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-4">
      <div className="flex items-center mb-4">
        <MessageSquare className="w-5 h-5 text-muted mr-2" />
        <h2 className="font-semibold text-ink">Notes & Activity</h2>
      </div>

      {isCustomerView && (
        <p className="text-xs text-muted mb-3">
          Updates shared by your technician will appear here.
        </p>
      )}

      {/* Add Note Form */}
      {!isCustomerView && (
        <div className="mb-4 p-3 bg-surface-100 rounded-xl border border-surface-200">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note about this job..."
            className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm text-ink placeholder:text-muted focus:ring-primary/15 focus:border-primary/40 min-h-[80px] mb-2 transition"
            disabled={submitting}
          />

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setVisibleToCustomer(!visibleToCustomer)}
              className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition border ${
                visibleToCustomer
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : 'bg-surface-100 text-muted border-surface-200'
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
              className="flex items-center px-4 py-2 bg-primary text-white dark:text-midnight-950 text-sm font-medium rounded-lg hover:bg-primary/90 border border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Send className="w-4 h-4 mr-1.5" />
              {submitting ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      {loading ? (
        <div className="text-center py-8 text-muted">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30 animate-pulse" />
          <p className="text-sm">Loading activity...</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-8 text-muted">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No notes or activity yet</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`border rounded-lg p-3 ${getNoteColor(note.note_type)}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getNoteIcon(note.note_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-ink truncate">
                      {note.user?.full_name || 'System'}
                    </span>
                    <div className="flex items-center gap-2">
                      {!note.is_visible_to_customer && (
                        <span className="text-xs bg-surface-100 text-muted px-2 py-0.5 rounded">
                          Internal
                        </span>
                      )}
                      <span className="text-xs text-muted flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-surface-600 whitespace-pre-wrap">{note.content}</p>

                  {note.note_type === 'status_change' && note.metadata?.new_status && (
                    <div className="mt-2 text-xs text-muted bg-surface-100 px-2 py-1 rounded inline-block">
                      Status: <span className="font-medium">{note.metadata.old_status}</span>
                      {' → '}
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
