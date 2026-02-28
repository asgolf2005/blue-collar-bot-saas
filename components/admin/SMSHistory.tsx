'use client'

import { useEffect, useState, useCallback } from 'react'
import { MessageSquare, Check, X, Clock, AlertCircle } from '@/components/ui/lucide'
import { format } from 'date-fns'
import { SMSNotification } from '@/types/sms'

interface SMSHistoryProps {
  jobId: string
}

function formatSmsTimestamp(value: string | null | undefined, pattern: string, fallback = '--') {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return format(date, pattern)
}

export default function SMSHistory({ jobId }: SMSHistoryProps) {
  const [smsHistory, setSmsHistory] = useState<SMSNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSMSHistory = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/sms/history?jobId=${jobId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch SMS history')
      }

      const data = await response.json()
      setSmsHistory(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SMS history')
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    void fetchSMSHistory()
  }, [fetchSMSHistory])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      case 'sent':
        return <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      case 'failed':
      case 'undelivered':
        return <X className="w-4 h-4 text-rose-600 dark:text-rose-400" />
      case 'pending':
      default:
        return <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      delivered: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300',
      sent: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      failed: 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300',
      undelivered: 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300',
      pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
        statusClasses[status as keyof typeof statusClasses] || statusClasses.pending
      }`}>
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getTemplateLabel = (templateName: string | null | undefined) => {
    if (!templateName) return 'Custom Message'

    return templateName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim()
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-100 dark:bg-slate-800 h-20 rounded-xl"></div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
      </div>
    )
  }

  if (smsHistory.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-500 dark:text-slate-400">No SMS notifications sent yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {smsHistory.map((sms) => (
        <div
          key={sms.id}
          className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {getTemplateLabel(sms.template_name)}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">To: {sms.to_phone}</p>
            </div>
            {getStatusBadge(sms.status)}
          </div>

          <p className="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mb-2">
            {sms.message}
          </p>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              {sms.sent_at
                ? formatSmsTimestamp(sms.sent_at, 'MMM d, h:mm a')
                : formatSmsTimestamp(sms.created_at, 'MMM d, h:mm a')}
            </span>
            {sms.delivered_at && (
              <span className="text-emerald-600 dark:text-emerald-400">
                Delivered: {formatSmsTimestamp(sms.delivered_at, 'h:mm a')}
              </span>
            )}
          </div>

          {sms.error_message && (
            <div className="mt-2 p-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg">
              <p className="text-xs text-rose-700 dark:text-rose-300 flex items-start gap-1">
                <X className="w-3 h-3 mt-0.5 flex-shrink-0" />
                {sms.error_message}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}


