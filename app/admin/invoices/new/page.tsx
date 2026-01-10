import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateInvoiceForm from '@/components/invoices/CreateInvoiceForm'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ showAll?: string; job?: string }>
}) {
  const params = await searchParams
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

  const showAll = params.showAll === 'true'
  const preSelectedJobId = params.job || null

  // Get jobs that can be invoiced (arrived, in_progress, or completed)
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

  // Get existing invoices from invoices table
  const { data: existingInvoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('job_id, id, invoice_number')
    .eq('business_id', profile.business_id)

  const invoicedJobIds = new Set(
    (existingInvoices || [])
      .map(inv => inv.job_id)
      .filter((id): id is string => Boolean(id))
  )

  const jobsWithInvoiceFlag =
    jobs?.map(job => ({
      ...job,
      hasInvoice: invoicedJobIds.has(job.id)
    })) || []

  // Filter based on showAll parameter
  const availableJobs = showAll
    ? jobsWithInvoiceFlag
    : jobsWithInvoiceFlag.filter(job => !job.hasInvoice)

  // Count stats for display
  const totalEligibleJobs = jobsWithInvoiceFlag.length
  const alreadyInvoicedCount = jobsWithInvoiceFlag.filter(job => job.hasInvoice).length
  const availableCount = availableJobs.length

  // Get all services for manual line items
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', profile.business_id)
    .eq('is_active', true)
    .order('name', { ascending: true })

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/invoices"
          className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Invoices
        </Link>
        <h1 className="text-2xl font-bold text-ink">Create Invoice</h1>
        <p className="text-muted mt-1">Generate an invoice from a job (in progress or completed)</p>
      </div>

      {/* Debug Info */}
      <div className="glass-card mb-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <div className="text-xs space-y-2">
          <p className="font-semibold text-blue-900 dark:text-blue-100">Debug Info:</p>
          <div className="grid grid-cols-2 gap-2">
            <p className="text-blue-800 dark:text-blue-200">Total eligible jobs: <span className="font-bold">{totalEligibleJobs}</span></p>
            <p className="text-blue-800 dark:text-blue-200">Total invoices: <span className="font-bold">{existingInvoices?.length || 0}</span></p>
            <p className="text-blue-800 dark:text-blue-200">Jobs with invoices: <span className="font-bold">{alreadyInvoicedCount}</span></p>
            <p className="text-blue-800 dark:text-blue-200">Available to invoice: <span className="font-bold">{availableCount}</span></p>
          </div>
          <p className="text-blue-800 dark:text-blue-200">Show all: <span className="font-bold">{showAll ? 'Yes' : 'No'}</span></p>
          {jobsError && <p className="text-red-600">Jobs Error: {jobsError.message}</p>}
          {invoicesError && <p className="text-red-600">Invoices Error: {invoicesError.message}</p>}

          {/* Status breakdown */}
          <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
            <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Jobs by Status:</p>
            <div className="space-y-1">
              {['completed', 'in_progress', 'arrived', 'on_the_way', 'scheduled'].map(status => {
                const statusJobs = jobsWithInvoiceFlag.filter(j => j.status === status)
                const invoicedInStatus = statusJobs.filter(j => j.hasInvoice).length
                const availableInStatus = statusJobs.filter(j => !j.hasInvoice).length
                if (statusJobs.length === 0) return null
                return (
                  <p key={status} className="text-blue-800 dark:text-blue-200">
                    <span className="font-semibold capitalize">{status.replace('_', ' ')}:</span> {statusJobs.length} total
                    ({invoicedInStatus} invoiced, <span className="font-bold text-green-600">{availableInStatus} available</span>)
                  </p>
                )
              })}
            </div>
          </div>

          <details className="mt-2">
            <summary className="cursor-pointer text-blue-900 dark:text-blue-100 font-semibold">Show detailed job list</summary>
            <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded text-[10px] max-h-60 overflow-y-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="p-1">Customer</th>
                    <th className="p-1">Status</th>
                    <th className="p-1">Has Invoice?</th>
                    <th className="p-1">Job ID</th>
                  </tr>
                </thead>
                <tbody>
                  {jobsWithInvoiceFlag.map((job, i) => (
                    <tr key={i} className={`border-b ${job.hasInvoice ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                      <td className="p-1">{job.customer?.name || 'Unknown'}</td>
                      <td className="p-1">{job.status}</td>
                      <td className="p-1">{job.hasInvoice ? '✓ Yes' : '✗ No'}</td>
                      <td className="p-1 font-mono text-[9px]">{job.id.substring(0, 8)}...</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </div>

      {/* Stats Banner */}
      {totalEligibleJobs > 0 && (
        <div className="glass-card mb-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted">
                  <span className="font-semibold text-ink">{totalEligibleJobs}</span> eligible jobs
                </span>
                <span className="text-muted">
                  <span className="font-semibold text-success">{availableCount}</span> without invoices
                </span>
                {alreadyInvoicedCount > 0 && (
                  <span className="text-muted">
                    <span className="font-semibold text-warning">{alreadyInvoicedCount}</span> already invoiced
                  </span>
                )}
              </div>
              {alreadyInvoicedCount > 0 && !showAll && (
                <p className="text-xs text-muted">
                  Some jobs already have invoices and are hidden.
                </p>
              )}
            </div>

            {alreadyInvoicedCount > 0 && (
              <a
                href={showAll ? '/admin/invoices/new' : '/admin/invoices/new?showAll=true'}
                className="px-4 py-2 text-sm font-medium text-primary hover:text-primary-dark border border-primary/20 hover:border-primary/40 rounded-lg transition-colors"
              >
                {showAll ? 'Hide invoiced jobs' : 'Show all jobs'}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Warning if counts seem wrong */}
      {availableCount === 0 && totalEligibleJobs > 0 && !showAll && (
        <div className="glass-card mb-6 bg-warning/10 border-warning/20">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-ink">All {totalEligibleJobs} jobs already have invoices</p>
              <p className="text-sm text-muted mt-1">
                Check the debug info above to see which jobs and invoices are in the system. Click "Show all jobs" below to see all jobs and optionally create additional invoices.
              </p>
            </div>
          </div>
        </div>
      )}

      <CreateInvoiceForm
        businessId={profile.business_id}
        jobs={availableJobs}
        services={services || []}
        showAll={showAll}
        preSelectedJobId={preSelectedJobId}
      />
    </div>
  )
}
