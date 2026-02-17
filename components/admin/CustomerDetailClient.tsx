'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Calendar, Receipt, Edit, CheckCircle, Clock } from '@/components/ui/icons'
import EditCustomerForm from './EditCustomerForm'
import Link from 'next/link'
import { Customer as BaseCustomer } from '@/lib/types'

interface Customer extends BaseCustomer {
  notes?: string
}

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
        return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300'
      case 'in_progress':
        return 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-300'
      case 'scheduled':
        return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/25 dark:bg-blue-400/10 dark:text-blue-300'
      case 'arrived':
        return 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-300'
      case 'on_the_way':
        return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300'
      default:
        return 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
    }
  }

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300'
      case 'sent':
        return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/25 dark:bg-blue-400/10 dark:text-blue-300'
      case 'overdue':
        return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-300'
      case 'draft':
        return 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
      default:
        return 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
    }
  }

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const safePhone = customer.phone || 'Not provided'
  const safeEmail = customer.email || 'Not provided'
  const safeAddress = customer.address || 'Not provided'

  const tabs = [
    { id: 'details' as const, label: 'Details' },
    { id: 'past' as const, label: `Past (${completedJobs.length})` },
    { id: 'upcoming' as const, label: `Upcoming (${pendingJobs.length})` },
    { id: 'invoices' as const, label: `Invoices (${invoices.length})` },
    { id: 'edit' as const, label: 'Edit' },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex gap-2 overflow-x-auto">
        {tabs.map(tab => {
          return (
            <button type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white dark:bg-cyan-500 dark:text-slate-950'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
        </div>
      </div>

      {activeTab === 'details' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <h2 className="font-display text-2xl tracking-wide text-slate-900 dark:text-white">Customer Information</h2>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Full Name</p>
              <p className="mt-1 font-mono text-sm text-slate-900 dark:text-slate-100">{customer.name}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Portal Access</p>
              <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${
                customer.portal_access
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300'
                  : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}>
                {customer.portal_access ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Phone</p>
              {customer.phone ? (
                <a href={`tel:${customer.phone}`} className="mt-1 block font-mono text-sm text-slate-900 hover:text-blue-600 dark:text-slate-100 dark:hover:text-cyan-300">
                  {safePhone}
                </a>
              ) : (
                <p className="mt-1 font-mono text-sm text-slate-500 dark:text-slate-400">{safePhone}</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Email</p>
              {customer.email ? (
                <a href={`mailto:${customer.email}`} className="mt-1 block truncate font-mono text-sm text-slate-900 hover:text-blue-600 dark:text-slate-100 dark:hover:text-cyan-300">
                  {safeEmail}
                </a>
              ) : (
                <p className="mt-1 font-mono text-sm text-slate-500 dark:text-slate-400">{safeEmail}</p>
              )}
            </div>

            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Service Address</p>
              <p className="mt-1 font-mono text-sm text-slate-900 dark:text-slate-100">{safeAddress}</p>
            </div>

            {customer.notes && (
              <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Notes</p>
                <p className="mt-1 whitespace-pre-wrap font-mono text-sm text-slate-900 dark:text-slate-100">{customer.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'past' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <h2 className="font-display text-2xl tracking-wide text-slate-900 dark:text-white">Past Appointments</h2>

          {completedJobs.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle className="mx-auto mb-3 h-12 w-12 text-slate-400 dark:text-slate-500" />
              <p className="font-mono text-sm text-slate-500 dark:text-slate-400">No completed appointments yet</p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {completedJobs.map(job => (
                <Link
                  key={job.id}
                  href={`/admin/jobs/${job.id}`}
                  className="block rounded-xl border border-slate-200 bg-slate-50/80 p-4 transition-colors hover:border-blue-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-cyan-400/40 dark:hover:bg-slate-800/80"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{job.description || 'Service Call'}</h3>
                        <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${getStatusColor(job.status)}`}>
                          {formatStatus(job.status)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(job.scheduled_start), 'd MMM yyyy')}</span>
                        </div>
                        {job.technician && (
                          <span>Tech: {job.technician.full_name}</span>
                        )}
                      </div>
                    </div>

                    {job.total_cost && (
                      <div className="text-right">
                        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Revenue</div>
                        <div className="font-display text-2xl text-emerald-600 dark:text-emerald-400">${Number(job.total_cost).toFixed(2)}</div>
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
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <h2 className="font-display text-2xl tracking-wide text-slate-900 dark:text-white">Upcoming Appointments</h2>

          {pendingJobs.length === 0 ? (
            <div className="py-12 text-center">
              <Clock className="mx-auto mb-3 h-12 w-12 text-slate-400 dark:text-slate-500" />
              <p className="font-mono text-sm text-slate-500 dark:text-slate-400">No upcoming appointments</p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {pendingJobs.map(job => (
                <Link
                  key={job.id}
                  href={`/admin/jobs/${job.id}`}
                  className="block rounded-xl border border-slate-200 bg-slate-50/80 p-4 transition-colors hover:border-blue-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-cyan-400/40 dark:hover:bg-slate-800/80"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{job.description || 'Service Call'}</h3>
                        <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${getStatusColor(job.status)}`}>
                          {formatStatus(job.status)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(job.scheduled_start), 'd MMM yyyy h:mm a')}</span>
                        </div>
                        {job.technician && <span>Tech: {job.technician.full_name}</span>}
                      </div>
                    </div>

                    {job.total_cost && (
                      <div className="text-right">
                        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Estimated</div>
                        <div className="font-display text-2xl text-slate-900 dark:text-slate-100">${Number(job.total_cost).toFixed(2)}</div>
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
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <h2 className="font-display text-2xl tracking-wide text-slate-900 dark:text-white">Invoice History</h2>

          {invoices.length === 0 ? (
            <div className="py-12 text-center">
              <Receipt className="mx-auto mb-3 h-12 w-12 text-slate-400 dark:text-slate-500" />
              <p className="font-mono text-sm text-slate-500 dark:text-slate-400">No invoices yet</p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {invoices.map(invoice => (
                <Link
                  key={invoice.id}
                  href={`/admin/invoices/${invoice.id}`}
                  className="block rounded-xl border border-slate-200 bg-slate-50/80 p-4 transition-colors hover:border-blue-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-cyan-400/40 dark:hover:bg-slate-800/80"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Invoice #{invoice.invoice_number || invoice.id.slice(0, 8)}
                        </h3>
                        <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${getInvoiceStatusColor(invoice.status)}`}>
                          {formatStatus(invoice.status)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span>Issued: {invoice.issue_date ? format(new Date(invoice.issue_date), 'd MMM yyyy') : format(new Date(invoice.created_at), 'd MMM yyyy')}</span>
                        </div>
                        {invoice.due_date && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4" />
                            <span>Due: {format(new Date(invoice.due_date), 'd MMM yyyy')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Amount</div>
                      <div className={`font-display text-2xl ${
                        invoice.status === 'paid' ? 'text-emerald-600 dark:text-emerald-400' :
                        invoice.status === 'overdue' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'
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
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <h2 className="font-display text-2xl tracking-wide text-slate-900 dark:text-white">Edit Customer</h2>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            Update customer profile and contact information
          </p>
          <EditCustomerForm customer={customer} businessId={businessId} />
        </div>
      )}
    </div>
  )
}

