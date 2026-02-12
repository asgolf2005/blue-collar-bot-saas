import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnalyticsClient from './components/AnalyticsClient'
import { 
  InvoiceWithRelations, 
  JobWithRelations
} from '@/lib/analytics/types'
import { getDateRange } from '@/lib/analytics/dateUtils'
import { 
  calculateMetrics,
  calculateStatusData,
  calculateTechnicianData,
  calculateServiceData,
  generateDailyRevenueData
} from '@/lib/analytics/calculations'

// Prevent caching to ensure fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

function isWithinRange(value: string | null | undefined, start: Date, end: Date): boolean {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return date >= start && date <= end
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined }
}) {
  const params = searchParams ? await Promise.resolve(searchParams) : {}
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile with business_id
  const { data: profile } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.business_id) {
    redirect('/login')
  }

  const businessId = profile.business_id
  const rawRange = Array.isArray(params?.range) ? params?.range[0] : params?.range
  const validRanges = new Set(['7d', '30d', '90d', 'ytd'])
  const range = validRanges.has(rawRange || '') ? (rawRange as '7d' | '30d' | '90d' | 'ytd') : '30d'
  const dateRange = getDateRange(range as any)

  // Fetch business data and apply range in memory for current + previous period
  const { data: jobsData = [] } = await supabase
    .from('jobs')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  const { data: invoicesData = [] } = await supabase
    .from('invoices')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  // Fetch related data separately
  const { data: customersData = [] } = await supabase
    .from('customers')
    .select('id, name')
    .eq('business_id', businessId)

  const { data: usersData = [] } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('business_id', businessId)

  const { data: servicesData = [] } = await supabase
    .from('services')
    .select('id, name')
    .eq('business_id', businessId)

  const jobIds = (jobsData || []).map(job => job.id)
  const { data: jobServicesData = [] } = jobIds.length
    ? await supabase
        .from('job_services')
        .select('job_id, service_id')
        .in('job_id', jobIds)
    : { data: [] as Array<{ job_id: string; service_id: string }> }

  // Build lookup maps
  const customerMap = new Map((customersData || []).map(c => [c.id, c.name]))
  const userMap = new Map((usersData || []).map(u => [u.id, u.full_name]))
  const serviceMap = new Map((servicesData || []).map(s => [s.id, s.name]))
  const jobMap = new Map((jobsData || []).map(job => [job.id, job]))
  const jobServiceNames = new Map<string, string[]>()

  ;(jobServicesData || []).forEach((row) => {
    const serviceName = row.service_id ? serviceMap.get(row.service_id) : null
    if (!serviceName) return
    const existing = jobServiceNames.get(row.job_id) || []
    existing.push(serviceName)
    jobServiceNames.set(row.job_id, existing)
  })

  // Transform to proper types with related data
  const allJobs: JobWithRelations[] = (jobsData || []).map((j: any) => ({
    id: j.id,
    status: j.status,
    total_cost: j.total_cost,
    created_at: j.created_at,
    scheduled_start: j.scheduled_start,
    scheduled_end: j.scheduled_end,
    completed_at: null,
    description: j.description,
    customer: j.customer_id ? { name: customerMap.get(j.customer_id) || 'Unknown' } : null,
    technician: j.technician_id ? { 
      id: j.technician_id,
      full_name: userMap.get(j.technician_id) || 'Unknown'
    } : null,
    service: (jobServiceNames.get(j.id) || [])[0]
      ? { name: (jobServiceNames.get(j.id) || [])[0] }
      : null
  }))

  const allInvoices: InvoiceWithRelations[] = (invoicesData || []).map((i: any) => {
    const relatedJob = i.job_id ? jobMap.get(i.job_id) : null
    const serviceName = i.job_id ? (jobServiceNames.get(i.job_id) || [])[0] : null

    return {
    id: i.id,
    status: i.status,
    total: i.total,
    subtotal: i.subtotal,
    tax: i.tax,
    created_at: i.created_at,
    paid_at: i.paid_at,
    issue_date: i.issue_date,
    due_date: i.due_date,
    customer: i.customer_id ? { name: customerMap.get(i.customer_id) || 'Unknown' } : null,
    job: i.job_id ? {
      id: i.job_id,
      status: relatedJob?.status || '',
      technician: relatedJob?.technician_id
        ? {
            id: relatedJob.technician_id,
            full_name: userMap.get(relatedJob.technician_id) || 'Unknown'
          }
        : null,
      service: serviceName ? { name: serviceName } : null
    } : null
  }})

  const currentJobs = allJobs.filter(job =>
    isWithinRange(job.scheduled_start || job.created_at, dateRange.start, dateRange.end)
  )
  const prevJobs = allJobs.filter(job =>
    isWithinRange(job.scheduled_start || job.created_at, dateRange.prevStart, dateRange.prevEnd)
  )
  const currentInvoices = allInvoices.filter(invoice =>
    isWithinRange(invoice.paid_at || invoice.created_at, dateRange.start, dateRange.end)
  )
  const prevInvoices = allInvoices.filter(invoice =>
    isWithinRange(invoice.paid_at || invoice.created_at, dateRange.prevStart, dateRange.prevEnd)
  )

  // Calculate all metrics
  const metrics = calculateMetrics({
    currentJobs,
    currentInvoices,
    prevJobs,
    prevInvoices
  })

  // Generate chart data
  const revenueData = generateDailyRevenueData(currentInvoices, currentJobs, dateRange)
  const statusData = calculateStatusData(currentJobs)
  const technicianData = calculateTechnicianData(currentJobs, currentInvoices)
  const serviceData = calculateServiceData(currentJobs, currentInvoices)

  return (
    <AnalyticsClient
      initialRange={range}
      metrics={metrics}
      revenueData={revenueData}
      statusData={statusData}
      technicianData={technicianData}
      serviceData={serviceData}
    />
  )
}
