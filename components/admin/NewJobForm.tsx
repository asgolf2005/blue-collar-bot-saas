'use client'

import { Customer, Service } from '@/lib/types'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  DollarSign,
  FileText,
  Save,
  Sparkles,
  User,
  Wrench,
} from '@/components/ui/icons'
import { FormAlert } from '@/components/shared'
import { Button } from '@/components/ui/Button'

interface Technician {
  id: string
  full_name: string
  email: string
}

interface NewJobFormProps {
  businessId: string
  customers: Customer[]
  technicians: Technician[]
  services: Service[]
  dispatchContextJobs: DispatchContextJob[]
  initialCustomerId?: string
}

interface DispatchContextJob {
  id: string
  customer_id: string
  technician_id: string | null
  scheduled_start: string
  scheduled_end: string | null
  status: string
  service_ids: string[]
}

interface DispatchSuggestion {
  id: string
  technicianId: string
  technicianName: string
  start: Date
  end: Date
  score: number
  reasons: string[]
  breakdown: Array<{ label: string; points: number }>
}

interface SelectOption {
  value: string
  label: string
  subtitle?: string
}

function toDateTimeInputValue(date: Date) {
  const pad = (v: number) => String(v).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function addHoursToLocalDateString(dateString: string, hours: number) {
  const d = new Date(dateString)
  d.setHours(d.getHours() + hours)
  return toDateTimeInputValue(d)
}

function addMinutesToDate(base: Date, minutes: number) {
  const next = new Date(base)
  next.setMinutes(next.getMinutes() + minutes)
  return next
}

function getMinutesBetween(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB
}

function formatDuration(minutes: number) {
  if (minutes <= 0) return '0m'
  if (minutes < 60) return `${minutes}m`
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins ? `${hrs}h ${mins}m` : `${hrs}h`
}

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
  className = '',
}: {
  icon: React.ElementType
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-3xl border border-border bg-bg-secondary/90 p-5 shadow-elevation-1 backdrop-blur sm:p-6 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-primary">{title}</h2>
            {subtitle && <p className="mt-1 text-xs text-text-secondary">{subtitle}</p>}
          </div>
        </div>
      </div>
      {children}
    </section>
  )
}

