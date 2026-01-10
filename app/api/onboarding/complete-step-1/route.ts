import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Use service role to bypass RLS for initial setup
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
    const body = await request.json()
    const { user_id, business_name, owner_name, email, phone, address, calendar_id } = body

    if (!user_id || !business_name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create business
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert({
        name: business_name,
        address: address || null,
        email: email,
        phone: phone || null,
        primary_calendar_id: calendar_id || null,
        onboarding_completed: false,
      })
      .select()
      .single()

    if (businessError) {
      console.error('Business creation error:', businessError)
      throw businessError
    }

    // Create user profile
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: user_id,
        business_id: business.id,
        email: email,
        full_name: owner_name,
        phone: phone || null,
        role: 'admin',
      })

    if (userError) {
      console.error('User profile error:', userError)
      throw userError
    }

    // Create subscription (free trial)
    const { error: subError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        business_id: business.id,
        tier: 'professional',
        plan_name: 'professional',
        status: 'trialing',
      })

    if (subError) {
      console.error('Subscription error:', subError)
      throw subError
    }

    return NextResponse.json({
      success: true,
      business_id: business.id,
    })
  } catch (error: any) {
    console.error('Onboarding step 1 error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to complete onboarding step 1' },
      { status: 500 }
    )
  }
}
