import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    })
  }

  return stripeClient
}

// Stripe configuration
export const STRIPE_CONFIG = {
  currency: 'usd',
  paymentMethodTypes: ['card', 'link'], // Apple Pay & Google Pay are auto-enabled
  successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/customer/payment/success?session_id={CHECKOUT_SESSION_ID}`,
  cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/customer/invoices`,
}
