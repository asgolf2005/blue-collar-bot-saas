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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as { note?: string }
    const optionalNote = body.note?.trim()

    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, business_id')
      .eq('user_id', user.id)
      .single()

    if (!customer) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 })
    }

    const { data: job } = await supabase
      .from('jobs')
      .select('id, customer_id, business_id, status, scheduled_start')
      .eq('id', id)
      .eq('customer_id', customer.id)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    if (job.status === 'completed' || job.status === 'cancelled') {
      return NextResponse.json(
        { error: 'This appointment can no longer be approved' },
        { status: 400 }
      )
    }

    const jobDateLabel = job.scheduled_start
      ? new Date(job.scheduled_start).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'unscheduled'

    const noteContent = [
      `Customer approved scope/pricing from portal.`,
      `Appointment: ${jobDateLabel}.`,
      optionalNote ? `Customer note: ${optionalNote}` : null,
    ]
      .filter(Boolean)
      .join(' ')

    const { data: customerProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (customerProfile) {
      await supabase.from('job_notes').insert({
        job_id: job.id,
        user_id: customerProfile.id,
        note_type: 'note',
        content: noteContent,
        is_visible_to_customer: true,
      })
    }

    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('business_id', customer.business_id)
      .eq('role', 'admin')

    if (admins && admins.length > 0) {
      await supabase.from('notifications').insert(
        admins.map((admin) => ({
          user_id: admin.id,
          type: 'appointment_reminder' as const,
          title: 'Customer approved scope',
          message: `${customer.name} approved job scope for appointment ${jobDateLabel}.`,
          link: `/admin/jobs/${job.id}`,
        }))
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Customer approve scope error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to approve scope' },
      { status: 500 }
    )
  }
}
