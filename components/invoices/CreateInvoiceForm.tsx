'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
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
import { ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'

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
  'w-full rounded-2xl border border-slate-200 bg-white/50 px-4 py-3 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-500 shadow-inner'

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

  // Wizard State
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 3

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1))

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
        label: 'Line items are complete',
        passed: hasValidLineItems,
        blocking: true,
      },
      {
        id: 'total',
        label: 'Invoice total > $0',
        passed: total > 0,
        blocking: true,
      },
      {
        id: 'due-date',
        label: 'Payment terms valid',
        passed: hasValidDueDays,
        blocking: true,
      },
      {
        id: 'buyer-identity-1000',
        label: 'Buyer identity > $1,000',
        passed: Boolean(selectedJob?.customer?.name?.trim()),
        blocking: false,
        applicable: buyerIdentityApplies,
        hint: 'Recommended for AU tax invoice.',
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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8 relative px-4">
        <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 bg-slate-200 dark:bg-slate-800 rounded-full -z-10 overflow-hidden">
          <motion.div
            className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex flex-col items-center gap-2 bg-slate-50 dark:bg-[#030712] p-1 rounded-full">
            <motion.div
              className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-mono text-sm md:text-base font-bold border-2 transition-colors duration-300 ${currentStep >= step
                  ? 'bg-cyan-500 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                  : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-400'
                }`}
              animate={currentStep === step ? { scale: 1.1 } : { scale: 1 }}
            >
              {currentStep > step ? <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" /> : step}
            </motion.div>
            <span className={`text-[9px] md:text-[10px] absolute -bottom-6 font-mono tracking-widest uppercase font-bold whitespace-nowrap ${currentStep >= step ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'
              }`}>
              {step === 1 ? 'Mission Select' : step === 2 ? 'Service Manifest' : 'Approval & Send'}
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main Wizard Area */}
        <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/50 bg-white/60 dark:bg-slate-900/40 dark:border-white/10 p-6 md:p-8 backdrop-blur-3xl shadow-2xl min-h-[500px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            {/* Step 1: Select Job */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 flex-1"
              >
                <div className="mb-6">
                  <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Search className="h-5 w-5 text-cyan-500" /> Source Mission
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Select the finalized work order to begin generating the invoice.</p>
                </div>

                <div className="relative mb-3">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    data-test="customer-input"
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    placeholder="Search by customer, status, or job description"
                    className={`${INPUT_CLASS} pl-11 py-4 font-mono text-sm`}
                  />
                </div>

                <div className="max-h-[350px] space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                  {filteredJobs.map((job) => {
                    const selected = selectedJobId === job.id
                    return (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => handleJobSelect(job.id)}
                        className={`w-full rounded-[1.25rem] border px-5 py-4 text-left transition-all ${selected
                            ? 'border-cyan-400 bg-cyan-500/10 dark:border-cyan-400/50 dark:bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/50'
                            : 'border-slate-200 bg-white/50 hover:bg-white/80 dark:border-slate-700/50 dark:bg-slate-800/40 dark:hover:bg-slate-800/80'
                          }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <p className="font-display font-bold text-slate-900 dark:text-white text-base">{job.customer?.name || 'Unknown Entity'}</p>
                          <span className="rounded-full border border-slate-200/50 bg-white/50 px-3 py-1 text-[9px] uppercase font-mono tracking-widest font-bold text-slate-600 dark:border-slate-700/50 dark:bg-slate-900/50 dark:text-slate-300">
                            {toStatusLabel(job.status)}
                          </span>
                        </div>
                        <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{formatJobSlot(job.scheduled_start)}</p>
                        {job.description && (
                          <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300 font-medium">{job.description}</p>
                        )}
                        {job.hasInvoice && (
                          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-300/50 bg-amber-500/10 px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-3 h-3" /> Already Invoiced
                          </div>
                        )}
                      </button>
                    )
                  })}

                  {filteredJobs.length === 0 && (
                    <div className="py-8 text-center text-slate-500 dark:text-slate-400 font-mono text-xs uppercase tracking-widest">
                      No matching missions found.
                    </div>
                  )}
                </div>

                {selectedJob?.hasInvoice && showAll && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-xl border border-amber-300/70 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/40 dark:text-amber-300 flex items-center gap-2 font-medium"
                  >
                    <AlertTriangle className="w-4 h-4" /> This mission already has an invoice linked. Proceed only if issuing an addendum.
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Step 2: Line Items */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 flex-1"
              >
                <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Wrench className="h-5 w-5 text-indigo-500" /> Service Manifest
                    </h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Review and adjust billable items before finalizing.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/50 px-4 py-2 text-xs font-bold font-mono tracking-widest uppercase text-slate-700 transition-all hover:bg-slate-200 hover:scale-105 dark:border-white/10 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-700/80 shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Manually Append
                  </button>
                </div>

                {services.length > 0 && (
                  <div className="mb-6 rounded-2xl bg-slate-50/50 p-4 border border-slate-200/50 dark:bg-slate-800/30 dark:border-slate-700/50 backdrop-blur-sm">
                    <p className="mb-3 text-[9px] font-bold font-mono uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">Quick-Inject Protocols</p>
                    <div className="flex flex-wrap gap-2">
                      {services.slice(0, 8).map((service) => (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => addServiceLineItem(service)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/50 bg-white shadow-sm px-3.5 py-1.5 text-[11px] font-medium text-slate-700 transition-all hover:bg-cyan-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-cyan-900/40 hover:border-cyan-300 dark:hover:border-cyan-500/50 hover:text-cyan-700 dark:hover:text-cyan-300 hover:-translate-y-0.5"
                        >
                          <Wrench className="h-3 w-3" />
                          {service.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  <AnimatePresence>
                    {lineItems.map((item, index) => (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        key={index}
                        className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-700/80 dark:bg-slate-800/80 overflow-hidden"
                      >
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-center">
                          <select
                            value={item.type}
                            onChange={(e) => updateLineItem(index, 'type', e.target.value)}
                            className={`${INPUT_CLASS} md:col-span-2 py-2 px-3 text-xs font-mono`}
                          >
                            <option value="service" className="font-sans">Service</option>
                            <option value="labor" className="font-sans">Labor</option>
                            <option value="parts" className="font-sans">Parts</option>
                          </select>

                          <input
                            type="text"
                            data-test="description-input"
                            value={item.description}
                            onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                            placeholder="Line Item Descriptor"
                            className={`${INPUT_CLASS} md:col-span-5 font-semibold py-2 px-3`}
                            required
                          />

                          <div className="md:col-span-2 relative group">
                            <input
                              type="number"
                              id={item.type === 'labor' ? 'labor-hours' : undefined}
                              data-test={item.type === 'labor' ? 'labor-hours' : undefined}
                              value={Number.isNaN(item.quantity) ? '' : item.quantity}
                              onChange={(e) => updateLineItem(index, 'quantity', Number.parseFloat(e.target.value) || 0)}
                              step="0.01"
                              min="0"
                              placeholder="0.0"
                              className={`${INPUT_CLASS} py-2 px-3 font-mono`}
                              required
                            />
                            <span className="absolute top-[-20px] left-2 text-[8px] font-mono tracking-widest uppercase text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">Qty/Hrs</span>
                          </div>

                          <div className="md:col-span-2 relative group">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-emerald-500 font-bold">$</span>
                            <input
                              type="number"
                              value={Number.isNaN(item.unit_price) ? '' : item.unit_price}
                              onChange={(e) => updateLineItem(index, 'unit_price', Number.parseFloat(e.target.value) || 0)}
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              className={`${INPUT_CLASS} py-2 pl-7 px-3 font-mono`}
                              required
                            />
                            <span className="absolute top-[-20px] left-2 text-[8px] font-mono tracking-widest uppercase text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">Unit Cost</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeLineItem(index)}
                            className="md:col-span-1 inline-flex w-full md:w-auto h-full items-center justify-center rounded-xl bg-rose-50/50 p-2 text-rose-500 transition-all hover:bg-rose-100/80 hover:text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
                            aria-label="Remove line item"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {lineItems.length === 0 && (
                  <div className="mt-6 rounded-[1.5rem] border-2 border-dashed border-slate-300/50 bg-slate-50/50 px-4 py-12 text-center text-sm text-slate-500 dark:border-slate-700/50 dark:bg-slate-800/30 flex flex-col items-center justify-center gap-3 font-medium">
                    <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    Manifest is currently empty. Initialize a new item to proceed.
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Final Details */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 flex-1"
              >
                <div className="mb-6">
                  <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-emerald-500" /> Administrative Protocol
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Configure financial terms and internal notation.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <label className="block text-[11px] font-mono font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">Tax Matrix (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value)}
                        className={`${INPUT_CLASS} py-4 pr-10 font-mono text-lg`}
                        step="0.1"
                        min="0"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-lg font-bold text-slate-400">%</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[11px] font-mono font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">Payment Window (Days)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={dueInDays}
                        onChange={(e) => setDueInDays(e.target.value)}
                        className={`${INPUT_CLASS} py-4 font-mono text-lg`}
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">Transmitter Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={`${INPUT_CLASS} min-h-[140px] resize-none font-sans leading-relaxed`}
                    placeholder="Provide detailed instructions, terms of service, or internal log entries..."
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-rose-300/70 bg-rose-50/80 px-5 py-4 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300 font-medium flex items-center gap-3 backdrop-blur"
                  >
                    <AlertTriangle className="h-5 w-5" />
                    {error}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Controls */}
          <div className="pt-8 mt-6 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10 w-full">
            <button
              type="button"
              className={`px-6 py-3 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-semibold transition-all hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center min-w-[120px] ${currentStep === 1 ? 'opacity-0 pointer-events-none' : ''}`}
              onClick={prevStep}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Revert
            </button>

            {currentStep < 3 ? (
              <button
                type="button"
                className="px-8 py-3 rounded-full bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/30 text-sm font-bold tracking-widest uppercase transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center min-w-[180px]"
                onClick={nextStep}
                disabled={(currentStep === 1 && !selectedJobId) || (currentStep === 2 && !hasValidLineItems)}
              >
                Proceed <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            ) : (
              <button
                type="submit"
                data-test="save-invoice"
                disabled={loading || !selectedJobId || lineItems.length === 0 || !isComplianceReady}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/30 font-mono text-sm uppercase tracking-widest font-bold transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95 disabled:hover:scale-100 min-w-[200px]"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> EXECUTING...</>
                ) : (
                  <><Save className="h-4 w-4" /> GENERATE INVOICE</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Global Summary & Compliance Aside */}
        <aside className="hidden xl:flex flex-col space-y-6 xl:sticky xl:top-24 xl:h-fit">
          {/* Summary Card */}
          <motion.section
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-[2rem] border border-slate-200/50 bg-white/40 p-6 shadow-xl backdrop-blur-3xl dark:border-white/10 dark:bg-slate-900/40 relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-400/20 blur-[30px] rounded-full pointer-events-none" />

            <div className="mb-6 flex items-center gap-2 relative z-10">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              <h3 className="text-[11px] font-bold font-mono uppercase tracking-[0.2em] text-slate-800 dark:text-slate-200">Financial Telemetry</h3>
            </div>

            <div className="space-y-4 text-sm relative z-10">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-medium">
                <span>Subtotal Matrix</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-medium">
                <span>Tax Allocation</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">${tax.toFixed(2)}</span>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent my-4" />

              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-slate-900 dark:text-white uppercase tracking-widest text-xs">Final Sum</span>
                <span className="font-mono text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-cyan-500">
                  ${total.toFixed(2)}
                </span>
              </div>

              <div className="mt-4 rounded-xl border border-cyan-200/50 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-800 dark:border-cyan-500/20 dark:text-cyan-200 flex items-center justify-center font-medium shadow-sm">
                <p className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {dueLabel}
                </p>
              </div>
            </div>
          </motion.section>

          {/* Compliance Card */}
          <section className="rounded-[2rem] border border-slate-200/50 bg-white/40 p-6 shadow-xl backdrop-blur-3xl dark:border-white/10 dark:bg-slate-900/40 relative z-10">
            <div className="mb-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className={`h-5 w-5 ${isComplianceReady ? 'text-emerald-500' : 'text-rose-500'}`} />
                <h3 className="text-[11px] font-bold font-mono uppercase tracking-[0.2em] text-slate-800 dark:text-slate-200">Compliance Core</h3>
              </div>
              <span
                className={`w-full inline-flex justify-center items-center rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest shadow-sm ${isComplianceReady
                    ? failedWarningChecks.length > 0
                      ? 'border border-amber-300/50 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      : 'border border-emerald-300/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border border-rose-300/50 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                  }`}
              >
                {isComplianceReady
                  ? failedWarningChecks.length > 0
                    ? 'READY (WARNINGS)'
                    : 'ALL SYSTEMS GO'
                  : `${failedBlockingChecks.length} ERRORS DETECTED`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-2xl border border-slate-200/50 bg-white/60 p-3 text-center shadow-inner dark:border-white/5 dark:bg-slate-950/40">
                <p className="text-[9px] uppercase font-mono tracking-widest text-slate-500 dark:text-slate-400 mb-1">Required</p>
                <p className="text-xl font-display font-bold text-slate-900 dark:text-white">
                  {passedBlockingCount}<span className="text-sm text-slate-400">/{blockingChecks.length || 0}</span>
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/50 bg-white/60 p-3 text-center shadow-inner dark:border-white/5 dark:bg-slate-950/40">
                <p className="text-[9px] uppercase font-mono tracking-widest text-slate-500 dark:text-slate-400 mb-1">Optional</p>
                <p className="text-xl font-display font-bold text-slate-900 dark:text-white">
                  {passedWarningCount}<span className="text-sm text-slate-400">/{warningChecks.length || 0}</span>
                </p>
              </div>
            </div>

            <details className="rounded-2xl border border-slate-200/50 bg-white/50 p-4 dark:border-white/5 dark:bg-slate-950/30 group [&_summary::-webkit-details-marker]:hidden">
              <summary className="cursor-pointer text-[11px] font-mono font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>View Full Matrix</span>
                <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-4 space-y-3 pt-3 border-t border-slate-200/50 dark:border-slate-800">
                {failedBlockingChecks.map((check) => (
                  <div key={check.id} className="flex items-start gap-2 text-xs">
                    <X className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-rose-500" />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{check.label}</span>
                  </div>
                ))}
                {failedWarningChecks.map((check) => (
                  <div key={check.id} className="flex items-start gap-2 text-xs">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{check.label}</span>
                  </div>
                ))}
                {blockingChecks.filter(c => c.passed).map((check) => (
                  <div key={check.id} className="flex items-start gap-2 text-xs opacity-60">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                    <span className="text-slate-700 dark:text-slate-300 line-through">{check.label}</span>
                  </div>
                ))}
              </div>
            </details>
          </section>
        </aside>
      </div>
    </form>
  )
}
