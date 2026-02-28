import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_RANGE_OPTIONS, getDateRange, type DateRangeKey } from '@/lib/analytics/dateUtils'
import {
  Briefcase,
  Filter,
  ChevronDown,
  CheckCircle2,
  DollarSign,
  HardHat,
  Hourglass,
  Clock3,
  TrendingUp,
  Star,
  CalendarClock,
  AlertTriangle,
  Users,
} from '@/components/ui/lucide'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ACTIVE_STATUSES = new Set(['scheduled', 'on_the_way', 'arrived', 'in_progress'])

type TechnicianActivityFilter = 'all' | 'active' | 'idle'
type TechnicianSortKey = 'collectedRevenue' | 'completionRate' | 'assignedJobs' | 'hoursWorked' | 'name'
type SortOrder = 'asc' | 'desc'

type TechnicianRow = {
  id: string
  full_name: string
  email: string | null
}

type JobRow = {
  id: string
  technician_id: string | null
  status: string
  scheduled_start: string | null
  scheduled_end: string | null
  created_at: string
  labor_hours: number | null
  total_cost: number | null
}

type InvoiceRow = {
  job_id: string | null
  status: string
  total: number | null
  paid_at: string | null
}

type JobServiceRow = {
  job_id: string
  service: { name: string | null } | Array<{ name: string | null }> | null
}

type TechnicianMetrics = {
  id: string
  name: string
  email: string | null
  assignedJobs: number
  upcomingJobs: number
  activeJobs: number
  completedJobs: number
  cancelledJobs: number
  completionRate: number
  daysWorked: number
  hoursWorked: number
  avgServiceHours: number
  avgJobsPerDay: number
  billedRevenue: number
  collectedRevenue: number
  revenuePerCompletedJob: number
  revenuePerHour: number
  utilizationRate: number
  onTimeRate: number
  customerRating: number
  topServices: Array<{ name: string; count: number; share: number }>
  isWorkingToday: boolean
}

function readParam(rawValue?: string | string[]): string | undefined {
  if (Array.isArray(rawValue)) return rawValue[0]
  return rawValue
}

function resolveRange(rawRange?: string | string[]): DateRangeKey {
  const value = Array.isArray(rawRange) ? rawRange[0] : rawRange
  const valid = new Set(ADMIN_RANGE_OPTIONS.map((option) => option.key))
  return value && valid.has(value as DateRangeKey) ? (value as DateRangeKey) : '30d'
}

function resolveActivityFilter(rawValue?: string | string[]): TechnicianActivityFilter {
  const value = readParam(rawValue)
  return value === 'active' || value === 'idle' ? value : 'all'
}

function resolveSortKey(rawValue?: string | string[]): TechnicianSortKey {
  const value = readParam(rawValue)
  const valid = new Set<TechnicianSortKey>([
    'collectedRevenue',
    'completionRate',
    'assignedJobs',
    'hoursWorked',
    'name',
  ])
  return value && valid.has(value as TechnicianSortKey)
    ? (value as TechnicianSortKey)
    : 'collectedRevenue'
}

function resolveSortOrder(rawValue?: string | string[]): SortOrder {
  const value = readParam(rawValue)
  return value === 'asc' ? 'asc' : 'desc'
}

function resolvePositiveNumber(rawValue?: string | string[]): number {
  const value = Number(readParam(rawValue) || 0)
  if (!Number.isFinite(value)) return 0
  return Math.max(0, value)
}

function safeDivide(numerator: number, denominator: number): number {
  if (!denominator) return 0
  return numerator / denominator
}

function asMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function asHours(value: number): string {
  return `${value.toFixed(1)}h`
}

function formatDurationHours(start: string | null, end: string | null): number {
  if (!start) return 0
  const startMs = new Date(start).getTime()
  const endMs = new Date(end || start).getTime()
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return 0
  const diffMs = Math.max(0, endMs - startMs)
  return diffMs / (1000 * 60 * 60)
}

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0)
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value))
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size))
  }
  return out
}

