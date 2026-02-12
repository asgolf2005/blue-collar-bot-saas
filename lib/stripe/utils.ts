import { getStripeClient, STRIPE_CONFIG } from './client'
import type Stripe from 'stripe'

export interface CreateCheckoutSessionParams {
  invoiceId: string
  customerId: string
  customerEmail: string
  customerName: string
  amount: number // in cents
  invoiceNumber: string
  description?: string
}

/**
 * Create a Stripe Checkout session for an invoice payment
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeClient()
  const session = await stripe.checkout.sessions.create({
    payment_method_types: STRIPE_CONFIG.paymentMethodTypes as any,
    mode: 'payment',
    customer_email: params.customerEmail,
    client_reference_id: params.invoiceId,
    line_items: [
      {
        price_data: {
          currency: STRIPE_CONFIG.currency,
          product_data: {
            name: `Invoice ${params.invoiceNumber}`,
            description: params.description || `Payment for services rendered`,
          },
          unit_amount: params.amount,
        },
        quantity: 1,
      },
    ],
    metadata: {
      invoiceId: params.invoiceId,
      customerId: params.customerId,
      invoiceNumber: params.invoiceNumber,
    },
    success_url: STRIPE_CONFIG.successUrl,
    cancel_url: STRIPE_CONFIG.cancelUrl,
    // Enable Apple Pay, Google Pay, and Link
    payment_method_options: {
      card: {
        setup_future_usage: 'off_session', // Save card for future use
      },
    },
  })

  return session
}

/**
 * Retrieve a checkout session by ID
 */
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeClient()
  return await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent', 'line_items'],
  })
}

/**
 * Create a refund for a payment
 */
export async function createRefund(paymentIntentId: string, amount?: number): Promise<Stripe.Refund> {
  const stripe = getStripeClient()
  return await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount, // Optional: partial refund amount in cents
  })
}

/**
 * Get payment intent details
 */
export async function getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  const stripe = getStripeClient()
  return await stripe.paymentIntents.retrieve(paymentIntentId)
}

/**
 * Construct webhook event from raw body and signature
 */
export function constructWebhookEvent(
  rawBody: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripeClient()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  }

  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
}
