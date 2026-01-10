import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendSMS } from '@/lib/twilio/client'
import { getSMSTemplate, SMSTemplateName } from '@/lib/twilio/templates'
import { SendSMSRequest } from '@/types/sms'

export async function POST(request: NextRequest) {
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

    // Only admins and techs can send SMS
    if (!['admin', 'tech'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body: SendSMSRequest = await request.json()
    const { to, templateName, data, jobId, customerId, invoiceId } = body

    if (!to || !templateName) {
      return NextResponse.json(
        { error: 'Missing required fields: to, templateName' },
        { status: 400 }
      )
    }

    // Get business settings to check if SMS is enabled
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('sms_enabled, sms_notifications, name')
      .eq('id', profile.business_id)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    if (!business.sms_enabled) {
      return NextResponse.json(
        { error: 'SMS notifications are not enabled for this business' },
        { status: 400 }
      )
    }

    // Check if this specific notification type is enabled
    const smsNotifications = business.sms_notifications as Record<string, boolean>
    if (smsNotifications && templateName in smsNotifications && !smsNotifications[templateName]) {
      return NextResponse.json(
        { error: `SMS notification type '${templateName}' is disabled` },
        { status: 400 }
      )
    }

    // Add business name to template data if not provided
    const templateData = {
      ...data,
      businessName: data.businessName || business.name || 'Your Service Provider',
    }

    // Generate message from template
    const message = getSMSTemplate(templateName as SMSTemplateName, templateData)

    // Create SMS notification record first
    const { data: smsRecord, error: insertError } = await supabase
      .from('sms_notifications')
      .insert({
        business_id: profile.business_id,
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

    if (insertError) {
      console.error('Error creating SMS record:', insertError)
      return NextResponse.json(
        { error: 'Failed to create SMS record' },
        { status: 500 }
      )
    }

    // Send SMS via Twilio
    try {
      const result = await sendSMS({ to, message })

      // Update SMS record with success status
      await supabase
        .from('sms_notifications')
        .update({
          status: 'sent',
          twilio_message_id: result.messageId,
          sent_at: new Date().toISOString(),
        })
        .eq('id', smsRecord.id)

      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        smsNotificationId: smsRecord.id,
      })
    } catch (twilioError) {
      // Update SMS record with failure status
      await supabase
        .from('sms_notifications')
        .update({
          status: 'failed',
          error_message: twilioError instanceof Error ? twilioError.message : 'Unknown error',
        })
        .eq('id', smsRecord.id)

      console.error('Twilio error:', twilioError)
      return NextResponse.json(
        {
          success: false,
          error: twilioError instanceof Error ? twilioError.message : 'Failed to send SMS',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('SMS send error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
