'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Receipt,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Wrench,
  X,
} from '@/components/ui/icons'

interface Job {
  id: string
  customer_id: string
  scheduled_start: string
  scheduled_end?: string | null
  description: string | null
  labor_hours: number | null
  labor_rate: number | null
  parts_cost: number | null
  total_cost?: number | null
  urgency?: string | null
  status: string
  hasInvoice?: boolean
  customer: {
    id: string
    name: string
    email: string
    phone?: string | null
    address?: string | null
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

interface BusinessProfile {
  name: string | null
  address: string | null
  email: string | null
  phone: string | null
}

interface ComplianceCheck {
  id: string
  label: string
  passed: boolean
  blocking: boolean
  applicable?: boolean
  hint?: string
}

const PANEL_CLASS =
  'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm backdrop-blur sm:p-6 dark:border-slate-700 dark:bg-slate-900'
const INPUT_CLASS =
  'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500'

function formatJobSlot(dateString: string) {
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!match) return dateString.replace('T', ' ').slice(0, 16)

  const [, y, m, d, hour, min] = match
  return `${d}/${m}/${y} ${hour}:${min}`
}

function toStatusLabel(status: string) {
  return status.replace(/_/g, ' ')
}

function buildLineItemsFromJob(job: Job): LineItem[] {
  const items: LineItem[] = []

  job.services?.forEach((js) => {
    if (!js.service) return
    items.push({
      type: 'service',
      description: js.service.name,
      quantity: 1,
      unit_price: js.service.base_price || 0,
      service_id: js.service.id,
    })
  })

  if (job.labor_hours && job.labor_rate) {
    items.push({
      type: 'labor',
      description: `Labor (${job.labor_hours} hours)`,
      quantity: job.labor_hours,
      unit_price: job.labor_rate,
    })
  }

  if (job.parts_cost && job.parts_cost > 0) {
    items.push({
      type: 'parts',
      description: 'Parts and Materials',
      quantity: 1,
      unit_price: job.parts_cost,
    })
  }

  if (items.length === 0) {
    items.push({
      type: 'service',
      description: job.description?.trim() || 'Service charge',
      quantity: 1,
      unit_price: job.total_cost && job.total_cost > 0 ? job.total_cost : 0,
    })
  }

  return items
}

function buildDefaultInvoiceNotes(job: Job): string {
  const notes: string[] = []

  if (job.description?.trim()) {
    notes.push(`Job scope: ${job.description.trim()}`)
  }

  if (job.customer?.address?.trim()) {
    notes.push(`Service address: ${job.customer.address.trim()}`)
  }

  notes.push(`Scheduled: ${formatJobSlot(job.scheduled_start)}`)

  return notes.join('\n')
}

export default function CreateInvoiceForm({
  businessId,
  businessProfile,
  jobs,
  services,
  showAll = false,
  preSelectedJobId = null,
}: {
  businessId: string
  businessProfile: BusinessProfile
  jobs: Job[]
  services: Service[]
  showAll?: boolean
  preSelectedJobId?: string | null
}) {
  const router = useRouter()
  const [selectedJobId, setSelectedJobId] = useState(preSelectedJobId || '')
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [jobSearch, setJobSearch] = useState('')
  const [taxRate, setTaxRate] = useState('10')
  const [notes, setNotes] = useState('')
  const [dueInDays, setDueInDays] = useState('14')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedJob = useMemo(() => jobs.find((j) => j.id === selectedJobId), [jobs, selectedJobId])

  const filteredJobs = useMemo(() => {
    const query = jobSearch.trim().toLowerCase()
    if (!query) return jobs
    return jobs.filter((job) => {
      const haystack = `${job.customer?.name || ''} ${job.description || ''} ${job.status}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [jobs, jobSearch])

  const subtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
    [lineItems]
  )
  const parsedTaxRate = Number.parseFloat(taxRate || '0')
  const tax = subtotal * (Number.isNaN(parsedTaxRate) ? 0 : parsedTaxRate / 100)
  const total = subtotal + tax
  const dueLabel = useMemo(() => {
    const days = Number.parseInt(dueInDays || '0', 10)
    if (Number.isNaN(days) || days <= 0) return 'Due immediately'
    if (days === 1) return 'Due in 1 day'
    return `Due in ${days} days`
  }, [dueInDays])

  const dueDaysValue = Number.parseInt(dueInDays || '0', 10)
  const hasValidDueDays = !Number.isNaN(dueDaysValue) && dueDaysValue >= 0
  const hasValidLineItems =
    lineItems.length > 0 &&
    lineItems.every((item) => item.description.trim().length > 0 && item.quantity > 0 && item.unit_price >= 0)

  const complianceChecks = useMemo<ComplianceCheck[]>(() => {
    const buyerIdentityApplies = total >= 1000

    return [
      {
        id: 'business-name',
        label: 'Business legal name is set',
        passed: Boolean(businessProfile.name?.trim()),
        blocking: true,
        hint: 'Go to Settings and add a business name.',
      },
      {
        id: 'business-address',
        label: 'Business address is set',
        passed: Boolean(businessProfile.address?.trim()),
        blocking: true,
        hint: 'Go to Settings and add a business address.',
      },
      {
        id: 'business-contact',
        label: 'Business email or phone is set',
        passed: Boolean(businessProfile.email?.trim() || businessProfile.phone?.trim()),
        blocking: true,
        hint: 'Go to Settings and add a contact method.',
      },
      {
        id: 'customer-selected',
        label: 'Customer is selected',
        passed: Boolean(selectedJob?.customer_id),
        blocking: true,
      },
      {
        id: 'customer-address',
        label: 'Customer address is on file',
        passed: Boolean(selectedJob?.customer?.address?.trim()),
        blocking: false,
        hint: 'Recommended for stronger invoice records.',
      },
      {
        id: 'line-items',
        label: 'Line items are complete (description, qty, price)',
        passed: hasValidLineItems,
        blocking: true,
      },
      {
        id: 'total',
        label: 'Invoice total is greater than $0',
        passed: total > 0,
        blocking: true,
      },
      {
        id: 'due-date',
        label: 'Payment terms are valid',
        passed: hasValidDueDays,
        blocking: true,
      },
      {
        id: 'buyer-identity-1000',
        label: 'Buyer identity present for totals over $1,000',
        passed: Boolean(selectedJob?.customer?.name?.trim()),
        blocking: false,
        applicable: buyerIdentityApplies,
        hint: 'Recommended for AU tax invoice compliance.',
      },
    ]
  }, [
    businessProfile.address,
    businessProfile.email,
    businessProfile.name,
    businessProfile.phone,
    hasValidDueDays,
    hasValidLineItems,
    selectedJob?.customer?.address,
    selectedJob?.customer?.name,
    selectedJob?.customer_id,
    total,
  ])

  const activeComplianceChecks = complianceChecks.filter((check) => check.applicable !== false)
  const blockingChecks = activeComplianceChecks.filter((check) => check.blocking)
  const warningChecks = activeComplianceChecks.filter((check) => !check.blocking)
  const passedBlockingCount = blockingChecks.filter((check) => check.passed).length
  const passedWarningCount = warningChecks.filter((check) => check.passed).length
  const failedBlockingChecks = blockingChecks.filter((check) => !check.passed)
  const failedWarningChecks = warningChecks.filter((check) => !check.passed)
  const isComplianceReady = failedBlockingChecks.length === 0

  const handleJobSelect = useCallback(
    (jobId: string) => {
      setSelectedJobId(jobId)
      const job = jobs.find((j) => j.id === jobId)
      if (!job) return

      setLineItems(buildLineItemsFromJob(job))
      setNotes((currentNotes) => {
        const shouldAutofill = selectedJobId !== jobId || currentNotes.trim().length === 0
        if (!shouldAutofill) return currentNotes
        return buildDefaultInvoiceNotes(job)
      })
    },
    [jobs, selectedJobId]
  )

  useEffect(() => {
    if (!preSelectedJobId || jobs.length === 0) return
    const job = jobs.find((j) => j.id === preSelectedJobId)
    if (job) {
      handleJobSelect(preSelectedJobId)
    }
  }, [preSelectedJobId, jobs, handleJobSelect])

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { type: 'service', description: '', quantity: 1, unit_price: 0 }])
  }

  const addServiceLineItem = (service: Service) => {
    setLineItems((prev) => [
      ...prev,
      {
        type: 'service',
        description: service.name,
        quantity: 1,
        unit_price: service.base_price || 0,
        service_id: service.id,
      },
    ])
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        return { ...item, [field]: value }
      })
    )
  }

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isComplianceReady) {
      return
    }

    setLoading(true)

    try {
      if (!selectedJobId) throw new Error('Please select a job')
      if (!selectedJob?.customer_id) throw new Error('Selected job has no customer')
      if (!hasValidLineItems) throw new Error('Please complete all line items with description, quantity, and unit price')

      const response = await fetch('/api/invoices/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          job_id: selectedJobId,
          customer_id: selectedJob.customer_id,
          line_items: lineItems,
          tax_rate: Number.parseFloat(taxRate || '0'),
          notes,
          due_in_days: Number.parseInt(dueInDays || '0', 10),
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create invoice')
      }

      router.push(`/admin/invoices/${result.invoice_id}`)
      router.refresh()
    } catch (submitError: unknown) {
      const message = submitError instanceof Error ? submitError.message : 'Failed to create invoice'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (jobs.length === 0) {
    return (
      <div className={PANEL_CLASS}>
        <div className="mx-auto max-w-lg text-center">
          <Receipt className="mx-auto mb-3 h-9 w-9 text-slate-400 dark:text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">No invoice-ready jobs</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Jobs must be in Arrived, In Progress, or Completed status to create invoices.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className={PANEL_CLASS}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100">1. Select Job</h2>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Pick the work order to generate this invoice from.</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {filteredJobs.length} visible
              </span>
            </div>

            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                placeholder="Search by customer, status, or job description"
                className={`${INPUT_CLASS} pl-9`}
              />
            </div>

            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {filteredJobs.map((job) => {
                const selected = selectedJobId === job.id
                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => handleJobSelect(job.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                      selected
                        ? 'border-cyan-400 bg-cyan-50/80 dark:border-cyan-400/60 dark:bg-cyan-500/10'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{job.customer?.name || 'Unknown Customer'}</p>
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                        {toStatusLabel(job.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{formatJobSlot(job.scheduled_start)}</p>
                    {job.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{job.description}</p>
                    )}
                    {job.hasInvoice && (
                      <p className="mt-2 inline-flex rounded-full border border-amber-300/70 bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                        Already invoiced
                      </p>
                    )}
                  </button>
                )
              })}
            </div>

            {selectedJob?.hasInvoice && showAll && (
              <div className="mt-4 rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                This job already has an invoice. Create another only if you are billing additional charges.
              </div>
            )}
          </section>

          {selectedJobId && (
            <section className={PANEL_CLASS}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100">2. Build Line Items</h2>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Adjust services, labor, and parts before sending.</p>
                </div>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Custom Item
                </button>
              </div>

              {services.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Quick Add Services</p>
                  <div className="flex flex-wrap gap-2">
                    {services.slice(0, 8).map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => addServiceLineItem(service)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] text-slate-700 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        <Wrench className="h-3 w-3" />
                        {service.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
                      <select
                        value={item.type}
                        onChange={(e) => updateLineItem(index, 'type', e.target.value)}
                        className={`${INPUT_CLASS} md:col-span-2`}
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
                        className={`${INPUT_CLASS} md:col-span-5`}
                        required
                      />

                      <input
                        type="number"
                        value={Number.isNaN(item.quantity) ? '' : item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', Number.parseFloat(e.target.value) || 0)}
                        step="0.01"
                        min="0"
                        placeholder="Qty"
                        className={`${INPUT_CLASS} md:col-span-2`}
                        required
                      />

                      <input
                        type="number"
                        value={Number.isNaN(item.unit_price) ? '' : item.unit_price}
                        onChange={(e) => updateLineItem(index, 'unit_price', Number.parseFloat(e.target.value) || 0)}
                        step="0.01"
                        min="0"
                        placeholder="Unit Price"
                        className={`${INPUT_CLASS} md:col-span-2`}
                        required
                      />

                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20 md:col-span-1"
                        aria-label="Remove line item"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {lineItems.length === 0 && (
                <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
                  No line items yet. Add one manually or use quick-add services.
                </div>
              )}
            </section>
          )}

          {selectedJobId && (
            <section className={PANEL_CLASS}>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100">3. Final Details</h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">Tax Rate (%)</label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className={INPUT_CLASS}
                    step="0.1"
                    min="0"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">Payment Due (days)</label>
                  <input
                    type="number"
                    value={dueInDays}
                    onChange={(e) => setDueInDays(e.target.value)}
                    className={INPUT_CLASS}
                    min="0"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${INPUT_CLASS} min-h-[110px]`}
                  placeholder="Payment instructions, terms, or internal notes..."
                />
              </div>
            </section>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </div>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:h-fit">
          <section className={`${PANEL_CLASS} p-4`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Compliance Status</h3>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                  isComplianceReady
                    ? failedWarningChecks.length > 0
                      ? 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
                      : 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                    : 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
                }`}
              >
                {isComplianceReady
                  ? failedWarningChecks.length > 0
                    ? 'Ready with warnings'
                    : 'Ready to send'
                  : `${failedBlockingChecks.length} missing`}
              </span>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Required</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {passedBlockingCount}/{blockingChecks.length || 0}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Recommended</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {passedWarningCount}/{warningChecks.length || 0}
                </p>
              </div>
            </div>

            <details className="mb-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
              <summary className="cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-200">
                View all compliance requirements
              </summary>
              <div className="mt-2 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Required
                </p>
                {blockingChecks.map((check) => (
                  <div key={check.id} className="flex items-start gap-2 text-xs">
                    {check.passed ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-rose-600 dark:text-rose-300" />
                    )}
                    <span className="text-slate-700 dark:text-slate-200">{check.label}</span>
                  </div>
                ))}

                {warningChecks.length > 0 && (
                  <>
                    <p className="pt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Recommended
                    </p>
                    {warningChecks.map((check) => (
                      <div key={check.id} className="flex items-start gap-2 text-xs">
                        {check.passed ? (
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
                        ) : (
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-amber-600 dark:text-amber-300" />
                        )}
                        <span className="text-slate-700 dark:text-slate-200">{check.label}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </details>

            {failedBlockingChecks.length > 0 ? (
              <div className="space-y-2">
                {failedBlockingChecks.map((check) => (
                  <div
                    key={check.id}
                    className="rounded-xl border border-rose-200 bg-rose-50/60 px-3 py-2 dark:border-rose-500/30 dark:bg-rose-500/10"
                  >
                    <p className="flex items-start gap-2 text-xs">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-rose-600 dark:text-rose-300" />
                      <span className="text-slate-700 dark:text-slate-200">{check.label}</span>
                    </p>
                    {check.hint && (
                      <p className="mt-1 pl-5 text-[11px] text-slate-600 dark:text-slate-300">{check.hint}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  All required compliance checks are complete.
                </p>
              </div>
            )}

            {failedWarningChecks.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Recommendations
                </p>
                <div className="space-y-2">
                  {failedWarningChecks.map((check) => (
                    <div
                      key={check.id}
                      className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10"
                    >
                      <p className="text-xs text-slate-700 dark:text-slate-200">{check.label}</p>
                      {check.hint && (
                        <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">{check.hint}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </section>

          <section className={`${PANEL_CLASS} p-4`}>
            <div className="mb-3 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Live Summary</h3>
            </div>

            <dl className="space-y-2.5 text-sm">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                <dt className="text-xs text-slate-500 dark:text-slate-400">Customer</dt>
                <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{selectedJob?.customer?.name || 'Not selected'}</dd>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                <dt className="text-xs text-slate-500 dark:text-slate-400">Job Slot</dt>
                <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                  {selectedJob ? formatJobSlot(selectedJob.scheduled_start) : 'Not selected'}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                <dt className="text-xs text-slate-500 dark:text-slate-400">Line Items</dt>
                <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{lineItems.length}</dd>
              </div>
            </dl>
          </section>

          <section className={`${PANEL_CLASS} p-4`}>
            <div className="mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Invoice Totals</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Subtotal</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Tax</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">${tax.toFixed(2)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-slate-100">
                <span>Total</span>
                <span className="font-mono text-base">${total.toFixed(2)}</span>
              </div>
              <div className="rounded-xl border border-cyan-200 bg-cyan-50/80 px-3 py-2 text-xs text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-200">
                <p className="inline-flex items-center gap-1 font-medium">
                  <DollarSign className="h-3.5 w-3.5" />
                  {dueLabel}
                </p>
              </div>
            </div>
          </section>

          <section className={`${PANEL_CLASS} p-4`}>
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={loading || !selectedJobId || lineItems.length === 0 || !isComplianceReady}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  'Creating...'
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Invoice
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
                Complete required compliance checks to enable creation.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </form>
  )
}

