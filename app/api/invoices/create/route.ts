import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/resend'
import { buildInvoiceEmail } from '@/lib/email/templates'

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

export async function POST(request: Request) {
  try {
    // ✅ SECURITY: Authenticate user before allowing invoice creation
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ✅ SECURITY: Verify user is an admin
    const { data: profile } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { business_id, job_id, customer_id, line_items, tax_rate, notes, due_in_days } = body

    // ✅ SECURITY: Verify the business_id matches the authenticated user's business
    if (business_id !== profile.business_id) {
      return NextResponse.json(
        { error: 'Forbidden - Cannot create invoices for other businesses' },
        { status: 403 }
      )
    }

    if (!business_id || !job_id || !customer_id || !line_items || line_items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate invoice number
    const { data: invoiceNumber } = await supabaseAdmin
      .rpc('generate_invoice_number', { p_business_id: business_id })

    if (!invoiceNumber) {
      throw new Error('Failed to generate invoice number')
    }

    // Calculate totals
    const subtotal = line_items.reduce((sum: number, item: any) =>
      sum + (item.quantity * item.unit_price), 0
    )
    const tax = subtotal * (tax_rate / 100)
    const total = subtotal + tax

    // Calculate due date
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + (due_in_days || 14))

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert({
        business_id,
        job_id,
        customer_id,
        invoice_number: invoiceNumber,
        status: 'sent',
        subtotal,
        tax,
        total,
        due_date: dueDate.toISOString().split('T')[0],
        notes: notes || null,
      })
      .select()
      .single()

    if (invoiceError) {
      console.error('Invoice creation error:', invoiceError)
      throw invoiceError
    }

    // Create line items
    const lineItemsToInsert = line_items.map((item: any) => ({
      invoice_id: invoice.id,
      service_id: item.service_id || null,
      type: item.type,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
    }))

    const { error: lineItemsError } = await supabaseAdmin
      .from('invoice_line_items')
      .insert(lineItemsToInsert)

    if (lineItemsError) {
      console.error('Line items error:', lineItemsError)
      throw lineItemsError
    }

    try {
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('name, email')
        .eq('id', customer_id)
        .single()

      const { data: business } = await supabaseAdmin
        .from('businesses')
        .select('name, email, phone')
        .eq('id', business_id)
        .single()

      if (customer?.email) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        const invoiceUrl = `${siteUrl}/customer/invoices/${invoice.id}`
        const emailContent = buildInvoiceEmail({
          customerName: customer.name,
          businessName: business?.name || 'Your Service Provider',
          invoiceNumber: invoice.invoice_number,
          total,
          dueDate: invoice.due_date,
          invoiceUrl,
        })

        await sendEmail({
          to: customer.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          replyTo: business?.email || undefined,
        })
      } else {
        console.warn('Skipping invoice email: customer has no email')
      }
    } catch (emailError) {
      console.error('Invoice email error:', emailError)
    }

    return NextResponse.json({
      success: true,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
    })
  } catch (error: any) {
    console.error('Create invoice error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create invoice' },
      { status: 500 }
    )
  }
}
