import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnalyticsClient from './components/AnalyticsClient'
import {
  InvoiceWithRelations,
  JobWithRelations,
  OpsHealthData,
} from '@/lib/analytics/types'
import { getDateRange, resolveDateRangeKey, type DateRangeKey } from '@/lib/analytics/dateUtils'
import {
  calculateMetrics,
  calculateTechnicianData,
  calculateServiceData,
  generateDailyRevenueData,
} from '@/lib/analytics/calculations'
import {
  fetchCustomerNames,
  fetchInvoicesInWindow,
  fetchJobsInWindow,
  fetchServiceNamesByJob,
  fetchUserNames,
} from '@/lib/analytics/server-queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function isWithinRange(value: string | null | undefined, start: Date, end: Date): boolean {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return date >= start && date <= end
}

function hoursBetween(start: string | null, end: string | null): number {
  if (!start || !end) return 2
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return 2
  return (endMs - startMs) / (1000 * 60 * 60)
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined }
}) {
  const params = searchParams ? await Promise.resolve(searchParams) : {}
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.business_id) redirect('/login')

  const businessId = profile.business_id
  const range: DateRangeKey = resolveDateRangeKey(params?.range)
  const dateRange = getDateRange(range)

  const [jobsData, invoicesData] = await Promise.all([
    fetchJobsInWindow({
      supabase,
      businessId,
      start: dateRange.prevStart,
      end: dateRange.end,
    }),
    fetchInvoicesInWindow({
      supabase,
      businessId,
      start: dateRange.prevStart,
      end: dateRange.end,
    }),
  ])
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('id, full_name, role')
    .eq('business_id', businessId)
  if (usersError) throw usersError
  const users = usersData ?? []

  const customerIds = Array.from(
    new Set([
      ...jobsData.map((job) => job.customer_id).filter((value): value is string => Boolean(value)),
      ...invoicesData.map((invoice) => invoice.customer_id).filter((value): value is string => Boolean(value)),
    ])
  )
  const technicianIds = Array.from(
    new Set(jobsData.map((job) => job.technician_id).filter((value): value is string => Boolean(value)))
  )
  const jobIds = jobsData.map((job) => job.id)

  const [customerMap, technicianMap, jobServiceNames] = await Promise.all([
    fetchCustomerNames({ supabase, businessId, customerIds }),
    fetchUserNames({ supabase, businessId, userIds: technicianIds }),
    fetchServiceNamesByJob({ supabase, businessId, jobIds }),
  ])

  const jobMap = new Map(jobsData.map((job) => [job.id, job]))

  const allJobs: JobWithRelations[] = jobsData.map((job) => ({
    id: job.id,
    status: (job.status || 'scheduled') as JobWithRelations['status'],
    total_cost: job.total_cost,
    created_at: job.created_at,
    scheduled_start: job.scheduled_start,
    scheduled_end: job.scheduled_end,
    completed_at: null,
    description: job.description,
    customer: job.customer_id ? { name: customerMap.get(job.customer_id) || 'Unknown' } : null,
    technician: job.technician_id
      ? {
          id: job.technician_id,
          full_name: technicianMap.get(job.technician_id) || 'Unknown',
        }
      : null,
    service: (jobServiceNames.get(job.id) || [])[0]
      ? { name: (jobServiceNames.get(job.id) || [])[0] }
      : null,
  }))

  const allInvoices: InvoiceWithRelations[] = invoicesData.map((invoice) => {
    const relatedJob = invoice.job_id ? jobMap.get(invoice.job_id) : null
    const serviceName = invoice.job_id ? (jobServiceNames.get(invoice.job_id) || [])[0] : null
    const techId = relatedJob?.technician_id || null
    return {
      id: invoice.id,
      status: (invoice.status || 'draft') as InvoiceWithRelations['status'],
      total: invoice.total || 0,
      subtotal: invoice.subtotal || 0,
      tax: invoice.tax || 0,
      created_at: invoice.created_at,
      paid_at: invoice.paid_at,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      customer: invoice.customer_id ? { name: customerMap.get(invoice.customer_id) || 'Unknown' } : null,
      job: invoice.job_id
        ? {
            id: invoice.job_id,
            status: relatedJob?.status || '',
            technician: techId
              ? {
                  id: techId,
                  full_name: technicianMap.get(techId) || 'Unknown',
                }
              : null,
            service: serviceName ? { name: serviceName } : null,
          }
        : null,
    }
  })

  const currentJobs = allJobs.filter((job) =>
    isWithinRange(job.scheduled_start || job.created_at, dateRange.start, dateRange.end)
  )
  const prevJobs = allJobs.filter((job) =>
    isWithinRange(job.scheduled_start || job.created_at, dateRange.prevStart, dateRange.prevEnd)
  )
  const currentInvoices = allInvoices.filter((invoice) =>
    isWithinRange(invoice.paid_at || invoice.created_at, dateRange.start, dateRange.end)
  )
  const prevInvoices = allInvoices.filter((invoice) =>
    isWithinRange(invoice.paid_at || invoice.created_at, dateRange.prevStart, dateRange.prevEnd)
  )

  const metrics = calculateMetrics({
    currentJobs,
    currentInvoices,
    prevJobs,
    prevInvoices,
  })
  const revenueData = generateDailyRevenueData(currentInvoices, currentJobs, dateRange)
  const technicianData = calculateTechnicianData(currentJobs, currentInvoices)
  const serviceData = calculateServiceData(currentJobs, currentInvoices)

  const techCount = users.filter((user) => user?.role === 'tech').length
  const activeStatuses = new Set(['scheduled', 'on_the_way', 'arrived', 'in_progress'])
  const now = new Date()

  const demandJobs = currentJobs.filter((job) => job.status !== 'cancelled').length
  const unassignedJobs = currentJobs.filter((job) => job.status !== 'cancelled' && !job.technician?.id).length
  const scheduledHours = currentJobs
    .filter((job) => job.status !== 'cancelled')
    .reduce((sum, job) => sum + hoursBetween(job.scheduled_start, job.scheduled_end), 0)

  const daysInRange = Math.max(1, Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)))
  const capacityHours = Math.max(0, techCount * daysInRange * 8)
  const capacityUtilizationPct = capacityHours > 0 ? (scheduledHours / capacityHours) * 100 : 0

  const activeWindowJobs = currentJobs.filter((job) => activeStatuses.has(job.status)).length
  const lateStartJobs = currentJobs.filter((job) => {
    if (!job.scheduled_start) return false
    if (!['scheduled', 'on_the_way', 'arrived'].includes(job.status)) return false
    return new Date(job.scheduled_start) < now
  }).length
  const overdueInProgressJobs = currentJobs.filter((job) => {
    if (job.status !== 'in_progress' || !job.scheduled_end) return false
    return new Date(job.scheduled_end) < now
  }).length
  const onTrackJobs = Math.max(0, activeWindowJobs - lateStartJobs - overdueInProgressJobs)
  const onTimeRate = activeWindowJobs > 0 ? (onTrackJobs / activeWindowJobs) * 100 : 100

  const opsHealth: OpsHealthData = {
    demandJobs,
    unassignedJobs,
    activeTechnicians: techCount,
    scheduledHours,
    capacityHours,
    capacityUtilizationPct,
    onTimeRate,
    lateStartJobs,
    overdueInProgressJobs,
    activeWindowJobs,
  }

  return (
    <AnalyticsClient
      initialRange={range}
      metrics={metrics}
      revenueData={revenueData}
      opsHealth={opsHealth}
      technicianData={technicianData}
      serviceData={serviceData}
    />
  )
}
