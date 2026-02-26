import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    // Use service role to bypass RLS for initial setup
    const supabaseAdmin = getSupabaseAdminClient()
    const body = await request.json()
    const { user_id, business_name, owner_name, email, phone, address, calendar_id } = body

    if (!user_id || !business_name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from('users')
      .select('id, business_id')
      .eq('id', user_id)
      .maybeSingle()

    if (existingUserError) {
      console.error('User lookup error:', existingUserError)
      throw existingUserError
    }

    let businessId = existingUser?.business_id || null
    if (!businessId) {
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
        .select('id')
        .single()

      if (businessError || !business) {
        console.error('Business creation error:', businessError)
        throw businessError || new Error('Failed to create business')
      }

      businessId = business.id
    } else {
      // Keep business profile in sync when onboarding is retried.
      const { error: businessUpdateError } = await supabaseAdmin
        .from('businesses')
        .update({
          name: business_name,
          address: address || null,
          email: email,
          phone: phone || null,
          primary_calendar_id: calendar_id || null,
        })
        .eq('id', businessId)

      if (businessUpdateError) {
        console.error('Business update error:', businessUpdateError)
        throw businessUpdateError
      }
    }

    const { error: userUpsertError } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          id: user_id,
          business_id: businessId,
          email: email,
          full_name: owner_name,
          phone: phone || null,
          role: 'admin',
        },
        { onConflict: 'id' }
      )

    if (userUpsertError) {
      console.error('User upsert error:', userUpsertError)
      throw userUpsertError
    }

    // Create or keep subscription (free trial)
    const { error: subError } = await supabaseAdmin
      .from('subscriptions')
      .upsert(
        {
          business_id: businessId,
          tier: 'professional',
          plan_name: 'professional',
          status: 'trialing',
        },
        { onConflict: 'business_id' }
      )

    if (subError) {
      console.error('Subscription upsert error:', subError)
      throw subError
    }

    return NextResponse.json({
      success: true,
      business_id: businessId,
    })
  } catch (error: any) {
    console.error('Onboarding step 1 error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to complete onboarding step 1' },
      { status: 500 }
    )
  }
}
