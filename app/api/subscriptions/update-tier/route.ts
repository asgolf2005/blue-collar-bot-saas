import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateSubscriptionTier, type SubscriptionTierKey } from '@/lib/stripe/subscriptions'

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
    const { newTier } = body as { newTier: SubscriptionTierKey }

    if (!newTier || !['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(newTier)) {
      return NextResponse.json({ error: 'Invalid tier specified' }, { status: 400 })
    }

    // Check if already on this tier
    if (subscription.tier === newTier.toLowerCase()) {
      return NextResponse.json(
        { error: 'Already subscribed to this tier' },
        { status: 400 }
      )
    }

    // Update subscription tier in Stripe
    const updatedSubscription = await updateSubscriptionTier({
      stripeSubscriptionId: subscription.stripe_subscription_id,
      newTier,
      prorationBehavior: 'create_prorations', // Pro-rate the difference
    })

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
      message: `Successfully ${getTierUpgradeDowngradeAction(subscription.tier, newTier)} to ${newTier}`,
    })
  } catch (error: any) {
    console.error('Subscription tier update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update subscription tier' },
      { status: 500 }
    )
  }
}

function getTierUpgradeDowngradeAction(
  currentTier: string,
  newTier: string
): 'upgraded' | 'downgraded' {
  const tierOrder = { starter: 1, professional: 2, enterprise: 3 }
  const current = tierOrder[currentTier.toLowerCase() as keyof typeof tierOrder] || 0
  const target = tierOrder[newTier.toLowerCase() as keyof typeof tierOrder] || 0
  return target > current ? 'upgraded' : 'downgraded'
}