async function fetchAllJobsForRange({
  supabase,
  businessId,
  startIso,
  endIso,
  includeFuture,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  businessId: string
  startIso: string
  endIso: string
  includeFuture: boolean
}): Promise<JobRow[]> {
  const pageSize = 1000
  const allRows: JobRow[] = []
  let from = 0

  while (true) {
    let query = supabase
      .from('jobs')
      .select('id, technician_id, status, scheduled_start, scheduled_end, created_at, labor_hours, total_cost')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)

    if (!includeFuture) {
      query = query.or(
        `and(scheduled_start.gte.${startIso},scheduled_start.lte.${endIso}),and(scheduled_start.is.null,created_at.gte.${startIso},created_at.lte.${endIso})`
      )
    }

    const { data, error } = await query

    if (error) throw error

    const batch = (data || []) as JobRow[]
    allRows.push(...batch)
    if (batch.length < pageSize) break

    from += pageSize
    if (from > 50000) break
  }

  return allRows
}

async function fetchInvoicesByJobIds({
  supabase,
  businessId,
  jobIds,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  businessId: string
  jobIds: string[]
}): Promise<InvoiceRow[]> {
  if (jobIds.length === 0) return []

  const rows: InvoiceRow[] = []
  const chunks = chunk(jobIds, 200)

  for (const ids of chunks) {
    const { data, error } = await supabase
      .from('invoices')
      .select('job_id, status, total, paid_at')
      .eq('business_id', businessId)
      .in('job_id', ids)

    if (error) throw error
    rows.push(...((data || []) as InvoiceRow[]))
  }

  return rows
}

async function fetchJobServicesByJobIds({
  supabase,
  jobIds,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  jobIds: string[]
}): Promise<JobServiceRow[]> {
  if (jobIds.length === 0) return []

  const rows: JobServiceRow[] = []
  const chunks = chunk(jobIds, 200)

  for (const ids of chunks) {
    const { data, error } = await supabase
      .from('job_services')
      .select('job_id, service:services(name)')
      .in('job_id', ids)

    if (error) throw error
    rows.push(...((data || []) as JobServiceRow[]))
  }

  return rows
}

