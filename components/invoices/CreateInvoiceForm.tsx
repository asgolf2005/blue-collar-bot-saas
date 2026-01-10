'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Plus, X } from 'lucide-react'

interface Job {
  id: string
  customer_id: string
  scheduled_start: string
  description: string
  labor_hours: number | null
  labor_rate: number | null
  parts_cost: number | null
  status: string
  hasInvoice?: boolean
  customer: {
    id: string
    name: string
    email: string
  }
  services: Array<{
    service: {
      id: string
      name: string
      base_price: number
    }
  }>
}

interface Service {
  id: string
  name: string
  base_price: number | null
}

interface LineItem {
  type: 'service' | 'labor' | 'parts'
  description: string
  quantity: number
  unit_price: number
  service_id?: string
}

export default function CreateInvoiceForm({
  businessId,
  jobs,
  services,
  showAll = false,
  preSelectedJobId = null,
}: {
  businessId: string
  jobs: Job[]
  services: Service[]
  showAll?: boolean
  preSelectedJobId?: string | null
}) {
  const router = useRouter()
  const [selectedJobId, setSelectedJobId] = useState(preSelectedJobId || '')
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [taxRate, setTaxRate] = useState('10') // 10% GST default
  const [notes, setNotes] = useState('')
  const [dueInDays, setDueInDays] = useState('14')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedJob = jobs.find(j => j.id === selectedJobId)

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId)
    const job = jobs.find(j => j.id === jobId)
    if (!job) return

    const items: LineItem[] = []

    // Add services from job
    job.services?.forEach(js => {
      if (js.service) {
        items.push({
          type: 'service',
          description: js.service.name,
          quantity: 1,
          unit_price: js.service.base_price || 0,
          service_id: js.service.id,
        })
      }
    })

    // Add labor if specified
    if (job.labor_hours && job.labor_rate) {
      items.push({
        type: 'labor',
        description: `Labor (${job.labor_hours} hours)`,
        quantity: job.labor_hours,
        unit_price: job.labor_rate,
      })
    }

    // Add parts if specified
    if (job.parts_cost && job.parts_cost > 0) {
      items.push({
        type: 'parts',
        description: 'Parts and Materials',
        quantity: 1,
        unit_price: job.parts_cost,
      })
    }

    setLineItems(items)
  }

  // Auto-select job if preSelectedJobId is provided
  useEffect(() => {
    if (preSelectedJobId && jobs.length > 0) {
      const job = jobs.find(j => j.id === preSelectedJobId)
      if (job) {
        handleJobSelect(preSelectedJobId)
      }
    }
  }, [preSelectedJobId, jobs])

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { type: 'service', description: '', quantity: 1, unit_price: 0 },
    ])
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setLineItems(updated)
  }

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  const tax = subtotal * (parseFloat(taxRate) / 100)
  const total = subtotal + tax

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!selectedJobId) throw new Error('Please select a job')
      if (lineItems.length === 0) throw new Error('Please add at least one line item')

      const response = await fetch('/api/invoices/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          job_id: selectedJobId,
          customer_id: selectedJob?.customer_id,
          line_items: lineItems,
          tax_rate: parseFloat(taxRate),
          notes,
          due_in_days: parseInt(dueInDays),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create invoice')
      }

      router.push(`/admin/invoices/${result.invoice_id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Job Selection */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Job</h3>
        <select
          value={selectedJobId}
          onChange={(e) => handleJobSelect(e.target.value)}
          className="input"
          required
        >
          <option value="">Choose a job to invoice...</option>
          {jobs.map(job => (
            <option key={job.id} value={job.id}>
              {job.customer.name} - {new Date(job.scheduled_start).toLocaleDateString()} - {job.description || 'No description'}
              {job.hasInvoice ? ' ⚠️ (Already invoiced)' : ''}
              {job.status !== 'completed' ? ` [${job.status}]` : ''}
            </option>
          ))}
        </select>

        {selectedJob?.hasInvoice && showAll && (
          <div className="mt-3 bg-warning/10 border border-warning/20 text-warning rounded-lg px-4 py-3 text-sm">
            <p className="font-semibold">⚠️ This job already has an invoice</p>
            <p className="text-xs mt-1">Creating another invoice will result in duplicate billing. Only proceed if you need to bill additional charges.</p>
          </div>
        )}

        {jobs.length === 0 && (
          <p className="text-sm text-muted mt-2">
            No jobs available for invoicing. Jobs must be at least "arrived" status or higher.
          </p>
        )}
      </div>

      {/* Line Items */}
      {selectedJobId && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
            <button
              type="button"
              onClick={addLineItem}
              className="btn btn-secondary text-sm flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </button>
          </div>

          <div className="space-y-3">
            {lineItems.map((item, index) => (
              <div key={index} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-2">
                  <select
                    value={item.type}
                    onChange={(e) => updateLineItem(index, 'type', e.target.value)}
                    className="input text-sm"
                  >
                    <option value="service">Service</option>
                    <option value="labor">Labor</option>
                    <option value="parts">Parts</option>
                  </select>

                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    placeholder="Description"
                    className="input text-sm md:col-span-2"
                    required
                  />

                  <input
                    type="number"
                    value={isNaN(item.quantity) ? '' : item.quantity}
                    onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    placeholder="Qty"
                    step="0.01"
                    min="0"
                    className="input text-sm"
                    required
                  />

                  <input
                    type="number"
                    value={isNaN(item.unit_price) ? '' : item.unit_price}
                    onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    placeholder="Price"
                    step="0.01"
                    min="0"
                    className="input text-sm"
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeLineItem(index)}
                  className="text-red-600 hover:text-red-700 p-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-6 border-t pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-600">Tax:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      step="0.1"
                      min="0"
                      className="input text-sm w-16 text-right"
                    />
                    <span>%</span>
                    <span className="font-medium w-20 text-right">${tax.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Details */}
      {selectedJobId && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>

          <div className="space-y-4">
            <div>
              <label className="label">Payment Due (days from now)</label>
              <input
                type="number"
                value={dueInDays}
                onChange={(e) => setDueInDays(e.target.value)}
                className="input"
                min="0"
              />
            </div>

            <div>
              <label className="label">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input min-h-[100px]"
                placeholder="Payment instructions, terms, or other notes..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Submit */}
      {selectedJobId && (
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || lineItems.length === 0}
            className="btn btn-primary flex items-center"
          >
            {loading ? (
              <>Creating...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Invoice
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}
    </form>
  )
}
