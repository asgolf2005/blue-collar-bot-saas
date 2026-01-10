import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCheckoutSession } from '@/lib/stripe/utils'
import { CheckCircle, Download, FileText, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import InvoiceDownloadButton from '@/components/customer/InvoiceDownloadButton'

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const params = await searchParams
  const sessionId = params.session_id

  if (!sessionId) {
    redirect('/customer/invoices')
  }

  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get Stripe session details
  let session
  try {
    session = await getCheckoutSession(sessionId)
  } catch (error) {
    console.error('Failed to retrieve session:', error)
    redirect('/customer/invoices')
  }

  // Get invoice ID from session metadata
  const invoiceId = session.metadata?.invoiceId || session.client_reference_id

  if (!invoiceId) {
    redirect('/customer/invoices')
  }

  // Fetch invoice details
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(*),
      line_items:invoice_line_items(*)
    `)
    .eq('id', invoiceId)
    .single()

  if (error || !invoice) {
    redirect('/customer/invoices')
  }

  // Verify the invoice belongs to the logged-in customer
  if (invoice.customer.user_id !== user.id) {
    redirect('/customer/invoices')
  }

  // Fetch business details for PDF generation
  const { data: business } = await supabase
    .from('businesses')
    .select('name, address, phone, email, primary_color')
    .eq('id', invoice.business_id)
    .single()

  if (!business) {
    redirect('/customer/invoices')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Success Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 border-4 border-success/20 mb-4">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h1>
            <p className="text-gray-600">
              Thank you for your payment. Your receipt has been sent to your email.
            </p>
          </div>

          {/* Payment Details Card */}
          <div className="card mb-6">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200">
              <FileText className="w-5 h-5 text-primary-600" />
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">
                  Invoice {invoice.invoice_number}
                </h2>
                <p className="text-sm text-gray-600">
                  Paid on {format(new Date(invoice.paid_at || new Date()), 'MMMM d, yyyy')}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  ${invoice.total.toFixed(2)}
                </div>
                <div className="text-xs text-success font-medium">PAID</div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b border-gray-200">
              <div>
                <div className="text-sm text-gray-600 mb-1">Payment Method</div>
                <div className="font-medium text-gray-900">
                  {session.payment_method_types?.[0] === 'card' ? 'Credit/Debit Card' : 'Payment Link'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Transaction ID</div>
                <div className="font-mono text-xs text-gray-900 break-all">
                  {session.payment_intent as string}
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="mb-6">
              <div className="text-sm text-gray-600 mb-2">Billed To</div>
              <div className="font-medium text-gray-900">{invoice.customer.name}</div>
              {invoice.customer.email && (
                <div className="text-sm text-gray-600">{invoice.customer.email}</div>
              )}
              {invoice.customer.address && (
                <div className="text-sm text-gray-600">{invoice.customer.address}</div>
              )}
            </div>

            {/* Invoice Notes */}
            {invoice.notes && (
              <div className="mb-6 pb-6 border-t border-gray-200 pt-6">
                <div className="text-sm text-gray-600 mb-2">Notes</div>
                <div className="text-gray-900">{invoice.notes}</div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
              <Link
                href={`/customer/invoices/${invoice.id}`}
                className="glass-btn-primary flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                View Invoice Details
              </Link>
              <InvoiceDownloadButton invoice={invoice} business={business} />
            </div>
          </div>

          {/* Back to Dashboard */}
          <div className="text-center">
            <Link
              href="/customer/invoices"
              className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Invoices
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
