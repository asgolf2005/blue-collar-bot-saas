import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

    // Verify user has access to this job
    const { data: job } = await supabase
      .from('jobs')
      .select('id, business_id')
      .eq('id', id)
      .single()

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Get user's business to verify access
    const { data: userProfile } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single()

    if (!userProfile || userProfile.business_id !== job.business_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
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

    // Build query based on role
    let query = supabase
      .from('job_notes')
      .select('*, user:users(id, full_name, email, role)')
      .eq('job_id', id)
      .order('created_at', { ascending: false })

    // Customers only see notes marked as visible to them
    if (userProfile.role === 'customer') {
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
