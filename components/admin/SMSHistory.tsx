'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, Check, X, Clock, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { SMSNotification } from '@/types/sms'

interface SMSHistoryProps {
  jobId: string
}

export default function SMSHistory({ jobId }: SMSHistoryProps) {
  const [smsHistory, setSmsHistory] = useState<SMSNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSMSHistory()
  }, [jobId])

  const fetchSMSHistory = async () => {
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
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Check className="w-4 h-4 text-green-600" />
      case 'sent':
        return <Clock className="w-4 h-4 text-blue-600" />
      case 'failed':
      case 'undelivered':
        return <X className="w-4 h-4 text-red-600" />
      case 'pending':
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      delivered: 'bg-green-100 text-green-800',
      sent: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800',
      undelivered: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
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
          <div key={i} className="bg-gray-100 h-20 rounded-lg"></div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  if (smsHistory.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No SMS notifications sent yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {smsHistory.map((sms) => (
        <div
          key={sms.id}
          className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-900">
                  {getTemplateLabel(sms.template_name)}
                </span>
              </div>
              <p className="text-xs text-gray-600">To: {sms.to_phone}</p>
            </div>
            {getStatusBadge(sms.status)}
          </div>

          <p className="text-sm text-gray-700 bg-white p-3 rounded border border-gray-200 mb-2">
            {sms.message}
          </p>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {sms.sent_at
                ? format(new Date(sms.sent_at), 'MMM d, h:mm a')
                : format(new Date(sms.created_at), 'MMM d, h:mm a')}
            </span>
            {sms.delivered_at && (
              <span className="text-green-600">
                Delivered: {format(new Date(sms.delivered_at), 'h:mm a')}
              </span>
            )}
          </div>

          {sms.error_message && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-xs text-red-700 flex items-start gap-1">
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
