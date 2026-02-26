import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { differenceInCalendarDays, format } from 'date-fns'
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  Receipt,
  Mail,
  MapPin,
  Phone,
  Send,
  User,
} from '@/components/ui/lucide'
import Link from 'next/link'
import MarkAsPaidButton from '@/components/invoices/MarkAsPaidButton'
import CopyInvoiceNumberButton from '@/components/invoices/CopyInvoiceNumberButton'
import SendInvoiceReminderButton from '@/components/invoices/SendInvoiceReminderButton'
import { InvoiceLineItem, InvoiceStatus } from '@/lib/types'

export default async function AdminInvoiceDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/tech/today')
  }

  const { id } = await params

  const { data: invoice } = await supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(*),
      job:jobs(*),
      line_items:invoice_line_items(*),
      business:businesses(name, address, email, phone)
    `)
    .eq('id', id)
    .eq('business_id', profile.business_id)
    .single()

  if (!invoice) {
    notFound()
  }

  const business = invoice.business as { name?: string; address?: string | null; email?: string | null; phone?: string | null } | null
  const customer = invoice.customer as { name?: string; address?: string | null; email?: string | null; phone?: string | null } | null

  const statusConfig: Record<
    InvoiceStatus,
    {
      label: string
      badgeClass: string
      accentClass: string
      meterColor: string
    }
  > = {
    draft: {
      label: 'Draft',
      badgeClass: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300',
      accentClass: 'text-slate-600 dark:text-slate-300',
      meterColor: 'rgba(100,116,139,0.95)',
    },
    sent: {
      label: 'Awaiting Payment',
      badgeClass: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300',
      accentClass: 'text-cyan-600 dark:text-cyan-300',
      meterColor: 'rgba(6,182,212,0.92)',
    },
    paid: {
      label: 'Paid',
      badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
      accentClass: 'text-emerald-600 dark:text-emerald-300',
      meterColor: 'rgba(16,185,129,0.95)',
    },
    overdue: {
      label: 'Overdue',
      badgeClass: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
      accentClass: 'text-rose-600 dark:text-rose-300',
      meterColor: 'rgba(244,63,94,0.95)',
    },
    cancelled: {
      label: 'Cancelled',
      badgeClass: 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
      accentClass: 'text-slate-500 dark:text-slate-400',
      meterColor: 'rgba(107,114,128,0.9)',
    },
  }

  const config = statusConfig[invoice.status as InvoiceStatus] || statusConfig.sent
  const issuedAt = new Date(invoice.issue_date)
  const dueAt = invoice.due_date ? new Date(invoice.due_date) : null
  const paidAt = invoice.paid_at ? new Date(invoice.paid_at) : null
  const dueDelta = dueAt ? differenceInCalendarDays(dueAt, new Date()) : null
  const isOverdue = !!dueAt && dueDelta !== null && dueDelta < 0 && invoice.status !== 'paid' && invoice.status !== 'cancelled'
  const paymentPercent = invoice.status === 'paid' ? 100 : 0
  const amountDue = invoice.status === 'paid' ? 0 : invoice.total

  const dueMeta = (() => {
    if (paidAt) return `Paid on ${format(paidAt, 'MMM dd, yyyy')}`
    if (!dueAt) return 'No due date'
    if (isOverdue) return `${Math.abs(dueDelta || 0)} day${Math.abs(dueDelta || 0) === 1 ? '' : 's'} overdue`
    if (dueDelta === 0) return 'Due today'
    return `Due in ${dueDelta} day${dueDelta === 1 ? '' : 's'}`
  })()

  const timeline = [
    { label: 'Issued', value: format(issuedAt, 'MMM dd, yyyy') },
    { label: 'Due', value: dueAt ? format(dueAt, 'MMM dd, yyyy') : 'Not set' },
    { label: 'Paid', value: paidAt ? format(paidAt, 'MMM dd, yyyy') : 'Pending' },
  ]

  return (
    <div className="relative min-h-[80vh] pb-24">
      {/* 2026 Global Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-cyan-400/5 dark:bg-cyan-500/10 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      {/* Floating Action Bar (Top) */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-10 relative z-20">
        <Link
          href="/admin/invoices"
          className="inline-flex items-center gap-2 group text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/50 dark:border-white/10 flex items-center justify-center group-hover:bg-cyan-50 dark:group-hover:bg-white/10 transition-colors shadow-sm">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] font-bold">Ledger Archive</span>
        </Link>
        <div className="flex items-center gap-3 backdrop-blur-xl bg-white/40 dark:bg-slate-900/40 p-1.5 rounded-full border border-slate-200/50 dark:border-white/10 shadow-lg shadow-black/5">
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full hover:bg-white/80 dark:hover:bg-white/10 text-[11px] font-mono uppercase tracking-widest text-slate-700 dark:text-slate-200 transition-all font-bold"
          >
            <Download className="w-3.5 h-3.5" /> PDF
          </a>
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <SendInvoiceReminderButton
              invoiceId={invoice.id}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/20 dark:hover:bg-indigo-500/30 text-[11px] font-mono uppercase tracking-widest text-indigo-700 dark:text-indigo-300 transition-all font-bold"
            />
          )}
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <MarkAsPaidButton
              invoiceId={invoice.id}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 text-[11px] font-mono uppercase tracking-widest transition-all font-bold"
            />
          )}
        </div>
      </div>

      {/* The Receipt Document */}
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="relative overflow-hidden bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-x border-t border-slate-200/50 dark:border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] rounded-t-[2rem]">
          {/* Top Zig-Zag or Perforated Edge Illusion via SVG/CSS can go here, using a dotted border for 2026 clean look */}

          <div className="p-8 sm:p-14">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-16 border-b border-dashed border-slate-300 dark:border-slate-800 pb-12">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 mb-6 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  <Receipt className="w-3 h-3" /> Digital Receipt
                </div>
                <h1 className="text-5xl font-display font-bold tracking-tighter text-slate-900 dark:text-white mb-2">
                  #{invoice.invoice_number}
                </h1>
                <p className="font-mono text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                  Issued: {format(issuedAt, 'yyyy.MM.dd')}
                </p>
              </div>

              <div className="flex flex-col items-end text-right">
                <div className={`mt-2 rounded-full border px-4 py-1.5 text-xs font-mono uppercase tracking-widest font-bold shadow-sm ${config.badgeClass} flex items-center gap-2 mb-6`}>
                  <div className={`w-2 h-2 rounded-full bg-current ${invoice.status === 'sent' || invoice.status === 'overdue' ? 'animate-pulse' : ''}`} />
                  {config.label}
                </div>
                <div className="font-display text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 tracking-tight">
                  ${invoice.total.toFixed(2)}
                </div>
                <p className={`mt-2 font-mono text-[10px] uppercase tracking-[0.1em] font-semibold ${isOverdue ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>
                  {dueMeta}
                </p>
              </div>
            </div>

            {/* Parties */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16 relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-dashed border-r border-dashed border-slate-300 dark:border-slate-800 hidden md:block -translate-x-1/2" />

              <div className="space-y-4">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-bold mb-6 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5" /> Origin
                </h3>
                <div>
                  <p className="text-xl font-display font-bold text-slate-900 dark:text-white mb-2">{business?.name || 'Your Business'}</p>
                  <div className="font-mono text-xs tracking-wide text-slate-600 dark:text-slate-400 space-y-1.5">
                    {business?.address && <p>{business.address}</p>}
                    {business?.phone && <p>{business.phone}</p>}
                    {business?.email && <p>{business.email}</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-4 md:pl-6">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-bold mb-6 flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Destination
                </h3>
                <div>
                  <p className="text-xl font-display font-bold text-slate-900 dark:text-white mb-2">{customer?.name || 'Unknown Client'}</p>
                  <div className="font-mono text-xs tracking-wide text-slate-600 dark:text-slate-400 space-y-1.5">
                    {customer?.address && <p>{customer.address}</p>}
                    {customer?.phone && <p>{customer.phone}</p>}
                    {customer?.email && <p>{customer.email}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-16">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400 font-bold mb-6 flex items-center gap-2 border-b border-dashed border-slate-300 dark:border-slate-800 pb-4">
                Service Manifest
                <span className="bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 px-2 py-0.5 rounded-full text-[9px]">
                  {(invoice.line_items || []).length} ENTR{(invoice.line_items || []).length === 1 ? 'Y' : 'IES'}
                </span>
              </h3>

              {(invoice.line_items || []).length === 0 ? (
                <div className="py-12 text-center border-b border-dashed border-slate-300 dark:border-slate-800">
                  <p className="font-mono text-xs uppercase tracking-widest text-slate-400">Empty Ledger</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-900 dark:border-slate-100">
                        <th className="py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 w-1/2">Descriptor</th>
                        <th className="py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 text-right">Qty</th>
                        <th className="py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 text-right">Rate</th>
                        <th className="py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 text-right text-slate-900 dark:text-white font-bold">Sum</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-sm">
                      {invoice.line_items?.map((item: InvoiceLineItem, idx: number) => (
                        <tr key={item.id} className="border-b border-dashed border-slate-200 dark:border-slate-800/80 group hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="py-6">
                            <p className="font-semibold text-slate-900 dark:text-slate-200 mb-1">{item.description}</p>
                            <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              {item.type}
                            </span>
                          </td>
                          <td className="py-6 text-right text-slate-600 dark:text-slate-400">{item.quantity}</td>
                          <td className="py-6 text-right text-slate-600 dark:text-slate-400">${item.unit_price.toFixed(2)}</td>
                          <td className="py-6 text-right font-bold text-slate-900 dark:text-white">${item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Totals & Notes Footer */}
            <div className="grid md:grid-cols-2 gap-12">
              <div>
                {invoice.notes ? (
                  <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-500/20 rounded-2xl p-6">
                    <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500 font-bold mb-3">Transmitter Notes</h4>
                    <p className="font-mono text-xs text-amber-800 dark:text-amber-200/80 leading-relaxed whitespace-pre-wrap">
                      {invoice.notes}
                    </p>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl opacity-50">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400">No additional notes</p>
                  </div>
                )}

                {invoice.job_id && (
                  <div className="mt-6 flex items-center justify-between p-4 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <div className="font-mono text-xs flex gap-2 items-center text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      Mission Reference: <span className="font-bold text-slate-700 dark:text-slate-300">#{invoice.job_id.slice(0, 8)}</span>
                    </div>
                    <Link
                      href={`/admin/jobs/${invoice.job_id}`}
                      className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-500 hover:text-cyan-600"
                    >
                      Inspect →
                    </Link>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/40 rounded-[2rem] p-8 border border-slate-200 dark:border-white/5 font-mono">
                <div className="space-y-4 text-xs tracking-wide">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Subtotal</span>
                    <span>${invoice.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Tax</span>
                    <span>${invoice.tax.toFixed(2)}</span>
                  </div>
                </div>

                <div className="my-6 border-t-2 border-dashed border-slate-300 dark:border-slate-700" />

                <div className="flex justify-between items-end">
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-1">Total Due</span>
                  <span className={`text-4xl font-display font-bold tracking-tight ${isOverdue ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                    ${amountDue.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom "Tear" Effect */}
          <div className="h-6 w-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.02)_10px,rgba(0,0,0,0.02)_20px)] dark:bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)] border-t border-slate-200/50 dark:border-white/10" />
        </div>
      </div>
    </div>
  )
}


