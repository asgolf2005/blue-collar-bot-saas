import { createClient } from '@/lib/supabase/server'
import { getSMSTemplate, SMSTemplateName } from '@/lib/twilio/templates'
import { sendSMS } from '@/lib/twilio/client'

export interface JobSMSData {
  jobId: string
  customerId: string
  status: string
  scheduledStart?: string | null
  description?: string | null
  technicianId?: string | null
  total?: number | null
}

// Map job status to SMS template
const statusToTemplate: Record<string, SMSTemplateName | null> = {
  scheduled: 'jobScheduled',
  on_the_way: 'onTheWay',
  arrived: 'arrived',
  in_progress: 'inProgress',
  completed: 'completed',
  cancelled: 'cancelled',
}

export async function sendJobStatusSMS(jobData: JobSMSData) {
  try {
    const supabase = await createClient()

    // Get template name based on job status
    const templateName = statusToTemplate[jobData.status]
    if (!templateName) {
      console.log(`No SMS template for status: ${jobData.status}`)
      return { success: false, reason: 'No template for status' }
    }

    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('name, phone, business_id')
      .eq('id', jobData.customerId)
      .single()

    if (customerError || !customer) {
      console.error('Error fetching customer:', customerError)
      return { success: false, error: 'Customer not found' }
    }

    if (!customer.phone) {
      console.log('Customer has no phone number')
      return { success: false, reason: 'No phone number' }
    }

    // Get business settings
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('sms_enabled, sms_notifications, name')
      .eq('id', customer.business_id)
      .single()

    if (businessError || !business) {
      console.error('Error fetching business:', businessError)
      return { success: false, error: 'Business not found' }
    }

    // Check if SMS is enabled
    if (!business.sms_enabled) {
      console.log('SMS not enabled for business')
      return { success: false, reason: 'SMS not enabled' }
    }

    // Check if this notification type is enabled
    const smsNotifications = business.sms_notifications as Record<string, boolean>
    if (smsNotifications && templateName in smsNotifications && !smsNotifications[templateName]) {
      console.log(`SMS notification ${templateName} is disabled`)
      return { success: false, reason: 'Notification type disabled' }
    }

    // Get technician details if assigned
    let technicianName: string | undefined
    if (jobData.technicianId) {
      const { data: technician } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', jobData.technicianId)
        .single()

      technicianName = technician?.full_name || undefined
    }

    // Prepare template data
    const templateData = {
      customerName: customer.name,
      businessName: business.name || 'Your Service Provider',
      technicianName,
      jobDescription: jobData.description || undefined,
      scheduledTime: jobData.scheduledStart || undefined,
      total: jobData.total || undefined,
    }

    const message = getSMSTemplate(templateName, templateData)
    return await sendSmsWithLog({
      supabase,
      businessId: customer.business_id,
      to: customer.phone,
      message,
      templateName,
      jobId: jobData.jobId,
      customerId: jobData.customerId,
    })
  } catch (error) {
    console.error('Error sending job status SMS:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function sendTechnicianAssignedSMS(
  jobId: string,
  customerId: string,
  technicianId: string
) {
  try {
    const supabase = await createClient()

    // Get all necessary data
    const [customerResult, technicianResult, jobResult] = await Promise.all([
      supabase.from('customers').select('name, phone, business_id').eq('id', customerId).single(),
      supabase.from('users').select('full_name').eq('id', technicianId).single(),
      supabase.from('jobs').select('description').eq('id', jobId).single(),
    ])

    const customer = customerResult.data
    const technician = technicianResult.data
    const job = jobResult.data

    if (!customer || !customer.phone) {
      return { success: false, reason: 'No customer or phone' }
    }

    // Get business settings
    const { data: business } = await supabase
      .from('businesses')
      .select('sms_enabled, sms_notifications, name')
      .eq('id', customer.business_id)
      .single()

    if (!business || !business.sms_enabled) {
      return { success: false, reason: 'SMS not enabled' }
    }

    const smsNotifications = business.sms_notifications as Record<string, boolean>
    if (smsNotifications && 'technicianAssigned' in smsNotifications && !smsNotifications['technicianAssigned']) {
      return { success: false, reason: 'Notification disabled' }
    }

    const message = getSMSTemplate('technicianAssigned', {
      customerName: customer.name,
      businessName: business.name || 'Your Service Provider',
      technicianName: technician?.full_name || 'A technician',
      jobDescription: job?.description,
    })

    return await sendSmsWithLog({
      supabase,
      businessId: customer.business_id,
      to: customer.phone,
      message,
      templateName: 'technicianAssigned',
      jobId,
      customerId,
    })
  } catch (error) {
    console.error('Error sending technician assigned SMS:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function sendSmsWithLog(params: {
  supabase: Awaited<ReturnType<typeof createClient>>
  businessId: string
  to: string
  message: string
  templateName: string
  jobId?: string
  customerId?: string
  invoiceId?: string
}) {
  const { supabase, businessId, to, message, templateName, jobId, customerId, invoiceId } = params

  const { data: smsRecord, error: insertError } = await supabase
    .from('sms_notifications')
    .insert({
      business_id: businessId,
      job_id: jobId || null,
      customer_id: customerId || null,
      invoice_id: invoiceId || null,
      to_phone: to,
      message,
      template_name: templateName,
      status: 'pending',
    })
    .select()
    .single()

  if (insertError || !smsRecord) {
    console.error('Error creating SMS record:', insertError)
    return { success: false, error: 'Failed to create SMS record' }
  }

  try {
    const result = await sendSMS({ to, message })

    await supabase
      .from('sms_notifications')
      .update({
        status: 'sent',
        twilio_message_id: result.messageId,
        sent_at: new Date().toISOString(),
      })
      .eq('id', smsRecord.id)

    return { success: true, messageId: result.messageId }
  } catch (error) {
    await supabase
      .from('sms_notifications')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', smsRecord.id)

    return { success: false, error: error instanceof Error ? error.message : 'Failed to send SMS' }
  }
}
