'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Calendar, Receipt, Edit, CheckCircle, Clock } from '@/components/ui/icons'
import EditCustomerForm from './EditCustomerForm'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Customer as BaseCustomer } from '@/lib/types'

interface Customer extends BaseCustomer {
  notes?: string
  updated_at?: string | null
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
  const lastModifiedAt = customer.updated_at || customer.created_at
  const lastJobActor = [...pendingJobs, ...completedJobs]
    .filter((job) => job.technician?.full_name)
    .sort((a, b) => new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime())[0]
  const lastModifiedBy = lastJobActor?.technician?.full_name || 'Admin Portal'

  const activityLog = [
    {
      id: `created-${customer.id}`,
      label: 'Customer created',
      detail: 'Created by Admin Portal',
      timestamp: customer.created_at,
    },
    ...[...pendingJobs, ...completedJobs]
      .slice(0, 6)
      .map((job) => ({
        id: `job-${job.id}`,
        label: 'Job status update',
        detail: `${formatStatus(job.status)}${job.technician?.full_name ? ` - ${job.technician.full_name}` : ''}`,
        timestamp: job.scheduled_start,
      })),
    ...invoices.slice(0, 4).map((invoice) => ({
      id: `invoice-${invoice.id}`,
      label: 'Invoice activity',
      detail: `Invoice ${invoice.invoice_number || invoice.id.slice(0, 8)} marked ${formatStatus(invoice.status)}`,
      timestamp: invoice.issue_date || invoice.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10)

  const tabs = [
    { id: 'details' as const, label: 'Details' },
    { id: 'past' as const, label: `Past (${completedJobs.length})` },
    { id: 'upcoming' as const, label: `Upcoming (${pendingJobs.length})` },
    { id: 'invoices' as const, label: `Invoices (${invoices.length})` },
    { id: 'edit' as const, label: 'Edit' },
  ]

  return (
    <div className="space-y-8 relative">
      {/* 2026 Background Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10 rounded-[2.5rem]">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-[100px] opacity-50 mix-blend-screen" />
        <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[100px] opacity-30 mix-blend-screen" />
      </div>

      {/* Modern Pill Navigation */}
      <div className="relative p-1.5 rounded-3xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 shadow-lg inline-flex overflow-x-auto max-w-full hide-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative rounded-2xl px-6 py-2.5 font-mono text-xs uppercase tracking-[0.15em] font-semibold whitespace-nowrap transition-colors z-10 ${
                isActive
                  ? 'text-white dark:text-cyan-50'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabBadge"
                  className="absolute inset-0 rounded-2xl bg-slate-900 dark:bg-cyan-500/20 border-b border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)] -z-10"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              {tab.label}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
          transition={{ duration: 0.3 }}
          className="relative z-10"
        >
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left Column: Quick Info & Contact */}
              <div className="lg:col-span-1 space-y-6">
                <div className="p-6 rounded-[2rem] bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 shadow-xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 p-[2px] mb-4 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                      <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
                        <span className="font-display text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-cyan-600 to-indigo-600 dark:from-cyan-400 dark:to-indigo-400">
                          {customer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white">{customer.name}</h2>
                    <span className={`mt-2 inline-flex items-center rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-widest ${
                      customer.portal_access
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300'
                        : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400'
                    }`}>
                      {customer.portal_access ? 'Portal Active' : 'No Portal'}
                    </span>
                  </div>

                  <div className="mt-8 space-y-4">
                    <div className="flex items-center gap-4 group/item">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center text-slate-400 group-hover/item:text-cyan-500 group-hover/item:bg-cyan-50 dark:group-hover/item:bg-cyan-500/10 transition-colors">
                        <Clock className="w-4 h-4" /> {/* Reused icon as standard phone not available in imports */}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Phone</p>
                        {customer.phone ? (
                          <a href={`tel:${customer.phone}`} className="font-mono text-sm text-slate-900 dark:text-slate-100 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">{safePhone}</a>
                        ) : (
                          <p className="font-mono text-sm text-slate-500">{safePhone}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 group/item">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center text-slate-400 group-hover/item:text-cyan-500 group-hover/item:bg-cyan-50 dark:group-hover/item:bg-cyan-500/10 transition-colors">
                        <Edit className="w-4 h-4" /> {/* Reused icon as standard mail not available */}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Email</p>
                        {customer.email ? (
                          <a href={`mailto:${customer.email}`} className="font-mono text-sm text-slate-900 dark:text-slate-100 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors truncate block">{safeEmail}</a>
                        ) : (
                          <p className="font-mono text-sm text-slate-500">{safeEmail}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-[2rem] bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 shadow-xl">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Administrative
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Service Address</p>
                      <p className="mt-1 font-mono text-sm text-slate-900 dark:text-slate-100 leading-relaxed">{safeAddress}</p>
                    </div>
                    <div className="pt-4 border-t border-slate-200/50 dark:border-slate-800">
                      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Last Modified</p>
                      <p className="mt-1 font-mono text-sm text-slate-900 dark:text-slate-100">{lastModifiedBy}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{format(new Date(lastModifiedAt), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Activity & Notes */}
              <div className="lg:col-span-2 space-y-6">
                {customer.notes && (
                  <div className="p-6 rounded-[2rem] bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-500/20 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] mix-blend-screen rounded-full pointer-events-none group-hover:bg-indigo-500/20 transition-colors duration-500" />
                    <h3 className="font-mono text-xs uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-2">
                      Notes
                    </h3>
                    <p className="font-mono text-sm text-slate-700 dark:text-indigo-100/80 whitespace-pre-wrap leading-relaxed">
                      {customer.notes}
                    </p>
                  </div>
                )}

                <div className="p-6 rounded-[2rem] bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 shadow-xl">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> Timeline Feed
                  </h3>
                  <div className="relative pl-4 border-l-2 border-slate-200 dark:border-slate-800 space-y-6">
                    {activityLog.map((entry, idx) => (
                      <div key={entry.id} className="relative">
                        <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-white dark:bg-slate-900 border-2 border-cyan-500 ring-4 ring-white dark:ring-slate-900" />
                        <div className="pl-4">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{entry.label}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{entry.detail}</p>
                          <p className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-slate-500 mt-2">
                            {format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'past' && (
            <div className="p-6 rounded-[2rem] bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 shadow-xl">
              <h2 className="font-display text-2xl tracking-wide text-slate-900 dark:text-white mb-6">Past Appointments</h2>
              {completedJobs.length === 0 ? (
                <div className="py-16 text-center">
                  <CheckCircle className="mx-auto mb-4 h-16 w-16 text-slate-300 dark:text-slate-700" />
                  <p className="font-mono text-sm text-slate-500 dark:text-slate-400">No completed history available.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedJobs.map(job => (
                    <Link
                      key={job.id}
                      href={`/admin/jobs/${job.id}`}
                      className="group block rounded-[1.5rem] bg-slate-50 dark:bg-slate-800/50 p-5 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-cyan-200 dark:hover:border-cyan-500/30 transition-all hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] hover:-translate-y-1"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">{job.description || 'Service Call'}</h3>
                          <span className={`mt-2 inline-block rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${getStatusColor(job.status)}`}>
                            {formatStatus(job.status)}
                          </span>
                        </div>
                        {job.total_cost && (
                          <div className="text-right">
                            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">Revenue</div>
                            <div className="font-display text-xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform origin-right">${Number(job.total_cost).toFixed(2)}</div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest pt-4 border-t border-slate-200 dark:border-slate-700/50">
                        <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" />{format(new Date(job.scheduled_start), 'd MMM yyyy')}</div>
                        {job.technician && <div>TECH: {job.technician.full_name}</div>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'upcoming' && (
            <div className="p-6 rounded-[2rem] bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 shadow-xl">
              <h2 className="font-display text-2xl tracking-wide text-slate-900 dark:text-white mb-6">Upcoming Missions</h2>
              {pendingJobs.length === 0 ? (
                <div className="py-16 text-center">
                  <Clock className="mx-auto mb-4 h-16 w-16 text-slate-300 dark:text-slate-700" />
                  <p className="font-mono text-sm text-slate-500 dark:text-slate-400">Schedule is clear.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingJobs.map(job => (
                    <Link
                      key={job.id}
                      href={`/admin/jobs/${job.id}`}
                      className="group block rounded-[1.5rem] bg-indigo-50/50 dark:bg-indigo-900/10 p-5 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] hover:-translate-y-1"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">{job.description || 'Service Call'}</h3>
                          <span className={`mt-2 inline-block rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${getStatusColor(job.status)}`}>
                            {formatStatus(job.status)}
                          </span>
                        </div>
                        {job.total_cost && (
                          <div className="text-right">
                            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">Value</div>
                            <div className="font-display text-xl text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform origin-right">${Number(job.total_cost).toFixed(2)}</div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest pt-4 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" />{format(new Date(job.scheduled_start), 'd MMM yyyy')}</div>
                        {job.technician && <div className="text-indigo-600 dark:text-indigo-400">ASSIGNED: {job.technician.full_name}</div>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="p-6 rounded-[2rem] bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 shadow-xl">
              <h2 className="font-display text-2xl tracking-wide text-slate-900 dark:text-white mb-6">Financial Ledger</h2>
              {invoices.length === 0 ? (
                <div className="py-16 text-center">
                  <Receipt className="mx-auto mb-4 h-16 w-16 text-slate-300 dark:text-slate-700" />
                  <p className="font-mono text-sm text-slate-500 dark:text-slate-400">No ledgers generated.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {invoices.map(invoice => (
                    <Link
                      key={invoice.id}
                      href={`/admin/invoices/${invoice.id}`}
                      className="group block rounded-[1.5rem] bg-slate-50 dark:bg-slate-800/50 p-5 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-500/30 transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] hover:-translate-y-1"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">INV #{invoice.invoice_number || invoice.id.slice(0, 8).toUpperCase()}</h3>
                          <span className={`mt-2 inline-block rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${getInvoiceStatusColor(invoice.status)}`}>
                            {formatStatus(invoice.status)}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">Amount</div>
                          <div className={`font-display text-xl transition-transform origin-right group-hover:scale-110 ${
                            invoice.status === 'paid' ? 'text-emerald-600 dark:text-emerald-400' :
                            invoice.status === 'overdue' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'
                          }`}>
                            ${Number(invoice.total).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-between gap-y-2 font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest pt-4 border-t border-slate-200 dark:border-slate-700/50">
                        <div>IST: {invoice.issue_date ? format(new Date(invoice.issue_date), 'd MMM yyyy') : format(new Date(invoice.created_at), 'd MMM yyyy')}</div>
                        {invoice.due_date && <div className={invoice.status === 'overdue' ? 'text-rose-500' : ''}>DUE: {format(new Date(invoice.due_date), 'd MMM yyyy')}</div>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'edit' && (
            <div className="p-6 rounded-[2rem] bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 shadow-xl max-w-2xl mx-auto">
              <h2 className="font-display text-2xl tracking-wide text-slate-900 dark:text-white mb-2">Edit Subject</h2>
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mb-8 border-b border-slate-200/50 dark:border-white/10 pb-4">
                Modify contact protocol & administrative parameters
              </p>
              <EditCustomerForm customer={customer} businessId={businessId} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
