'use client'

import { useState } from 'react'
import { CalendarClock, CheckCircle2, Loader2, Mail, Phone, Sparkles } from 'lucide-react'
import { showToast } from '@/lib/utils/toast'

interface AppointmentSelfServeActionsProps {
  jobId: string
  jobStatus: string
  businessPhone?: string | null
  businessEmail?: string | null
}

const RESCHEDULE_WINDOWS = ['Morning (8am-12pm)', 'Afternoon (12pm-4pm)', 'Evening (4pm-7pm)', 'Flexible'] as const

export default function AppointmentSelfServeActions({
  jobId,
  jobStatus,
  businessPhone,
  businessEmail,
}: AppointmentSelfServeActionsProps) {
  const [showRescheduleForm, setShowRescheduleForm] = useState(false)
  const [preferredDate, setPreferredDate] = useState('')
  const [preferredWindow, setPreferredWindow] = useState<typeof RESCHEDULE_WINDOWS[number]>('Flexible')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [approvalNote, setApprovalNote] = useState('')
  const [loadingAction, setLoadingAction] = useState<'approve' | 'reschedule' | null>(null)

  const canApprove = !['completed', 'cancelled'].includes(jobStatus)
  const canRequestReschedule = ['scheduled'].includes(jobStatus)

  const handleApprove = async () => {
    if (!canApprove) return
    setLoadingAction('approve')
    try {
      const response = await fetch(`/api/customer/appointments/${jobId}/approve-scope`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: approvalNote.trim() || undefined }),
      })
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to approve scope')
      }
      showToast.success('Scope approved. The office has been notified.')
      setApprovalNote('')
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to approve scope')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleRescheduleRequest = async () => {
    if (!canRequestReschedule) return
    if (!rescheduleReason.trim()) {
      showToast.warning('Please add a reason for the reschedule request')
      return
    }

    setLoadingAction('reschedule')
    try {
      const response = await fetch(`/api/customer/appointments/${jobId}/reschedule-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredDate: preferredDate || undefined,
          preferredWindow,
          reason: rescheduleReason.trim(),
        }),
      })
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to submit request')
      }
      showToast.success('Reschedule request sent to the office')
      setRescheduleReason('')
      setPreferredDate('')
      setPreferredWindow('Flexible')
      setShowRescheduleForm(false)
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to submit request')
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4.5 w-4.5 text-cyan-600 dark:text-cyan-300" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">Self-Serve Actions</h3>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={handleApprove}
          disabled={!canApprove || loadingAction !== null}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingAction === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Approve Scope & Pricing
        </button>

        <button
          type="button"
          onClick={() => setShowRescheduleForm((prev) => !prev)}
          disabled={!canRequestReschedule || loadingAction !== null}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <CalendarClock className="h-4 w-4" />
          Request Reschedule
        </button>
      </div>

      {!canRequestReschedule && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Rescheduling is only available before dispatch starts.
        </p>
      )}

      {showRescheduleForm && canRequestReschedule && (
        <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/60">
          <div>
            <label className="mb-1 block text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Preferred Date
            </label>
            <input
              type="date"
              value={preferredDate}
              onChange={(event) => setPreferredDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Preferred Window
            </label>
            <select
              value={preferredWindow}
              onChange={(event) => setPreferredWindow(event.target.value as typeof RESCHEDULE_WINDOWS[number])}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              {RESCHEDULE_WINDOWS.map((window) => (
                <option key={window} value={window}>
                  {window}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Reason
            </label>
            <textarea
              value={rescheduleReason}
              onChange={(event) => setRescheduleReason(event.target.value)}
              rows={3}
              placeholder="Tell us what changed..."
              className="w-full resize-none rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>

          <button
            type="button"
            onClick={handleRescheduleRequest}
            disabled={loadingAction !== null}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAction === 'reschedule' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Send Request
          </button>
        </div>
      )}

      <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
        {businessPhone && (
          <a
            href={`tel:${businessPhone}`}
            className="flex items-center gap-2 text-sm text-cyan-700 hover:text-cyan-800 dark:text-cyan-300 dark:hover:text-cyan-200"
          >
            <Phone className="h-4 w-4" />
            Call office
          </a>
        )}
        {businessEmail && (
          <a
            href={`mailto:${businessEmail}`}
            className="flex items-center gap-2 text-sm text-cyan-700 hover:text-cyan-800 dark:text-cyan-300 dark:hover:text-cyan-200"
          >
            <Mail className="h-4 w-4" />
            Email office
          </a>
        )}
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Optional note for approval
        </label>
        <textarea
          value={approvalNote}
          onChange={(event) => setApprovalNote(event.target.value)}
          rows={2}
          placeholder="Anything the office should know?"
          className="w-full resize-none rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
        />
      </div>
    </div>
  )
}
