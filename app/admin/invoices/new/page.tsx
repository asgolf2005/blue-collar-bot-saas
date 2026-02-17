import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateInvoiceForm from '@/components/invoices/CreateInvoiceForm'
import { ArrowLeft, BriefcaseBusiness, Receipt, Sparkles } from '@/components/ui/lucide'
import Link from 'next/link'

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ showAll?: string; job?: string; debug?: string }>
}) {
  const params = await searchParams
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

  const { data: business } = await supabase
    .from('businesses')
    .select('name, address, email, phone')
    .eq('id', profile.business_id)
    .single()

  const showAll = params.showAll === 'true'
  const preSelectedJobId = params.job || null
  const showDebug = params.debug === 'true'

  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers(*),
      services:job_services(*, service:services(*))
    `)
    .eq('business_id', profile.business_id)
    .in('status', ['arrived', 'in_progress', 'completed'])
    .order('scheduled_start', { ascending: false })

  const { data: existingInvoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('job_id, id')
    .eq('business_id', profile.business_id)

  const invoicedJobIds = new Set(
    (existingInvoices || [])
      .map((inv) => inv.job_id)
      .filter((id): id is string => Boolean(id))
  )

  const jobsWithInvoiceFlag =
    jobs?.map((job) => ({
      ...job,
      hasInvoice: invoicedJobIds.has(job.id),
    })) || []

  const availableJobs = showAll
    ? jobsWithInvoiceFlag
    : jobsWithInvoiceFlag.filter((job) => !job.hasInvoice)

  const totalEligibleJobs = jobsWithInvoiceFlag.length
  const alreadyInvoicedCount = jobsWithInvoiceFlag.filter((job) => job.hasInvoice).length
  const availableCount = availableJobs.length

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', profile.business_id)
    .eq('is_active', true)
    .order('name', { ascending: true })

  const dataErrorMessage = jobsError?.message || invoicesError?.message || null

  return (
    <div className="mx-auto w-full max-w-[1300px] space-y-6">
      <div>
        <Link
          href="/admin/invoices"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Invoices
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-cyan-50 p-6 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-500/10 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full bg-cyan-200/40 blur-3xl dark:bg-cyan-500/20" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-emerald-200/35 blur-3xl dark:bg-emerald-500/15" />

        <div className="relative z-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-100/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" />
            Invoice Builder
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">Create invoice</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
            Generate polished invoices from completed field work with a faster, cleaner builder flow.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <BriefcaseBusiness className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              {totalEligibleJobs} eligible jobs
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <Receipt className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              {availableCount} ready to invoice
            </div>
            {alreadyInvoicedCount > 0 && (
              <Link
                href={showAll ? '/admin/invoices/new' : '/admin/invoices/new?showAll=true'}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
              >
                {showAll ? 'Hide invoiced jobs' : `Show all (${alreadyInvoicedCount} invoiced)`}
              </Link>
            )}
          </div>
        </div>
      </section>

      {availableCount === 0 && totalEligibleJobs > 0 && !showAll && (
        <div className="rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          All eligible jobs already have invoices. Turn on &quot;Show all&quot; only when you intentionally need a secondary invoice.
        </div>
      )}

      {dataErrorMessage && (
        <div className="rounded-2xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
          Data loading issue: {dataErrorMessage}
        </div>
      )}

      {showDebug && (
        <details className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <summary className="cursor-pointer font-semibold uppercase tracking-wide">Debug Snapshot</summary>
          <div className="mt-3 space-y-1">
            <p>Total eligible jobs: {totalEligibleJobs}</p>
            <p>Already invoiced jobs: {alreadyInvoicedCount}</p>
            <p>Visible in builder: {availableCount}</p>
            <p>showAll=true: {showAll ? 'yes' : 'no'}</p>
          </div>
        </details>
      )}

      <CreateInvoiceForm
        businessId={profile.business_id}
        businessProfile={{
          name: business?.name || null,
          address: business?.address || null,
          email: business?.email || null,
          phone: business?.phone || null,
        }}
        jobs={availableJobs}
        services={services || []}
        showAll={showAll}
        preSelectedJobId={preSelectedJobId}
      />
    </div>
  )
}


