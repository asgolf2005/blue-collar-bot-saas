import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewJobForm from '@/components/admin/NewJobForm'
import { ArrowLeft, Sparkles, Users, Wrench } from '@/components/ui/lucide'
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

      <div className="relative overflow-hidden rounded-[28px] border border-border bg-gradient-to-br from-bg-secondary via-bg-secondary to-cyan-50/70 p-6 shadow-glass dark:to-cyan-500/10 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cyan-300/25 blur-3xl dark:bg-cyan-500/20" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-500/15" />

        <div className="relative z-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-100/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" />
            Next-Gen Job Composer
          </div>

          <h1 className="admin-page-header">
            Create a new job in seconds
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary sm:text-base">
            Assign the right customer, technician, services, and schedule in one sleek workflow optimized for dispatch speed.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-secondary/85 px-3 py-1.5 text-xs text-text-secondary">
              <Users className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              {customers?.length || 0} customers
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-secondary/85 px-3 py-1.5 text-xs text-text-secondary">
              <Wrench className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              {technicians?.length || 0} technicians
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-secondary/85 px-3 py-1.5 text-xs text-text-secondary">
              <Sparkles className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              {services?.length || 0} active services
            </div>
          </div>
        </div>
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

