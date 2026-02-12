'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'

export default function MarkAsPaidButton({
  invoiceId,
  className,
}: {
  invoiceId: string
  className?: string
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleMarkAsPaid = async () => {
    if (!confirm('Mark this invoice as paid?')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to mark invoice as paid')
      }

      router.refresh()
    } catch (error) {
      console.error('Error marking as paid:', error)
      alert('Failed to mark invoice as paid')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleMarkAsPaid}
      disabled={loading}
      className={
        className ||
        'inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20'
      }
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
      {loading ? 'Processing...' : 'Mark as Paid'}
    </button>
  )
}
