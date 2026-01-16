import { stripe } from './client'
import type Stripe from 'stripe'

/**
 * Subscription Pricing Tiers
 * Based on AI_PHONE_IMPLEMENTATION_PLAN.md
 */
export const SUBSCRIPTION_TIERS = {
  STARTER: {
    name: 'Starter',
    priceMonthly: 9900, // $99.00 in cents
    stripeProductId: process.env.STRIPE_PRODUCT_STARTER_ID,
    stripePriceId: process.env.STRIPE_PRICE_STARTER_ID,
    features: [
      'Job management',
      'Customer database',
      'Tech mobile app',
      'Customer portal',
      'Invoicing & payments',
      'Basic support',
      'Up to 3 technicians',
    ],
  },
  PROFESSIONAL: {
    name: 'Professional',
    priceMonthly: 29900, // $299.00 in cents
    stripeProductId: process.env.STRIPE_PRODUCT_PRO_ID,
    stripePriceId: process.env.STRIPE_PRICE_PRO_ID,
    features: [
      'Everything in Starter',
      '✨ AI Phone Receptionist',
      'Unlimited AI calls (fair use: 200/month)',
      'Priority support',
      'Call recordings & transcripts',
      'Monthly performance reports',
      'Up to 10 technicians',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    priceMonthly: 49900, // $499.00 in cents
    stripeProductId: process.env.STRIPE_PRODUCT_ENTERPRISE_ID,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE_ID,
    features: [
      'Everything in Professional',
      'Multi-location support',
      'Custom integrations',
      'API access',
      'Dedicated success manager',
      'Unlimited calls (fair use: 500/month)',
      'Unlimited technicians',
    ],
  },
} as const

export type SubscriptionTierKey = keyof typeof SUBSCRIPTION_TIERS

/**
 * Create or retrieve a Stripe customer for a business
 */
export async function createOrGetStripeCustomer(params: {
  businessId: string
  email: string
  name: string
  existingStripeCustomerId?: string
}): Promise<Stripe.Customer> {
  // If customer already exists, retrieve it
  if (params.existingStripeCustomerId) {
    try {
      return await stripe.customers.retrieve(params.existingStripeCustomerId) as Stripe.Customer
    } catch (error) {
      console.error('Failed to retrieve existing Stripe customer:', error)
      // Fall through to create new customer
    }
  }

  // Create new Stripe customer
  return await stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: {
      businessId: params.businessId,
    },
  })
}

/**
 * Create a subscription for a business
 */
export async function createSubscription(params: {
  stripeCustomerId: string
  tier: SubscriptionTierKey
  trialDays?: number
}): Promise<Stripe.Subscription> {
  const tierConfig = SUBSCRIPTION_TIERS[params.tier]

  if (!tierConfig.stripePriceId) {
    throw new Error(`Stripe price ID not configured for tier: ${params.tier}`)
  }

  const subscriptionParams: Stripe.SubscriptionCreateParams = {
    customer: params.stripeCustomerId,
    items: [
      {
        price: tierConfig.stripePriceId,
      },
    ],
    payment_behavior: 'default_incomplete',
    payment_settings: {
      payment_method_types: ['card'],
      save_default_payment_method: 'on_subscription',
    },
    expand: ['latest_invoice.payment_intent'],
  }

  // Add trial period if specified
  if (params.trialDays && params.trialDays > 0) {
    subscriptionParams.trial_period_days = params.trialDays
  }

  return await stripe.subscriptions.create(subscriptionParams)
}

/**
 * Update a subscription to a different tier (upgrade/downgrade)
 */
export async function updateSubscriptionTier(params: {
  stripeSubscriptionId: string
  newTier: SubscriptionTierKey
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
}): Promise<Stripe.Subscription> {
  const tierConfig = SUBSCRIPTION_TIERS[params.newTier]

  if (!tierConfig.stripePriceId) {
    throw new Error(`Stripe price ID not configured for tier: ${params.newTier}`)
  }

  // Get current subscription
  const subscription = await stripe.subscriptions.retrieve(params.stripeSubscriptionId)

  // Update subscription with new price
  return await stripe.subscriptions.update(params.stripeSubscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: tierConfig.stripePriceId,
      },
    ],
    proration_behavior: params.prorationBehavior || 'create_prorations',
  })
}

/**
 * Cancel a subscription at the end of the billing period
 */
export async function cancelSubscription(params: {
  stripeSubscriptionId: string
  cancelImmediately?: boolean
}): Promise<Stripe.Subscription> {
  if (params.cancelImmediately) {
    return await stripe.subscriptions.cancel(params.stripeSubscriptionId)
  } else {
    return await stripe.subscriptions.update(params.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })
  }
}

/**
 * Reactivate a subscription that was set to cancel
 */
export async function reactivateSubscription(
  stripeSubscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.update(stripeSubscriptionId, {
    cancel_at_period_end: false,
  })
}

/**
 * Get subscription details from Stripe
 */
export async function getSubscription(
  stripeSubscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.retrieve(stripeSubscriptionId, {
    expand: ['default_payment_method', 'latest_invoice'],
  })
}

/**
 * Create a billing portal session for customer self-service
 */
export async function createBillingPortalSession(params: {
  stripeCustomerId: string
  returnUrl: string
}): Promise<Stripe.BillingPortal.Session> {
  return await stripe.billingPortal.sessions.create({
    customer: params.stripeCustomerId,
    return_url: params.returnUrl,
  })
}

/**
 * Map Stripe status to database subscription_status enum
 */
export function mapStripeStatusToDb(
  stripeStatus: Stripe.Subscription.Status
): 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' {
  switch (stripeStatus) {
    case 'trialing':
      return 'trialing'
    case 'active':
      return 'active'
    case 'past_due':
      return 'past_due'
    case 'canceled':
    case 'incomplete_expired':
    case 'paused':
      return 'canceled'
    case 'incomplete':
    case 'unpaid':
      return 'unpaid'
    default:
      return 'unpaid'
  }
}

/**
 * Map tier name to subscription_tier enum
 */
export function getTierFromPriceId(priceId: string): 'starter' | 'professional' | 'enterprise' {
  if (priceId === SUBSCRIPTION_TIERS.STARTER.stripePriceId) {
    return 'starter'
  } else if (priceId === SUBSCRIPTION_TIERS.PROFESSIONAL.stripePriceId) {
    return 'professional'
  } else if (priceId === SUBSCRIPTION_TIERS.ENTERPRISE.stripePriceId) {
    return 'enterprise'
  }
  return 'starter' // Default fallback
}
