import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAdmin = getSupabaseAdminClient()
    const { id: customerId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get admin's business_id
    const { data: profile } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { enabled } = await request.json()

    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .eq('business_id', profile.business_id)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    if (enabled) {
      // Enable portal access
      if (customer.user_id) {
        // User account already exists, just update portal_access
        const { error: updateError } = await supabase
          .from('customers')
          .update({ portal_access: true })
          .eq('id', customerId)

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 })
        }
      } else {
        // Need to create a user account
        if (!customer.email) {
          return NextResponse.json(
            { error: 'Customer must have an email address to enable portal access' },
            { status: 400 }
          )
        }

        // Use the admin client to create auth user
        const { data: { user: newUser }, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
          email: customer.email,
          email_confirm: true,
          user_metadata: {
            full_name: customer.name,
            role: 'customer',
          },
        })

        if (createUserError) {
          return NextResponse.json({ error: createUserError.message }, { status: 500 })
        }

        if (!newUser) {
          return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 })
        }

        // Update customer with user_id and enable portal access
        const { error: linkError } = await supabase
          .from('customers')
          .update({
            user_id: newUser.id,
            portal_access: true,
          })
          .eq('id', customerId)

        if (linkError) {
          return NextResponse.json({ error: linkError.message }, { status: 500 })
        }

        // Generate and send magic link for first login
        const { error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: customer.email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
          },
        })

        if (magicLinkError) {
          console.error('Failed to generate magic link:', magicLinkError)
          // Don't fail the request, portal access is still enabled
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Portal access enabled',
        emailSent: !customer.user_id, // Email only sent for new accounts
      })
    } else {
      // Disable portal access
      const { error: updateError } = await supabase
        .from('customers')
        .update({ portal_access: false })
        .eq('id', customerId)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Portal access disabled',
      })
    }
  } catch (error) {
    console.error('Portal access toggle error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
