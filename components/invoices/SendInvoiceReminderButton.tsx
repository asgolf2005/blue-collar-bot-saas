'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Send } from 'lucide-react'

export default function SendInvoiceReminderButton({
  invoiceId,
  className,
}: {
  invoiceId: string
  className?: string
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSendReminder = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/invoices/bulk-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceIds: [invoiceId] }),
      })

      if (!response.ok) {
        throw new Error('Failed to send reminder')
      }

      router.refresh()
    } catch (error) {
      console.error('Error sending reminder:', error)
      alert('Failed to send reminder')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleSendReminder}
      disabled={loading}
      className={
        className ||
        'inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-xs font-semibold text-cyan-700 transition-colors hover:bg-cyan-100 disabled:opacity-60 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:bg-cyan-500/20'
      }
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      {loading ? 'Sending...' : 'Send Reminder'}
    </button>
  )
}
