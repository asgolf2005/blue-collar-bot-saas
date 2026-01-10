import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendJobStatusSMS } from '@/lib/sms/job-notifications'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    let query = supabase
      .from('jobs')
      .select(`
        *,
        customer:customers(*),
        technician:users(*)
      `)

    if (profile.role === 'admin') {
      query = query.eq('business_id', profile.business_id)
    } else {
      query = query.eq('technician_id', user.id)
    }

    const { data: jobs, error } = await query.order('scheduled_start', { ascending: false })

    if (error) throw error

    return NextResponse.json(jobs)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // ✅ SECURITY: Whitelist allowed fields instead of spreading entire body
    const allowedFields = {
      customer_id: body.customer_id,
      technician_id: body.technician_id || null,
      status: body.status || 'scheduled',
      scheduled_start: body.scheduled_start,
      scheduled_end: body.scheduled_end,
      description: body.description || null,
      urgency: body.urgency || null,
      calendar_event_id: body.calendar_event_id || null,
      labor_hours: body.labor_hours || null,
      labor_rate: body.labor_rate || null,
      parts_cost: body.parts_cost || null,
      total_cost: body.total_cost || null,
      estimated_labor_hours: body.estimated_labor_hours || null,
      estimated_materials_cost: body.estimated_materials_cost || null,
      estimated_other_costs: body.estimated_other_costs || null,
    }

    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        business_id: profile.business_id,
        source: 'manual', // ✅ SECURITY: Always set source explicitly
        ...allowedFields,
      })
      .select()
      .single()

    if (error) throw error

    // Send SMS notification for new scheduled job
    if (job && job.status === 'scheduled' && job.customer_id && job.scheduled_start) {
      try {
        await sendJobStatusSMS({
          jobId: job.id,
          customerId: job.customer_id,
          status: 'scheduled',
          scheduledStart: job.scheduled_start,
          description: job.description,
          technicianId: job.technician_id,
          total: job.total_cost,
        })
      } catch (smsError) {
        console.error('SMS notification error:', smsError)
        // Don't fail the request if SMS fails
      }
    }

    return NextResponse.json(job)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