function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  required = false,
  id,
  dataTest,
}: {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder: string
  required?: boolean
  id?: string
  dataTest?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <div className={`relative ${isOpen ? 'z-[120]' : ''}`}>
      <button
        type="button"
        id={id}
        data-test={dataTest}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-2xl border border-border bg-white px-4 py-3 text-left text-sm text-text-primary transition-colors hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:bg-slate-900/90 dark:hover:border-slate-600"
      >
        <span className={selectedOption ? 'text-text-primary' : 'text-text-muted'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <button type="button" className="fixed inset-0 z-[120]" onClick={() => setIsOpen(false)} />
          <div className="absolute z-[121] mt-2 w-full overflow-hidden rounded-2xl border border-border bg-bg-secondary shadow-elevation-2">
            {!required && (
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setIsOpen(false)
                }}
                className="w-full border-b border-border px-4 py-2.5 text-left text-sm text-text-secondary transition-colors hover:bg-bg-hover"
              >
                {placeholder}
              </button>
            )}
            <div className="max-h-64 overflow-y-auto">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  className={`w-full border-b border-border px-4 py-2.5 text-left transition-colors last:border-b-0 ${value === option.value
                    ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300'
                    : 'text-text-primary hover:bg-bg-hover'
                    }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{option.label}</div>
                      {option.subtitle && <div className="truncate text-xs text-text-muted">{option.subtitle}</div>}
                    </div>
                    {value === option.value && <Check className="h-4 w-4 shrink-0" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function NewJobForm({
  businessId,
  customers,
  technicians,
  services,
  dispatchContextJobs,
  initialCustomerId = '',
}: NewJobFormProps) {
  const [customerId, setCustomerId] = useState(initialCustomerId)
  const [technicianId, setTechnicianId] = useState('')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [scheduledStart, setScheduledStart] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dispatchSuggestions, setDispatchSuggestions] = useState<DispatchSuggestion[]>([])
  const [dispatchRan, setDispatchRan] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 3

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!initialCustomerId) return
    if (customers.some((c) => c.id === initialCustomerId)) {
      setCustomerId(initialCustomerId)
    }
  }, [customers, initialCustomerId])

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) || null,
    [customerId, customers]
  )

  const selectedTechnician = useMemo(
    () => technicians.find((t) => t.id === technicianId) || null,
    [technicianId, technicians]
  )

  const selectedServiceItems = useMemo(
    () => services.filter((service) => selectedServices.includes(service.id)),
    [selectedServices, services]
  )

  const totalEstimatedPrice = useMemo(
    () => selectedServiceItems.reduce((sum, service) => sum + (service.base_price || 0), 0),
    [selectedServiceItems]
  )

  const totalEstimatedDuration = useMemo(
    () => selectedServiceItems.reduce((sum, service) => sum + (service.duration_minutes || 0), 0),
    [selectedServiceItems]
  )

  const selectedServiceIdSet = useMemo(() => new Set(selectedServices), [selectedServices])

  const targetDurationMinutes = useMemo(() => {
    if (totalEstimatedDuration > 0) return totalEstimatedDuration
    if (scheduledStart && scheduledEnd) {
      const start = new Date(scheduledStart)
      const end = new Date(scheduledEnd)
      const minutes = getMinutesBetween(start, end)
      if (minutes > 0) return minutes
    }
    return 120
  }, [scheduledEnd, scheduledStart, totalEstimatedDuration])

  const calculatedDuration = useMemo(() => {
    if (!scheduledStart || !scheduledEnd) return null
    const diffMs = new Date(scheduledEnd).getTime() - new Date(scheduledStart).getTime()
    return Math.floor(diffMs / 60000)
  }, [scheduledEnd, scheduledStart])

  const customerOptions: SelectOption[] = customers.map((c) => ({
    value: c.id,
    label: c.name,
    subtitle: c.phone || c.email || undefined,
  }))

  const technicianOptions: SelectOption[] = technicians.map((t) => ({
    value: t.id,
    label: t.full_name,
    subtitle: t.email,
  }))

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    )
  }

  const applyQuickStart = (mode: 'now' | 'in_1h' | 'tomorrow_9') => {
    const now = new Date()
    if (mode === 'in_1h') now.setHours(now.getHours() + 1)
    if (mode === 'tomorrow_9') {
      now.setDate(now.getDate() + 1)
      now.setHours(9, 0, 0, 0)
    }
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0)

    const start = toDateTimeInputValue(now)
    setScheduledStart(start)
    if (!scheduledEnd || new Date(scheduledEnd) <= new Date(start)) {
      setScheduledEnd(addHoursToLocalDateString(start, 2))
    }
  }

  const handleStartChange = (value: string) => {
    setScheduledStart(value)
    if (!value) return
    if (!scheduledEnd || new Date(scheduledEnd) <= new Date(value)) {
      setScheduledEnd(addHoursToLocalDateString(value, 2))
    }
  }

  const runDispatchCopilot = () => {
    const now = new Date()
    const candidates: Date[] = []

    if (scheduledStart) {
      const base = new Date(scheduledStart)
      if (!Number.isNaN(base.getTime())) {
        ;[0, 60, -60, 120, 24 * 60].forEach((offset) => {
          const candidate = addMinutesToDate(base, offset)
          if (candidate > now) {
            candidates.push(candidate)
          }
        })
      }
    } else {
      const cursor = new Date(now)
      cursor.setMinutes(Math.ceil(cursor.getMinutes() / 30) * 30, 0, 0)

      for (let i = 0; i < 36 && candidates.length < 12; i += 1) {
        const candidate = addMinutesToDate(cursor, i * 60)
        const hour = candidate.getHours()
        if (hour >= 7 && hour <= 18) {
          candidates.push(candidate)
        }
      }
    }

    const uniqueCandidates = Array.from(new Map(candidates.map((d) => [d.getTime(), d])).values())
      .sort((a, b) => a.getTime() - b.getTime())
      .slice(0, 8)

    const nextSuggestions: DispatchSuggestion[] = []

    for (const tech of technicians) {
      const techJobs = dispatchContextJobs.filter((job) => job.technician_id === tech.id)
      const activeJobs = techJobs.filter((job) =>
        ['scheduled', 'on_the_way', 'arrived', 'in_progress'].includes(job.status)
      )
      const completedJobs = techJobs.filter((job) => job.status === 'completed')

      for (const slotStart of uniqueCandidates) {
        const slotEnd = addMinutesToDate(slotStart, targetDurationMinutes)

        const hasConflict = activeJobs.some((job) => {
          const jobStart = new Date(job.scheduled_start)
          const jobEnd = job.scheduled_end ? new Date(job.scheduled_end) : addMinutesToDate(jobStart, 120)
          return overlaps(slotStart, slotEnd, jobStart, jobEnd)
        })
        if (hasConflict) continue

        const dayStart = new Date(slotStart)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(dayStart)
        dayEnd.setDate(dayEnd.getDate() + 1)

        const weekStart = new Date(slotStart)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        weekStart.setHours(0, 0, 0, 0)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 7)

        const dayLoad = activeJobs.filter((job) => {
          const jobStart = new Date(job.scheduled_start)
          return jobStart >= dayStart && jobStart < dayEnd
        }).length

        const weekLoad = activeJobs.filter((job) => {
          const jobStart = new Date(job.scheduled_start)
          return jobStart >= weekStart && jobStart < weekEnd
        }).length

        const serviceMatches = selectedServiceIdSet.size
          ? completedJobs.filter((job) => job.service_ids.some((serviceId) => selectedServiceIdSet.has(serviceId))).length
          : 0

        const customerHistory = customerId
          ? completedJobs.filter((job) => job.customer_id === customerId).length
          : 0

        const adjacentGap = activeJobs.some((job) => {
          const jobStart = new Date(job.scheduled_start)
          const jobEnd = job.scheduled_end ? new Date(job.scheduled_end) : addMinutesToDate(jobStart, 120)
          const gapMinutes = Math.min(
            Math.abs(getMinutesBetween(jobEnd, slotStart)),
            Math.abs(getMinutesBetween(slotEnd, jobStart))
          )
          return gapMinutes <= 90
        })

        const baseScore = 100
        const dayLoadPenalty = dayLoad * 6
        const weekLoadPenalty = weekLoad * 2
        const serviceFitBoost = Math.min(25, serviceMatches * 5)
        const customerHistoryBoost = customerHistory > 0 ? 12 : 0
        const routeContinuityBoost = adjacentGap ? 8 : 0
        let urgencyBoost = 0
        const hoursUntil = Math.max(0, (slotStart.getTime() - now.getTime()) / 3600000)
        if (urgency === 'high') urgencyBoost = Math.max(0, 28 - hoursUntil * 2.5)
        if (urgency === 'medium') urgencyBoost = Math.max(0, 16 - hoursUntil * 1.2)
        if (urgency === 'low') urgencyBoost = Math.max(0, 6 - hoursUntil * 0.4)

        let preferredTimePenalty = 0
        if (scheduledStart) {
          const preferred = new Date(scheduledStart)
          const offsetHours = Math.abs(slotStart.getTime() - preferred.getTime()) / 3600000
          preferredTimePenalty = offsetHours * 3
        }

        const score =
          baseScore -
          dayLoadPenalty -
          weekLoadPenalty +
          serviceFitBoost +
          customerHistoryBoost +
          routeContinuityBoost +
          urgencyBoost -
          preferredTimePenalty

        const reasons: string[] = []
        if (serviceMatches > 0) reasons.push(`${serviceMatches} similar completed jobs`)
        if (customerHistory > 0) reasons.push(`worked with this customer before`)
        if (dayLoad <= 1) reasons.push(`lighter day workload`)
        if (adjacentGap) reasons.push(`route continuity window`)
        if (reasons.length === 0) reasons.push(`open slot with no overlap`)

        nextSuggestions.push({
          id: `${tech.id}-${slotStart.getTime()}`,
          technicianId: tech.id,
          technicianName: tech.full_name,
          start: slotStart,
          end: slotEnd,
          score,
          reasons,
          breakdown: [
            { label: 'Base fit', points: baseScore },
            { label: 'Day workload', points: -dayLoadPenalty },
            { label: 'Week workload', points: -weekLoadPenalty },
            { label: 'Service fit', points: serviceFitBoost },
            { label: 'Customer history', points: customerHistoryBoost },
            { label: 'Route continuity', points: routeContinuityBoost },
            { label: `Urgency (${urgency})`, points: urgencyBoost },
            { label: 'Preferred-time offset', points: -preferredTimePenalty },
          ].filter((entry) => entry.points !== 0),
        })
      }
    }

    nextSuggestions.sort((a, b) => b.score - a.score)
    setDispatchSuggestions(nextSuggestions.slice(0, 3))
    setDispatchRan(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!customerId || !scheduledStart || !scheduledEnd) {
        throw new Error('Please fill in all required fields')
      }

      if (new Date(scheduledEnd) <= new Date(scheduledStart)) {
        throw new Error('End time must be after start time')
      }

      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          business_id: businessId,
          customer_id: customerId,
          technician_id: technicianId || null,
          status: 'scheduled',
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
          description: description || null,
          urgency,
          source: 'admin_portal',
        })
        .select()
        .single()

      if (jobError) throw jobError

      if (selectedServices.length > 0) {
        const jobServices = selectedServices.map((serviceId) => ({
          job_id: job.id,
          service_id: serviceId,
        }))

        const { error: servicesError } = await supabase.from('job_services').insert(jobServices)
        if (servicesError) throw servicesError
      }

      router.push('/admin/jobs')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create job'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  // Step handlers
  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1))

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto" data-test="schedule-form">
      {/* 2026 Step Indicator */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full -z-10 overflow-hidden">
          <motion.div
            className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex flex-col items-center gap-2">
            <motion.div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-mono text-sm font-bold border-2 transition-colors duration-300 ${currentStep >= step
                  ? 'bg-cyan-500 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-400'
                }`}
              animate={currentStep === step ? { scale: 1.1 } : { scale: 1 }}
            >
              {currentStep > step ? <Check className="w-5 h-5" /> : step}
            </motion.div>
            <span className={`text-[10px] font-mono tracking-widest uppercase font-semibold ${currentStep >= step ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'
              }`}>
              {step === 1 ? 'Parties & Scope' : step === 2 ? 'Scheduling' : 'Review'}
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/50 bg-white/60 dark:bg-slate-900/40 dark:border-white/10 p-6 md:p-8 backdrop-blur-2xl shadow-xl min-h-[500px]">
          <AnimatePresence mode="wait">
            {/* Step 1: Customer, Technician, Services */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <SectionCard
                  icon={User}
                  title="Parties Involved"
                  subtitle="Select the client and assign a technician immediately or leave unassigned."
                  className="bg-white/50 dark:bg-slate-950/50 border-white/20 dark:border-slate-800"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                        Customer <span className="text-rose-500">*</span>
                      </label>
                      <CustomSelect
                        id="customer"
                        dataTest="customer-input"
                        value={customerId}
                        onChange={setCustomerId}
                        options={customerOptions}
                        placeholder="Search directory..."
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                        Technician
                      </label>
                      <CustomSelect
                        value={technicianId}
                        onChange={setTechnicianId}
                        options={technicianOptions}
                        placeholder="Unassigned"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label htmlFor="address" className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                      Service Address
                    </label>
                    <input
                      id="address"
                      data-test="address-input"
                      type="text"
                      value={selectedCustomer?.address || ''}
                      readOnly
                      placeholder="Select a customer to load address"
                      className="w-full rounded-2xl border border-border bg-black/5 dark:bg-white/5 px-4 py-3 text-sm text-text-primary transition-colors focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>
                </SectionCard>

                <SectionCard
                  icon={Wrench}
                  title="Mission Scope (Services)"
                  subtitle="Select the required services to automatically estimate duration and price."
                  className="bg-white/50 dark:bg-slate-950/50 border-white/20 dark:border-slate-800"
                >
                  {services.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-bg-tertiary/50 px-5 py-8 text-center">
                      <Wrench className="mx-auto mb-2 h-8 w-8 text-text-muted" />
                      <p className="text-sm font-medium text-text-secondary">No active services found</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {services.map((service) => {
                        const checked = selectedServices.includes(service.id)
                        return (
                          <label
                            key={service.id}
                            className={`cursor-pointer rounded-2xl border p-4 transition-all duration-300 ${checked
                              ? 'border-cyan-400 bg-cyan-50/80 dark:border-cyan-500/60 dark:bg-cyan-900/20 shadow-lg shadow-cyan-500/10'
                              : 'border-slate-200/50 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-600'
                              }`}
                          >
                            <div className="flex gap-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleServiceToggle(service.id)}
                                className="mt-1 h-4 w-4 rounded border-border text-cyan-600 focus:ring-cyan-500/30"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-text-primary">{service.name}</div>
                                {service.description && (
                                  <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{service.description}</p>
                                )}
                                <div className="mt-2 flex items-center gap-3 text-xs font-mono text-text-secondary">
                                  {service.base_price !== null && <span className="text-emerald-600 dark:text-emerald-400 font-bold">${service.base_price.toFixed(2)}</span>}
                                  {service.duration_minutes !== null && <span>{formatDuration(service.duration_minutes)}</span>}
                                </div>
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </SectionCard>
              </motion.div>
            )}

            {/* Step 2: Schedule, Priority, Copilot */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <SectionCard
                  icon={Calendar}
                  title="Mission Timing"
                  subtitle="Set constraints manually or inject quick presets."
                  className="bg-white/50 dark:bg-slate-950/50 border-white/20 dark:border-slate-800"
                >
                  <div className="mb-4 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" className="rounded-full text-xs font-mono tracking-wide" onClick={() => applyQuickStart('now')}>
                      Start immediately
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="rounded-full text-xs font-mono tracking-wide" onClick={() => applyQuickStart('in_1h')}>
                      T+1 Hour
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="rounded-full text-xs font-mono tracking-wide" onClick={() => applyQuickStart('tomorrow_9')}>
                      T+1 Day 0900
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                        Start <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduledStart}
                        onChange={(e) => handleStartChange(e.target.value)}
                        className="w-full rounded-2xl border border-border bg-white/50 px-4 py-3 text-sm text-text-primary transition-colors focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:bg-slate-900/50 backdrop-blur"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                        End <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduledEnd}
                        onChange={(e) => setScheduledEnd(e.target.value)}
                        className="w-full rounded-2xl border border-border bg-white/50 px-4 py-3 text-sm text-text-primary transition-colors focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:bg-slate-900/50 backdrop-blur"
                        required
                      />
                    </div>
                  </div>

                  {calculatedDuration !== null && (
                    <div
                      className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${calculatedDuration > 0
                        ? 'border-cyan-200 bg-cyan-50/80 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300'
                        : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'
                        }`}
                    >
                      <div className="flex items-center gap-2 font-mono">
                        <Clock className="h-4 w-4" />
                        {calculatedDuration > 0 ? (
                          <span>Extracted span: {formatDuration(calculatedDuration)}</span>
                        ) : (
                          <span>Warning: Inverted timeline constraints.</span>
                        )}
                      </div>
                    </div>
                  )}
                </SectionCard>

                <SectionCard
                  icon={Sparkles}
                  title="AI Dispatch Optimizer"
                  subtitle="Scans grid load, service context, and route continuity to find the optimal assignment."
                  className="bg-white/50 dark:bg-slate-950/50 border-white/20 dark:border-slate-800"
                >
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                      <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        Target Block: <span className="font-bold text-cyan-600 dark:text-cyan-400">{formatDuration(targetDurationMinutes)}</span>
                      </div>
                      <Button
                        type="button"
                        variant="glassPrimary"
                        size="sm"
                        className="rounded-full shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-shadow"
                        onClick={runDispatchCopilot}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {dispatchRan ? 'Re-run Network Scan' : 'Run Network Scan'}
                      </Button>
                    </div>

                    {dispatchRan && dispatchSuggestions.length === 0 && (
                      <div className="rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm font-mono text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                        No viable routing nodes discovered.
                      </div>
                    )}

                    {dispatchSuggestions.length > 0 && (
                      <div className="space-y-3">
                        {dispatchSuggestions.map((suggestion, index) => (
                          <div
                            key={suggestion.id}
                            className={`rounded-2xl border p-4 transition-all ${index === 0
                              ? 'border-cyan-400 bg-cyan-50 dark:border-cyan-500/50 dark:bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.15)] relative overflow-hidden'
                              : 'border-slate-200/50 bg-white/40 dark:border-slate-800 dark:bg-slate-900/40'
                              }`}
                          >
                            {index === 0 && <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/20 blur-[50px] -z-10 rounded-full" />}
                            <div className="flex flex-col sm:flex-row gap-4 items-start justify-between relative z-10">
                              <div>
                                <h4 className="font-display font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                  {suggestion.technicianName}
                                  {index === 0 && <span className="bg-cyan-500 text-white text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-mono">Top Match</span>}
                                </h4>
                                <div className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5" />
                                  {suggestion.start.toLocaleDateString()} • {suggestion.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {suggestion.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <p className="mt-2 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                  Insight: {suggestion.reasons.join(' | ')}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-md border border-emerald-200/50 dark:border-emerald-700/50">
                                  SCORE: {Math.round(suggestion.score)}
                                </span>
                                <Button
                                  type="button"
                                  variant="glass"
                                  size="sm"
                                  className="rounded-xl text-xs w-full sm:w-auto shadow-sm"
                                  onClick={() => {
                                    setTechnicianId(suggestion.technicianId)
                                    setScheduledStart(toDateTimeInputValue(suggestion.start))
                                    setScheduledEnd(toDateTimeInputValue(suggestion.end))
                                  }}
                                >
                                  Lock Node
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </SectionCard>

                <SectionCard
                  icon={AlertCircle}
                  title="Priority Level"
                  subtitle="Tag the mission urgency."
                  className="bg-white/50 dark:bg-slate-950/50 border-white/20 dark:border-slate-800"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {(['low', 'medium', 'high'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setUrgency(level)}
                        className={`rounded-2xl border px-4 py-3 text-sm font-semibold capitalize font-mono tracking-wide transition-all ${urgency === level
                          ? level === 'low'
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/20 dark:text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                            : level === 'medium'
                              ? 'border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-500/50 dark:bg-amber-500/20 dark:text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                              : 'border-rose-400 bg-rose-50 text-rose-700 dark:border-rose-500/50 dark:bg-rose-500/20 dark:text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                          : 'border-slate-200/50 bg-white/40 text-slate-500 hover:text-slate-800 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:text-slate-300'
                          }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* Step 3: Work Details, Review */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <SectionCard
                  icon={FileText}
                  title="Mission Brief (Notes)"
                  subtitle="Transmit critical context to the field technician."
                  className="bg-white/50 dark:bg-slate-950/50 border-white/20 dark:border-slate-800"
                >
                  <textarea
                    id="description"
                    data-test="description-input"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter diagnostic patterns, site hazards, or customer requests..."
                    rows={6}
                    className="w-full resize-none rounded-2xl border border-border bg-white/50 px-4 py-4 font-mono text-sm text-text-primary transition-colors placeholder:text-text-muted focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:bg-slate-900/50 backdrop-blur"
                  />
                </SectionCard>

                {error && <FormAlert type="danger" message={error} onClose={() => setError(null)} />}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pagination Controls */}
          <div className="mt-8 pt-6 border-t border-slate-200/50 dark:border-slate-800 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              className={`rounded-full shadow-sm ${currentStep === 1 ? 'opacity-0 pointer-events-none' : ''}`}
              onClick={prevStep}
            >
              ← Previous Phase
            </Button>

            {currentStep < 3 ? (
              <Button
                type="button"
                variant="glassPrimary"
                className="rounded-full shadow-lg shadow-cyan-500/20"
                onClick={nextStep}
              >
                Next Phase →
              </Button>
            ) : (
              <Button
                id="save-job-button"
                type="submit"
                variant="glassPrimary"
                className="rounded-full shadow-lg shadow-cyan-500/30 font-bold tracking-widest uppercase font-mono px-8"
                loading={loading}
                icon={!loading ? <Save className="h-4 w-4" /> : undefined}
                data-test="save-job"
              >
                {loading ? 'Initializing...' : 'Launch Mission'}
              </Button>
            )}
          </div>
        </div>

        {/* Global Summary Sticky Aside */}
        <aside className="hidden xl:block space-y-4 xl:sticky xl:top-24 xl:h-fit">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2rem] border border-slate-200/50 bg-white/40 p-6 shadow-xl backdrop-blur-3xl dark:border-white/10 dark:bg-slate-900/40 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 blur-[40px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/10 blur-[40px] rounded-full pointer-events-none" />

            <div className="mb-6 flex items-center gap-2 relative z-10">
              <div className="w-8 h-8 rounded-full bg-cyan-50 dark:bg-cyan-500/20 flex items-center justify-center border border-cyan-200 dark:border-cyan-500/30">
                <Sparkles className="h-4 w-4 text-cyan-600 dark:text-cyan-300 animate-pulse" />
              </div>
              <h3 className="text-[11px] font-bold font-mono uppercase tracking-[0.2em] text-slate-800 dark:text-slate-200">Mission Snapshot</h3>
            </div>

            <dl className="space-y-4 text-sm relative z-10">
              <div className="rounded-2xl border border-white/50 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/60 shadow-sm p-4 backdrop-blur-sm transition-transform hover:scale-[1.02]">
                <dt className="text-[10px] uppercase font-mono tracking-widest text-slate-500 dark:text-slate-400 mb-1">Target Identity</dt>
                <dd className="font-bold text-slate-900 dark:text-slate-100">{selectedCustomer?.name || <span className="text-rose-500 opacity-80 animate-pulse">Pending...</span>}</dd>
              </div>
              <div className="rounded-2xl border border-white/50 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/60 shadow-sm p-4 backdrop-blur-sm transition-transform hover:scale-[1.02]">
                <dt className="text-[10px] uppercase font-mono tracking-widest text-slate-500 dark:text-slate-400 mb-1">Assigned Agent</dt>
                <dd className="font-bold text-slate-900 dark:text-slate-100">{selectedTechnician?.full_name || 'Autonomous/TBD'}</dd>
              </div>
              <div className="rounded-2xl border border-white/50 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/60 shadow-sm p-4 backdrop-blur-sm transition-transform hover:scale-[1.02]">
                <dt className="text-[10px] uppercase font-mono tracking-widest text-slate-500 dark:text-slate-400 mb-1">Execution Window</dt>
                <dd className="font-bold text-slate-900 dark:text-slate-100">
                  {scheduledStart && scheduledEnd ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-emerald-600 dark:text-emerald-400">{new Date(scheduledStart).toLocaleString()}</span>
                      <span className="text-rose-600 dark:text-rose-400">{new Date(scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ) : (
                    <span className="text-amber-500 opacity-80">Awaiting constraints...</span>
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-6 rounded-2xl border border-cyan-200/80 bg-cyan-50/90 p-5 dark:border-cyan-500/40 dark:bg-cyan-900/40 backdrop-blur-md relative z-10">
              <div className="flex items-center justify-between font-mono">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-800 dark:text-cyan-200">
                  <DollarSign className="h-4 w-4" /> Est. Yield
                </span>
                <span className="text-2xl font-display font-black tracking-tight text-cyan-700 dark:text-cyan-400">${totalEstimatedPrice.toFixed(2)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-widest font-bold text-cyan-600/70 dark:text-cyan-300/70">
                <span>{selectedServiceItems.length} vectors</span>
                <span>{formatDuration(totalEstimatedDuration)} block</span>
              </div>
            </div>
          </motion.section>
        </aside>
      </div>
    </form>
  )
}
