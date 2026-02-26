import { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export interface AnalyticsJobRow {
  id: string
  status: string
  total_cost: number | null
  created_at: string
  scheduled_start: string | null
  scheduled_end: string | null
  description: string | null
  customer_id: string | null
  technician_id: string | null
  urgency: string | null
  updated_at: string | null
}

export interface AnalyticsInvoiceRow {
  id: string
  invoice_number: string | null
  status: string
  total: number
  subtotal: number
  tax: number
  created_at: string
  paid_at: string | null
  issue_date: string
  due_date: string | null
  job_id: string | null
  customer_id: string | null
}

const JOB_SELECT = `
  id,
  status,
  total_cost,
  created_at,
  scheduled_start,
  scheduled_end,
  description,
  customer_id,
  technician_id,
  urgency,
  updated_at
`

const INVOICE_SELECT = `
  id,
  invoice_number,
  status,
  total,
  subtotal,
  tax,
  created_at,
  paid_at,
  issue_date,
  due_date,
  job_id,
  customer_id
`

function buildWindowFilter({
  primaryField,
  fallbackField,
  startIso,
  endIso,
}: {
  primaryField: string
  fallbackField: string
  startIso: string
  endIso: string
}): string {
  return [
    `and(${primaryField}.gte.${startIso},${primaryField}.lte.${endIso})`,
    `and(${primaryField}.is.null,${fallbackField}.gte.${startIso},${fallbackField}.lte.${endIso})`,
  ].join(',')
}

export async function fetchJobsInWindow({
  supabase,
  businessId,
  start,
  end,
}: {
  supabase: SupabaseServerClient
  businessId: string
  start: Date
  end: Date
}): Promise<AnalyticsJobRow[]> {
  const startIso = start.toISOString()
  const endIso = end.toISOString()
  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_SELECT)
    .eq('business_id', businessId)
    .or(
      buildWindowFilter({
        primaryField: 'scheduled_start',
        fallbackField: 'created_at',
        startIso,
        endIso,
      })
    )
    .order('scheduled_start', { ascending: false, nullsFirst: false })

  if (error) throw error
  return (data || []) as AnalyticsJobRow[]
}

export async function fetchInvoicesInWindow({
  supabase,
  businessId,
  start,
  end,
  statuses,
}: {
  supabase: SupabaseServerClient
  businessId: string
  start: Date
  end: Date
  statuses?: string[]
}): Promise<AnalyticsInvoiceRow[]> {
  const startIso = start.toISOString()
  const endIso = end.toISOString()
  let query = supabase
    .from('invoices')
    .select(INVOICE_SELECT)
    .eq('business_id', businessId)
    .or(
      buildWindowFilter({
        primaryField: 'paid_at',
        fallbackField: 'created_at',
        startIso,
        endIso,
      })
    )
    .order('created_at', { ascending: false })

  if (statuses && statuses.length > 0) {
    query = query.in('status', statuses)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as AnalyticsInvoiceRow[]
}

export async function fetchOpenJobsInScheduledWindow({
  supabase,
  businessId,
  start,
  end,
}: {
  supabase: SupabaseServerClient
  businessId: string
  start: Date
  end: Date
}): Promise<AnalyticsJobRow[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_SELECT)
    .eq('business_id', businessId)
    .in('status', ['scheduled', 'on_the_way', 'arrived', 'in_progress'])
    .gte('scheduled_start', start.toISOString())
    .lte('scheduled_start', end.toISOString())
    .order('scheduled_start', { ascending: true })

  if (error) throw error
  return (data || []) as AnalyticsJobRow[]
}

export async function fetchCustomerNames({
  supabase,
  businessId,
  customerIds,
}: {
  supabase: SupabaseServerClient
  businessId: string
  customerIds: string[]
}): Promise<Map<string, string>> {
  if (customerIds.length === 0) return new Map()
  const { data, error } = await supabase
    .from('customers')
    .select('id, name')
    .eq('business_id', businessId)
    .in('id', customerIds)

  if (error) throw error
  return new Map((data || []).map((row) => [row.id, row.name]))
}

export async function fetchUserNames({
  supabase,
  businessId,
  userIds,
}: {
  supabase: SupabaseServerClient
  businessId: string
  userIds: string[]
}): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map()
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('business_id', businessId)
    .in('id', userIds)

  if (error) throw error
  return new Map((data || []).map((row) => [row.id, row.full_name]))
}

export async function fetchServiceNamesByJob({
  supabase,
  businessId,
  jobIds,
}: {
  supabase: SupabaseServerClient
  businessId: string
  jobIds: string[]
}): Promise<Map<string, string[]>> {
  const namesByJob = new Map<string, string[]>()
  if (jobIds.length === 0) return namesByJob

  const { data: linkRows, error: linksError } = await supabase
    .from('job_services')
    .select('job_id, service_id')
    .in('job_id', jobIds)

  if (linksError) throw linksError
  const links = (linkRows || []) as Array<{ job_id: string; service_id: string | null }>
  const serviceIds = Array.from(
    new Set(links.map((row) => row.service_id).filter((value): value is string => Boolean(value)))
  )

  if (serviceIds.length === 0) return namesByJob

  const { data: serviceRows, error: servicesError } = await supabase
    .from('services')
    .select('id, name')
    .eq('business_id', businessId)
    .in('id', serviceIds)

  if (servicesError) throw servicesError

  const serviceNameMap = new Map((serviceRows || []).map((row) => [row.id, row.name]))
  for (const link of links) {
    if (!link.service_id) continue
    const name = serviceNameMap.get(link.service_id)
    if (!name) continue
    const existing = namesByJob.get(link.job_id) || []
    existing.push(name)
    namesByJob.set(link.job_id, existing)
  }

  return namesByJob
}
