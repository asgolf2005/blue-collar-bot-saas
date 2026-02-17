import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendJobStatusSMS, sendTechnicianAssignedSMS } from '@/lib/sms/job-notifications'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { evaluateCompletionVerification } from '@/lib/ai/completion-check'

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdminClient()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId, status, technicianId, scheduledStart, scheduledEnd, description, urgency } =
      await request.json()

    if (!jobId || !status) {
      return NextResponse.json({ error: 'Missing jobId or status' }, { status: 400 })
    }

    const allowedStatuses = ['scheduled', 'on_the_way', 'arrived', 'in_progress', 'completed', 'cancelled']
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, status, technician_id, business_id, customer_id, description')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (profile.role === 'tech' && job.technician_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (typeof technicianId !== 'undefined' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if ((typeof description !== 'undefined' || typeof urgency !== 'undefined') && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (status === 'completed' && profile.role === 'tech') {
      const completionVerification = await evaluateCompletionVerification({ supabase, jobId })
      if (completionVerification.status === 'block') {
        return NextResponse.json(
          {
            error:
              'Completion verification failed. Show problem identified and problem solved evidence before completing this job.',
            code: 'COMPLETION_VERIFICATION_BLOCKED',
            completionVerification,
          },
          { status: 400 }
        )
      }
    }

    // Only admins can change scheduled times
    let parsedScheduledStart: string | undefined
    let parsedScheduledEnd: string | undefined
    let parsedDescription: string | null | undefined
    let parsedUrgency: string | null | undefined

    if (profile.role === 'admin') {
      if (scheduledStart) {
        const startDate = new Date(scheduledStart)
        if (isNaN(startDate.getTime())) {
          return NextResponse.json({ error: 'Invalid scheduledStart' }, { status: 400 })
        }
        parsedScheduledStart = startDate.toISOString()
      }

      if (scheduledEnd) {
        const endDate = new Date(scheduledEnd)
        if (isNaN(endDate.getTime())) {
          return NextResponse.json({ error: 'Invalid scheduledEnd' }, { status: 400 })
        }
        parsedScheduledEnd = endDate.toISOString()
      }

      if (typeof description !== 'undefined') {
        if (description === null || description === '') {
          parsedDescription = null
        } else if (typeof description === 'string') {
          parsedDescription = description.trim() || null
        } else {
          return NextResponse.json({ error: 'Invalid description' }, { status: 400 })
        }
      }

      if (typeof urgency !== 'undefined') {
        if (urgency === null || urgency === '') {
          parsedUrgency = null
        } else if (
          typeof urgency === 'string' &&
          ['low', 'medium', 'high', 'emergency'].includes(urgency)
        ) {
          parsedUrgency = urgency
        } else {
          return NextResponse.json({ error: 'Invalid urgency' }, { status: 400 })
        }
      }
    }

    const updatePayload: Record<string, any> = { status }
    if (typeof technicianId !== 'undefined') {
      updatePayload.technician_id = technicianId || null
    }
    if (parsedScheduledStart) {
      updatePayload.scheduled_start = parsedScheduledStart
    }
    if (parsedScheduledEnd) {
      updatePayload.scheduled_end = parsedScheduledEnd
    }
    if (typeof parsedDescription !== 'undefined') {
      updatePayload.description = parsedDescription
    }
    if (typeof parsedUrgency !== 'undefined') {
      updatePayload.urgency = parsedUrgency
    }

    const { data: updatedJob, error: updateError } = await supabase
      .from('jobs')
      .update(updatePayload)
      .eq('id', jobId)
      .select()
      .single()

    if (updateError) throw updateError

    if (job.status !== status && updatedJob.technician_id && updatedJob.technician_id !== user.id) {
      let customerName: string | null = null

      try {
        const { data: customer } = await supabaseAdmin
          .from('customers')
          .select('name')
          .eq('id', job.customer_id)
          .single()
        customerName = customer?.name || null
      } catch (error) {
        console.error('Customer lookup error:', error)
      }

      const title = 'Job Status Updated'
      const statusLabel = status.replace(/_/g, ' ')
      const messageParts = [
        `Status changed to ${statusLabel}.`,
        customerName ? `Customer: ${customerName}.` : null,
        job.description ? `Job: ${job.description}.` : null,
      ].filter(Boolean)

      try {
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: updatedJob.technician_id,
            type: 'job_status_changed',
            title,
            message: messageParts.join(' '),
            link: `/tech/jobs/${jobId}`,
          })
      } catch (notificationError) {
        console.error('Notification insert error:', notificationError)
      }
    }

    // Send SMS notification for status change
    if (job.status !== status && job.customer_id) {
      try {
        const { data: fullJob } = await supabase
          .from('jobs')
          .select('scheduled_start, description, total_cost')
          .eq('id', jobId)
          .single()

        await sendJobStatusSMS({
          jobId: updatedJob.id,
          customerId: job.customer_id,
          status: updatedJob.status,
          scheduledStart: fullJob?.scheduled_start,
          description: fullJob?.description,
          technicianId: updatedJob.technician_id,
          total: fullJob?.total_cost,
        })
      } catch (smsError) {
        console.error('SMS notification error:', smsError)
        // Don't fail the request if SMS fails
      }
    }

    // Send SMS when technician is assigned
    if (typeof technicianId !== 'undefined' && technicianId && technicianId !== job.technician_id && job.customer_id) {
      try {
        await sendTechnicianAssignedSMS(jobId, job.customer_id, technicianId)
      } catch (smsError) {
        console.error('Technician assigned SMS error:', smsError)
        // Don't fail the request if SMS fails
      }
    }

    return NextResponse.json(updatedJob)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
