import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ✅ SECURITY: This endpoint creates demo accounts for testing
// Protected by multiple security layers
export async function POST(request: Request) {
  // Layer 1: Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  // Layer 2: Require secret token
  const authHeader = request.headers.get('authorization')
  const expectedAuth = `Bearer ${process.env.SEED_SECRET || 'dev-only-seed-secret'}`

  if (authHeader !== expectedAuth) {
    return NextResponse.json({ error: 'Unauthorized - Invalid seed secret' }, { status: 401 })
  }

  // Layer 3: Check if running on localhost
  const host = request.headers.get('host')
  if (!host?.includes('localhost') && !host?.includes('127.0.0.1')) {
    return NextResponse.json({ error: 'Forbidden - Only accessible from localhost' }, { status: 403 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseServiceKey) {
    return NextResponse.json({
      error: 'Missing SUPABASE_SERVICE_ROLE_KEY in environment variables'
    }, { status: 500 })
  }

  // Use service role key to bypass RLS
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const demoContacts = {
    businessAddress: 'Level 3, 123 Pitt St, Sydney NSW 2000',
    businessPhone: '+61 2 9100 1234',
    techPhone: '+61 4 9123 4567',
    customerAddress: '22 Market St, Brisbane QLD 4000',
    customerPhone: '+61 4 8555 7788',
  }
  const testPassword = 'testpass123'
  const results: any = { admin: null, tech: null, customer: null }

  try {
    // 1. Create Admin User
    const adminEmail = 'admin@demo.com'
    const { data: adminAuth, error: adminAuthError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Demo Admin' }
    })

    if (adminAuthError && !adminAuthError.message.includes('already been registered')) {
      console.error('Admin auth error:', adminAuthError)
    }

    let adminUserId = adminAuth?.user?.id

    // If user already exists, get their ID
    if (!adminUserId) {
      const { data: existingUsers } = await supabase
        .from('users')
        .select('id')
        .eq('email', adminEmail)
        .single()
      adminUserId = existingUsers?.id
    }

    if (adminUserId) {
      // Create or update business
      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .upsert({
          id: adminUserId, // Use user ID as business ID for simplicity
          owner_id: adminUserId,
          name: 'Demo Plumbing Co.',
          address: demoContacts.businessAddress,
          phone: demoContacts.businessPhone,
          email: adminEmail,
          primary_color: '#f97316',
          is_active: true,
          onboarding_completed: true,
        }, { onConflict: 'owner_id' })
        .select()
        .single()

      const businessId = business?.id || adminUserId

      // Create or update admin user profile
      await supabase
        .from('users')
        .upsert({
          id: adminUserId,
          email: adminEmail,
          full_name: 'Demo Admin',
          role: 'admin',
          business_id: businessId,
        }, { onConflict: 'id' })

      // Create some demo services
      await supabase
        .from('services')
        .upsert([
          { business_id: businessId, name: 'Blocked Drain', base_price: 150, duration_minutes: 60, is_active: true },
          { business_id: businessId, name: 'Hot Water System', base_price: 350, duration_minutes: 120, is_active: true },
          { business_id: businessId, name: 'Leak Repair', base_price: 120, duration_minutes: 45, is_active: true },
          { business_id: businessId, name: 'Toilet Repair', base_price: 180, duration_minutes: 60, is_active: true },
        ], { onConflict: 'id', ignoreDuplicates: true })

      results.admin = { email: adminEmail, password: testPassword, role: 'admin', businessId }

      // 2. Create Technician User
      const techEmail = 'tech@demo.com'
      const { data: techAuth, error: techAuthError } = await supabase.auth.admin.createUser({
        email: techEmail,
        password: testPassword,
        email_confirm: true,
        user_metadata: { full_name: 'Demo Technician' }
      })

      if (techAuthError && !techAuthError.message.includes('already been registered')) {
        console.error('Tech auth error:', techAuthError)
      }

      let techUserId = techAuth?.user?.id

      if (!techUserId) {
        const { data: existingTech } = await supabase
          .from('users')
          .select('id')
          .eq('email', techEmail)
          .single()
        techUserId = existingTech?.id
      }

      if (techUserId) {
        await supabase
          .from('users')
          .upsert({
            id: techUserId,
            email: techEmail,
            full_name: 'Alex Rivera',
            role: 'tech',
            business_id: businessId,
          }, { onConflict: 'id' })

        results.tech = { email: techEmail, password: testPassword, role: 'tech' }
      }

      // 3. Create Customer User
      const customerEmail = 'customer@demo.com'
      const { data: customerAuth, error: customerAuthError } = await supabase.auth.admin.createUser({
        email: customerEmail,
        password: testPassword,
        email_confirm: true,
        user_metadata: { full_name: 'Demo Customer' }
      })

      if (customerAuthError && !customerAuthError.message.includes('already been registered')) {
        console.error('Customer auth error:', customerAuthError)
      }

      let customerUserId = customerAuth?.user?.id

      if (!customerUserId) {
        const { data: existingCustomer } = await supabase
          .from('users')
          .select('id')
          .eq('email', customerEmail)
          .single()
        customerUserId = existingCustomer?.id
      }

      if (customerUserId) {
        await supabase
          .from('users')
          .upsert({
            id: customerUserId,
            email: customerEmail,
            full_name: 'John Customer',
            role: 'customer',
            business_id: businessId,
          }, { onConflict: 'id' })

        // Create customer profile
        const { data: customer } = await supabase
          .from('customers')
          .upsert({
            user_id: customerUserId,
            business_id: businessId,
            name: 'John Customer',
            email: customerEmail,
            phone: demoContacts.customerPhone,
            address: demoContacts.customerAddress,
          }, { onConflict: 'user_id' })
          .select()
          .single()

        results.customer = { email: customerEmail, password: testPassword, role: 'customer' }

        // Create some demo jobs for the technician and customer
        if (customer && techUserId) {
          const today = new Date()
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)

          await supabase
            .from('jobs')
            .upsert([
              {
                business_id: businessId,
                customer_id: customer.id,
                technician_id: techUserId,
                description: 'Blocked kitchen drain',
                status: 'scheduled',
                scheduled_start: new Date(today.setHours(9, 0, 0, 0)).toISOString(),
                scheduled_end: new Date(today.setHours(10, 0, 0, 0)).toISOString(),
              },
              {
                business_id: businessId,
                customer_id: customer.id,
                technician_id: techUserId,
                description: 'Hot water system check',
                status: 'scheduled',
                scheduled_start: new Date(today.setHours(11, 0, 0, 0)).toISOString(),
                scheduled_end: new Date(today.setHours(13, 0, 0, 0)).toISOString(),
              },
              {
                business_id: businessId,
                customer_id: customer.id,
                technician_id: techUserId,
                description: 'Leaking bathroom tap',
                status: 'scheduled',
                scheduled_start: new Date(today.setHours(14, 0, 0, 0)).toISOString(),
                scheduled_end: new Date(today.setHours(15, 0, 0, 0)).toISOString(),
              },
            ], { onConflict: 'id', ignoreDuplicates: true })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Demo accounts created successfully',
      accounts: results,
      note: 'Use these credentials to log in to each dashboard'
    })

  } catch (error: any) {
    console.error('Seed error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to create demo accounts',
      details: error
    }, { status: 500 })
  }
}

export async function GET() {
  // ✅ SECURITY: Don't expose credentials via GET endpoint
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  return NextResponse.json({
    message: 'Seed Endpoint',
    note: 'POST to this endpoint with proper authorization to create demo accounts',
    usage: 'curl -X POST http://localhost:3000/api/seed -H "Authorization: Bearer YOUR_SEED_SECRET"',
    environment: process.env.NODE_ENV,
  })
}
