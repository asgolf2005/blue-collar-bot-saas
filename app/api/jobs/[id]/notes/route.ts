import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type UserProfile = {
  business_id: string
  role: string
}

async function canAccessJobNotes(args: {
  supabase: Awaited<ReturnType<typeof createClient>>
  jobId: string
  userId: string
  userProfile: UserProfile
  allowCustomerRead: boolean
  forWrite: boolean
}) {
  const { supabase, jobId, userId, userProfile, allowCustomerRead, forWrite } = args

  const { data: job } = await supabase
    .from('jobs')
    .select('id, business_id, technician_id, customer_id')
    .eq('id', jobId)
    .single()

  if (!job) {
    return { ok: false as const, status: 404, error: 'Job not found' }
  }

  if (!userProfile.business_id || userProfile.business_id !== job.business_id) {
    return { ok: false as const, status: 403, error: 'Unauthorized' }
  }

  if (userProfile.role === 'admin') {
    return { ok: true as const, role: 'admin' as const }
  }

  if (userProfile.role === 'tech') {
    if (job.technician_id !== userId) {
      return { ok: false as const, status: 403, error: 'Forbidden' }
    }
    return { ok: true as const, role: 'tech' as const }
  }

  if (userProfile.role === 'customer' && allowCustomerRead && !forWrite) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!customer || customer.id !== job.customer_id) {
      return { ok: false as const, status: 403, error: 'Forbidden' }
    }

    return { ok: true as const, role: 'customer' as const }
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
    const { content, is_visible_to_customer = false } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    if (content.trim().length > 5000) {
      return NextResponse.json(
        { error: 'Content is too long (max 5000 chars)' },
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

    const access = await canAccessJobNotes({
      supabase,
      jobId: id,
      userId: user.id,
      userProfile: userProfile as UserProfile,
      allowCustomerRead: false,
      forWrite: true,
    })

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    // Create the note
    const { data: note, error } = await supabase
      .from('job_notes')
      .insert({
        job_id: id,
        user_id: user.id,
        note_type: 'note',
        content: content.trim(),
        is_visible_to_customer,
      })
      .select('*, user:users(id, full_name, email, role)')
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, note })
  } catch (error: any) {
    console.error('Add note error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add note' },
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

    // Get user role
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

    const access = await canAccessJobNotes({
      supabase,
      jobId: id,
      userId: user.id,
      userProfile: userProfile as UserProfile,
      allowCustomerRead: true,
      forWrite: false,
    })

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    // Build query based on role
    let query = supabase
      .from('job_notes')
      .select('*, user:users(id, full_name, email, role)')
      .eq('job_id', id)
      .order('created_at', { ascending: false })

    // Customers only see notes marked as visible to them
    if (access.role === 'customer') {
      query = query.eq('is_visible_to_customer', true)
    }

    const { data: notes, error } = await query

    if (error) throw error

    return NextResponse.json({ notes: notes || [] })
  } catch (error: any) {
    console.error('Get notes error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get notes' },
      { status: 500 }
    )
  }
}
