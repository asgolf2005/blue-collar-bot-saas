'use client'

import { Customer, Service } from '@/lib/types'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
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
} from 'lucide-react'
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
}: {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder: string
  required?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <div className={`relative ${isOpen ? 'z-[120]' : ''}`}>
      <button
        type="button"
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
                  className={`w-full border-b border-border px-4 py-2.5 text-left transition-colors last:border-b-0 ${
                    value === option.value
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <SectionCard
            icon={User}
            title="Customer & Technician"
            subtitle="Pick who this job is for and who should own it."
            className="relative z-30"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                  Customer <span className="text-rose-500">*</span>
                </label>
                <CustomSelect
                  value={customerId}
                  onChange={setCustomerId}
                  options={customerOptions}
                  placeholder="Select customer"
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
          </SectionCard>

          <SectionCard
            icon={Calendar}
            title="Schedule"
            subtitle="Use quick presets or set exact start and end times."
          >
            <div className="mb-3 flex flex-wrap gap-2">
              <Button type="button" variant="glass" size="sm" className="rounded-full text-xs" onClick={() => applyQuickStart('now')}>
                Start now
              </Button>
              <Button type="button" variant="glass" size="sm" className="rounded-full text-xs" onClick={() => applyQuickStart('in_1h')}>
                In 1 hour
              </Button>
              <Button type="button" variant="glass" size="sm" className="rounded-full text-xs" onClick={() => applyQuickStart('tomorrow_9')}>
                Tomorrow 9:00 AM
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
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-primary transition-colors focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:bg-slate-900/90"
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
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-primary transition-colors focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:bg-slate-900/90"
                  required
                />
              </div>
            </div>

            {calculatedDuration !== null && (
              <div
                className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                  calculatedDuration > 0
                    ? 'border-cyan-200 bg-cyan-50/80 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300'
                    : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {calculatedDuration > 0 ? (
                    <span>Planned duration: {formatDuration(calculatedDuration)}</span>
                  ) : (
                    <span>End time must be after start time.</span>
                  )}
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon={Sparkles}
            title="AI Dispatch Co-Pilot"
            subtitle="Recommend the best technician and slot based on availability, workload, and service fit."
          >
            <div className="space-y-3">
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50/80 p-3 text-xs text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300">
                <p>
                  Target duration: <span className="font-semibold">{formatDuration(targetDurationMinutes)}</span>
                </p>
                <p className="mt-1 text-cyan-700/80 dark:text-cyan-200/90">
                  Uses completed-job history, upcoming schedule overlap, and urgency weighting.
                </p>
              </div>

              <Button
                type="button"
                variant="glassPrimary"
                size="sm"
                className="rounded-full text-xs"
                onClick={runDispatchCopilot}
                icon={<Sparkles className="h-3.5 w-3.5" />}
              >
                {dispatchRan ? 'Refresh Recommendations' : 'Recommend Best Tech + Time'}
              </Button>

              {dispatchRan && dispatchSuggestions.length === 0 && (
                <div className="rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                  No open recommendation found in the nearby windows. Try another start time.
                </div>
              )}

              {dispatchSuggestions.length > 0 && (
                <div className="space-y-2">
                  {dispatchSuggestions.map((suggestion, index) => (
                    <div
                      key={suggestion.id}
                      className={`rounded-2xl border p-3 ${
                        index === 0
                          ? 'border-cyan-300 bg-cyan-50/80 dark:border-cyan-500/40 dark:bg-cyan-500/10'
                          : 'border-border bg-bg-secondary/70'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">
                            {suggestion.technicianName}
                            {index === 0 ? ' (Top match)' : ''}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {suggestion.start.toLocaleDateString()} {suggestion.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {suggestion.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="mt-1 text-[11px] text-text-muted">
                            {suggestion.reasons.join(' | ')}
                          </p>
                          <details className="mt-2">
                            <summary className="cursor-pointer text-[11px] font-medium text-cyan-700 dark:text-cyan-300">
                              Why this score
                            </summary>
                            <div className="mt-2 rounded-xl border border-border bg-bg-tertiary/50 px-2.5 py-2">
                              <div className="space-y-1.5">
                                {suggestion.breakdown.map((entry) => (
                                  <div key={entry.label} className="flex items-center justify-between gap-2 text-[10px]">
                                    <span className="text-text-secondary">{entry.label}</span>
                                    <span className={`font-mono ${entry.points >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>
                                      {entry.points >= 0 ? '+' : ''}{Math.round(entry.points)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </details>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-border bg-bg-tertiary/60 px-2 py-0.5 font-mono text-[10px] text-text-secondary">
                            score {Math.round(suggestion.score)}
                          </span>
                          <Button
                            type="button"
                            variant="glass"
                            size="sm"
                            className="rounded-full text-[11px]"
                            onClick={() => {
                              setTechnicianId(suggestion.technicianId)
                              setScheduledStart(toDateTimeInputValue(suggestion.start))
                              setScheduledEnd(toDateTimeInputValue(suggestion.end))
                            }}
                          >
                            Apply
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
            icon={FileText}
            title="Work Details"
            subtitle="Add context your tech will actually use in the field."
          >
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Example: Check condenser unit, verify refrigerant levels, replace capacitor if needed."
              rows={5}
              className="w-full resize-none rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-primary transition-colors placeholder:text-text-muted focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:bg-slate-900/90"
            />
          </SectionCard>

          <SectionCard
            icon={AlertCircle}
            title="Priority"
            subtitle="Set urgency so dispatch and techs can triage quickly."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(['low', 'medium', 'high'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setUrgency(level)}
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold capitalize transition-colors ${
                    urgency === level
                      ? level === 'low'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : level === 'medium'
                        ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300'
                        : 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300'
                      : 'border-border bg-bg-secondary text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            icon={Wrench}
            title="Services"
            subtitle="Select one or more services to prefill scope and estimate."
          >
            {services.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-bg-tertiary/50 px-5 py-8 text-center">
                <Wrench className="mx-auto mb-2 h-8 w-8 text-text-muted" />
                <p className="text-sm font-medium text-text-secondary">No active services found</p>
                <p className="mt-1 text-xs text-text-muted">Add services first, then return here to build richer jobs.</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {services.map((service) => {
                  const checked = selectedServices.includes(service.id)
                  return (
                    <label
                      key={service.id}
                      className={`cursor-pointer rounded-2xl border p-4 transition-colors ${
                        checked
                          ? 'border-cyan-300 bg-cyan-50/80 dark:border-cyan-500/40 dark:bg-cyan-500/10'
                          : 'border-border bg-bg-secondary hover:border-slate-300 dark:hover:border-slate-600'
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
                          <div className="mt-2 flex items-center gap-3 text-xs text-text-secondary">
                            {service.base_price !== null && <span>${service.base_price.toFixed(2)}</span>}
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
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:h-fit">
          <section className="rounded-3xl border border-border bg-bg-secondary/90 p-5 shadow-elevation-2 backdrop-blur">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-cyan-600 dark:text-cyan-300" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Live Summary</h3>
            </div>

            <dl className="space-y-3 text-sm">
              <div className="rounded-xl border border-border bg-bg-tertiary/40 px-3 py-2">
                <dt className="text-xs text-text-muted">Customer</dt>
                <dd className="mt-0.5 font-medium text-text-primary">{selectedCustomer?.name || 'Not selected'}</dd>
              </div>
              <div className="rounded-xl border border-border bg-bg-tertiary/40 px-3 py-2">
                <dt className="text-xs text-text-muted">Technician</dt>
                <dd className="mt-0.5 font-medium text-text-primary">{selectedTechnician?.full_name || 'Unassigned'}</dd>
              </div>
              <div className="rounded-xl border border-border bg-bg-tertiary/40 px-3 py-2">
                <dt className="text-xs text-text-muted">Schedule Window</dt>
                <dd className="mt-0.5 font-medium text-text-primary">
                  {scheduledStart && scheduledEnd
                    ? `${new Date(scheduledStart).toLocaleString()} - ${new Date(scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Not set'}
                </dd>
              </div>
            </dl>

            <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50/80 p-3 dark:border-cyan-500/30 dark:bg-cyan-500/10">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <DollarSign className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                  Est. total
                </span>
                <span className="font-semibold text-cyan-700 dark:text-cyan-300">${totalEstimatedPrice.toFixed(2)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-text-secondary">
                <span>{selectedServiceItems.length} services</span>
                <span>{formatDuration(totalEstimatedDuration)}</span>
              </div>
            </div>
          </section>

          {error && <FormAlert type="danger" message={error} onClose={() => setError(null)} />}

          <section className="rounded-3xl border border-border bg-bg-secondary/90 p-4 shadow-elevation-1 backdrop-blur">
            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                variant="glassPrimary"
                size="lg"
                className="w-full rounded-2xl"
                loading={loading}
                icon={!loading ? <Save className="h-4 w-4" /> : undefined}
              >
                {loading ? 'Creating Job...' : 'Create Job'}
              </Button>
              <Button
                type="button"
                variant="glass"
                size="lg"
                className="w-full rounded-2xl"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </form>
  )
}
