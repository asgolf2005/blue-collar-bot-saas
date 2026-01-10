import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft, Download, CheckCircle, DollarSign } from 'lucide-react'
import Link from 'next/link'
import MarkAsPaidButton from '@/components/invoices/MarkAsPaidButton'
import { InvoiceLineItem } from '@/lib/types'

export default async function AdminInvoiceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/tech/today')
  }

  // Await params
  const { id } = await params

  // Get invoice with all details
  const { data: invoice } = await supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(*),
      job:jobs(*),
      line_items:invoice_line_items(*),
      business:businesses(name, address, email, phone)
    `)
    .eq('id', id)
    .eq('business_id', profile.business_id)
    .single()

  if (!invoice) {
    notFound()
  }

  const business = invoice.business as any
  const customer = invoice.customer as any

  const statusConfig: Record<string, { color: string; label: string }> = {
    draft: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200', label: 'Draft' },
    sent: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 dark:border dark:border-blue-700', label: 'Awaiting Payment' },
    paid: { color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 dark:border dark:border-green-700', label: 'Paid' },
    overdue: { color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 dark:border dark:border-red-700', label: 'Overdue' },
    cancelled: { color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300', label: 'Cancelled' },
  }

  const config = statusConfig[invoice.status] || statusConfig.sent

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/invoices"
          className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Invoices
        </Link>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoice {invoice.invoice_number}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Issued {format(new Date(invoice.issue_date), 'MMMM dd, yyyy')}
            </p>
          </div>

          <div className="flex gap-2">
            {invoice.status !== 'paid' && (
              <MarkAsPaidButton invoiceId={invoice.id} />
            )}
          </div>
        </div>
      </div>

      {/* Invoice Details Card */}
      <div className="card">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{business.name}</h2>
            {business.address && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{business.address}</p>}
            {business.phone && <p className="text-sm text-gray-600 dark:text-gray-300">{business.phone}</p>}
            {business.email && <p className="text-sm text-gray-600 dark:text-gray-300">{business.email}</p>}
          </div>

          <div className={`px-4 py-2 rounded-full text-sm font-medium ${config.color}`}>
            {config.label}
          </div>
        </div>

        {/* Bill To */}
        <div className="grid grid-cols-2 gap-8 mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Bill To</h3>
            <p className="font-medium text-gray-900 dark:text-white">{customer.name}</p>
            {customer.address && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{customer.address}</p>}
            {customer.email && <p className="text-sm text-gray-600 dark:text-gray-300">{customer.email}</p>}
            {customer.phone && <p className="text-sm text-gray-600 dark:text-gray-300">{customer.phone}</p>}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Invoice Details</h3>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Invoice #:</span>
                <span className="font-medium text-gray-900 dark:text-white">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Issue Date:</span>
                <span className="font-medium text-gray-900 dark:text-white">{format(new Date(invoice.issue_date), 'MMM dd, yyyy')}</span>
              </div>
              {invoice.due_date && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Due Date:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{format(new Date(invoice.due_date), 'MMM dd, yyyy')}</span>
                </div>
              )}
              {invoice.paid_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Paid:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {format(new Date(invoice.paid_at), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="mb-6">
          <table className="w-full">
            <thead className="border-b-2 border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left py-3 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">Description</th>
                <th className="text-right py-3 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">Qty</th>
                <th className="text-right py-3 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">Rate</th>
                <th className="text-right py-3 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items?.map((item: InvoiceLineItem) => (
                <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 text-gray-900 dark:text-gray-100">{item.description}</td>
                  <td className="py-3 text-right text-gray-900 dark:text-gray-100">{item.quantity}</td>
                  <td className="py-3 text-right text-gray-900 dark:text-gray-100">${item.unit_price.toFixed(2)}</td>
                  <td className="py-3 text-right font-medium text-gray-900 dark:text-white">${item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between py-2">
              <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
              <span className="font-medium text-gray-900 dark:text-white">${invoice.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600 dark:text-gray-400">Tax:</span>
              <span className="font-medium text-gray-900 dark:text-white">${invoice.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-t-2 border-gray-200 dark:border-gray-700">
              <span className="text-lg font-bold text-gray-900 dark:text-white">Total:</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">${invoice.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Notes</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
