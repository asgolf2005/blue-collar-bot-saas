import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import type { ReactNode } from 'react'
import { ArrowLeft, Briefcase, Mail, MapPin, Phone } from '@/components/ui/lucide'

export default async function TechCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'tech') {
    redirect('/tech/today')
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .select('id, name, email, phone, address, created_at')
    .eq('id', id)
    .single()

  if (error || !customer) {
    notFound()
  }

  const { data: jobsData } = await supabase
    .from('jobs')
    .select('id, description, status, scheduled_start, scheduled_end, total_cost')
    .eq('customer_id', customer.id)
    .eq('technician_id', user.id)
    .order('scheduled_start', { ascending: false })

  const jobs = jobsData || []

  const totalJobs = jobs.length
  const completedJobs = jobs.filter((job) => job.status === 'completed').length
  const upcomingJobs = jobs.filter((job) => job.scheduled_start && new Date(job.scheduled_start) > new Date()).length
  const completedRevenue = jobs
    .filter((job) => job.status === 'completed')
    .reduce((sum, job) => sum + (Number(job.total_cost) || 0), 0)

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.16),transparent_42%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.2),transparent_42%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/tech/today"
              className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to queue
            </Link>

            <h1 className="mt-2 font-display text-4xl uppercase tracking-[0.12em] text-slate-900 dark:text-white">
              {customer.name}
            </h1>
            <p className="mt-1 font-sans text-sm text-slate-600 dark:text-slate-300">
              Customer since {format(new Date(customer.created_at), 'MMMM d, yyyy')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatChip label="Jobs" value={String(totalJobs)} />
            <StatChip label="Completed" value={String(completedJobs)} />
            <StatChip label="Upcoming" value={String(upcomingJobs)} />
            <StatChip label="Revenue" value={`$${completedRevenue.toFixed(0)}`} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="font-display text-2xl uppercase tracking-[0.1em] text-slate-900 dark:text-white">Contact</p>
          <div className="mt-4 space-y-3">
            <ContactRow icon={<Mail className="h-4 w-4" />} label="Email" value={customer.email || 'No email'} href={customer.email ? `mailto:${customer.email}` : undefined} />
            <ContactRow icon={<Phone className="h-4 w-4" />} label="Phone" value={customer.phone || 'No phone'} href={customer.phone ? `tel:${customer.phone}` : undefined} />
            <ContactRow icon={<MapPin className="h-4 w-4" />} label="Address" value={customer.address || 'No address'} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {customer.phone ? (
              <a
                href={`tel:${customer.phone}`}
                className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-3 py-2 font-sans text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400"
              >
                Call
              </a>
            ) : null}
            {customer.address ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 font-sans text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Route
              </a>
            ) : null}
          </div>
        </aside>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <p className="font-display text-2xl uppercase tracking-[0.1em] text-slate-900 dark:text-white">Job History</p>
              <p className="font-sans text-xs text-slate-500 dark:text-slate-400">Assignments you have completed or scheduled for this customer</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {totalJobs}
            </span>
          </div>

          {jobs.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                <Briefcase className="h-5 w-5 text-slate-500 dark:text-slate-300" />
              </div>
              <p className="mt-3 font-sans text-sm text-slate-600 dark:text-slate-300">No technician jobs for this customer yet.</p>
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/tech/jobs/${job.id}`}
                  className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-colors hover:border-cyan-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-cyan-500/35 dark:hover:bg-slate-900"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-sans text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {job.description || 'Service call'}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {job.scheduled_start
                          ? format(new Date(job.scheduled_start), 'EEE, MMM d - h:mm a')
                          : 'No schedule set'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusPill status={job.status} />
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        {job.total_cost ? `$${Number(job.total_cost).toFixed(0)}` : '--'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  )
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/80">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  )
}

function ContactRow({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode
  label: string
  value: string
  href?: string
}) {
  const content = (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</p>
      <div className="mt-1 flex items-start gap-2">
        <span className="mt-0.5 text-slate-500 dark:text-slate-300">{icon}</span>
        <span className="font-sans text-sm text-slate-700 dark:text-slate-200">{value}</span>
      </div>
    </div>
  )

  if (!href) return content

  return (
    <a href={href} className="block transition-opacity hover:opacity-85">
      {content}
    </a>
  )
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.replace(/_/g, ' ')
  const style =
    status === 'completed'
      ? 'border-emerald-300/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : status === 'in_progress' || status === 'arrived' || status === 'on_the_way'
        ? 'border-cyan-300/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
        : status === 'cancelled'
          ? 'border-rose-300/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
          : 'border-slate-300/40 bg-slate-500/10 text-slate-700 dark:text-slate-300'

  return (
    <span className={`inline-flex rounded-full border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${style}`}>
      {normalized}
    </span>
  )
}
