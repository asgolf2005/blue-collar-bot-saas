import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBillingPortalSession } from '@/lib/stripe/subscriptions'

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
      .select('business_id, role, businesses(id, stripe_customer_id)')
      .eq('id', user.id)
      .single()

    if (!userRecord?.business_id || userRecord.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 })
    }

    const business = userRecord.businesses as any

    if (!business.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { returnUrl } = body as { returnUrl?: string }

    // Create billing portal session
    const session = await createBillingPortalSession({
      stripeCustomerId: business.stripe_customer_id,
      returnUrl: returnUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/admin/settings`,
    })

    return NextResponse.json({
      success: true,
      url: session.url,
    })
  } catch (error: any) {
    console.error('Billing portal error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create billing portal session' },
      { status: 500 }
    )
  }
}
