import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createCheckoutSession } from '@/lib/stripe/utils'

export async function POST(request: Request) {
  try {
    const { invoiceId } = await request.json()

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch invoice with customer details
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('id', invoiceId)
      .single()

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Verify the invoice belongs to the logged-in customer
    if (invoice.customer.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if invoice is already paid
    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Invoice is already paid' }, { status: 400 })
    }

    const amountInCents = Math.round(invoice.total * 100)

    // Create Stripe Checkout Session
    const session = await createCheckoutSession({
      invoiceId: invoice.id,
      customerId: invoice.customer_id,
      customerEmail: invoice.customer.email || user.email || '',
      customerName: invoice.customer.name,
      amount: amountInCents,
      invoiceNumber: invoice.invoice_number,
      description: `Payment for services rendered`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
