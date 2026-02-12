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

export const STRIPE_CONFIG = {
  currency: 'usd',
  paymentMethods: ['card'], // Can extend to: 'card', 'us_bank_account', 'link'
  // Stripe fees: 2.9% + $0.30 per transaction (similar to competitors)
}
