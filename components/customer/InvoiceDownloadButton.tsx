'use client'

import { useState } from 'react'
import { jsPDF } from 'jspdf'
import type { Invoice, InvoiceLineItem, Customer, Business } from '@/lib/types'

type InvoiceDownloadBusiness = Pick<
  Business,
  'name' | 'address' | 'phone' | 'email' | 'primary_color'
>

interface InvoiceDownloadButtonProps {
  invoice: Invoice & {
    customer: Customer
    line_items: InvoiceLineItem[]
  }
  business: InvoiceDownloadBusiness
  variant?: 'button' | 'icon'
}

export default function InvoiceDownloadButton({
  invoice,
  business,
  variant = 'button'
}: InvoiceDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const generatePDF = async () => {
    setIsGenerating(true)

    try {
      const doc = new jsPDF()

      // Colors
      const primaryColor = business.primary_color || '#3b82f6'
      const grayDark = '#1f2937'
      const grayMedium = '#6b7280'
      const grayLight = '#e5e7eb'

      // Header
      doc.setFillColor(primaryColor)
      doc.rect(0, 0, 220, 40, 'F')

      // Business Name
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text(business.name, 20, 25)

      // INVOICE label
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text('INVOICE', 170, 20)
      doc.setFontSize(10)
      doc.text(invoice.invoice_number, 170, 28)

      // Business contact info
      doc.setTextColor(grayMedium)
      doc.setFontSize(9)
      let yPos = 55

      if (business.address) {
        doc.text(business.address, 20, yPos)
        yPos += 5
      }
      if (business.phone) {
        doc.text(business.phone, 20, yPos)
        yPos += 5
      }
      if (business.email) {
        doc.text(business.email, 20, yPos)
      }

      // Invoice details box
      doc.setFillColor(248, 250, 252) // gray-50
      doc.rect(130, 50, 60, 30, 'F')

      doc.setTextColor(grayMedium)
      doc.setFontSize(8)
      doc.text('Issue Date:', 135, 58)
      doc.text('Due Date:', 135, 66)
      doc.text('Status:', 135, 74)

      doc.setTextColor(grayDark)
      doc.setFontSize(9)
      doc.text(formatDate(invoice.issue_date), 160, 58)
      doc.text(invoice.due_date ? formatDate(invoice.due_date) : 'Due on receipt', 160, 66)

      // Status badge
      const statusColors: Record<string, string> = {
        paid: '#10b981',
        sent: '#3b82f6',
        overdue: '#ef4444',
        draft: '#6b7280'
      }
      doc.setTextColor(statusColors[invoice.status] || grayMedium)
      doc.setFont('helvetica', 'bold')
      doc.text(invoice.status.toUpperCase(), 160, 74)

      // Bill To section
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(grayDark)
      doc.setFontSize(10)
      doc.text('BILL TO', 20, 95)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(invoice.customer.name, 20, 103)

      doc.setTextColor(grayMedium)
      doc.setFontSize(9)
      yPos = 109
      if (invoice.customer.address) {
        doc.text(invoice.customer.address, 20, yPos)
        yPos += 5
      }
      if (invoice.customer.email) {
        doc.text(invoice.customer.email, 20, yPos)
        yPos += 5
      }
      if (invoice.customer.phone) {
        doc.text(invoice.customer.phone, 20, yPos)
      }

      // Line items table header
      yPos = 135
      doc.setFillColor(grayLight)
      doc.rect(20, yPos - 5, 170, 10, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(grayDark)
      doc.setFontSize(9)
      doc.text('Description', 25, yPos + 2)
      doc.text('Qty', 120, yPos + 2)
      doc.text('Price', 140, yPos + 2)
      doc.text('Total', 165, yPos + 2)

      // Line items
      doc.setFont('helvetica', 'normal')
      yPos += 15

      for (const item of invoice.line_items) {
        doc.setTextColor(grayDark)
        doc.text(item.description.substring(0, 40), 25, yPos)
        doc.text(item.quantity.toString(), 120, yPos)
        doc.text(formatCurrency(item.unit_price), 140, yPos)
        doc.text(formatCurrency(item.total), 165, yPos)

        yPos += 8

        // Add line
        doc.setDrawColor(grayLight)
        doc.line(20, yPos - 3, 190, yPos - 3)
      }

      // Totals section
      yPos += 10
      const totalsX = 130

      // Subtotal
      doc.setTextColor(grayMedium)
      doc.text('Subtotal:', totalsX, yPos)
      doc.setTextColor(grayDark)
      doc.text(formatCurrency(invoice.subtotal), 165, yPos)

      // Tax
      if (invoice.tax > 0) {
        yPos += 8
        doc.setTextColor(grayMedium)
        doc.text('Tax:', totalsX, yPos)
        doc.setTextColor(grayDark)
        doc.text(formatCurrency(invoice.tax), 165, yPos)
      }

      // Total
      yPos += 12
      doc.setFillColor(primaryColor)
      doc.rect(totalsX - 5, yPos - 6, 65, 12, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('TOTAL:', totalsX, yPos + 2)
      doc.text(formatCurrency(invoice.total), 165, yPos + 2)

      // Notes
      if (invoice.notes) {
        yPos += 30
        doc.setTextColor(grayMedium)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text('Notes:', 20, yPos)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        const splitNotes = doc.splitTextToSize(invoice.notes, 170)
        doc.text(splitNotes, 20, yPos + 7)
      }

      // Footer
      doc.setTextColor(grayMedium)
      doc.setFontSize(8)
      doc.text('Thank you for your business!', 105, 280, { align: 'center' })

      // Save the PDF
      doc.save(`${invoice.invoice_number}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  if (variant === 'icon') {
    return (
      <button type="button"
        onClick={generatePDF}
        disabled={isGenerating}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
        title="Download PDF"
      >
        {isGenerating ? <span className="text-xs text-gray-500">...</span> : <span className="text-xs text-gray-600">PDF</span>}
      </button>
    )
  }

  return (
    <button type="button"
      onClick={generatePDF}
      disabled={isGenerating}
      className="btn btn-secondary"
    >
      {isGenerating ? (
        <>Generating...</>
      ) : (
        <>Download PDF</>
      )}
    </button>
  )
}
