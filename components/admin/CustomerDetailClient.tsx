'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { User, Calendar, FileText, Edit, Mail, Phone, MapPin, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import EditCustomerForm from './EditCustomerForm'
import Link from 'next/link'

interface Job {
  id: string
  status: string
  scheduled_start: string
  scheduled_end: string
  description: string
  total_cost: number | null
  labor_hours: number | null
  labor_rate: number | null
  parts_cost: number | null
  technician?: {
    id: string
    full_name: string
  }
}

interface Invoice {
  id: string
  invoice_number: string | null
  status: string
  total: number
  created_at: string
  due_date: string | null
  issue_date: string | null
}

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address: string
  portal_access: boolean
  notes?: string
}

interface CustomerDetailClientProps {
  customer: Customer
  completedJobs: Job[]
  pendingJobs: Job[]
  invoices: Invoice[]
  businessId: string
}

export default function CustomerDetailClient({
  customer,
  completedJobs,
  pendingJobs,
  invoices,
  businessId,
}: CustomerDetailClientProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'past' | 'upcoming' | 'invoices' | 'edit'>('details')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/10 text-success border-success/20'
      case 'in_progress':
        return 'bg-primary/10 text-primary border-primary/20'
      case 'scheduled':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      case 'arrived':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20'
      case 'on_the_way':
        return 'bg-warning/10 text-warning border-warning/20'
      default:
        return 'bg-muted/10 text-muted border-muted/20'
    }
  }

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-success/10 text-success border-success/20'
      case 'sent':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      case 'overdue':
        return 'bg-red-500/10 text-red-600 border-red-500/20'
      case 'draft':
        return 'bg-muted/10 text-muted border-muted/20'
      default:
        return 'bg-muted/10 text-muted border-muted/20'
    }
  }

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const tabs = [
    { id: 'details' as const, label: 'Details', icon: User },
    { id: 'past' as const, label: `Past (${completedJobs.length})`, icon: CheckCircle },
    { id: 'upcoming' as const, label: `Upcoming (${pendingJobs.length})`, icon: Clock },
    { id: 'invoices' as const, label: `Invoices (${invoices.length})`, icon: FileText },
    { id: 'edit' as const, label: 'Edit', icon: Edit },
  ]

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary text-white'
                  : 'glass-card hover:bg-surface-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="glass-card space-y-6">
          <h2 className="text-xl font-bold text-ink">Customer Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <div className="text-xs text-muted uppercase tracking-wider font-medium">Full Name</div>
                  <div className="text-ink font-medium mt-1">{customer.name}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <div className="text-xs text-muted uppercase tracking-wider font-medium">Phone</div>
                  <a href={`tel:${customer.phone}`} className="text-ink font-medium mt-1 hover:text-primary transition-colors">
                    {customer.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <div className="text-xs text-muted uppercase tracking-wider font-medium">Email</div>
                  <a href={`mailto:${customer.email}`} className="text-ink font-medium mt-1 hover:text-primary transition-colors">
                    {customer.email || 'No email provided'}
                  </a>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <div className="text-xs text-muted uppercase tracking-wider font-medium">Service Address</div>
                  <div className="text-ink font-medium mt-1">{customer.address || 'No address provided'}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <div className="text-xs text-muted uppercase tracking-wider font-medium">Portal Access</div>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${
                      customer.portal_access
                        ? 'bg-success/10 text-success border-success/20'
                        : 'bg-muted/10 text-muted border-muted/20'
                    }`}>
                      {customer.portal_access ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          {customer.notes && (
            <div className="pt-6 border-t border-surface-200">
              <h3 className="text-sm font-semibold text-ink uppercase tracking-wider mb-3">Notes</h3>
              <div className="p-4 rounded-lg bg-surface-50 border border-surface-200">
                <p className="text-ink whitespace-pre-wrap">{customer.notes}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'past' && (
        <div className="glass-card">
          <h2 className="text-xl font-bold text-ink mb-6">Past Appointments</h2>

          {completedJobs.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-muted mx-auto mb-3" />
              <p className="text-muted">No completed appointments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedJobs.map(job => (
                <Link
                  key={job.id}
                  href={`/admin/jobs/${job.id}`}
                  className="block p-4 rounded-lg border border-surface-200 hover:border-primary/30 hover:bg-surface-50 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-ink">{job.description || 'Service Call'}</h3>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor(job.status)}`}>
                          {formatStatus(job.status)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-muted">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(job.scheduled_start), 'MMM d, yyyy')}</span>
                        </div>
                        {job.technician && (
                          <div className="flex items-center gap-1.5">
                            <User className="w-4 h-4" />
                            <span>{job.technician.full_name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {job.total_cost && (
                      <div className="text-right">
                        <div className="text-xs text-muted">Revenue</div>
                        <div className="text-lg font-bold text-success">${Number(job.total_cost).toFixed(2)}</div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'upcoming' && (
        <div className="glass-card">
          <h2 className="text-xl font-bold text-ink mb-6">Upcoming Appointments</h2>

          {pendingJobs.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-muted mx-auto mb-3" />
              <p className="text-muted">No upcoming appointments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingJobs.map(job => (
                <Link
                  key={job.id}
                  href={`/admin/jobs/${job.id}`}
                  className="block p-4 rounded-lg border border-surface-200 hover:border-primary/30 hover:bg-surface-50 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-ink">{job.description || 'Service Call'}</h3>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor(job.status)}`}>
                          {formatStatus(job.status)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-muted">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(job.scheduled_start), 'MMM d, yyyy h:mm a')}</span>
                        </div>
                        {job.technician && (
                          <div className="flex items-center gap-1.5">
                            <User className="w-4 h-4" />
                            <span>{job.technician.full_name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {job.total_cost && (
                      <div className="text-right">
                        <div className="text-xs text-muted">Estimated</div>
                        <div className="text-lg font-bold text-ink">${Number(job.total_cost).toFixed(2)}</div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="glass-card">
          <h2 className="text-xl font-bold text-ink mb-6">Invoice History</h2>

          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted mx-auto mb-3" />
              <p className="text-muted">No invoices yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map(invoice => (
                <Link
                  key={invoice.id}
                  href={`/admin/invoices/${invoice.id}`}
                  className="block p-4 rounded-lg border border-surface-200 hover:border-primary/30 hover:bg-surface-50 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-ink">
                          Invoice #{invoice.invoice_number || invoice.id.slice(0, 8)}
                        </h3>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getInvoiceStatusColor(invoice.status)}`}>
                          {formatStatus(invoice.status)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-muted">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span>Issued: {invoice.issue_date ? format(new Date(invoice.issue_date), 'MMM d, yyyy') : format(new Date(invoice.created_at), 'MMM d, yyyy')}</span>
                        </div>
                        {invoice.due_date && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>Due: {format(new Date(invoice.due_date), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-muted">Amount</div>
                      <div className={`text-lg font-bold ${
                        invoice.status === 'paid' ? 'text-success' :
                        invoice.status === 'overdue' ? 'text-red-600' : 'text-ink'
                      }`}>
                        ${Number(invoice.total).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'edit' && (
        <div className="glass-card">
          <h2 className="text-xl font-bold text-ink mb-6">Edit Customer</h2>
          <EditCustomerForm customer={customer} businessId={businessId} />
        </div>
      )}
    </div>
  )
}
