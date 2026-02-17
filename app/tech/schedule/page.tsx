import { addDays, subDays } from 'date-fns'
import { redirect } from 'next/navigation'
import TechScheduleClient, { type TechScheduleJob } from '@/components/tech/TechScheduleClient'
import { createClient } from '@/lib/supabase/server'

const resolveSingle = <T,>(value: T | T[] | null | undefined) =>
  Array.isArray(value) ? value[0] : value ?? null

export default async function TechSchedulePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const today = new Date()
  const rangeStart = subDays(today, 60)
  const rangeEnd = addDays(today, 120)

  const { data: jobsData = [] } = await supabase
    .from('jobs')
    .select(
      `
      id,
      status,
      description,
      scheduled_start,
      scheduled_end,
      total_cost,
      customer:customers(id, name, phone, address)
    `
    )
    .eq('technician_id', user.id)
    .gte('scheduled_start', rangeStart.toISOString())
    .lte('scheduled_start', rangeEnd.toISOString())
    .order('scheduled_start', { ascending: true })

  const jobs = jobsData ?? []
  const jobIds = jobs.map((job) => job.id).filter(Boolean) as string[]

  const { data: jobServicesData = [] } = jobIds.length
    ? await supabase.from('job_services').select('job_id, service_id').in('job_id', jobIds)
    : { data: [] as Array<{ job_id: string; service_id: string | null }> }

  const serviceIds = Array.from(
    new Set((jobServicesData || []).map((row) => row.service_id).filter(Boolean))
  ) as string[]

  const { data: servicesData = [] } = serviceIds.length
    ? await supabase.from('services').select('id, name').in('id', serviceIds)
    : { data: [] as Array<{ id: string; name: string }> }

  const serviceMap = new Map((servicesData || []).map((service) => [service.id, service.name]))
  const servicesByJob = new Map<string, string[]>()

  for (const row of jobServicesData || []) {
    const serviceName = row.service_id ? serviceMap.get(row.service_id) : null
    if (!serviceName) continue
    const existing = servicesByJob.get(row.job_id) || []
    existing.push(serviceName)
    servicesByJob.set(row.job_id, existing)
  }

  const initialJobs: TechScheduleJob[] = jobs
    .filter((job) => Boolean(job.scheduled_start))
    .map((job) => {
      const customer = resolveSingle(job.customer)
      return {
        id: job.id,
        status: job.status || 'scheduled',
        scheduled_start: job.scheduled_start,
        scheduled_end: job.scheduled_end,
        description: job.description,
        total_cost: job.total_cost,
        customer: customer
          ? {
              id: customer.id,
              name: customer.name || 'Unknown Customer',
              phone: customer.phone,
              address: customer.address,
            }
          : null,
        service_names: servicesByJob.get(job.id) || [],
      }
    })

  return <TechScheduleClient initialJobs={initialJobs} todayIso={today.toISOString()} />
}
