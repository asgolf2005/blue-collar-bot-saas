import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

    const { invoiceIds } = await request.json()

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json({ error: 'Invalid invoice IDs' }, { status: 400 })
    }

    // Update invoices to 'sent' status
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'sent' })
      .in('id', invoiceIds)
      .eq('business_id', profile.business_id)
      .in('status', ['draft']) // Only send drafts

    if (error) {
      throw error
    }

    // TODO: Send actual emails to customers here
    // Get invoice details and send via email service

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Bulk send error:', error)
    return NextResponse.json({ error: 'Failed to send invoices' }, { status: 500 })
  }
}
