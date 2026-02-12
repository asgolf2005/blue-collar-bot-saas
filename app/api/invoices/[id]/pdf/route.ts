import { NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'
import { createClient } from '@/lib/supabase/server'

function toHexColor(color: string | null | undefined) {
  if (!color) return '#06b6d4'
  const normalized = color.trim()
  return /^#([0-9A-Fa-f]{6})$/.test(normalized) ? normalized : '#06b6d4'
}

function money(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

function asNumber(value: unknown) {
  if (typeof value === 'number') return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

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

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(*),
        line_items:invoice_line_items(*),
        business:businesses(name, address, email, phone, primary_color)
      `)
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single()

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const customer = invoice.customer as {
      name?: string
      address?: string | null
      email?: string | null
      phone?: string | null
    } | null

    const business = invoice.business as {
      name?: string
      address?: string | null
      email?: string | null
      phone?: string | null
      primary_color?: string | null
    } | null

    const lineItems = (invoice.line_items || []) as Array<{
      description: string
      quantity: number
      unit_price: number
      total: number
    }>

    const doc = new jsPDF()
    const primaryColor = toHexColor(business?.primary_color)
    const dark = '#0f172a'
    const medium = '#475569'
    const light = '#e2e8f0'

    doc.setFillColor(primaryColor)
    doc.rect(0, 0, 220, 40, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text(business?.name || 'Your Business', 20, 24)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text('INVOICE', 168, 18)
    doc.setFontSize(10)
    doc.text(invoice.invoice_number, 168, 25)

    doc.setTextColor(medium)
    doc.setFontSize(9)
    let yPos = 55

    if (business?.address) {
      doc.text(business.address, 20, yPos)
      yPos += 5
    }
    if (business?.phone) {
      doc.text(business.phone, 20, yPos)
      yPos += 5
    }
    if (business?.email) {
      doc.text(business.email, 20, yPos)
    }

    doc.setFillColor(248, 250, 252)
    doc.rect(128, 50, 62, 32, 'F')
    doc.setTextColor(medium)
    doc.setFontSize(8)
    doc.text('Issue Date:', 133, 58)
    doc.text('Due Date:', 133, 66)
    doc.text('Status:', 133, 74)

    doc.setTextColor(dark)
    doc.setFontSize(9)
    doc.text(new Date(invoice.issue_date).toLocaleDateString('en-US'), 158, 58)
    doc.text(invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-US') : 'Due on receipt', 158, 66)
    doc.text(String(invoice.status).toUpperCase(), 158, 74)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('BILL TO', 20, 95)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(dark)
    doc.setFontSize(10)
    doc.text(customer?.name || 'Unknown Customer', 20, 102)
    doc.setTextColor(medium)
    doc.setFontSize(9)
    yPos = 108
    if (customer?.address) {
      doc.text(customer.address, 20, yPos)
      yPos += 5
    }
    if (customer?.email) {
      doc.text(customer.email, 20, yPos)
      yPos += 5
    }
    if (customer?.phone) {
      doc.text(customer.phone, 20, yPos)
    }

    yPos = 135
    doc.setFillColor(light)
    doc.rect(20, yPos - 6, 170, 10, 'F')
    doc.setTextColor(dark)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('Description', 25, yPos)
    doc.text('Qty', 118, yPos)
    doc.text('Price', 138, yPos)
    doc.text('Total', 165, yPos)

    doc.setFont('helvetica', 'normal')
    yPos += 10

    for (const item of lineItems) {
      if (yPos > 250) {
        doc.addPage()
        yPos = 25
      }

      doc.setTextColor(dark)
      doc.setFontSize(9)
      doc.text(String(item.description || '').slice(0, 42), 25, yPos)
      doc.text(String(asNumber(item.quantity)), 118, yPos)
      doc.text(money(asNumber(item.unit_price)), 138, yPos)
      doc.text(money(asNumber(item.total)), 165, yPos)
      yPos += 8
      doc.setDrawColor(light)
      doc.line(20, yPos - 3, 190, yPos - 3)
    }

    yPos += 8
    const subtotal = asNumber(invoice.subtotal)
    const tax = asNumber(invoice.tax)
    const total = asNumber(invoice.total)

    doc.setTextColor(medium)
    doc.text('Subtotal:', 132, yPos)
    doc.setTextColor(dark)
    doc.text(money(subtotal), 165, yPos)

    yPos += 8
    doc.setTextColor(medium)
    doc.text('Tax:', 132, yPos)
    doc.setTextColor(dark)
    doc.text(money(tax), 165, yPos)

    yPos += 12
    doc.setFillColor(primaryColor)
    doc.rect(126, yPos - 6, 64, 12, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL:', 132, yPos + 2)
    doc.text(money(total), 165, yPos + 2)

    if (invoice.notes) {
      yPos += 26
      doc.setTextColor(medium)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text('Notes:', 20, yPos)
      doc.setFont('helvetica', 'normal')
      const wrapped = doc.splitTextToSize(String(invoice.notes), 170)
      doc.text(wrapped, 20, yPos + 7)
    }

    doc.setTextColor(medium)
    doc.setFontSize(8)
    doc.text('Thank you for your business.', 105, 285, { align: 'center' })

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    const fileName = `${invoice.invoice_number || 'invoice'}.pdf`

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (routeError) {
    console.error('Invoice PDF route error:', routeError)
    return NextResponse.json({ error: 'Failed to generate invoice PDF' }, { status: 500 })
  }
}