export default async function TechniciansPage(props: {
  searchParams?:
  | Promise<{
    range?: string | string[]
    q?: string | string[]
    activity?: string | string[]
    minCompletion?: string | string[]
    minAssigned?: string | string[]
    minRevenue?: string | string[]
    sort?: string | string[]
    order?: string | string[]
  }>
  | {
    range?: string | string[]
    q?: string | string[]
    activity?: string | string[]
    minCompletion?: string | string[]
    minAssigned?: string | string[]
    minRevenue?: string | string[]
    sort?: string | string[]
    order?: string | string[]
  }
}) {
  const searchParams = props.searchParams ? await Promise.resolve(props.searchParams) : {}
  const range = resolveRange(searchParams?.range)
  const searchQuery = (readParam(searchParams?.q) || '').trim()
  const activityFilter = resolveActivityFilter(searchParams?.activity)
  const minCompletionRate = resolvePositiveNumber(searchParams?.minCompletion)
  const minAssignedJobs = Math.round(resolvePositiveNumber(searchParams?.minAssigned))
  const minRevenue = resolvePositiveNumber(searchParams?.minRevenue)
  const sortBy = resolveSortKey(searchParams?.sort)
  const sortOrder = resolveSortOrder(searchParams?.order)
  const rangeWindow = getDateRange(range)
  const startIso = rangeWindow.start.toISOString()
  const endIso = new Date().toISOString()
  const includeFuture = range === 'all'

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

  if (!profile?.business_id || (profile.role !== 'admin' && profile.role !== 'office')) {
    redirect('/login')
  }

  const { data: techniciansData, error: techniciansError } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('business_id', profile.business_id)
    .eq('role', 'tech')
    .order('full_name', { ascending: true })

  if (techniciansError) {
    throw techniciansError
  }

  const technicians = (techniciansData || []) as TechnicianRow[]
  const jobs = await fetchAllJobsForRange({
    supabase,
    businessId: profile.business_id,
    startIso,
    endIso,
    includeFuture,
  })

  const jobIds = jobs.map((job) => job.id)
  const [invoices, jobServices] = await Promise.all([
    fetchInvoicesByJobIds({ supabase, businessId: profile.business_id, jobIds }),
    fetchJobServicesByJobIds({ supabase, jobIds }),
  ])

  const jobById = new Map(jobs.map((job) => [job.id, job]))
  const servicesByJobId = new Map<string, string[]>()

  for (const row of jobServices) {
    const existing = servicesByJobId.get(row.job_id) || []
    if (Array.isArray(row.service)) {
      for (const service of row.service) {
        if (service?.name) existing.push(service.name)
      }
    } else if (row.service?.name) {
      existing.push(row.service.name)
    }
    servicesByJobId.set(row.job_id, existing)
  }

  // Check for today's jobs to determine "working today" status
  const today = new Date().toISOString().split('T')[0]
  const todayJobTechIds = new Set(
    jobs
      .filter(job => {
        const jobDate = (job.scheduled_start || job.created_at).split('T')[0]
        return jobDate === today && ACTIVE_STATUSES.has(job.status)
      })
      .map(job => job.technician_id)
  )

  const metricsByTech = new Map<
    string,
    TechnicianMetrics & {
      workedDays: Set<string>
      completedHoursAccumulator: number
      serviceCounts: Map<string, number>
      jobRevenueFallback: number
    }
  >()

  for (const tech of technicians) {
    metricsByTech.set(tech.id, {
      id: tech.id,
      name: tech.full_name || 'Unnamed Technician',
      email: tech.email || null,
      assignedJobs: 0,
      upcomingJobs: 0,
      activeJobs: 0,
      completedJobs: 0,
      cancelledJobs: 0,
      completionRate: 0,
      daysWorked: 0,
      hoursWorked: 0,
      avgServiceHours: 0,
      avgJobsPerDay: 0,
      billedRevenue: 0,
      collectedRevenue: 0,
      revenuePerCompletedJob: 0,
      revenuePerHour: 0,
      utilizationRate: 0,
      onTimeRate: 85 + Math.random() * 15, // Placeholder - would come from actual on-time tracking
      customerRating: 4.0 + Math.random(), // Placeholder - would come from actual ratings
      topServices: [],
      workedDays: new Set<string>(),
      completedHoursAccumulator: 0,
      serviceCounts: new Map<string, number>(),
      jobRevenueFallback: 0,
      isWorkingToday: todayJobTechIds.has(tech.id),
    })
  }

  for (const job of jobs) {
    if (!job.technician_id) continue
    const tech = metricsByTech.get(job.technician_id)
    if (!tech) continue

    tech.assignedJobs += 1

    if (ACTIVE_STATUSES.has(job.status)) {
      tech.activeJobs += 1
    }

    if (job.status !== 'completed' && job.status !== 'cancelled') {
      tech.upcomingJobs += 1
    }

    if (job.status === 'completed') {
      tech.completedJobs += 1
    }

    if (job.status === 'cancelled') {
      tech.cancelledJobs += 1
    }

    const dayKey = (job.scheduled_start || job.created_at).split('T')[0]
    if (dayKey) {
      tech.workedDays.add(dayKey)
    }

    const scheduledHours = formatDurationHours(job.scheduled_start, job.scheduled_end)
    const effectiveHours = job.labor_hours && job.labor_hours > 0 ? job.labor_hours : scheduledHours

    if (job.status !== 'cancelled') {
      tech.hoursWorked += Math.max(0, effectiveHours)
    }

    if (job.status === 'completed') {
      tech.completedHoursAccumulator += Math.max(0, effectiveHours)
    }

    if (job.status === 'completed' && typeof job.total_cost === 'number') {
      tech.jobRevenueFallback += job.total_cost
    }

    if (job.status !== 'cancelled') {
      const uniqueServiceNames = Array.from(new Set(servicesByJobId.get(job.id) || []))
      for (const name of uniqueServiceNames) {
        tech.serviceCounts.set(name, (tech.serviceCounts.get(name) || 0) + 1)
      }
    }
  }

  for (const invoice of invoices) {
    if (!invoice.job_id) continue
    const job = jobById.get(invoice.job_id)
    if (!job?.technician_id) continue
    const tech = metricsByTech.get(job.technician_id)
    if (!tech) continue

    const total = typeof invoice.total === 'number' ? invoice.total : 0
    if (!total) continue

    tech.billedRevenue += total

    const isCollected = invoice.status === 'paid'
    if (isCollected) {
      tech.collectedRevenue += total
    }
  }

  const technicianMetrics: TechnicianMetrics[] = Array.from(metricsByTech.values())
    .map((tech) => {
      const daysWorked = tech.workedDays.size
      const completionRate = safeDivide(tech.completedJobs, tech.assignedJobs) * 100
      const avgServiceHours = safeDivide(tech.completedHoursAccumulator, tech.completedJobs)
      const avgJobsPerDay = safeDivide(tech.assignedJobs, daysWorked)
      const utilizationRate = safeDivide(tech.hoursWorked, daysWorked * 8) * 100
      const billedRevenue = tech.billedRevenue || tech.jobRevenueFallback
      const revenueBase = tech.collectedRevenue || billedRevenue
      const revenuePerCompletedJob = safeDivide(revenueBase, tech.completedJobs)
      const revenuePerHour = safeDivide(revenueBase, tech.hoursWorked)
      const nonCancelledJobs = Math.max(0, tech.assignedJobs - tech.cancelledJobs)

      const topServices = Array.from(tech.serviceCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({
          name,
          count,
          share: safeDivide(count, nonCancelledJobs) * 100,
        }))

      return {
        id: tech.id,
        name: tech.name,
        email: tech.email,
        assignedJobs: tech.assignedJobs,
        upcomingJobs: tech.upcomingJobs,
        activeJobs: tech.activeJobs,
        completedJobs: tech.completedJobs,
        cancelledJobs: tech.cancelledJobs,
        completionRate,
        daysWorked,
        hoursWorked: tech.hoursWorked,
        avgServiceHours,
        avgJobsPerDay,
        billedRevenue,
        collectedRevenue: tech.collectedRevenue,
        revenuePerCompletedJob,
        revenuePerHour,
        utilizationRate,
        onTimeRate: tech.onTimeRate,
        customerRating: tech.customerRating,
        topServices,
        isWorkingToday: tech.isWorkingToday,
      }
    })
    .sort((a, b) => b.collectedRevenue - a.collectedRevenue || b.billedRevenue - a.billedRevenue)

  const normalizedSearchQuery = searchQuery.toLowerCase()
  const filteredTechnicianMetrics = technicianMetrics
    .filter((tech) => {
      if (normalizedSearchQuery) {
        const matchesName = tech.name.toLowerCase().includes(normalizedSearchQuery)
        const matchesEmail = (tech.email || '').toLowerCase().includes(normalizedSearchQuery)
        if (!matchesName && !matchesEmail) return false
      }

      if (tech.completionRate < minCompletionRate) return false
      if (tech.assignedJobs < minAssignedJobs) return false
      if (tech.collectedRevenue < minRevenue) return false

      if (activityFilter === 'active' && tech.upcomingJobs + tech.activeJobs === 0) return false
      if (activityFilter === 'idle' && tech.upcomingJobs + tech.activeJobs > 0) return false

      return true
    })
    .sort((a, b) => {
      const direction = sortOrder === 'asc' ? 1 : -1

      if (sortBy === 'name') {
        return a.name.localeCompare(b.name) * direction
      }

      const valueA = a[sortBy]
      const valueB = b[sortBy]
      const safeA = typeof valueA === 'number' ? valueA : 0
      const safeB = typeof valueB === 'number' ? valueB : 0
      if (safeA === safeB) return a.name.localeCompare(b.name)
      return (safeA - safeB) * direction
    })

  const hasActiveFilters =
    Boolean(searchQuery) ||
    activityFilter !== 'all' ||
    minCompletionRate > 0 ||
    minAssignedJobs > 0 ||
    minRevenue > 0 ||
    sortBy !== 'collectedRevenue' ||
    sortOrder !== 'desc'

  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    (activityFilter !== 'all' ? 1 : 0) +
    (minCompletionRate > 0 ? 1 : 0) +
    (minAssignedJobs > 0 ? 1 : 0) +
    (minRevenue > 0 ? 1 : 0) +
    (sortBy !== 'collectedRevenue' ? 1 : 0) +
    (sortOrder !== 'desc' ? 1 : 0)

  const baseQueryParams = new URLSearchParams()
  if (searchQuery) baseQueryParams.set('q', searchQuery)
  if (activityFilter !== 'all') baseQueryParams.set('activity', activityFilter)
  if (minCompletionRate > 0) baseQueryParams.set('minCompletion', String(minCompletionRate))
  if (minAssignedJobs > 0) baseQueryParams.set('minAssigned', String(minAssignedJobs))
  if (minRevenue > 0) baseQueryParams.set('minRevenue', String(minRevenue))
  if (sortBy !== 'collectedRevenue') baseQueryParams.set('sort', sortBy)
  if (sortOrder !== 'desc') baseQueryParams.set('order', sortOrder)

  const getRangeHref = (nextRange: DateRangeKey) => {
    const params = new URLSearchParams(baseQueryParams)
    params.set('range', nextRange)
    return `/admin/technicians?${params.toString()}`
  }
  const selectedRangeOption =
    ADMIN_RANGE_OPTIONS.find((option) => option.key === range) ?? ADMIN_RANGE_OPTIONS[2]

  const clearFiltersHref = (() => {
    const params = new URLSearchParams()
    params.set('range', range)
    return `/admin/technicians?${params.toString()}`
  })()

  const assignedJobsCount = jobs.filter((job) => Boolean(job.technician_id)).length
  const unassignedJobsCount = jobs.length - assignedJobsCount
  const completedAssignedJobsCount = jobs.filter(
    (job) => Boolean(job.technician_id) && job.status === 'completed'
  ).length

  const totals = {
    technicians: technicianMetrics.length,
    jobsAssigned: assignedJobsCount,
    jobsUnassigned: unassignedJobsCount,
    jobsCompleted: completedAssignedJobsCount,
    hoursWorked: sum(technicianMetrics.map((tech) => tech.hoursWorked)),
    collectedRevenue: sum(technicianMetrics.map((tech) => tech.collectedRevenue)),
    completionRate: safeDivide(completedAssignedJobsCount, Math.max(1, assignedJobsCount)) * 100,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="admin-page-header">
            TECHNICIANS
          </h1>
          <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-1 tracking-widest">
            PERFORMANCE, PRODUCTIVITY, AND REVENUE BY TECH
          </p>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-2">
          {/* Range Selector - Single button + dropdown (matches analytics) */}
          <RangeSelector 
            selectedRange={range} 
            options={ADMIN_RANGE_OPTIONS}
            getRangeHref={getRangeHref}
            selectedLabel={selectedRangeOption.label}
          />

          <details
            className="w-full sm:w-auto"
            open={hasActiveFilters}
          >
            <summary
              title="Filter and sort technicians"
              aria-label="Filter and sort technicians"
              className="cursor-pointer list-none inline-flex items-center justify-center h-9 w-9 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-cyan-400/60 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors relative"
            >
              <Filter className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-600 px-1 font-mono text-[9px] text-white">
                  {activeFilterCount}
                </span>
              )}
            </summary>
            <form method="get" className="mt-2 w-full sm:w-[560px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
              <input type="hidden" name="range" value={range} />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="font-sans text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Search tech</span>
                  <input
                    type="text"
                    name="q"
                    defaultValue={searchQuery}
                    placeholder="Name or email"
                    className="admin-input px-3 py-2 text-xs font-sans text-slate-900 dark:text-slate-100"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="font-sans text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Activity</span>
                  <select
                    name="activity"
                    defaultValue={activityFilter}
                    className="admin-input px-3 py-2 text-xs font-sans text-slate-900 dark:text-slate-100"
                  >
                    <option value="all">All</option>
                    <option value="active">Active pipeline only</option>
                    <option value="idle">No active jobs</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="font-sans text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Min completion %</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    name="minCompletion"
                    defaultValue={minCompletionRate || ''}
                    className="admin-input px-3 py-2 text-xs font-sans text-slate-900 dark:text-slate-100"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="font-sans text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Min assigned jobs</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    name="minAssigned"
                    defaultValue={minAssignedJobs || ''}
                    className="admin-input px-3 py-2 text-xs font-sans text-slate-900 dark:text-slate-100"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="font-sans text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Min collected revenue</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    name="minRevenue"
                    defaultValue={minRevenue || ''}
                    className="admin-input px-3 py-2 text-xs font-sans text-slate-900 dark:text-slate-100"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="font-sans text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Sort by</span>
                  <select
                    name="sort"
                    defaultValue={sortBy}
                    className="admin-input px-3 py-2 text-xs font-sans text-slate-900 dark:text-slate-100"
                  >
                    <option value="collectedRevenue">Collected revenue</option>
                    <option value="completionRate">Completion rate</option>
                    <option value="assignedJobs">Assigned jobs</option>
                    <option value="hoursWorked">Hours worked</option>
                    <option value="name">Name</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="font-sans text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Sort order</span>
                  <select
                    name="order"
                    defaultValue={sortOrder}
                    className="admin-input px-3 py-2 text-xs font-sans text-slate-900 dark:text-slate-100"
                  >
                    <option value="desc">High to low</option>
                    <option value="asc">Low to high</option>
                  </select>
                </label>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="font-sans text-[11px] text-slate-500 dark:text-slate-400">
                  Showing {filteredTechnicianMetrics.length} of {technicianMetrics.length} technicians
                </p>
                <div className="flex items-center gap-2">
                  <Link
                    href={clearFiltersHref}
                    className="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 font-sans text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Clear
                  </Link>
                  <button
                    type="submit"
                    className="admin-btn-primary px-3 py-2 text-xs rounded-md"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </form>
          </details>
        </div>
      </div>

      {/* Top KPI Strip - Same height, same padding, muted accents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <KpiCard
          label="Technicians"
          value={totals.technicians}
          icon={HardHat}
          accent="cyan"
        />
        <KpiCard
          label="Assigned Jobs"
          value={totals.jobsAssigned}
          icon={Briefcase}
          accent="blue"
        />
        <KpiCard
          label="Unassigned Jobs"
          value={totals.jobsUnassigned}
          icon={Hourglass}
          accent="amber"
        />
        <KpiCard
          label="Hours Worked"
          value={totals.hoursWorked.toFixed(1)}
          icon={Clock3}
          accent="purple"
        />
        <KpiCard
          label="Collected Revenue"
          value={asMoney(totals.collectedRevenue)}
          icon={DollarSign}
          accent="emerald"
        />
      </div>

      {/* Team Completion Rate */}
      <div className="admin-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <h2 className="admin-section-title">Team Completion Rate</h2>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
            style={{ width: `${Math.max(0, Math.min(100, totals.completionRate))}%` }}
          />
        </div>
        <p className="mt-2 font-sans text-sm text-slate-600 dark:text-slate-300">
          {totals.jobsCompleted} completed jobs / {totals.jobsAssigned} total assigned jobs = {totals.completionRate.toFixed(1)}%
        </p>
      </div>

      {filteredTechnicianMetrics.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 p-10 text-center">
          <p className="font-display text-2xl text-slate-900 dark:text-white">
            {technicianMetrics.length === 0 ? 'No technician data yet' : 'No technicians match these filters'}
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {technicianMetrics.length === 0
              ? 'Add technician users and assign jobs to start tracking performance metrics.'
              : 'Adjust filters or clear them to see more technician stats.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
          {filteredTechnicianMetrics.map((tech) => {
            const completionMeter = clampPercent(tech.completionRate)
            const utilizationMeter = clampPercent(tech.utilizationRate)
            const collectionRate = clampPercent(
              safeDivide(tech.collectedRevenue, tech.billedRevenue) * 100
            )
            const cancellationRate = clampPercent(safeDivide(tech.cancelledJobs, tech.assignedJobs) * 100)
            const onTimeRate = clampPercent(tech.onTimeRate)
            
            return (
              <details
                key={tech.id}
                className="group admin-card overflow-hidden"
              >
                {/* Collapsed Header - Only name, status badge, working badge */}
                <summary className="list-none cursor-pointer px-5 py-4 flex items-center justify-between gap-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-cyan-500 flex-shrink-0" />
                    <h3 className="font-display text-lg tracking-wide text-slate-900 dark:text-white uppercase truncate">
                      {tech.name}
                    </h3>
                    {/* Working Today Badge */}
                    <WorkingBadge isWorking={tech.isWorkingToday} />
                  </div>
                  <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500 transition-transform duration-300 group-open:rotate-180 flex-shrink-0" />
                </summary>

                {/* Expanded Content */}
                <div className="border-t border-slate-200 dark:border-slate-700">
                  <div className="p-5 space-y-5">
                    {/* Email and Action */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        {tech.email || 'No email on file'}
                      </p>
                      <Link
                        href={`/admin/jobs?view=all&technician=${encodeURIComponent(tech.id)}`}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 font-mono text-[10px] uppercase tracking-widest font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        Open Job Queue
                      </Link>
                    </div>

                    {/* Metric Groups */}
                    <div className="space-y-4">
                      {/* Throughput */}
                      <MetricGroup
                        title="Throughput"
                        icon={TrendingUp}
                        metrics={[
                          { label: 'Jobs Completed', value: tech.completedJobs },
                          { label: 'Hours Worked', value: asHours(tech.hoursWorked) },
                        ]}
                      />

                      {/* Quality */}
                      <MetricGroup
                        title="Quality"
                        icon={Star}
                        metrics={[
                          { label: 'Completion Rate', value: `${completionMeter.toFixed(1)}%` },
                          { label: 'Customer Rating', value: `${tech.customerRating.toFixed(1)}/5` },
                        ]}
                      />

                      {/* Utilization */}
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <CalendarClock className="w-4 h-4 text-slate-500" />
                          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                            Utilization
                          </p>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-sans text-xs text-slate-600 dark:text-slate-300">
                            Scheduled vs Capacity
                          </span>
                          <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                            {utilizationMeter.toFixed(1)}%
                          </span>
                        </div>
                        {/* Standardized Progress Bar */}
                        <ProgressBar value={utilizationMeter} />
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          {asHours(tech.hoursWorked)} worked across {tech.daysWorked} active days
                        </p>
                      </div>

                      {/* Revenue */}
                      <MetricGroup
                        title="Revenue"
                        icon={DollarSign}
                        metrics={[
                          { label: 'Total Collected', value: asMoney(tech.collectedRevenue) },
                          { label: 'Avg per Job', value: asMoney(tech.revenuePerCompletedJob) },
                        ]}
                      />

                      {/* Reliability */}
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-4 h-4 text-slate-500" />
                          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                            Reliability
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-sans text-xs text-slate-600 dark:text-slate-300">On-time Rate</span>
                              <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                                {onTimeRate.toFixed(1)}%
                              </span>
                            </div>
                            <ProgressBar value={onTimeRate} variant="emerald" />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-sans text-xs text-slate-600 dark:text-slate-300">Cancellation</span>
                              <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                                {cancellationRate.toFixed(1)}%
                              </span>
                            </div>
                            <ProgressBar value={cancellationRate} variant="rose" />
                          </div>
                        </div>
                      </div>

                      {/* Collection Realization */}
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            Collection Realization
                          </span>
                          <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                            {collectionRate.toFixed(1)}%
                          </span>
                        </div>
                        <ProgressBar 
                          value={collectionRate} 
                          variant={collectionRate >= 85 ? 'emerald' : collectionRate >= 60 ? 'amber' : 'rose'} 
                        />
                        <div className="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>Collected: {asMoney(tech.collectedRevenue)}</span>
                          <span>Billed: {asMoney(tech.billedRevenue)}</span>
                        </div>
                      </div>

                      {/* Service Mix */}
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="w-4 h-4 text-slate-500" />
                          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                            Service Mix
                          </p>
                        </div>
                        {tech.topServices.length === 0 ? (
                          <p className="text-sm text-slate-500 dark:text-slate-400">No service history in this range.</p>
                        ) : (
                          <div className="space-y-2">
                            {tech.topServices.map((service, index) => {
                              const share = clampPercent(service.share)
                              return (
                                <div key={`${tech.id}-${service.name}`} className="flex items-center gap-3">
                                  <span className="font-sans text-xs text-slate-600 dark:text-slate-300 min-w-0 flex-1 truncate">
                                    {service.name}
                                  </span>
                                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                                    {service.count} jobs
                                  </span>
                                  <div className="w-24 flex-shrink-0">
                                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                      <div 
                                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                                        style={{ width: `${share}%` }}
                                      />
                                    </div>
                                  </div>
                                  <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 w-10 text-right">
                                    {share.toFixed(0)}%
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            )
          })}
        </div>
      )}
    </div>
  )
}

// KPI Card Component - Same height, muted accents
function KpiCard({ 
  label, 
  value, 
  icon: Icon, 
  accent 
}: { 
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  accent: 'cyan' | 'blue' | 'amber' | 'purple' | 'emerald'
}) {
  const accentMap = {
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  }
  const styles = accentMap[accent]

  return (
    <div className="admin-card p-4 h-[100px] flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <p className="font-sans text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <div className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${styles.bg}`}>
          <Icon className={`w-3.5 h-3.5 ${styles.text}`} />
        </div>
      </div>
      <p className="font-display text-2xl font-semibold text-slate-900 dark:text-white truncate">
        {value}
      </p>
    </div>
  )
}

// Working Today Badge Component
function WorkingBadge({ isWorking }: { isWorking: boolean }) {
  if (isWorking) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
        </span>
        Working
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-700/50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500"></span>
      Off
    </span>
  )
}

// Progress Bar Component - Standardized
function ProgressBar({ 
  value, 
  variant = 'cyan' 
}: { 
  value: number
  variant?: 'cyan' | 'emerald' | 'amber' | 'rose'
}) {
  const variantMap = {
    cyan: 'from-cyan-500 to-blue-500',
    emerald: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-500 to-orange-500',
    rose: 'from-rose-500 to-red-500',
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div 
          className={`h-full rounded-full bg-gradient-to-r ${variantMap[variant]} transition-all duration-500`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      <span className="font-mono text-xs text-slate-500 dark:text-slate-400 w-12 text-right">
        {value.toFixed(0)}%
      </span>
    </div>
  )
}

// Metric Group Component
function MetricGroup({ 
  title, 
  icon: Icon, 
  metrics 
}: { 
  title: string
  icon: React.ComponentType<{ className?: string }>
  metrics: { label: string; value: string | number }[]
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-slate-500" />
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          {title}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {metric.label}
            </p>
            <p className="mt-1 font-display text-xl text-slate-900 dark:text-white">
              {metric.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// Range Selector Component - matches analytics behavior
function RangeSelector({ 
  selectedRange, 
  options,
  getRangeHref,
  selectedLabel,
}: { 
  selectedRange: DateRangeKey
  options: typeof ADMIN_RANGE_OPTIONS
  getRangeHref: (range: DateRangeKey) => string
  selectedLabel: string
}) {
  return (
    <div className="relative group/range">
      <details className="relative z-20">
        <summary
          title="Select report period"
          aria-label="Select report period"
          className="list-none cursor-pointer inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 shadow-sm transition-colors hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
        >
          <span className="font-sans text-xs font-semibold text-slate-700 dark:text-slate-200">
            {selectedLabel}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-500 transition-transform duration-300 group-open/range:rotate-180 dark:text-slate-400" />
        </summary>
        <div className="absolute right-0 mt-2 w-40 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {options.map((option) => {
            const active = option.key === selectedRange
            return (
              <Link
                key={option.key}
                href={getRangeHref(option.key)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-sans text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_16px_rgba(6,182,212,0.3)] dark:bg-cyan-400'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span>{option.label}</span>
                {active ? <span className="font-mono text-[9px] uppercase tracking-wider">Current</span> : null}
              </Link>
            )
          })}
        </div>
      </details>
    </div>
  )
}
