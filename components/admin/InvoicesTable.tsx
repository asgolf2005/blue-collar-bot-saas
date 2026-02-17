'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { useBulkSelection } from '@/hooks/useBulkSelection'
import BulkActionBar, { BulkActionButton } from '@/components/ui/BulkActionBar'
import { showToast } from '@/lib/utils/toast'
import { useState } from 'react'
import { InvoiceStatus } from '@/lib/types'
import { EmptyInvoices } from '@/components/ui/EmptyState'
import { useRouter } from 'next/navigation'
import ContextMenu from '@/components/ui/ContextMenu'

interface Invoice {
  id: string
  invoice_number: string
  total: number | string
  status: InvoiceStatus
  issue_date: string
  due_date: string
  customer?: {
    id: string
    name: string
    email?: string
  } | {
    id: string
    name: string
    email?: string
  }[]
}

interface InvoicesTableProps {
  invoices: Invoice[]
}

export default function InvoicesTable({ invoices }: InvoicesTableProps) {
  const router = useRouter()
  const normalizedInvoices = invoices.map((invoice) => ({
    ...invoice,
    customer: Array.isArray(invoice.customer) ? invoice.customer[0] : invoice.customer,
  }))
  const {
    selectedIds,
    selectedCount,
    isSelected,
    toggleItem,
    toggleAll,
    clearSelection,
    isAllSelected,
    isSomeSelected,
  } = useBulkSelection(normalizedInvoices)

  const [isDeleting, setIsDeleting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isMarkingPaid, setIsMarkingPaid] = useState(false)

  const statusColors: Record<InvoiceStatus, string> = {
    draft: 'bg-surface-100 text-surface-600',
    sent: 'bg-info/10 text-info',
    paid: 'bg-success/10 text-success',
    overdue: 'bg-danger/10 text-danger',
    cancelled: 'bg-surface-100 text-surface-500',
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedCount} invoice${selectedCount > 1 ? 's' : ''}?`)) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch('/api/invoices/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceIds: selectedIds }),
      })

      if (!response.ok) throw new Error('Failed to delete invoices')

      showToast.success(`${selectedCount} invoice${selectedCount > 1 ? 's' : ''} deleted successfully`)
      clearSelection()
      window.location.reload()
    } catch (error) {
      showToast.error('Failed to delete invoices')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkSend = async () => {
    setIsSending(true)
    try {
      const response = await fetch('/api/invoices/bulk-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceIds: selectedIds }),
      })

      if (!response.ok) throw new Error('Failed to send invoices')

      showToast.success(`${selectedCount} invoice${selectedCount > 1 ? 's' : ''} sent successfully`)
      clearSelection()
      window.location.reload()
    } catch (error) {
      showToast.error('Failed to send invoices')
    } finally {
      setIsSending(false)
    }
  }

  const handleBulkMarkPaid = async () => {
    setIsMarkingPaid(true)
    try {
      const response = await fetch('/api/invoices/bulk-mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceIds: selectedIds }),
      })

      if (!response.ok) throw new Error('Failed to mark invoices as paid')

      showToast.success(`${selectedCount} invoice${selectedCount > 1 ? 's' : ''} marked as paid`)
      clearSelection()
      window.location.reload()
    } catch (error) {
      showToast.error('Failed to mark invoices as paid')
    } finally {
      setIsMarkingPaid(false)
    }
  }

  if (normalizedInvoices.length === 0) {
    return (
      <div className="card overflow-hidden p-6">
        <EmptyInvoices
          onCreateInvoice={() => router.push('/admin/invoices/new')}
        />
      </div>
    )
  }

  return (
    <>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-100 border-b border-surface-200">
              <tr>
                <th className="px-6 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={input => {
                      if (input) input.indeterminate = isSomeSelected
                    }}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-surface-300 text-primary focus:ring-primary focus:ring-offset-0"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {normalizedInvoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className={`hover:bg-surface-100/70 ${isSelected(invoice.id) ? 'bg-primary/5' : ''}`}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={isSelected(invoice.id)}
                      onChange={() => toggleItem(invoice.id)}
                      className="w-4 h-4 rounded border-surface-300 text-primary focus:ring-primary focus:ring-offset-0"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/admin/invoices/${invoice.id}`} className="text-primary hover:text-primary/80 font-medium">
                      {invoice.invoice_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-ink">{invoice.customer?.name}</div>
                    <div className="text-sm text-muted">{invoice.customer?.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-ink">
                    {format(new Date(invoice.issue_date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-ink">
                    {parseFloat(invoice.total.toString()).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[invoice.status]}`}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <ContextMenu
                      items={[
                        {
                          label: 'View Details',
                          onClick: () => router.push(`/admin/invoices/${invoice.id}`),
                        },
                        {
                          label: 'Edit Invoice',
                          onClick: () => router.push(`/admin/invoices/${invoice.id}`),
                        },
                        {
                          label: 'Download PDF',
                          onClick: () => showToast.info('PDF download coming soon'),
                          divider: true,
                        },
                        {
                          label: 'Send Invoice',
                      onClick: async () => {
                        try {
                          const response = await fetch('/api/invoices/bulk-send', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ invoiceIds: [invoice.id] }),
                          })
                          if (!response.ok) throw new Error('Failed to send invoice')
                          showToast.success('Invoice sent successfully')
                          router.refresh()
                        } catch (error) {
                              showToast.error('Failed to send invoice')
                            }
                          },
                          disabled: invoice.status === 'paid',
                        },
                        {
                          label: 'Mark as Paid',
                      onClick: async () => {
                        try {
                          const response = await fetch(`/api/invoices/${invoice.id}/mark-paid`, {
                            method: 'POST',
                          })
                          if (!response.ok) throw new Error('Failed to mark invoice as paid')
                          showToast.success('Invoice marked as paid')
                          router.refresh()
                            } catch (error) {
                              showToast.error('Failed to mark invoice as paid')
                            }
                          },
                          disabled: invoice.status === 'paid',
                          divider: true,
                        },
                        {
                          label: 'Delete',
                          onClick: async () => {
                            if (!confirm('Are you sure you want to delete this invoice?')) return

                            try {
                          const response = await fetch('/api/invoices/bulk-delete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ invoiceIds: [invoice.id] }),
                          })
                          if (!response.ok) throw new Error('Failed to delete invoice')
                          showToast.success('Invoice deleted successfully')
                          router.refresh()
                        } catch (error) {
                              showToast.error('Failed to delete invoice')
                            }
                          },
                          variant: 'danger',
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <BulkActionBar selectedCount={selectedCount} onClear={clearSelection}>
        <BulkActionButton
          label={isSending ? 'Sending...' : 'Send'}
          onClick={handleBulkSend}
        />
        <BulkActionButton
          label={isMarkingPaid ? 'Marking...' : 'Mark Paid'}
          onClick={handleBulkMarkPaid}
        />
        <BulkActionButton
          label={isDeleting ? 'Deleting...' : 'Delete'}
          onClick={handleBulkDelete}
          variant="danger"
        />
      </BulkActionBar>
    </>
  )
}
