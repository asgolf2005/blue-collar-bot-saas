import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cancelSubscription } from '@/lib/stripe/subscriptions'

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

    // Get user's business and subscription
    const { data: userRecord } = await supabase
      .from('users')
      .select('business_id, role, businesses(id, subscriptions(*))')
      .eq('id', user.id)
      .single()

    if (!userRecord?.business_id || userRecord.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 })
    }

    const business = userRecord.businesses as any
    const subscription = business?.subscriptions?.[0]

    if (!subscription || !subscription.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { cancelImmediately } = body as { cancelImmediately?: boolean }

    // Cancel subscription in Stripe
    const canceledSubscription = await cancelSubscription({
      stripeSubscriptionId: subscription.stripe_subscription_id,
      cancelImmediately: cancelImmediately || false,
    })

    return NextResponse.json({
      success: true,
      subscription: canceledSubscription,
      message: cancelImmediately
        ? 'Subscription canceled immediately'
        : 'Subscription will cancel at the end of the billing period',
    })
  } catch (error: any) {
    console.error('Subscription cancellation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
