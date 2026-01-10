'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'

export default function MarkAsPaidButton({ invoiceId }: { invoiceId: string }) {
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
      onClick={handleMarkAsPaid}
      disabled={loading}
      className="btn btn-primary flex items-center"
    >
      <CheckCircle className="w-4 h-4 mr-2" />
      {loading ? 'Processing...' : 'Mark as Paid'}
    </button>
  )
}
