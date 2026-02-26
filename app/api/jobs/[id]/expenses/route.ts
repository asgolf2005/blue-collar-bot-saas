import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type UserProfile = {
  business_id: string
  role: string
}

async function canAccessJobExpenses(args: {
  supabase: Awaited<ReturnType<typeof createClient>>
  jobId: string
  userId: string
  userProfile: UserProfile
}) {
  const { supabase, jobId, userId, userProfile } = args

  const { data: job } = await supabase
    .from('jobs')
    .select('id, business_id, technician_id')
    .eq('id', jobId)
    .single()

  if (!job) {
    return { ok: false as const, status: 404, error: 'Job not found' }
  }

  if (!userProfile.business_id || userProfile.business_id !== job.business_id) {
    return { ok: false as const, status: 403, error: 'Unauthorized' }
  }

  if (userProfile.role === 'admin') {
    return { ok: true as const, businessId: job.business_id }
  }

  if (userProfile.role === 'tech' && job.technician_id === userId) {
    return { ok: true as const, businessId: job.business_id }
  }

  return { ok: false as const, status: 403, error: 'Forbidden' }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { category, description, amount, vendor, purchase_date, notes, receipt_url } = body

    // Validation
    if (!category || !description || !amount) {
      return NextResponse.json(
        { error: 'Category, description, and amount are required' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const access = await canAccessJobExpenses({
      supabase,
      jobId: id,
      userId: user.id,
      userProfile: userProfile as UserProfile,
    })

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    // Create the expense
    const { data: expense, error } = await supabase
      .from('job_expenses')
      .insert({
        job_id: id,
        business_id: access.businessId,
        category,
        description: description.trim(),
        amount,
        vendor: vendor || null,
        purchase_date: purchase_date || new Date().toISOString().split('T')[0],
        notes: notes || null,
        receipt_url: receipt_url || null,
        created_by: user.id,
      })
      .select('*, creator:users!created_by(id, full_name, email)')
      .single()

    if (error) throw error

    // Profit calculations are auto-updated by database trigger

    return NextResponse.json({ success: true, expense })
  } catch (error: any) {
    console.error('Add expense error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add expense' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const access = await canAccessJobExpenses({
      supabase,
      jobId: id,
      userId: user.id,
      userProfile: userProfile as UserProfile,
    })

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    // Get expenses
    const { data: expenses, error } = await supabase
      .from('job_expenses')
      .select('*, creator:users!created_by(id, full_name, email)')
      .eq('job_id', id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ expenses: expenses || [] })
  } catch (error: any) {
    console.error('Get expenses error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get expenses' },
      { status: 500 }
    )
  }
}
