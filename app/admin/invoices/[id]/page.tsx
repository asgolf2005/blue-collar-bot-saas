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
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-cyan-50 p-5 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-500/10 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full bg-cyan-200/40 blur-3xl dark:bg-cyan-500/20" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-emerald-200/35 blur-3xl dark:bg-emerald-500/15" />

        <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <Link
              href="/admin/invoices"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Invoices
            </Link>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">Invoice Workspace</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl" style={{ viewTransitionName: `invoice-${invoice.id}` }}>
                Invoice {invoice.invoice_number}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                Issued {format(issuedAt, 'MMMM dd, yyyy')} | {dueMeta}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <CopyInvoiceNumberButton value={invoice.invoice_number} />
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                Customer: <span className="ml-1 font-semibold text-slate-900 dark:text-slate-100">{customer?.name || 'Unknown'}</span>
              </span>
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${config.badgeClass}`}>
                {config.label}
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Payment Signal</p>
              <span className={`text-sm font-semibold ${config.accentClass}`}>{config.label}</span>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div
                className="grid h-20 w-20 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(${config.meterColor} ${paymentPercent}%, rgba(148,163,184,0.18) ${paymentPercent}% 100%)`,
                }}
              >
                <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-xs font-semibold text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                  {paymentPercent}%
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-300">Total</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">${invoice.total.toFixed(2)}</p>
                <p className={`mt-0.5 text-xs ${isOverdue ? 'text-rose-600 dark:text-rose-300' : 'text-slate-600 dark:text-slate-300'}`}>
                  {dueMeta}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100">Parties</h2>
              <span className="text-[10px] uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">Business + Customer</span>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  <Building2 className="h-3.5 w-3.5" />
                  From
                </div>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{business?.name || 'Your Business'}</p>
                {business?.address && (
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {business.address}
                  </p>
                )}
                {business?.phone && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <Phone className="h-3.5 w-3.5" />
                    {business.phone}
                  </p>
                )}
                {business?.email && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <Mail className="h-3.5 w-3.5" />
                    {business.email}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  <User className="h-3.5 w-3.5" />
                  Bill To
                </div>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{customer?.name || 'Unknown Customer'}</p>
                {customer?.address && (
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{customer.address}</p>
                )}
                {customer?.phone && (
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{customer.phone}</p>
                )}
                {customer?.email && (
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{customer.email}</p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100">Invoice Timeline</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {timeline.map((entry) => (
                <div key={entry.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">{entry.label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{entry.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100">Line Items</h2>
              <span className="text-[10px] uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
                {(invoice.line_items || []).length} item{(invoice.line_items || []).length === 1 ? '' : 's'}
              </span>
            </div>

            {(invoice.line_items || []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-800/40">
                <Receipt className="mx-auto mb-2 h-8 w-8 text-slate-400 dark:text-slate-500" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No line items</p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="py-2.5 text-left text-[10px] uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">Description</th>
                        <th className="w-24 py-2.5 text-right text-[10px] uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">Qty</th>
                        <th className="w-28 py-2.5 text-right text-[10px] uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">Rate</th>
                        <th className="w-32 py-2.5 text-right text-[10px] uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.line_items?.map((item: InvoiceLineItem, index: number) => (
                        <tr key={item.id} className={`${index !== (invoice.line_items?.length || 1) - 1 ? 'border-b border-slate-200/80 dark:border-slate-700/80' : ''}`}>
                          <td className="py-3.5 text-sm text-slate-900 dark:text-slate-100">
                            <p className="font-medium">{item.description}</p>
                            <span className="mt-0.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {item.type}
                            </span>
                          </td>
                          <td className="py-3.5 text-right font-mono text-sm text-slate-900 dark:text-slate-100">{item.quantity}</td>
                          <td className="py-3.5 text-right font-mono text-sm text-slate-900 dark:text-slate-100">${item.unit_price.toFixed(2)}</td>
                          <td className="py-3.5 text-right font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">${item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2 lg:hidden">
                  {invoice.line_items?.map((item: InvoiceLineItem) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{item.description}</p>
                          <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {item.type}
                          </span>
                        </div>
                        <p className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">${item.total.toFixed(2)}</p>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                        <span>Qty {item.quantity}</span>
                        <span>Rate ${item.unit_price.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {invoice.notes && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900 sm:p-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100">Notes</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">{invoice.notes}</p>
            </section>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:h-fit">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Actions</h3>
            <div className="space-y-2">
              <a
                href={`/api/invoices/${invoice.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </a>

              {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                <SendInvoiceReminderButton
                  invoiceId={invoice.id}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-xs font-semibold text-cyan-700 transition-colors hover:bg-cyan-100 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:bg-cyan-500/20"
                />
              )}

              {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                <MarkAsPaidButton
                  invoiceId={invoice.id}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                />
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Totals</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>Subtotal</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">${invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>Tax</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">${invoice.tax.toFixed(2)}</span>
              </div>
              <div className="my-1 h-px bg-border" />
              <div className="flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-slate-100">
                <span>Total</span>
                <span className="font-mono text-base">${invoice.total.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  Amount due
                </span>
                <span className={`font-mono font-semibold ${isOverdue ? 'text-rose-600 dark:text-rose-300' : 'text-slate-900 dark:text-slate-100'}`}>
                  ${amountDue.toFixed(2)}
                </span>
              </div>
              <div className={`mt-2 rounded-xl border px-3 py-2 text-xs ${config.badgeClass}`}>
                {dueMeta}
              </div>
            </div>
          </section>

          {invoice.job_id && (
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Linked Job</h3>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Job #{invoice.job_id.slice(0, 8)}</p>
              <Link
                href={`/admin/jobs/${invoice.job_id}`}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                <Calendar className="h-4 w-4" />
                Open Job
              </Link>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}


