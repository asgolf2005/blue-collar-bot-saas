'use client'

import { JobWithDetails, User } from '@/lib/types'
import { format } from 'date-fns'
import { ArrowLeft, Phone, MapPin, Calendar, Image as ImageIcon, MessageSquare, Send, FileText, Plus } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import JobNotes from '@/components/tech/JobNotes'
import { showToast } from '@/lib/utils/toast'
import SMSHistory from '@/components/admin/SMSHistory'

export default function JobDetailsAdmin({
  job,
  technicians
}: {
  job: JobWithDetails
  technicians: User[]
}) {
  const [status, setStatus] = useState(job.status)
  const [technicianId, setTechnicianId] = useState(job.technician_id || '')
  const [saving, setSaving] = useState(false)
  const [sendingSMS, setSendingSMS] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('jobScheduled')
  const [scheduledStart, setScheduledStart] = useState(
    job.scheduled_start ? job.scheduled_start.slice(0, 16) : ''
  )
  const [scheduledEnd, setScheduledEnd] = useState(
    job.scheduled_end ? job.scheduled_end.slice(0, 16) : ''
  )
  const [invoice, setInvoice] = useState<any>(null)
  const [loadingInvoice, setLoadingInvoice] = useState(true)

  // Fetch invoice for this job
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

      alert('Job updated successfully')
      window.location.reload()
    } catch (error: any) {
      alert('Failed to update job: ' + error.message)
    } finally {
      setSaving(false)
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

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      scheduled: 'badge-scheduled',
      on_the_way: 'badge-on-the-way',
      arrived: 'badge-arrived',
      in_progress: 'badge-in-progress',
      completed: 'badge-completed',
      cancelled: 'badge-cancelled',
    }

    const label = status.replace(/_/g, ' ').toUpperCase()

    return (
      <span className={`badge ${statusMap[status] || 'badge-scheduled'}`}>
        {label}
      </span>
    )
  }

  return (
    <div>
      <Link href="/admin/jobs" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Jobs
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Job Details</h2>

            <div className="space-y-4">
              <div>
                <label className="label">Customer</label>
                <div className="font-medium text-gray-900">{job.customer.name}</div>
                <div className="flex items-center text-sm text-gray-600 mt-1">
                  <Phone className="w-4 h-4 mr-2" />
                  {job.customer.phone}
                </div>
                {job.customer.address && (
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <MapPin className="w-4 h-4 mr-2" />
                    {job.customer.address}
                  </div>
                )}
              </div>

              <div>
                <label className="label">Description</label>
                <p className="text-gray-900">{job.description || 'No description provided'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Scheduled Start</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted" />
                    <input
                      type="datetime-local"
                      value={scheduledStart}
                      onChange={(e) => setScheduledStart(e.target.value)}
                      className="input"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Scheduled End</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted" />
                    <input
                      type="datetime-local"
                      value={scheduledEnd}
                      onChange={(e) => setScheduledEnd(e.target.value)}
                      className="input"
                    />
                  </div>
                  <p className="text-xs text-muted mt-1">Times are saved in your local timezone.</p>
                </div>
              </div>

              <div>
                <label className="label">Urgency</label>
                <p className="text-gray-900">{job.urgency || 'Normal'}</p>
              </div>

              <div>
                <label className="label">Source</label>
                <span className={`badge ${job.source === 'ai_caller' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                  {job.source === 'ai_caller' ? 'AI Caller' : 'Manual'}
                </span>
              </div>
            </div>
          </div>

          {job.media && job.media.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <ImageIcon className="w-5 h-5 mr-2" />
                Photos ({job.media.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {job.media.map((media) => (
                  <a
                    key={media.id}
                    href={media.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square bg-gray-100 rounded-lg overflow-hidden hover:opacity-90 transition"
                  >
                    <img
                      src={media.file_url}
                      alt="Job photo"
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <JobNotes jobId={job.id} />
          </div>

          {/* SMS Notification History */}
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-green-600" />
              SMS Notifications
            </h3>
            <SMSHistory jobId={job.id} />
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Manage Job</h3>

            <div className="space-y-4">
              <div>
                <label className="label">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="input"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="on_the_way">On the Way</option>
                  <option value="arrived">Arrived</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="label">Assign Technician</label>
                <select
                  value={technicianId}
                  onChange={(e) => setTechnicianId(e.target.value)}
                  className="input"
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
                className="btn btn-primary w-full"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Current Status</h3>
            <div className="flex justify-center py-4">
              {getStatusBadge(job.status)}
            </div>
          </div>

          {/* Invoice Section */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-gray-900">Invoice</h3>
            </div>

            {loadingInvoice ? (
              <p className="text-sm text-gray-500">Loading invoice...</p>
            ) : invoice ? (
              <div className="space-y-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Invoice #{invoice.invoice_number || invoice.id.slice(0, 8)}</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                      invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                      invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    ${Number(invoice.total).toFixed(2)}
                  </div>
                </div>
                <Link
                  href={`/admin/invoices/${invoice.id}`}
                  className="btn btn-secondary w-full text-sm"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Invoice
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">No invoice created for this job yet</p>
                {['arrived', 'in_progress', 'completed'].includes(job.status) ? (
                  <Link
                    href={`/admin/invoices/new?job=${job.id}`}
                    className="btn btn-primary w-full text-sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Invoice
                  </Link>
                ) : (
                  <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    Job must be at least "Arrived" status to create an invoice
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Manual SMS Notification */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-bold text-gray-900">Send SMS Update</h3>
            </div>

            {job.customer?.phone ? (
              <div className="space-y-4">
                <div>
                  <label className="label">Message Type</label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="input text-sm"
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

                <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <strong>To:</strong> {job.customer.phone}
                </div>

                <button
                  onClick={handleSendSMS}
                  disabled={sendingSMS}
                  className="btn btn-secondary w-full text-sm"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sendingSMS ? 'Sending...' : 'Send SMS'}
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Customer has no phone number</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
