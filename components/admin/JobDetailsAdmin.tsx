'use client'

import { JobWithDetails, User } from '@/lib/types'
import { format, parseISO, isPast } from 'date-fns'
import { 
  ArrowLeft, Phone, MapPin, Calendar, Clock, Image as ImageIcon, 
  MessageSquare, Send, FileText, Plus, User as UserIcon, 
  AlertCircle, CheckCircle, Truck, Play, Circle, XCircle,
  ExternalLink, MessageCircle, Receipt, ChevronRight, Briefcase, Trash2
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import JobNotes from '@/components/tech/JobNotes'
import { showToast } from '@/lib/utils/toast'
import SMSHistory from '@/components/admin/SMSHistory'

// ========================================
// DESIGN SYSTEM - Minimalist Industrial
// ========================================

const STATUS_CONFIG: Record<string, {
  label: string
  color: string
  bg: string
  border: string
  icon: React.ReactNode
  description: string
}> = {
  scheduled: {
    label: 'Scheduled',
    color: 'text-slate-700 dark:text-slate-300',
    bg: 'bg-slate-100 dark:bg-slate-800',
    border: 'border-slate-300 dark:border-slate-600',
    icon: <Calendar className="w-4 h-4" />,
    description: 'Job is scheduled and waiting'
  },
  on_the_way: {
    label: 'On the Way',
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-300 dark:border-amber-700',
    icon: <Truck className="w-4 h-4" />,
    description: 'Technician is en route'
  },
  arrived: {
    label: 'Arrived',
    color: 'text-orange-700 dark:text-orange-300',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-300 dark:border-orange-700',
    icon: <MapPin className="w-4 h-4" />,
    description: 'Technician has arrived at location'
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-300 dark:border-blue-700',
    icon: <Play className="w-4 h-4" />,
    description: 'Work is currently being performed'
  },
  completed: {
    label: 'Completed',
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-300 dark:border-emerald-700',
    icon: <CheckCircle className="w-4 h-4" />,
    description: 'Job has been completed'
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    border: 'border-rose-300 dark:border-rose-700',
    icon: <XCircle className="w-4 h-4" />,
    description: 'Job was cancelled'
  },
}

const URGENCY_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: 'text-emerald-600 bg-emerald-50 border-emerald-200', label: 'Low Priority' },
  medium: { color: 'text-amber-600 bg-amber-50 border-amber-200', label: 'Medium Priority' },
  high: { color: 'text-orange-600 bg-orange-50 border-orange-200', label: 'High Priority' },
  emergency: { color: 'text-rose-600 bg-rose-50 border-rose-200', label: 'Emergency' },
}

const DELETE_HOLD_MS = 1200

function toLocalDateTimeInputValue(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

// ========================================
// SUB-COMPONENTS
// ========================================

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled
  
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${config.bg} ${config.border} border`}>
      <span className={config.color}>{config.icon}</span>
      <span className={`font-medium text-sm ${config.color}`}>{config.label}</span>
    </div>
  )
}

function Card({ 
  children, 
  className = '',
  title,
  icon,
  action
}: { 
  children: React.ReactNode
  className?: string
  title?: string
  icon?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden ${className}`}>
      {(title || icon) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {icon && <div className="text-slate-400">{icon}</div>}
            <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
          </div>
          {action}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}

