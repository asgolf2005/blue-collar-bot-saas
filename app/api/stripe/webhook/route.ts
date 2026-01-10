import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { constructWebhookEvent } from '@/lib/stripe/utils'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    // Verify webhook signature and construct event
    let event: Stripe.Event
    try {
      event = constructWebhookEvent(body, signature)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Get invoice ID from metadata or client_reference_id
        const invoiceId = session.metadata?.invoiceId || session.client_reference_id

        if (!invoiceId) {
          console.error('No invoice ID found in session metadata')
          break
        }

        // Update invoice status to paid
        const { error: updateError } = await supabaseAdmin
          .from('invoices')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            payment_intent_id: session.payment_intent as string,
          })
          .eq('id', invoiceId)

        if (updateError) {
          console.error('Failed to update invoice:', updateError)
          break
        }

        console.log(`Invoice ${invoiceId} marked as paid`)

        // Fetch invoice details to trigger notification
        const { data: invoice } = await supabaseAdmin
          .from('invoices')
          .select(`
            *,
            customer:customers(
              id,
              name,
              email,
              user_id
            )
          `)
          .eq('id', invoiceId)
          .single()

        if (invoice) {
          // Trigger payment notification
          try {
            const { triggerPaymentNotification } = await import('@/lib/notifications/actions')
            await triggerPaymentNotification(invoiceId)
          } catch (notificationError) {
            console.error('Failed to trigger payment notification:', notificationError)
          }

          // Send payment receipt email
          try {
            const { emailService } = await import('@/lib/email/client')
            const { data: business } = await supabaseAdmin
              .from('businesses')
              .select('name')
              .eq('id', invoice.business_id)
              .single()

            const businessName = business?.name || 'Our Business'
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

            if (invoice.customer.email) {
              await emailService.sendPaymentReceipt(
                invoice.customer.email,
                invoice.customer.name,
                businessName,
                invoice.invoice_number,
                invoice.total,
                new Date(invoice.paid_at || new Date()).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }),
                session.payment_method_types?.[0] === 'card' ? 'Credit/Debit Card' : 'Payment Link',
                session.payment_intent as string,
                `${appUrl}/customer/invoices/${invoice.id}`
              )
              console.log(`Payment receipt sent to ${invoice.customer.email}`)
            }
          } catch (emailError) {
            console.error('Failed to send payment receipt email:', emailError)
            // Don't fail the webhook if email fails
          }
        }

        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log(`PaymentIntent ${paymentIntent.id} succeeded`)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.error(`PaymentIntent ${paymentIntent.id} failed`)

        // Could send notification to admin about failed payment
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        console.log(`Charge ${charge.id} was refunded`)

        // Find invoice by payment_intent_id and update status
        if (charge.payment_intent) {
          const { data: invoice } = await supabaseAdmin
            .from('invoices')
            .select('id')
            .eq('payment_intent_id', charge.payment_intent)
            .single()

          if (invoice) {
            await supabaseAdmin
              .from('invoices')
              .update({ status: 'cancelled' })
              .eq('id', invoice.id)

            console.log(`Invoice ${invoice.id} marked as cancelled (refunded)`)
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
