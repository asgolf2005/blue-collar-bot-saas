import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { JobsRealtimeWrapper } from '@/components/admin/JobsRealtimeWrapper'
import { JobsPageClient } from '@/components/admin/JobsPageClient'
import { resolveControlPreset } from '@/lib/ui/control-presets'
import type { Job } from '@/lib/types'

export const dynamic = 'force-dynamic'



function resolveTechnicianFilter(technicianParam?: string | string[]): string | null {
  const technician = Array.isArray(technicianParam) ? technicianParam[0] : technicianParam
  if (!technician) return null
  const trimmed = technician.trim()
  return trimmed.length > 0 ? trimmed : null
}

const MAX_OPERATIONAL_JOBS = 2000
const INVOICE_BATCH_SIZE = 300

interface JobInvoiceSummary {
  job_id: string
  status: string
  total: number | null
  paid_at: string | null
  due_date: string | null
}

async function fetchOperationalJobs({
  supabase,
  businessId,
  maxRecords = MAX_OPERATIONAL_JOBS,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  businessId: string
  maxRecords?: number
}): Promise<Job[]> {
  const jobsSelect = `
    id,
    business_id,
    customer_id,
    technician_id,
    status,
    scheduled_start,
    scheduled_end,
    description,
    urgency,
    calendar_event_id,
    source,
    labor_hours,
    labor_rate,
    parts_cost,
    customer_signature,
    total_cost,
    created_at,
    updated_at,
    customer:customers(id,name),
    technician:users(id,full_name),
    services:job_services(service:services(id,name))
  `

  const { data, error } = await supabase
    .from('jobs')
    .select(jobsSelect)
    .eq('business_id', businessId)
    .order('scheduled_start', { ascending: false, nullsFirst: false })
    .limit(maxRecords)
    .returns<Job[]>()

  if (error) throw error

  // Keep client assumptions stable: return ascending by schedule.
  return (data || []).reverse()
}

async function fetchInvoicesForJobs({
  supabase,
  businessId,
  jobIds,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  businessId: string
  jobIds: string[]
}) {
  if (jobIds.length === 0) return [] as JobInvoiceSummary[]

  const rows: JobInvoiceSummary[] = []

  for (let i = 0; i < jobIds.length; i += INVOICE_BATCH_SIZE) {
    const batch = jobIds.slice(i, i + INVOICE_BATCH_SIZE)
    const { data, error } = await supabase
      .from('invoices')
      .select('job_id, status, total, paid_at, due_date')
      .eq('business_id', businessId)
      .in('job_id', batch)
      .returns<JobInvoiceSummary[]>()

    if (error) throw error
    rows.push(...(data || []))
  }

  return rows
}

export default async function JobsPage(props: {
  searchParams?: Promise<{
    technician?: string | string[]
    ui?: string | string[]
  }>
}) {
  const searchParams = (await props.searchParams) ?? {}
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/tech/today')

  const technicianFilterId = resolveTechnicianFilter(searchParams?.technician)
  const uiPreset = resolveControlPreset(searchParams?.ui)

  let jobs: Job[] = []
  let jobInvoices: JobInvoiceSummary[] = []

  try {
    jobs = await fetchOperationalJobs({
      supabase,
      businessId: profile.business_id,
    })
    jobInvoices = await fetchInvoicesForJobs({
      supabase,
      businessId: profile.business_id,
      jobIds: jobs.map((job) => job.id),
    })
  } catch (error) {
    console.error('Jobs query error:', error)
  }

  const technicianFilterName = technicianFilterId
    ? jobs.find((job) => job.technician_id === technicianFilterId)?.technician?.full_name || 'Selected technician'
    : null

  return (
    <JobsRealtimeWrapper businessId={profile.business_id} initialJobs={jobs}>
      <JobsPageClient
        uiPreset={uiPreset}
        technicianFilterId={technicianFilterId}
        technicianFilterName={technicianFilterName}
        jobInvoices={jobInvoices}
      />
    </JobsRealtimeWrapper>
  )
}