function InfoItem({ 
  label, 
  value, 
  icon,
  href
}: { 
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
  href?: string
}) {
  const content = (
    <div className="group">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
        {icon && <span className="text-slate-400 group-hover:text-cyan-500 transition-colors">{icon}</span>}
        <span className="font-medium">{value}</span>
        {href && <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-cyan-500 transition-colors" />}
      </div>
    </div>
  )
  
  if (href) {
    return <Link href={href} className="block hover:bg-slate-50 dark:hover:bg-slate-800/50 -mx-2 px-2 py-2 rounded-xl transition-colors">{content}</Link>
  }
  
  return content
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function JobDetailsAdmin({
  job,
  technicians
}: {
  job: JobWithDetails
  technicians: User[]
}) {
  const router = useRouter()
  const [status, setStatus] = useState(job.status)
  const [technicianId, setTechnicianId] = useState(job.technician_id || '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteHoldProgress, setDeleteHoldProgress] = useState(0)
  const [sendingSMS, setSendingSMS] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('jobScheduled')
  const [scheduledStart, setScheduledStart] = useState(
    toLocalDateTimeInputValue(job.scheduled_start)
  )
  const [scheduledEnd, setScheduledEnd] = useState(
    toLocalDateTimeInputValue(job.scheduled_end)
  )
  const [invoice, setInvoice] = useState<any>(null)
  const [loadingInvoice, setLoadingInvoice] = useState(true)
  const deleteHoldIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const deleteHoldStartedAtRef = useRef<number | null>(null)
  const deleteTriggeredRef = useRef(false)
  
  const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.scheduled
  const isOverdue = job.scheduled_start && isPast(parseISO(job.scheduled_start)) && job.status === 'scheduled'

  const stopDeleteHold = (resetProgress = true) => {
    if (deleteHoldIntervalRef.current) {
      clearInterval(deleteHoldIntervalRef.current)
      deleteHoldIntervalRef.current = null
    }
    deleteHoldStartedAtRef.current = null
    if (resetProgress) {
      setDeleteHoldProgress(0)
    }
  }

  const beginDeleteHold = () => {
    if (deleting || saving || deleteTriggeredRef.current) return
    stopDeleteHold(false)
    deleteTriggeredRef.current = false
    deleteHoldStartedAtRef.current = Date.now()
    setDeleteHoldProgress(0)

    deleteHoldIntervalRef.current = setInterval(() => {
      if (!deleteHoldStartedAtRef.current) return
      const elapsed = Date.now() - deleteHoldStartedAtRef.current
      const nextProgress = Math.min(100, (elapsed / DELETE_HOLD_MS) * 100)
      setDeleteHoldProgress(nextProgress)

      if (elapsed >= DELETE_HOLD_MS && !deleteTriggeredRef.current) {
        deleteTriggeredRef.current = true
        stopDeleteHold(false)
        setDeleteHoldProgress(100)
        void handleDeleteJob()
      }
    }, 16)
  }

  const cancelDeleteHold = () => {
    if (deleting) return
    if (deleteTriggeredRef.current) return
    stopDeleteHold(true)
  }

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await fetch(`/api/invoices/by-job/${job.id}`)
        if (response.ok) {
          const data = await response.json()
          setInvoice(data.invoice)
        }
      } catch (error) {
        console.error('Failed to fetch invoice:', error)
      } finally {
        setLoadingInvoice(false)
      }
    }
    fetchInvoice()
  }, [job.id])

  useEffect(() => {
    return () => {
      stopDeleteHold(false)
    }
  }, [])

  const handleUpdateJob = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/jobs/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          jobId: job.id,
          status,
          technicianId: technicianId || null,
          scheduledStart: scheduledStart ? new Date(scheduledStart).toISOString() : undefined,
          scheduledEnd: scheduledEnd ? new Date(scheduledEnd).toISOString() : undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update job')
      }

      showToast.success('Job updated successfully')
      window.location.reload()
    } catch (error: any) {
      showToast.error('Failed to update job: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteJob = async () => {
    if (deleting) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete job')
      }

      showToast.success('Job deleted')
      router.push('/admin/jobs?view=all')
      router.refresh()
    } catch (error: any) {
      showToast.error('Failed to delete job: ' + error.message)
      deleteTriggeredRef.current = false
      setDeleteHoldProgress(0)
      setDeleting(false)
    }
  }

  const handleSendSMS = async () => {
    if (!job.customer?.phone) {
      showToast.error('Customer has no phone number')
      return
    }

    setSendingSMS(true)
    try {
      const technician = technicians.find(t => t.id === (technicianId || job.technician_id))

      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: job.customer.phone,
          templateName: selectedTemplate,
          data: {
            customerName: job.customer.name,
            technicianName: technician?.full_name,
            jobDescription: job.description,
            scheduledTime: job.scheduled_start,
            total: job.total_cost,
          },
          jobId: job.id,
          customerId: job.customer.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send SMS')
      }

      showToast.success('SMS sent successfully!')
    } catch (error: any) {
      showToast.error(error.message || 'Failed to send SMS')
    } finally {
      setSendingSMS(false)
    }
  }

  // Calculate duration
  const duration = job.scheduled_start && job.scheduled_end
    ? Math.round((new Date(job.scheduled_end).getTime() - new Date(job.scheduled_start).getTime()) / (1000 * 60 * 60) * 10) / 10
    : null

  return (
    <div className="space-y-6">
      {/* Back Link & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link 
          href="/admin/jobs" 
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Jobs</span>
        </Link>
        
        <div className="flex items-center gap-3">
          {isOverdue && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span className="text-sm font-medium text-rose-700 dark:text-rose-300">Overdue</span>
            </div>
          )}
          <StatusBadge status={job.status} />
        </div>
      </div>

      {/* Job Title */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${statusConfig.bg} ${statusConfig.border} border`}>
            <Briefcase className={`w-6 h-6 ${statusConfig.color}`} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{job.customer?.name}</h1>
            <p className="text-slate-500 dark:text-slate-400">Job #{job.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT COLUMN - Main Info */}
        <div className="xl:col-span-2 space-y-6">
          {/* Customer Info Card */}
          <Card title="Customer Details" icon={<UserIcon className="w-5 h-5" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <InfoItem 
                label="Customer"
                value={job.customer?.name}
                icon={<UserIcon className="w-4 h-4" />}
                href={`/admin/customers/${job.customer?.id}`}
              />
              <InfoItem 
                label="Phone"
                value={job.customer?.phone || 'No phone'}
                icon={<Phone className="w-4 h-4" />}
              />
              {job.customer?.address && (
                <InfoItem 
                  label="Address"
                  value={job.customer.address}
                  icon={<MapPin className="w-4 h-4" />}
                />
              )}
              <InfoItem 
                label="Job Source"
                value={job.source === 'ai_caller' ? 'AI Caller' : 'Manual Entry'}
                icon={<Circle className="w-4 h-4" />}
              />
            </div>
          </Card>

          {/* Schedule Card */}
          <Card title="Schedule" icon={<Calendar className="w-5 h-5" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">Start Time</label>
                <input
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">End Time</label>
                <input
                  type="datetime-local"
                  value={scheduledEnd}
                  onChange={(e) => setScheduledEnd(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                />
              </div>
            </div>
            {duration && (
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <Clock className="w-4 h-4" />
                <span>Estimated duration: <strong className="text-slate-700 dark:text-slate-300">{duration} hours</strong></span>
              </div>
            )}
            <p className="mt-3 text-xs text-slate-400">Times are saved in your local timezone</p>
          </Card>

          {/* Description Card */}
          <Card title="Job Description" icon={<Briefcase className="w-5 h-5" />}>
            {job.description ? (
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{job.description}</p>
            ) : (
              <p className="text-slate-400 italic">No description provided</p>
            )}
            
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${
                URGENCY_CONFIG[job.urgency || 'low']?.color || URGENCY_CONFIG.low.color
              }`}>
                <AlertCircle className="w-3.5 h-3.5" />
                {URGENCY_CONFIG[job.urgency || 'low']?.label || 'Normal Priority'}
              </div>
            </div>
          </Card>

          {/* Photos */}
          {job.media && job.media.length > 0 && (
            <Card title="Photos" icon={<ImageIcon className="w-5 h-5" />}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {job.media.map((media) => (
                  <a
                    key={media.id}
                    href={media.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 hover:ring-2 ring-cyan-500 transition-all group"
                  >
                    <Image
                      src={media.file_url}
                      alt="Job photo"
                      width={320}
                      height={320}
                      unoptimized
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </a>
                ))}
              </div>
            </Card>
          )}

          {/* Notes */}
          <Card title="Notes & Activity" icon={<MessageSquare className="w-5 h-5" />}>
            <JobNotes jobId={job.id} embedded />
          </Card>

          {/* SMS History */}
          <Card title="SMS History" icon={<MessageSquare className="w-5 h-5" />}>
            <SMSHistory jobId={job.id} />
          </Card>
        </div>

        {/* RIGHT COLUMN - Actions */}
        <div className="space-y-6">
          {/* Manage Job */}
          <Card title="Manage Job" icon={<CheckCircle className="w-5 h-5" />}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="on_the_way">On the Way</option>
                  <option value="arrived">Arrived</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {STATUS_CONFIG[status] && (
                  <p className="mt-2 text-xs text-slate-500">{STATUS_CONFIG[status].description}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">Assign Technician</label>
                <select
                  value={technicianId}
                  onChange={(e) => setTechnicianId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                >
                  <option value="">Unassigned</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleUpdateJob}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white font-medium transition-all hover:shadow-lg active:scale-[0.98]"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={deleting || saving}
                onPointerDown={beginDeleteHold}
                onPointerUp={cancelDeleteHold}
                onPointerLeave={cancelDeleteHold}
                onPointerCancel={cancelDeleteHold}
                onKeyDown={(event) => {
                  if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
                    event.preventDefault()
                    beginDeleteHold()
                  }
                }}
                onKeyUp={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    cancelDeleteHold()
                  }
                }}
                className="relative w-full overflow-hidden flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-medium transition-all disabled:opacity-50"
              >
                <span
                  className="absolute left-0 top-0 h-full bg-rose-500/25 dark:bg-rose-400/20 transition-[width] duration-75 ease-linear"
                  style={{ width: `${deleteHoldProgress}%` }}
                />
                {deleting ? (
                  <span className="relative z-10 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  <span className="relative z-10 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    {deleteHoldProgress > 0 ? 'Hold to Delete...' : 'Hold to Delete Job'}
                  </span>
                )}
              </button>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Press and hold for 1.2s to delete this job instantly.
              </p>
            </div>
          </Card>

          {/* Invoice */}
          <Card title="Invoice" icon={<Receipt className="w-5 h-5" />}>
            {loadingInvoice ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : invoice ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Invoice #{invoice.invoice_number || invoice.id.slice(0, 8).toUpperCase()}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                      invoice.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                      invoice.status === 'overdue' ? 'bg-rose-100 text-rose-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    ${Number(invoice.total).toFixed(2)}
                  </p>
                </div>
                
                <Link
                  href={`/admin/invoices/${invoice.id}`}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Invoice
                </Link>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Receipt className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 mb-4">No invoice created yet</p>
                {['arrived', 'in_progress', 'completed'].includes(job.status) ? (
                  <Link
                    href={`/admin/invoices/new?job=${job.id}`}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition-all hover:shadow-lg"
                  >
                    <Plus className="w-4 h-4" />
                    Create Invoice
                  </Link>
                ) : (
                  <p className="text-xs text-slate-400 px-4">
                    Job must be at least &quot;Arrived&quot; status to create an invoice
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* Send SMS */}
          <Card title="Send SMS" icon={<MessageCircle className="w-5 h-5" />}>
            {job.customer?.phone ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">Message Type</label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all appearance-none cursor-pointer text-sm"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                  >
                    <option value="jobScheduled">Job Scheduled</option>
                    <option value="technicianAssigned">Technician Assigned</option>
                    <option value="onTheWay">On the Way</option>
                    <option value="arrived">Arrived</option>
                    <option value="inProgress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="rescheduled">Rescheduled</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">{job.customer.phone}</span>
                </div>

                <button
                  onClick={handleSendSMS}
                  disabled={sendingSMS}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 font-medium transition-all disabled:opacity-50"
                >
                  {sendingSMS ? (
                    <>
                      <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send SMS
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500">Customer has no phone number</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
