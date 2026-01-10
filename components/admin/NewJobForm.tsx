'use client'

import { Customer, Service } from '@/lib/types'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Save, Loader2, User, Calendar, Clock, FileText, AlertCircle, Briefcase, DollarSign, ChevronDown, X, Check } from 'lucide-react'
import { FormAlert } from '@/components/shared'

interface Technician {
  id: string
  full_name: string
  email: string
}

// Custom Select Component with Solid Background
function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  required = false,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string; subtitle?: string }[]
  placeholder: string
  required?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-white dark:bg-surface-900 text-ink dark:text-surface-50 rounded-lg border border-surface-300 dark:border-surface-600 hover:border-primary dark:hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-left flex items-center justify-between font-medium shadow-sm"
      >
        <span className={selectedOption ? 'text-ink dark:text-surface-50' : 'text-muted'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-[101] mt-2 w-full bg-white dark:bg-surface-900 rounded-lg border border-surface-300 dark:border-surface-600 shadow-2xl max-h-64 overflow-auto">
            {!required && (
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setIsOpen(false)
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-muted border-b border-surface-200 dark:border-surface-700"
              >
                {placeholder}
              </button>
            )}
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={`w-full px-4 py-2.5 text-left transition-all duration-150 border-b border-surface-100 dark:border-surface-700 last:border-b-0 ${
                  value === option.value
                    ? 'bg-primary/10 dark:bg-primary/15 text-primary dark:text-primary-light font-semibold'
                    : 'text-ink dark:text-surface-50 hover:bg-surface-100 dark:hover:bg-surface-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className={value === option.value ? 'text-primary dark:text-primary-light font-semibold' : 'text-ink dark:text-surface-50 font-medium'}>
                      {option.label}
                    </div>
                    {option.subtitle && (
                      <div className={`text-xs mt-0.5 ${value === option.value ? 'text-primary/70 dark:text-primary-light/70' : 'text-muted'}`}>
                        {option.subtitle}
                      </div>
                    )}
                  </div>
                  {value === option.value && (
                    <Check className="w-4 h-4 text-primary dark:text-primary-light ml-2 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
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
}: {
  businessId: string
  customers: Customer[]
  technicians: Technician[]
  services: Service[]
}) {
  const [customerId, setCustomerId] = useState('')
  const [technicianId, setTechnicianId] = useState('')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [scheduledStart, setScheduledStart] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!customerId || !scheduledStart || !scheduledEnd) {
        throw new Error('Please fill in all required fields')
      }

      // Create the job
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
          urgency: urgency,
          source: 'admin_portal',
        })
        .select()
        .single()

      if (jobError) throw jobError

      // Link selected services to the job
      if (selectedServices.length > 0) {
        const jobServices = selectedServices.map(serviceId => ({
          job_id: job.id,
          service_id: serviceId,
        }))

        const { error: servicesError } = await supabase
          .from('job_services')
          .insert(jobServices)

        if (servicesError) throw servicesError
      }

      router.push('/admin/jobs')
      router.refresh()
    } catch (err: any) {
      console.error('Error creating job:', err)
      setError(err.message || 'Failed to create job')
    } finally {
      setLoading(false)
    }
  }

  const calculateDuration = () => {
    if (!scheduledStart || !scheduledEnd) return null
    const start = new Date(scheduledStart)
    const end = new Date(scheduledEnd)
    const diffMs = end.getTime() - start.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 60) return `${diffMins} minutes`
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const totalEstimatedPrice = selectedServices.reduce((total, serviceId) => {
    const service = services.find(s => s.id === serviceId)
    return total + (service?.base_price || 0)
  }, 0)

  const customerOptions = customers.map(c => ({
    value: c.id,
    label: c.name,
    subtitle: c.phone,
  }))

  const technicianOptions = technicians.map(t => ({
    value: t.id,
    label: t.full_name,
    subtitle: t.email,
  }))

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer & Technician */}
      <div className="glass-card">
        <div className="flex items-center gap-2 mb-5">
          <User className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-ink">Customer & Assignment</h2>
        </div>

        <div className="space-y-4">
          {/* Customer Selection */}
          <div>
            <label className="label">
              Customer <span className="text-danger ml-1">*</span>
            </label>
            <CustomSelect
              value={customerId}
              onChange={setCustomerId}
              options={customerOptions}
              placeholder="Select a customer..."
              required={true}
            />
          </div>

          {/* Technician Selection */}
          <div>
            <label className="label">
              Assign Technician
            </label>
            <CustomSelect
              value={technicianId}
              onChange={setTechnicianId}
              options={technicianOptions}
              placeholder="Unassigned - will be assigned later"
              required={false}
            />
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="glass-card">
        <div className="flex items-center gap-2 mb-5">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-ink">Schedule</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Scheduled Start */}
          <div>
            <label className="label">
              Start Time <span className="text-danger ml-1">*</span>
            </label>
            <input
              type="datetime-local"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
              className="input-premium"
              required
            />
          </div>

          {/* Scheduled End */}
          <div>
            <label className="label">
              End Time <span className="text-danger ml-1">*</span>
            </label>
            <input
              type="datetime-local"
              value={scheduledEnd}
              onChange={(e) => setScheduledEnd(e.target.value)}
              className="input-premium"
              required
            />
          </div>
        </div>

        {calculateDuration() && (
          <div className="mt-4 px-4 py-2.5 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-ink font-medium">
                Duration: {calculateDuration()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Job Details */}
      <div className="glass-card">
        <div className="flex items-center gap-2 mb-5">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-ink">Job Details</h2>
        </div>

        <div className="space-y-4">
          {/* Description */}
          <div>
            <label className="label">
              Job Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-premium min-h-[100px] resize-none"
              placeholder="Describe the work to be done..."
            />
          </div>

          {/* Urgency */}
          <div>
            <label className="label">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Priority Level
              </div>
            </label>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {(['low', 'medium', 'high'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setUrgency(level)}
                  className={`px-4 py-2.5 rounded-lg border transition-all duration-200 font-medium text-sm capitalize ${
                    urgency === level
                      ? level === 'low'
                        ? 'bg-success/10 dark:bg-success/20 text-success border-success/30 ring-2 ring-success/20'
                        : level === 'medium'
                        ? 'bg-warning/10 dark:bg-warning/20 text-warning border-warning/30 ring-2 ring-warning/20'
                        : 'bg-danger/10 dark:bg-danger/20 text-danger border-danger/30 ring-2 ring-danger/20'
                      : 'bg-surface-100 dark:bg-surface-700 text-muted border-surface-300 dark:border-surface-600 hover:border-surface-400 dark:hover:border-surface-500'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Services Selection */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-ink">Services</h2>
          </div>
          {totalEstimatedPrice > 0 && (
            <div className="px-3 py-1.5 bg-success/10 dark:bg-success/20 border border-success/30 rounded-lg">
              <div className="flex items-center gap-1 text-success font-semibold text-sm">
                <DollarSign className="w-4 h-4" />
                <span>{totalEstimatedPrice.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {services.length === 0 ? (
          <div className="text-center py-8 text-muted">
            <Briefcase className="w-10 h-10 text-muted mx-auto mb-2 opacity-50" />
            <p className="font-medium">No services available</p>
            <p className="text-sm mt-1">Add services in the Services Management page first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {services.map(service => (
              <label
                key={service.id}
                className={`flex items-start p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                  selectedServices.includes(service.id)
                    ? 'bg-primary/5 dark:bg-primary/10 border-primary/30 ring-2 ring-primary/20 shadow-md shadow-primary/10'
                    : 'bg-surface-50/50 dark:bg-surface-800/50 border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedServices.includes(service.id)}
                  onChange={() => handleServiceToggle(service.id)}
                  className="mt-1 mr-3 w-4 h-4 rounded accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <div className={`font-medium mb-1 ${selectedServices.includes(service.id) ? 'text-primary' : 'text-ink'}`}>
                    {service.name}
                  </div>
                  {service.description && (
                    <div className="text-sm text-muted mb-2 line-clamp-2">
                      {service.description}
                    </div>
                  )}
                  <div className="flex gap-3 text-sm text-muted">
                    {service.base_price && (
                      <span className="font-medium">${service.base_price.toFixed(2)}</span>
                    )}
                    {service.duration_minutes && (
                      <span>
                        {service.duration_minutes < 60
                          ? `${service.duration_minutes}m`
                          : `${Math.floor(service.duration_minutes / 60)}h`}
                      </span>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <FormAlert type="danger" message={error} onClose={() => setError(null)} />
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="glass-btn-primary flex items-center"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Job...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Create Job
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="glass-btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
