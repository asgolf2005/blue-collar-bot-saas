import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type UserProfile = {
  business_id: string
  role: string
}

async function canAccessJobExpenseMutation(args: {
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { id, expenseId } = await params
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

    // Get user's business
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

    const access = await canAccessJobExpenseMutation({
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

    // Verify expense belongs to user's business
    const { data: existingExpense } = await supabase
      .from('job_expenses')
      .select('id, job_id, business_id')
      .eq('id', expenseId)
      .eq('job_id', id)
      .single()

    if (!existingExpense || existingExpense.business_id !== access.businessId) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    // Build update object (only include provided fields)
    const updates: any = {}
    if (category !== undefined) updates.category = category
    if (description !== undefined) updates.description = description.trim()
    if (amount !== undefined) {
      if (amount <= 0) {
        return NextResponse.json(
          { error: 'Amount must be greater than 0' },
          { status: 400 }
        )
      }
      updates.amount = amount
    }
    if (vendor !== undefined) updates.vendor = vendor || null
    if (purchase_date !== undefined) updates.purchase_date = purchase_date
    if (notes !== undefined) updates.notes = notes || null
    if (receipt_url !== undefined) updates.receipt_url = receipt_url || null

    // Update the expense
    const { data: expense, error } = await supabase
      .from('job_expenses')
      .update(updates)
      .eq('id', expenseId)
      .select('*, creator:users!created_by(id, full_name, email)')
      .single()

    if (error) throw error

    // Profit calculations are auto-updated by database trigger

    return NextResponse.json({ success: true, expense })
  } catch (error: any) {
    console.error('Update expense error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update expense' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { id, expenseId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's business
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

    const access = await canAccessJobExpenseMutation({
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

    // Verify expense belongs to user's business
    const { data: existingExpense } = await supabase
      .from('job_expenses')
      .select('id, job_id, business_id')
      .eq('id', expenseId)
      .eq('job_id', id)
      .single()

    if (!existingExpense || existingExpense.business_id !== access.businessId) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    // Delete the expense
    const { error } = await supabase
      .from('job_expenses')
      .delete()
      .eq('id', expenseId)

    if (error) throw error

    // Profit calculations are auto-updated by database trigger

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete expense error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete expense' },
      { status: 500 }
    )
  }
}
