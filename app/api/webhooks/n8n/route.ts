import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createCustomerAccount } from '@/lib/utils/create-customer-account'
import { n8nWebhookSchema, validateInput } from '@/lib/validation/schemas'
import { timingSafeEqual } from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ✅ SECURITY: Timing-safe comparison to prevent timing attacks
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false

  try {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    return timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.N8N_WEBHOOK_SECRET}`

    // ✅ SECURITY: Use timing-safe comparison
    if (!authHeader || !timingSafeCompare(authHeader, expectedAuth)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()

    // ✅ SECURITY: Validate all input fields with Zod
    const validation = validateInput(n8nWebhookSchema, payload)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.errors,
      }, { status: 400 })
    }

    const data = validation.data as {
      business_id: string
      customer_name: string
      customer_phone: string
      customer_email?: string
      customer_address?: string
      scheduled_start: string
      scheduled_end: string
      description?: string
      urgency?: 'low' | 'medium' | 'high' | 'emergency'
      calendar_event_id?: string
      technician_id?: string
    }
    const {
      business_id,
      customer_name,
      customer_phone,
      customer_email,
      customer_address,
      scheduled_start,
      scheduled_end,
      description,
      urgency,
      calendar_event_id,
      technician_id,
    } = data

    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('business_id', business_id)
      .eq('phone', customer_phone)
      .single()

    let customerId: string

    if (existingCustomer) {
      customerId = existingCustomer.id

      await supabaseAdmin
        .from('customers')
        .update({
          name: customer_name,
          email: customer_email || null,
          address: customer_address || null,
        })
        .eq('id', customerId)
    } else {
      const { data: newCustomer, error: customerError } = await supabaseAdmin
        .from('customers')
        .insert({
          business_id,
          name: customer_name,
          phone: customer_phone,
          email: customer_email || null,
          address: customer_address || null,
        })
        .select('id')
        .single()

      if (customerError) throw customerError

      customerId = newCustomer.id
    }

    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .insert({
        business_id,
        customer_id: customerId,
        technician_id: technician_id || null,
        status: 'scheduled',
        scheduled_start,
        scheduled_end,
        description: description || null,
        urgency: urgency || null,
        calendar_event_id: calendar_event_id || null,
        source: 'ai_caller',
      })
      .select()
      .single()

    if (jobError) throw jobError

    // Auto-create customer portal account if this is a new customer
    if (!existingCustomer) {
      await createCustomerAccount(customerId, customer_email || null)
      // Account creation happens asynchronously, don't wait for it
    }

    return NextResponse.json({
      success: true,
      job_id: job.id,
      customer_id: customerId,
      message: 'Job created successfully',
    })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json({
      error: error.message,
      success: false
    }, { status: 500 })
  }
}
