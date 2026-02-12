import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { constructWebhookEvent } from '@/lib/stripe/utils'
import { mapStripeStatusToDb, getTierFromPriceId } from '@/lib/stripe/subscriptions'
import type Stripe from 'stripe'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdminClient()
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

      // ========================================
      // SUBSCRIPTION EVENTS
      // ========================================

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const priceId = subscription.items.data[0]?.price.id

        console.log(`Subscription ${subscription.id} ${event.type === 'customer.subscription.created' ? 'created' : 'updated'}`)

        // Get business_id from customer metadata
        const customer = await supabaseAdmin
          .from('businesses')
          .select('id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single()

        if (!customer.data) {
          console.error(`No business found for Stripe customer ${subscription.customer}`)
          break
        }

        // Upsert subscription record
        const { error: upsertError } = await supabaseAdmin
          .from('subscriptions')
          .upsert({
            business_id: customer.data.id,
            stripe_customer_id: subscription.customer as string,
            stripe_subscription_id: subscription.id,
            tier: getTierFromPriceId(priceId),
            status: mapStripeStatusToDb(subscription.status),
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'business_id',
          })

        if (upsertError) {
          console.error('Failed to upsert subscription:', upsertError)
        } else {
          console.log(`Subscription record updated for business ${customer.data.id}`)
        }

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        console.log(`Subscription ${subscription.id} deleted`)

        // Update subscription status to canceled
        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        if (updateError) {
          console.error('Failed to update subscription on deletion:', updateError)
        } else {
          console.log(`Subscription ${subscription.id} marked as canceled`)
        }

        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice

        // Only handle subscription invoices (not one-time invoice payments)
        if (invoice.subscription) {
          console.log(`Subscription payment succeeded for invoice ${invoice.id}`)

          // Subscription record will be updated via subscription.updated event
          // This event is mainly for logging and potential email notifications
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice

        if (invoice.subscription) {
          console.error(`Subscription payment failed for invoice ${invoice.id}`)

          // Update subscription status to past_due
          const { error: updateError } = await supabaseAdmin
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription as string)

          if (updateError) {
            console.error('Failed to update subscription on payment failure:', updateError)
          }

          // TODO: Send email notification to business owner about failed payment
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
