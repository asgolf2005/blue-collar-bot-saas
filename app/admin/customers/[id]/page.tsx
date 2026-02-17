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
  const completedJobs = allJobs.filter((j: {status: string; scheduled_start: string}) => j.status === 'completed').sort((a: {scheduled_start: string}, b: {scheduled_start: string}) =>
    new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime()
  )
  const pendingJobs = allJobs.filter((j: {status: string; scheduled_start: string}) => j.status !== 'completed' && j.status !== 'cancelled').sort((a: {scheduled_start: string}, b: {scheduled_start: string}) =>
    new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
  )

  // Calculate totals
  const totalRevenue = completedJobs.reduce((sum: number, job: {total_cost: number | null}) => sum + (Number(job.total_cost) || 0), 0)
  const outstandingInvoices = invoices?.filter((inv: {status: string}) => ['sent', 'overdue'].includes(inv.status)) || []
  const outstandingAmount = outstandingInvoices.reduce((sum: number, inv: {total: number}) => sum + Number(inv.total), 0)

  return (
    <div className="space-y-6">
      <Link
        href="/admin/customers"
        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Customers
      </Link>

      <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_42%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_42%)]" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Client Profile</p>
            <h1 className="font-display text-4xl tracking-wide text-slate-900 dark:text-white sm:text-5xl">{customerWithJobs.name}</h1>
            <p className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              Customer details, job history, and billing activity
            </p>
          </div>
          <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300">
            {customerWithJobs.portal_access ? 'Portal Enabled' : 'Portal Disabled'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="font-mono text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Jobs</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{allJobs.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="font-mono text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Completed</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{completedJobs.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="font-mono text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Revenue</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">${totalRevenue.toFixed(0)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="font-mono text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Outstanding</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
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


