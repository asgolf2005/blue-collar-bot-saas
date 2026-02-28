'use client'

import { JobWithDetails, User } from '@/lib/types'
import { format, parseISO, isPast } from 'date-fns'
import {
  ArrowLeft, Phone, MapPin, Calendar, Clock, Image as ImageIcon,
  MessageSquare, Send, FileText, Plus, User as UserIcon,
  AlertCircle, CheckCircle, Truck, Play, Circle, XCircle,
  ExternalLink, MessageCircle, Receipt, ChevronRight, Briefcase, Trash2
} from '@/components/ui/lucide'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import JobNotes from '@/components/tech/JobNotes'
import { showToast } from '@/lib/utils/toast'
import SMSHistory from '@/components/admin/SMSHistory'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'

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
type EditableUrgency = '' | 'low' | 'medium' | 'high' | 'emergency'

function toEditableUrgency(value?: string | null): EditableUrgency {
  if (value === 'low' || value === 'medium' || value === 'high' || value === 'emergency') {
    return value
  }
  return ''
}

function toLocalDateTimeInputValue(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

function safeFormatDate(value: string | Date | null | undefined, pattern: string, fallback = '--') {
  if (!value) return fallback
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return format(date, pattern)
}

// ========================================
// SUB-COMPONENTS
// ========================================

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled

  return (
    <div
      data-test="assigned-badge"
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${config.bg} ${config.border} border`}
    >
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
  action,
  dataTest,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  title?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  dataTest?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`relative group rounded-[2rem] border border-white/5 bg-white/5 p-1 shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-cyan-500/10 hover:border-white/10 ${className}`}
      data-test={dataTest}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="relative z-10 bg-slate-900/40 rounded-[1.75rem] h-full overflow-hidden">
        {(title || icon) && (
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5">
            <div className="flex items-center gap-3">
              {icon && <div className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">{icon}</div>}
              <h3 className="font-display font-bold tracking-widest text-white uppercase text-sm drop-shadow-sm">{title}</h3>
            </div>
            {action}
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </motion.div>
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
import { motion, AnimatePresence } from 'framer-motion'

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
  const [description, setDescription] = useState(job.description || '')
  const [urgency, setUrgency] = useState<EditableUrgency>(toEditableUrgency(job.urgency))
  const [invoice, setInvoice] = useState<any>(null)
  const [loadingInvoice, setLoadingInvoice] = useState(true)
  const [noteActivity, setNoteActivity] = useState<Array<{
    id: string
    content: string
    created_at: string
    user?: { full_name?: string | null } | null
  }>>([])
  const deleteHoldIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const deleteHoldStartedAtRef = useRef<number | null>(null)
  const deleteTriggeredRef = useRef(false)

  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled
  const currentStartDate = scheduledStart ? new Date(scheduledStart) : parseISO(job.scheduled_start)
  const isOverdue =
    !Number.isNaN(currentStartDate.getTime()) &&
    isPast(currentStartDate) &&
    status === 'scheduled'
  const urgencyConfig = urgency ? URGENCY_CONFIG[urgency] : null
  const hasChanges =
    status !== job.status ||
    technicianId !== (job.technician_id || '') ||
    scheduledStart !== toLocalDateTimeInputValue(job.scheduled_start) ||
    scheduledEnd !== toLocalDateTimeInputValue(job.scheduled_end) ||
    description !== (job.description || '') ||
    urgency !== toEditableUrgency(job.urgency)

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
    const fetchNotes = async () => {
      try {
        const response = await fetch(`/api/jobs/${job.id}/notes`, { credentials: 'include' })
        if (!response.ok) return
        const payload = (await response.json()) as {
          notes?: Array<{
            id: string
            content: string
            created_at: string
            user?: { full_name?: string | null } | null
          }>
        }
        setNoteActivity(payload.notes?.slice(0, 6) || [])
      } catch {
        setNoteActivity([])
      }
    }
    void fetchNotes()
  }, [job.id])

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
          description,
          urgency: urgency || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update job')
      }

      showToast.success('Job updated successfully')
      router.refresh()
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

  const createdByLabel = job.source === 'ai_caller' ? 'AI Receptionist' : 'Admin Portal'
  const lastModifiedByLabel = noteActivity[0]?.user?.full_name || 'Admin Update'
  const lastModifiedAt = noteActivity[0]?.created_at || job.updated_at

  const auditEvents = useMemo(() => {
    const events: Array<{
      id: string
      label: string
      detail: string
      timestamp: string
    }> = [
        {
          id: 'created',
          label: 'Job created',
          detail: `Created by ${createdByLabel}`,
          timestamp: job.created_at,
        },
        {
          id: 'status',
          label: 'Status updated',
          detail: `Current status: ${status.replace(/_/g, ' ')}`,
          timestamp: job.updated_at,
        },
      ]

    const assignedTech = technicians.find((tech) => tech.id === (technicianId || job.technician_id))
    if (assignedTech) {
      events.push({
        id: 'assignment',
        label: 'Technician assignment',
        detail: `Assigned to ${assignedTech.full_name}`,
        timestamp: job.updated_at,
      })
    }

    noteActivity.forEach((note) => {
      events.push({
        id: `note-${note.id}`,
        label: 'Note added',
        detail: `${note.user?.full_name || 'Team'}: ${note.content}`,
        timestamp: note.created_at,
      })
    })

    return events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8)
  }, [createdByLabel, job.created_at, job.technician_id, job.updated_at, noteActivity, status, technicianId, technicians])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 relative rounded-[2.5rem] bg-[#0f172a]/60 backdrop-blur-3xl border border-white/10 p-4 sm:p-8"
    >
      {/* 2026 Global Spatial Orbs specific to this section */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />

      {/* Back Link & Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/admin/jobs"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium font-mono uppercase tracking-widest">Back to Hub</span>
        </Link>

        <div className="flex items-center gap-3">
          {isOverdue && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 animate-pulse" />
              <span className="text-sm font-medium text-rose-300 tracking-wider">CRITICAL DELAY</span>
            </motion.div>
          )}
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 relative z-10">
        {/* LEFT COLUMN - Main Info */}
        <div className="xl:col-span-2 space-y-6">
          {/* Customer Info Card */}
          <Card title="Customer Details" icon={<UserIcon className="w-5 h-5" />} delay={0.1}>
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
          < Card title="Schedule" icon={< Calendar className="w-5 h-5" />} delay={0.2} >
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
            {
              duration && (
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span>Estimated duration: <strong className="text-slate-700 dark:text-slate-300">{duration} hours</strong></span>
                </div>
              )
            }
            <p className="mt-3 text-xs text-slate-400">Times are saved in your local timezone</p>
          </Card >

          {/* Description Card */}
          < Card title="Job Description" icon={< Briefcase className="w-5 h-5" />} delay={0.3} >
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                  Description
                </label>
                <textarea
                  id="description"
                  data-test="description-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all resize-y"
                  placeholder="Describe the job scope, issues, and customer requests..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                    Urgency
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as EditableUrgency)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all appearance-none cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                  >
                    <option value="">Not set</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div className="flex items-end">
                  {urgencyConfig ? (
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${urgencyConfig.color}`}>
                      <AlertCircle className="w-3.5 h-3.5" />
                      {urgencyConfig.label}
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-300 dark:bg-slate-800/60 dark:border-slate-700">
                      <AlertCircle className="w-3.5 h-3.5" />
                      No priority set
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card >

          {/* Photos */}
          {
            job.media && job.media.length > 0 && (
              <Card title="Photos" icon={<ImageIcon className="w-5 h-5" />} delay={0.4}>
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
            )
          }

          {/* Notes */}
          <Card title="Notes & Activity" icon={<MessageSquare className="w-5 h-5" />} delay={0.5}>
            <ErrorBoundary
              fallback={
                <div className="rounded-xl border border-amber-300/50 bg-amber-50/70 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                  Notes module failed to load for this job. Refresh the page to retry.
                </div>
              }
            >
              <JobNotes jobId={job.id} embedded />
            </ErrorBoundary>
          </Card>

          {/* SMS History */}
          <Card title="SMS History" icon={<MessageSquare className="w-5 h-5" />} delay={0.6}>
            <ErrorBoundary
              fallback={
                <div className="rounded-xl border border-amber-300/50 bg-amber-50/70 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                  SMS history failed to load for this job. Refresh the page to retry.
                </div>
              }
            >
              <SMSHistory jobId={job.id} />
            </ErrorBoundary>
          </Card>
        </div >

        {/* RIGHT COLUMN - Actions */}
        < div className="space-y-6" >
          <Card title="Audit Trail" icon={<FileText className="w-5 h-5" />}>
            <div className="space-y-4">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Created by</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{createdByLabel}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{safeFormatDate(job.created_at, 'MMM d, yyyy h:mm a')}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Last modified by</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{lastModifiedByLabel}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{safeFormatDate(lastModifiedAt, 'MMM d, yyyy h:mm a')}</p>
              </div>
              <div className="rounded-md border border-slate-200 dark:border-slate-700">
                <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-700">
                  <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Activity log</p>
                </div>
                <div className="max-h-56 space-y-2 overflow-y-auto p-3">
                  {auditEvents.map((event) => (
                    <div key={event.id} className="rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/60">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">{event.label}</p>
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{event.detail}</p>
                      <p className="mt-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        {safeFormatDate(event.timestamp, 'MMM d, h:mm a')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Manage Job */}
          <Card title="Manage Job" icon={<CheckCircle className="w-5 h-5" />}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">Status</label>
                <select
                  data-test="status-dropdown"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                >
                  <option value="scheduled" data-test="status-scheduled">Scheduled</option>
                  <option value="on_the_way" data-test="status-on-the-way">On the Way</option>
                  <option value="arrived" data-test="status-arrived">Arrived</option>
                  <option value="in_progress" data-test="status-in-progress">In Progress</option>
                  <option value="completed" data-test="status-completed">Completed</option>
                  <option value="cancelled" data-test="status-cancelled">Cancelled</option>
                </select>
                {STATUS_CONFIG[status] && (
                  <p className="mt-2 text-xs text-slate-500">{STATUS_CONFIG[status].description}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                  Assign Technician
                </label>
                <div data-test="tech-list">
                  <select
                    data-test="tech-select"
                    value={technicianId}
                    onChange={(e) => setTechnicianId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all appearance-none cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                  >
                    <option value="" data-test="tech-item">Unassigned</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id} data-test="tech-item">
                        {tech.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                data-test="assign-tech"
                onClick={handleUpdateJob}
                disabled={saving || !hasChanges}
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
                    {hasChanges ? 'Save Changes' : 'No Changes'}
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
          <Card title="Invoice" icon={<Receipt className="w-5 h-5" />} dataTest="invoice-form">
            {loadingInvoice ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : invoice ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Invoice #{invoice.invoice_number || invoice.id.slice(0, 8).toUpperCase()}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
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
                    data-test="create-invoice"
                    aria-label="Create Invoice"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition-all hover:shadow-lg"
                  >
                    <Plus className="w-4 h-4" />
                    Create Invoice
                  </Link>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      data-test="create-invoice"
                      disabled
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-300 text-white font-medium cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      Create Invoice
                    </button>
                    <p className="text-xs text-slate-400 px-4">
                      Job must be at least &quot;Arrived&quot; status to create an invoice
                    </p>
                  </div>
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

                <button type="button"
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
    </motion.div>
  )
}

