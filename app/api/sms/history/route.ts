import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile to check business
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const jobId = searchParams.get('jobId')
    const customerId = searchParams.get('customerId')
    const invoiceId = searchParams.get('invoiceId')

    // Build query
    let query = supabase
      .from('sms_notifications')
      .select('*')
      .eq('business_id', profile.business_id)
      .order('created_at', { ascending: false })

    // Filter by job, customer, or invoice
    if (jobId) {
      query = query.eq('job_id', jobId)
    } else if (customerId) {
      query = query.eq('customer_id', customerId)
    } else if (invoiceId) {
      query = query.eq('invoice_id', invoiceId)
    }

    const { data: smsHistory, error } = await query

    if (error) {
      console.error('Error fetching SMS history:', error)
      return NextResponse.json(
        { error: 'Failed to fetch SMS history' },
        { status: 500 }
      )
    }

    return NextResponse.json(smsHistory || [])
  } catch (error) {
    console.error('SMS history error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
