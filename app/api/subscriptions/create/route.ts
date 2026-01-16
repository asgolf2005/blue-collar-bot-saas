import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createOrGetStripeCustomer,
  createSubscription,
  type SubscriptionTierKey,
} from '@/lib/stripe/subscriptions'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's business
    const { data: userRecord } = await supabase
      .from('users')
      .select('business_id, businesses(id, name, stripe_customer_id)')
      .eq('id', user.id)
      .single()

    if (!userRecord?.business_id || !userRecord.businesses) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const business = userRecord.businesses as any

    // Parse request body
    const body = await request.json()
    const { tier, trialDays } = body as { tier: SubscriptionTierKey; trialDays?: number }

    if (!tier || !['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier specified' }, { status: 400 })
    }

    // Check if business already has a subscription
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('business_id', business.id)
      .single()

    if (existingSubscription && existingSubscription.status !== 'canceled') {
      return NextResponse.json(
        { error: 'Business already has an active subscription' },
        { status: 400 }
      )
    }

    // Create or get Stripe customer
    const stripeCustomer = await createOrGetStripeCustomer({
      businessId: business.id,
      email: user.email!,
      name: business.name,
      existingStripeCustomerId: business.stripe_customer_id,
    })

    // Update business with Stripe customer ID if new
    if (!business.stripe_customer_id) {
      await supabase
        .from('businesses')
        .update({ stripe_customer_id: stripeCustomer.id })
        .eq('id', business.id)
    }

    // Create subscription in Stripe
    const subscription = await createSubscription({
      stripeCustomerId: stripeCustomer.id,
      tier,
      trialDays: trialDays || 14, // Default 14-day trial
    })

    // Get the payment intent client secret if subscription requires payment
    const clientSecret =
      subscription.status === 'incomplete'
        ? (subscription.latest_invoice as any)?.payment_intent?.client_secret
        : null

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      clientSecret,
      status: subscription.status,
      message: 'Subscription created successfully',
    })
  } catch (error: any) {
    console.error('Subscription creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription' },
      { status: 500 }
    )
  }
}
