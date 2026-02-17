import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft, Download, CheckCircle, Clock, AlertCircle, Phone, Mail } from '@/components/ui/lucide'
import Link from 'next/link'
import { InvoiceLineItem } from '@/lib/types'
import InvoiceDownloadButton from '@/components/customer/InvoiceDownloadButton'

export default async function InvoiceDetailsPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get customer info with business details
  const { data: customer } = await supabase
    .from('customers')
    .select('id, business:business(name, address, phone, email, primary_color)')
    .eq('user_id', user.id)
    .single()

  if (!customer) {
    redirect('/login')
  }

  // Get invoice details with line items
  const { data: invoice } = await supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(*),
      job:jobs(*),
      line_items:invoice_line_items(*)
    `)
    .eq('id', id)
    .eq('customer_id', customer.id)
    .single()

  if (!invoice) {
    notFound()
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; icon: any; label: string }> = {
      sent: { color: 'bg-warning/10 text-warning', icon: Clock, label: 'Awaiting Payment' },
      paid: { color: 'bg-success/10 text-success', icon: CheckCircle, label: 'Paid' },
      overdue: { color: 'bg-danger/10 text-danger', icon: AlertCircle, label: 'Overdue' },
    }
    return configs[status] || configs.sent
  }

  const business = customer.business as any

  const statusConfig = getStatusConfig(invoice.status)
  const StatusIcon = statusConfig.icon

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Link
          href="/customer/invoices"
          className="inline-flex items-center text-primary hover:text-primary/80"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Invoices
        </Link>
        <InvoiceDownloadButton invoice={invoice} business={business} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Content */}
        <div className="lg:col-span-2">
          <div className="card">
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-8 pb-6 border-b border-surface-200">
              <div>
                <h1 className="text-3xl font-bold text-ink mb-2">INVOICE</h1>
                <p className="text-sm text-muted">
                  Invoice Number: <span className="font-mono font-medium">{invoice.invoice_number}</span>
                </p>
              </div>
              <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${statusConfig.color}`}>
                <StatusIcon className="w-4 h-4" />
                {statusConfig.label}
              </div>
            </div>

            {/* Business & Customer Info */}
            <div className="grid grid-cols-2 gap-8 mb-8 pb-6 border-b border-surface-200">
              <div>
                <h3 className="text-sm font-semibold text-muted uppercase mb-2">From</h3>
                <p className="font-medium text-ink">{business.name}</p>
                {business.address && <p className="text-sm text-muted mt-1">{business.address}</p>}
                {business.phone && (
                  <p className="text-sm text-muted mt-1 flex items-center">
                    <Phone className="w-3 h-3 mr-1" />
                    {business.phone}
                  </p>
                )}
                {business.email && (
                  <p className="text-sm text-muted mt-1 flex items-center">
                    <Mail className="w-3 h-3 mr-1" />
                    {business.email}
                  </p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-muted uppercase mb-2">Bill To</h3>
                <p className="font-medium text-ink">{invoice.customer.name}</p>
                {invoice.customer.address && <p className="text-sm text-muted mt-1">{invoice.customer.address}</p>}
                <p className="text-sm text-muted mt-1">{invoice.customer.phone}</p>
              </div>
            </div>

            {/* Invoice Dates */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <p className="text-sm text-muted">Issue Date</p>
                <p className="font-medium text-ink">{format(new Date(invoice.issue_date), 'MMMM d, yyyy')}</p>
              </div>
              {invoice.due_date && (
                <div>
                  <p className="text-sm text-muted">Due Date</p>
                  <p className="font-medium text-ink">{format(new Date(invoice.due_date), 'MMMM d, yyyy')}</p>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="mb-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="text-left py-3 text-sm font-semibold text-muted uppercase">Description</th>
                    <th className="text-right py-3 text-sm font-semibold text-muted uppercase">Qty</th>
                    <th className="text-right py-3 text-sm font-semibold text-muted uppercase">Rate</th>
                    <th className="text-right py-3 text-sm font-semibold text-muted uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.line_items?.map((item: InvoiceLineItem) => (
                    <tr key={item.id} className="border-b border-surface-100">
                      <td className="py-3 text-ink">{item.description}</td>
                      <td className="py-3 text-right text-ink">{item.quantity}</td>
                      <td className="py-3 text-right text-ink">${item.unit_price.toFixed(2)}</td>
                      <td className="py-3 text-right font-medium text-ink">${item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between py-2">
                  <span className="text-muted">Subtotal</span>
                  <span className="font-medium text-ink">${invoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted">Tax</span>
                  <span className="font-medium text-ink">${invoice.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-3 border-t-2 border-surface-400">
                  <span className="text-lg font-bold text-ink">Total</span>
                  <span className="text-lg font-bold text-ink">${invoice.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="mt-8 pt-6 border-t border-surface-200">
                <h3 className="text-sm font-semibold text-muted uppercase mb-2">Notes</h3>
                <p className="text-surface-600">{invoice.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Payment Status */}
          <div className="card">
            <h3 className="text-lg font-bold text-ink mb-4">Payment Status</h3>
            {invoice.status === 'paid' && invoice.paid_at ? (
              <div className="space-y-2">
                <div className="flex items-center text-success">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">Paid in Full</span>
                </div>
                <p className="text-sm text-muted">
                  Paid on {format(new Date(invoice.paid_at), 'MMMM d, yyyy')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center text-warning">
                  <Clock className="w-5 h-5 mr-2" />
                  <span className="font-medium">Payment Due</span>
                </div>
                <div className="text-3xl font-bold text-ink">
                  ${invoice.total.toFixed(2)}
                </div>
                {invoice.due_date && (
                  <p className="text-sm text-muted">
                    Due by {format(new Date(invoice.due_date), 'MMMM d, yyyy')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Contact Business */}
          <div className="card">
            <h3 className="text-lg font-bold text-ink mb-4">Questions?</h3>
            <p className="text-sm text-muted mb-4">
              Contact us if you have questions about this invoice.
            </p>
            <div className="space-y-2">
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="flex items-center text-primary hover:text-primary/80"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  <span className="text-sm">{business.phone}</span>
                </a>
              )}
              {business.email && (
                <a
                  href={`mailto:${business.email}`}
                  className="flex items-center text-primary hover:text-primary/80"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  <span className="text-sm">{business.email}</span>
                </a>
              )}
            </div>
          </div>

          {/* Related Job */}
          {invoice.job && (
            <div className="card">
              <h3 className="text-lg font-bold text-ink mb-4">Related Service</h3>
              <p className="text-sm text-muted mb-2">
                {format(new Date(invoice.job.scheduled_start), 'MMMM d, yyyy')}
              </p>
              <Link
                href={`/customer/appointments/${invoice.job.id}`}
                className="text-primary hover:text-primary/80 text-sm font-medium"
              >
                View Appointment â†’
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


