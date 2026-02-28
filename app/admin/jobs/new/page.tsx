import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewJobForm from '@/components/admin/NewJobForm'
import { ArrowLeft } from '@/components/ui/lucide'
import Link from 'next/link'

export default async function NewJobPage({
  searchParams,
}: {
  searchParams?: Promise<{ customer?: string }> | { customer?: string }
}) {
  const supabase = await createClient()
  const params = searchParams ? await Promise.resolve(searchParams) : undefined
  const initialCustomerId = params?.customer || ''

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

  // Get customers for the business
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', profile.business_id)
    .order('name', { ascending: true })

  // Get technicians for the business
  const { data: technicians } = await supabase
    .from('users')
    .select('*')
    .eq('business_id', profile.business_id)
    .eq('role', 'tech')
    .order('full_name', { ascending: true })

  // Get active services for the business
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', profile.business_id)
    .eq('is_active', true)
    .order('name', { ascending: true })

  // Dispatch co-pilot context: recent + upcoming jobs with service links
  const dispatchWindowStart = new Date()
  dispatchWindowStart.setDate(dispatchWindowStart.getDate() - 120)
  const dispatchWindowEnd = new Date()
  dispatchWindowEnd.setDate(dispatchWindowEnd.getDate() + 30)

  const { data: dispatchJobsData } = await supabase
    .from('jobs')
    .select(`
      id,
      customer_id,
      technician_id,
      scheduled_start,
      scheduled_end,
      status,
      job_services(service_id)
    `)
    .eq('business_id', profile.business_id)
    .gte('scheduled_start', dispatchWindowStart.toISOString())
    .lte('scheduled_start', dispatchWindowEnd.toISOString())

  return (
    <div className="mx-auto w-full max-w-[1300px]">
      <div className="mb-6">
        <Link
          href="/admin/jobs"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-secondary/80 px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Jobs
        </Link>
      </div>

      <div className="rounded-[28px] border border-slate-200/70 bg-white/85 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/50 sm:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Job Creation
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          Create Job
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
          Set customer, schedule, scope, and assignment in one focused flow.
        </p>
      </div>

      <div className="mt-6">
        <NewJobForm
          businessId={profile.business_id}
          customers={customers || []}
          technicians={technicians || []}
          services={services || []}
          dispatchContextJobs={(dispatchJobsData || []).map((job: any) => ({
            id: job.id,
            customer_id: job.customer_id,
            technician_id: job.technician_id,
            scheduled_start: job.scheduled_start,
            scheduled_end: job.scheduled_end,
            status: job.status,
            service_ids: (job.job_services || []).map((js: any) => js.service_id).filter(Boolean),
          }))}
          initialCustomerId={initialCustomerId}
        />
      </div>
    </div>
  )
}
