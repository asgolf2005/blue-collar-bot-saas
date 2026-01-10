import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

// Twilio webhook to handle SMS delivery status updates
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const messageId = formData.get('MessageSid') as string
    const messageStatus = formData.get('MessageStatus') as string

    if (!messageId || !messageStatus) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Map Twilio status to our status
    let status = messageStatus
    if (messageStatus === 'delivered') {
      status = 'delivered'
    } else if (['failed', 'undelivered'].includes(messageStatus)) {
      status = messageStatus
    }

    const updateData: any = {
      status,
    }

    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString()
    }

    // Update SMS notification status
    const { error } = await supabaseAdmin
      .from('sms_notifications')
      .update(updateData)
      .eq('twilio_message_id', messageId)

    if (error) {
      console.error('Error updating SMS status:', error)
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
