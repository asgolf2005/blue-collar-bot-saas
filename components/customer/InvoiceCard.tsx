'use client'

import { Invoice, Customer } from '@/lib/types'
import { format } from 'date-fns'
import Link from 'next/link'
import { FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react'

interface InvoiceWithCustomer extends Invoice {
  customer: Customer
}

export default function InvoiceCard({ invoice }: { invoice: InvoiceWithCustomer }) {
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; icon: any; label: string }> = {
      draft: {
        color: 'bg-gray-50 text-gray-700 border-gray-200',
        icon: FileText,
        label: 'Draft',
      },
      sent: {
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: Clock,
        label: 'Awaiting Payment',
      },
      paid: {
        color: 'bg-green-50 text-green-700 border-green-200',
        icon: CheckCircle,
        label: 'Paid',
      },
      overdue: {
        color: 'bg-red-50 text-red-700 border-red-200',
        icon: AlertCircle,
        label: 'Overdue',
      },
      cancelled: {
        color: 'bg-gray-50 text-gray-600 border-gray-200',
        icon: FileText,
        label: 'Cancelled',
      },
    }
    return configs[status] || configs.draft
  }

  const statusConfig = getStatusConfig(invoice.status)
  const StatusIcon = statusConfig.icon

  return (
    <Link href={`/customer/invoices/${invoice.id}`}>
      <div className="card hover:shadow-md transition cursor-pointer">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="font-mono text-sm font-medium text-gray-900">
                {invoice.invoice_number}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Issued {format(new Date(invoice.issue_date), 'MMM d, yyyy')}
            </div>
            {invoice.due_date && invoice.status !== 'paid' && (
              <div className="text-sm text-gray-600">
                Due {format(new Date(invoice.due_date), 'MMM d, yyyy')}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              ${invoice.total.toFixed(2)}
            </div>
            <div
              className={`mt-2 px-3 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1 ${statusConfig.color}`}
            >
              <StatusIcon className="w-3 h-3" />
              {statusConfig.label}
            </div>
          </div>
        </div>

        {invoice.notes && (
          <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-200">
            {invoice.notes}
          </p>
        )}

        <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center gap-3">
          <span className="text-sm text-gray-600 flex-1">
            {invoice.status === 'paid' && invoice.paid_at && (
              <>Paid on {format(new Date(invoice.paid_at), 'MMM d, yyyy')}</>
            )}
          </span>
          <span className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View Details {'>'}
          </span>
        </div>
      </div>
    </Link>
  )
}
