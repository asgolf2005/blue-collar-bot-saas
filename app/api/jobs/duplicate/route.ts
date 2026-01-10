import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId } = await request.json()

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        id,
        business_id,
        customer_id,
        technician_id,
        scheduled_start,
        scheduled_end,
        description,
        urgency,
        labor_hours,
        labor_rate,
        parts_cost,
        total_cost,
        estimated_labor_hours,
        estimated_materials_cost,
        estimated_other_costs
      `)
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.business_id !== profile.business_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: newJob, error: newJobError } = await supabase
      .from('jobs')
      .insert({
        business_id: job.business_id,
        customer_id: job.customer_id,
        technician_id: job.technician_id,
        status: 'scheduled',
        scheduled_start: job.scheduled_start,
        scheduled_end: job.scheduled_end,
        description: job.description ? `${job.description} (Copy)` : null,
        urgency: job.urgency,
        calendar_event_id: null,
        source: 'manual',
        labor_hours: job.labor_hours,
        labor_rate: job.labor_rate,
        parts_cost: job.parts_cost,
        total_cost: job.total_cost,
        estimated_labor_hours: job.estimated_labor_hours,
        estimated_materials_cost: job.estimated_materials_cost,
        estimated_other_costs: job.estimated_other_costs,
      })
      .select()
      .single()

    if (newJobError || !newJob) {
      throw newJobError || new Error('Failed to duplicate job')
    }

    const { data: jobServices, error: jobServicesError } = await supabase
      .from('job_services')
      .select('service_id, quantity, notes')
      .eq('job_id', jobId)

    if (jobServicesError) {
      await supabase.from('jobs').delete().eq('id', newJob.id)
      return NextResponse.json({ error: 'Failed to load job services' }, { status: 500 })
    }

    if (jobServices && jobServices.length > 0) {
      const newJobServices = jobServices.map((service) => ({
        job_id: newJob.id,
        service_id: service.service_id,
        quantity: service.quantity,
        notes: service.notes,
      }))

      const { error: insertServicesError } = await supabase
        .from('job_services')
        .insert(newJobServices)

      if (insertServicesError) {
        await supabase.from('jobs').delete().eq('id', newJob.id)
        return NextResponse.json({ error: 'Failed to duplicate job services' }, { status: 500 })
      }
    }

    return NextResponse.json({ jobId: newJob.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
