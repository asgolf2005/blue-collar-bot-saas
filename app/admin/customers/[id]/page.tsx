import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import CustomerDetailClient from '@/components/admin/CustomerDetailClient'
import { ArrowLeft } from '@/components/ui/lucide'
import Link from 'next/link'

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

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

  // Fetch customer first
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('business_id', profile.business_id)
    .single()

  if (customerError) {
    console.error('Customer fetch error:', {
      customerId: id,
      businessId: profile.business_id,
      error: customerError,
    })
  }

  if (!customer) {
    // Backward compatibility for legacy numeric customer links like /admin/customers/1
    if (/^\d+$/.test(id)) {
      const legacyIndex = Math.max(Number.parseInt(id, 10) - 1, 0)
      const { data: legacyCustomers, error: legacyCustomerError } = await supabase
        .from('customers')
        .select('id')
        .eq('business_id', profile.business_id)
        .order('created_at', { ascending: true })
        .range(legacyIndex, legacyIndex)

      if (legacyCustomerError) {
        console.error('Legacy customer id resolution error:', {
          legacyId: id,
          businessId: profile.business_id,
          error: legacyCustomerError,
        })
      }

      const resolvedId = legacyCustomers?.[0]?.id
      if (resolvedId) {
        redirect(`/admin/customers/${resolvedId}`)
      }
    }

    console.error('Customer not found:', {
      customerId: id,
      businessId: profile.business_id,
    })
    notFound()
  }

  // Fetch jobs separately so customer page does not fail on relationship parsing issues
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select(`
      id,
      status,
      scheduled_start,
      scheduled_end,
      description,
      total_cost,
      labor_hours,
      labor_rate,
      parts_cost,
      technician:users!jobs_technician_id_fkey(id, full_name)
    `)
    .eq('customer_id', id)
    .eq('business_id', profile.business_id)

  if (jobsError) {
    console.error('Customer jobs fetch error:', {
      customerId: id,
      businessId: profile.business_id,
      error: jobsError,
    })
  }

  const customerWithJobs = {
    ...customer,
    jobs: jobs || [],
  }

  // Fetch invoices for this customer
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })

  // Sort jobs by date
  const allJobs = customerWithJobs.jobs || []
  const completedJobs = allJobs.filter((j: { status: string; scheduled_start: string }) => j.status === 'completed').sort((a: { scheduled_start: string }, b: { scheduled_start: string }) =>
    new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime()
  )
  const pendingJobs = allJobs.filter((j: { status: string; scheduled_start: string }) => j.status !== 'completed' && j.status !== 'cancelled').sort((a: { scheduled_start: string }, b: { scheduled_start: string }) =>
    new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
  )

  // Calculate totals
  const totalRevenue = completedJobs.reduce((sum: number, job: { total_cost: number | null }) => sum + (Number(job.total_cost) || 0), 0)
  const outstandingInvoices = invoices?.filter((inv: { status: string }) => ['sent', 'overdue'].includes(inv.status)) || []
  const outstandingAmount = outstandingInvoices.reduce((sum: number, inv: { total: number }) => sum + Number(inv.total), 0)

  return (
    <div className="space-y-8 relative">
      {/* 2026 Global Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-indigo-500/10 to-transparent dark:from-indigo-500/20 opacity-50 mix-blend-screen" />
      </div>

      {/* Top Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10">
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center group-hover:bg-cyan-50 dark:group-hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold font-mono uppercase tracking-[0.2em]">Customer Directory</span>
        </Link>
      </div>

      {/* Hero Header Card */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/50 bg-white/40 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-white/10 dark:bg-slate-900/40 backdrop-blur-3xl sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.2),transparent_50%)]" />
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-semibold">Client Profile</p>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 mb-2">
              {customerWithJobs.name}
            </h1>
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
              Customer details and job history.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 relative z-10">
        <div className="group rounded-[2rem] bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-6 shadow-lg hover:shadow-cyan-500/10 transition-all hover:-translate-y-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400 font-bold mb-3 flex items-center gap-2 group-hover:scale-105 transition-transform origin-left">
            Total Jobs
          </div>
          <div className="font-display text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{allJobs.length}</div>
        </div>
        <div className="group rounded-[2rem] bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-6 shadow-lg hover:shadow-emerald-500/10 transition-all hover:-translate-y-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 font-bold mb-3 flex items-center gap-2 group-hover:scale-105 transition-transform origin-left">
            Completed
          </div>
          <div className="font-display text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{completedJobs.length}</div>
        </div>
        <div className="group rounded-[2rem] bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-6 shadow-lg hover:shadow-indigo-500/10 transition-all hover:-translate-y-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 font-bold mb-3 flex items-center gap-2 group-hover:scale-105 transition-transform origin-left">
            Total Value
          </div>
          <div className="font-display text-4xl font-bold tracking-tight text-slate-900 dark:text-white">${totalRevenue.toFixed(0)}</div>
        </div>
        <div className="group rounded-[2rem] bg-rose-50/50 dark:bg-rose-900/10 backdrop-blur-xl border border-rose-200/50 dark:border-rose-500/20 p-6 shadow-lg hover:shadow-rose-500/20 transition-all hover:-translate-y-1 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 dark:bg-rose-500/20 rounded-full blur-[30px] -z-10 group-hover:scale-150 transition-transform duration-500" />
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400 font-bold mb-3 flex items-center gap-2 group-hover:scale-105 transition-transform origin-left">
            Outstanding
          </div>
          <div className="font-display text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            ${outstandingAmount.toFixed(0)}
          </div>
        </div>
      </div>

      <CustomerDetailClient
        customer={customerWithJobs}
        completedJobs={completedJobs}
        pendingJobs={pendingJobs}
        invoices={invoices || []}
        businessId={profile.business_id}
      />
    </div>
  )
}
