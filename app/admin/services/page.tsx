'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ActionIconButton } from '@/components/ui/ActionSystem'
import {
  Plus,
  Briefcase,
  DollarSign,
  CheckCircle2,
  Clock,
  Search,
  ArrowRight,
  X,
  Activity,
  Gauge,
  ChevronDown,
} from '@/components/ui/lucide'
import { createClient } from '@/lib/supabase/client'
import { getDateRange, formatDisplayDate, resolveDateRangeKey, type DateRangeKey } from '@/lib/analytics/dateUtils'

type ServiceMaturity = 'Draft' | 'Early' | 'Established' | 'Scaled'

interface Service {
  id: string
  name: string
  description: string | null
  base_price: number | null
  duration_minutes: number | null
  is_active: boolean
  created_at: string
  times_booked: number
  times_completed: number
  jobs_30d: number
  completed_30d: number
  cancelled_30d: number
  billed_30d: number
  avg_duration_minutes_30d: number | null
  last_booked_at: string | null
  completion_rate_30d: number
  maturity: ServiceMaturity
}

type JobRow = {
  id: string
  status: string | null
  scheduled_start: string | null
  scheduled_end: string | null
  created_at: string
  total_cost: number | null
}

type UsageJobRow = {
  status: string | null
  scheduled_start: string | null
  scheduled_end: string | null
  total_cost: number | null
}

type JobServiceUsageRow = {
  service_id: string
  job_id: string
  jobs: UsageJobRow | UsageJobRow[] | null
}

type InvoiceRow = {
  job_id: string | null
  total: number | null
  created_at: string
}

const PAGE_SIZE = 1000

const NEW_SERVICE_BUTTON_CLASS =
  'text-xs px-5 py-2.5 transition-all whitespace-nowrap flex-nowrap rounded-full border border-cyan-400/50 bg-slate-900 text-cyan-300 font-mono shadow-[inset_0_0_0_1px_rgba(34,211,238,0.15)] hover:bg-cyan-500/10 dark:border-cyan-300/60 dark:bg-slate-950 dark:text-cyan-200'

// Range options matching analytics pattern plus 14D
const RANGE_OPTIONS: { key: DateRangeKey | '14d'; label: string }[] = [
  { key: '7d', label: '7 Days' },
  { key: '14d', label: '14 Days' },
  { key: '30d', label: '30 Days' },
  { key: '6m', label: '6 Months' },
  { key: '1y', label: '1 Year' },
  { key: 'all', label: 'All Time' },
]

// Helper to check if date is within range
function isDateInRange(dateStr: string | null, start: Date, end: Date): boolean {
  if (!dateStr) return false
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return false
  return date >= start && date <= end
}

// Get job date (scheduled_start or fallback to created_at)
function getJobDate(job: JobRow | UsageJobRow): string {
  return job.scheduled_start || (job as JobRow).created_at || ''
}

function toSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] || null : value
}

function durationMinutes(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null
  const mins = Math.round((endMs - startMs) / 60000)
  if (mins <= 0 || mins > 24 * 60) return null
  return mins
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatMoneyCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`
  return `$${Math.round(value)}`
}

function formatDuration(minutes: number | null): string {
  if (!minutes || !Number.isFinite(minutes) || minutes <= 0) return 'Variable'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
  if (hours > 0) return `${hours}h`
  return `${mins}m`
}

function calculateMaturity(recentJobs: number, totalJobs: number): ServiceMaturity {
  if (totalJobs === 0 || recentJobs === 0) return 'Draft'
  if (recentJobs < 5) return 'Early'
  if (recentJobs < 20) return 'Established'
  return 'Scaled'
}

function normalizeServiceName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function mergeDuplicateServices(services: Service[]): Service[] {
  const grouped = new Map<string, Service[]>()

  for (const service of services) {
    const key = normalizeServiceName(service.name)
    const list = grouped.get(key) || []
    list.push(service)
    grouped.set(key, list)
  }

  const merged: Service[] = []

  for (const rows of grouped.values()) {
    const preferred = [...rows].sort((a, b) => {
      if ((b.jobs_30d || 0) !== (a.jobs_30d || 0)) return (b.jobs_30d || 0) - (a.jobs_30d || 0)
      if ((b.times_booked || 0) !== (a.times_booked || 0)) return (b.times_booked || 0) - (a.times_booked || 0)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })[0]

    const totalBooked = rows.reduce((sum, row) => sum + (row.times_booked || 0), 0)
    const totalCompleted = rows.reduce((sum, row) => sum + (row.times_completed || 0), 0)
    const jobs30d = rows.reduce((sum, row) => sum + (row.jobs_30d || 0), 0)
    const completed30d = rows.reduce((sum, row) => sum + (row.completed_30d || 0), 0)
    const cancelled30d = rows.reduce((sum, row) => sum + (row.cancelled_30d || 0), 0)
    const billed30d = rows.reduce((sum, row) => sum + (row.billed_30d || 0), 0)

    const durationValues = rows
      .map((row) => row.avg_duration_minutes_30d)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)
    const avgDurationMinutes30d =
      durationValues.length > 0
        ? Math.round(durationValues.reduce((sum, value) => sum + value, 0) / durationValues.length)
        : preferred.avg_duration_minutes_30d

    const lastBookedAt = rows
      .map((row) => row.last_booked_at)
      .filter((value): value is string => !!value)
      .sort((a, b) => b.localeCompare(a))[0] || null

    const completionRate30d = jobs30d > 0 ? (completed30d / jobs30d) * 100 : 0
    const maturity = calculateMaturity(jobs30d, totalBooked)
    const isActive = rows.some((row) => row.is_active)

    merged.push({
      ...preferred,
      is_active: isActive,
      times_booked: totalBooked,
      times_completed: totalCompleted,
      jobs_30d: jobs30d,
      completed_30d: completed30d,
      cancelled_30d: cancelled30d,
      billed_30d: billed30d,
      avg_duration_minutes_30d: avgDurationMinutes30d,
      last_booked_at: lastBookedAt,
      completion_rate_30d: completionRate30d,
      maturity,
    })
  }

  return merged.sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
    if (b.jobs_30d !== a.jobs_30d) return b.jobs_30d - a.jobs_30d
    return a.name.localeCompare(b.name)
  })
}

function getRankTone(rank: number): string {
  // Top 3: emerald | 4-7: amber | 8+: rose
  if (rank <= 3) {
    return 'border-emerald-300/80 bg-emerald-50/90 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/15 dark:text-emerald-300'
  }
  if (rank <= 7) {
    return 'border-amber-300/80 bg-amber-50/90 text-amber-700 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-300'
  }
  return 'border-rose-300/80 bg-rose-50/90 text-rose-700 dark:border-rose-500/50 dark:bg-rose-500/15 dark:text-rose-300'
}

async function fetchAllJobServiceUsage(
  supabase: ReturnType<typeof createClient>,
  businessId: string
): Promise<JobServiceUsageRow[]> {
  const rows: JobServiceUsageRow[] = []
  let from = 0

  while (true) {
    const to = from + PAGE_SIZE - 1
    const { data, error } = await supabase
      .from('job_services')
      .select('service_id, job_id, jobs!inner(status, scheduled_start, scheduled_end, total_cost)')
      .eq('jobs.business_id', businessId)
      .order('created_at', { ascending: true })
      .range(from, to)

    if (error) throw error

    const batch = ((data || []) as JobServiceUsageRow[])
    rows.push(...batch)

    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

async function fetchAllBusinessJobs(
  supabase: ReturnType<typeof createClient>,
  businessId: string
): Promise<JobRow[]> {
  const rows: JobRow[] = []
  let from = 0

  while (true) {
    const to = from + PAGE_SIZE - 1
    const { data, error } = await supabase
      .from('jobs')
      .select('id, status, scheduled_start, scheduled_end, created_at, total_cost')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true })
      .range(from, to)

    if (error) throw error
    const batch = ((data || []) as JobRow[])
    rows.push(...batch)

    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

async function fetchAllBusinessInvoices(
  supabase: ReturnType<typeof createClient>,
  businessId: string
): Promise<InvoiceRow[]> {
  const rows: InvoiceRow[] = []
  let from = 0

  while (true) {
    const to = from + PAGE_SIZE - 1
    const { data, error } = await supabase
      .from('invoices')
      .select('job_id, total, created_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error
    const batch = ((data || []) as InvoiceRow[])
    rows.push(...batch)

    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

async function fetchInvoicesForJobs(
  supabase: ReturnType<typeof createClient>,
  businessId: string,
  jobIds: string[]
): Promise<InvoiceRow[]> {
  if (jobIds.length === 0) return []

  const rows: InvoiceRow[] = []
  for (let i = 0; i < jobIds.length; i += PAGE_SIZE) {
    const chunk = jobIds.slice(i, i + PAGE_SIZE)
    const { data, error } = await supabase
      .from('invoices')
      .select('job_id, total, created_at')
      .eq('business_id', businessId)
      .in('job_id', chunk)
      .order('created_at', { ascending: false })

    if (error) throw error
    rows.push(...((data || []) as InvoiceRow[]))
  }

  return rows
}

export default function ServicesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const [services, setServices] = useState<Service[]>([])
  const [totalJobsAllTime, setTotalJobsAllTime] = useState(0)
  const [totalBilledAllTime, setTotalBilledAllTime] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false)
  
  // Get range from URL or default to 'all'
  const requestedRange = searchParams.get('range') as DateRangeKey | '14d' | null
  const selectedRange = RANGE_OPTIONS.find(r => r.key === requestedRange) || RANGE_OPTIONS.find(r => r.key === 'all')!
  const dateRange = useMemo(() => getDateRange(selectedRange.key as DateRangeKey), [selectedRange.key])

  // Close range menu on outside click
  useEffect(() => {
    if (!rangeMenuOpen) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-range-menu]')) setRangeMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [rangeMenuOpen])
  
  const handleRangeChange = (range: DateRangeKey | '14d') => {
    setRangeMenuOpen(false)
    const params = new URLSearchParams(searchParams)
    params.set('range', range)
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }
  
  useEffect(() => {
    async function loadServices() {
      const supabase = createClient()

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const { data: profile } = await supabase
          .from('users')
          .select('business_id, role')
          .eq('id', user.id)
          .single()

        if (!profile || profile.role !== 'admin') {
          setLoading(false)
          return
        }
        setIsAdmin(true)

        const { data: servicesData } = await supabase
          .from('services')
          .select('*')
          .eq('business_id', profile.business_id)
          .order('created_at', { ascending: false })

        const [usageRows, allJobs, allInvoices] = await Promise.all([
          fetchAllJobServiceUsage(supabase, profile.business_id),
          fetchAllBusinessJobs(supabase, profile.business_id),
          fetchAllBusinessInvoices(supabase, profile.business_id),
        ])
        
        // Filter jobs by date range
        const filteredJobs = allJobs.filter(job => isDateInRange(getJobDate(job), dateRange.start, dateRange.end))

        setTotalJobsAllTime(filteredJobs.length)

        // Filter usage rows to only include jobs in date range
        const filteredUsageRows = usageRows.filter(row => {
          const job = allJobs.find(j => j.id === row.job_id)
          return job && isDateInRange(getJobDate(job), dateRange.start, dateRange.end)
        })
        
        const jobIds = Array.from(new Set(filteredUsageRows.map((row) => row.job_id)))
        const mappedJobIds = new Set(jobIds)
        const jobsById = new Map(allJobs.map((job) => [job.id, job]))

        // allInvoices query is ordered by created_at desc, so first hit per job is latest.
        const latestInvoiceByJob = new Map<string, InvoiceRow>()
        for (const row of allInvoices) {
          if (!row.job_id || latestInvoiceByJob.has(row.job_id)) continue
          latestInvoiceByJob.set(row.job_id, row)
        }

        // Fallback if invoice fetch returned empty but mapped jobs exist.
        if (latestInvoiceByJob.size === 0 && mappedJobIds.size > 0) {
          const fallbackInvoices = await fetchInvoicesForJobs(supabase, profile.business_id, jobIds)
          for (const row of fallbackInvoices) {
            if (!row.job_id || latestInvoiceByJob.has(row.job_id)) continue
            latestInvoiceByJob.set(row.job_id, row)
          }
        }

        const billedByJob = new Map<string, number>()
        for (const job of allJobs) {
          const invoiceTotal = latestInvoiceByJob.get(job.id)?.total
          const billedValue = Number(invoiceTotal ?? job.total_cost ?? 0)
          billedByJob.set(job.id, billedValue)
        }

        const totalBilled = filteredJobs.reduce((sum, job) => sum + (billedByJob.get(job.id) || 0), 0)
        setTotalBilledAllTime(totalBilled)

        const mappedBilled = Array.from(mappedJobIds).reduce((sum, jobId) => sum + (billedByJob.get(jobId) || 0), 0)
        const serviceLinkCountByJob = new Map<string, number>()
        for (const row of filteredUsageRows) {
          serviceLinkCountByJob.set(row.job_id, (serviceLinkCountByJob.get(row.job_id) || 0) + 1)
        }

        const servicesWithStats: Service[] = (servicesData || []).map((service) => {
          const usageForService = filteredUsageRows.filter((row) => row.service_id === service.id)
          const usageJobs = usageForService.map((row) => ({
            jobId: row.job_id,
            job: toSingle(row.jobs),
          }))

          const totalBooked = usageJobs.length
          const completedAll = usageJobs.filter((entry) => entry.job?.status === 'completed').length

          const recentUsage = usageJobs

          const jobs30d = recentUsage.length
          const completed30d = recentUsage.filter((entry) => entry.job?.status === 'completed').length
          const cancelled30d = recentUsage.filter((entry) => entry.job?.status === 'cancelled').length
          const completionRate30d = jobs30d > 0 ? (completed30d / jobs30d) * 100 : 0

          const billed30d = recentUsage.reduce((sum, entry) => {
            const linkCount = Math.max(1, serviceLinkCountByJob.get(entry.jobId) || 1)
            const billedValue = billedByJob.get(entry.jobId) ?? Number(entry.job?.total_cost ?? 0)
            return sum + billedValue / linkCount
          }, 0)

          const durationValues = recentUsage
            .map((entry) => durationMinutes(entry.job?.scheduled_start || null, entry.job?.scheduled_end || null))
            .filter((value): value is number => typeof value === 'number')

          const avgDurationMinutes30d =
            durationValues.length > 0
              ? Math.round(durationValues.reduce((sum, value) => sum + value, 0) / durationValues.length)
              : null

          const maturity = calculateMaturity(jobs30d, totalBooked)

          return {
            ...service,
            times_booked: totalBooked,
            times_completed: completedAll,
            jobs_30d: jobs30d,
            completed_30d: completed30d,
            cancelled_30d: cancelled30d,
            billed_30d: billed30d,
            avg_duration_minutes_30d: avgDurationMinutes30d,
            last_booked_at: null,
            completion_rate_30d: completionRate30d,
            maturity,
          }
        })

        setServices(mergeDuplicateServices(servicesWithStats))
      } catch (error) {
        console.error('Failed to load services summary', error)
        setServices([])
      } finally {
        setLoading(false)
      }
    }

    void loadServices()
  }, [selectedRange.key, dateRange.start, dateRange.end])

  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services

    const query = searchQuery.toLowerCase()
    return services.filter((service) =>
      service.name.toLowerCase().includes(query) ||
      (service.description?.toLowerCase().includes(query) ?? false) ||
      service.maturity.toLowerCase().includes(query)
    )
  }, [services, searchQuery])

  const dedupedFilteredServices = useMemo(() => mergeDuplicateServices(filteredServices), [filteredServices])
  const activeServices = dedupedFilteredServices.filter((service) => service.is_active)
  const inactiveServices = dedupedFilteredServices.filter((service) => !service.is_active)
  const displayedActiveBeforeSearch = services.filter((service) => service.is_active).length
  const rankByServiceId = useMemo(() => {
    const sorted = [...dedupedFilteredServices].sort((a, b) => {
      if (b.times_booked !== a.times_booked) return b.times_booked - a.times_booked
      if (b.jobs_30d !== a.jobs_30d) return b.jobs_30d - a.jobs_30d
      return a.name.localeCompare(b.name)
    })

    const map = new Map<string, { rank: number; total: number }>()
    const total = sorted.length
    sorted.forEach((service, index) => {
      map.set(service.id, { rank: index + 1, total })
    })
    return map
  }, [dedupedFilteredServices])

  const totalJobsPeriod = services.reduce((sum, service) => sum + service.jobs_30d, 0)
  const totalCompletedPeriod = services.reduce((sum, service) => sum + service.completed_30d, 0)
  const totalBilledPeriod = services.reduce((sum, service) => sum + service.billed_30d, 0)
  const avgCompletionRatePeriod = totalJobsPeriod > 0 ? (totalCompletedPeriod / totalJobsPeriod) * 100 : 0
  const atRiskServices = services.filter((service) => {
    if (service.jobs_30d < 3) return false
    const cancelRate = service.jobs_30d > 0 ? service.cancelled_30d / service.jobs_30d : 0
    return cancelRate >= 0.2 || service.completion_rate_30d < 65
  }).length
  const displayedServiceCount = services.length
  const jobsAcrossPeriod = totalJobsAllTime
  
  // Period label for display
  const periodLabel = selectedRange.key === 'all' ? 'ALL TIME' : selectedRange.label.toUpperCase()

  const now = new Date()
  const sysTime = now
    .toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase()
    .replace(/,/g, '')

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-5xl sm:text-6xl text-slate-900 dark:text-white tracking-wide">
              SERVICES
            </h1>
            <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1 tracking-widest">
              SYS.TIME: {sysTime}
            </p>
          </div>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse font-mono text-sm text-slate-400">LOADING...</div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
        <h1 className="font-display text-4xl text-slate-900 dark:text-white tracking-wide">SERVICES</h1>
        <p className="mt-2 font-sans text-sm text-slate-600 dark:text-slate-400">
          Admin access is required for service catalog controls.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl sm:text-6xl text-slate-900 dark:text-white tracking-wide">
            SERVICES
          </h1>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1 tracking-widest">
            SYS.TIME: {sysTime}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Link href="/admin/services/new">
            <Button className={NEW_SERVICE_BUTTON_CLASS} icon={<Plus className="h-4 w-4" />}>
              NEW SERVICE
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <p className="font-sans text-sm text-slate-700 dark:text-slate-200">
          Service catalog defines service types and playbooks. Price and duration can still vary per individual job.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="font-sans text-sm text-slate-500 dark:text-slate-400">
            {selectedRange.key === 'all' ? 'All-time performance metrics' : `Performance metrics for ${selectedRange.label.toLowerCase()}`}
          </p>
        </div>
        
        {/* Range Selector */}
        <div className="relative" data-range-menu>
          <button
            type="button"
            onClick={() => setRangeMenuOpen(!rangeMenuOpen)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 shadow-sm transition-colors hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
          >
            <span className="font-sans text-xs font-semibold text-slate-700 dark:text-slate-200">
              {selectedRange.label}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${rangeMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {rangeMenuOpen && (
            <div className="absolute right-0 top-full z-30 mt-2 w-40 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              {RANGE_OPTIONS.map((range) => {
                const active = range.key === selectedRange.key
                return (
                  <button
                    type="button"
                    key={range.key}
                    onClick={() => handleRangeChange(range.key)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-sans text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-cyan-500 text-slate-950 shadow-[0_0_16px_rgba(6,182,212,0.3)] dark:bg-cyan-400'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{range.label}</span>
                    {active && (
                      <span className="font-mono text-[9px] uppercase tracking-wider">Current</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard label="SERVICES" value={displayedServiceCount} icon={Briefcase} color="blue" />
        <MetricCard label="ACTIVE" value={displayedActiveBeforeSearch} icon={CheckCircle2} color="emerald" />
        <MetricCard label={`JOBS (${periodLabel})`} value={jobsAcrossPeriod} icon={Activity} color="cyan" />
        <MetricCard label={`BILLED (${periodLabel})`} value={formatMoneyCompact(totalBilledPeriod)} icon={DollarSign} color="purple" />
        <MetricCard label={`COMPLETION (${periodLabel})`} value={`${Math.round(avgCompletionRatePeriod)}%`} icon={Gauge} color="amber" />
      </div>

      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Search services..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl
                     bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                     placeholder-slate-400 font-mono text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                     transition-all"
        />
        {searchQuery && (
          <ActionIconButton
            stylePreset="ambient"
            intent="ghost"
            size="xs"
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"
            aria-label="Clear search"
            title="Clear search"
            icon={<X className="h-3.5 w-3.5" />}
          />
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl text-slate-900 dark:text-white tracking-wide">ACTIVE SERVICES</h2>
              <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 mt-1 tracking-wider">
                {activeServices.length} {activeServices.length === 1 ? 'SERVICE' : 'SERVICES'} AVAILABLE
              </p>
            </div>
            {searchQuery && (
              <span className="font-mono text-[10px] text-slate-400">
                FILTERED FROM {displayedActiveBeforeSearch}
              </span>
            )}
          </div>
        </div>
        <div className="p-4">
          {activeServices.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400 dark:text-slate-600 font-mono text-sm">
              {searchQuery ? 'No services match your search' : 'No active services'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {activeServices.map((service) => (
                <ServiceCard key={service.id} service={service} rankMeta={rankByServiceId.get(service.id)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {inactiveServices.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm opacity-70">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-display text-xl text-slate-500 dark:text-slate-400 tracking-wide">ARCHIVED SERVICES</h2>
            <p className="font-mono text-[10px] text-slate-400 dark:text-slate-500 mt-1 tracking-wider">
              {inactiveServices.length} INACTIVE {inactiveServices.length === 1 ? 'SERVICE' : 'SERVICES'}
            </p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {inactiveServices.map((service) => (
                <ServiceCard key={service.id} service={service} rankMeta={rankByServiceId.get(service.id)} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number | string
  icon: React.ElementType
  color: string
}) {
  const colors: Record<string, { light: string; dark: string }> = {
    blue: { light: 'text-blue-600', dark: 'dark:text-blue-400' },
    cyan: { light: 'text-cyan-600', dark: 'dark:text-cyan-400' },
    emerald: { light: 'text-emerald-600', dark: 'dark:text-emerald-400' },
    purple: { light: 'text-purple-600', dark: 'dark:text-purple-400' },
    amber: { light: 'text-amber-600', dark: 'dark:text-amber-400' },
  }
  const c = colors[color] || colors.blue

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
        <Icon className={`w-4 h-4 ${c.light} ${c.dark}`} />
      </div>
      <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

function ServiceCard({
  service,
  rankMeta,
}: {
  service: Service
  rankMeta?: { rank: number; total: number }
}) {
  const rankLabel = rankMeta ? `#${rankMeta.rank}` : '#-'
  const rankTone = rankMeta ? getRankTone(rankMeta.rank) : 'border-slate-300/80 bg-slate-100/80 text-slate-700 dark:border-slate-600/70 dark:bg-slate-800/70 dark:text-slate-300'

  // Calculate avg ticket (revenue per job)
  const avgTicket = service.jobs_30d > 0 ? service.billed_30d / service.jobs_30d : 0

  return (
    <Link href={`/admin/services/${service.id}`} prefetch={false}>
      <div data-testid="service-card" className="group relative p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all h-full flex flex-col">
        {/* Rank badge - top left */}
        <span className={`absolute top-4 left-4 inline-flex items-center rounded-full border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${rankTone}`}>
          {rankLabel}
        </span>

        {/* Arrow - top right */}
        <div className="absolute top-4 right-4">
          <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
        </div>

        {/* Service name - large */}
        <h3 className="font-display text-2xl leading-tight text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mt-8 mb-4">
          {service.name}
        </h3>

        {/* 4 metrics grid */}
        <div className="mt-auto grid grid-cols-2 gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Revenue</p>
            <p data-testid="metric-value" className="font-mono text-lg text-slate-900 dark:text-white">{formatMoneyCompact(service.billed_30d)}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Jobs</p>
            <p data-testid="metric-value" className="font-mono text-lg text-slate-900 dark:text-white">{service.jobs_30d}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Avg Ticket</p>
            <p data-testid="metric-value" className="font-mono text-lg text-slate-900 dark:text-white">{formatMoneyCompact(avgTicket)}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Completion</p>
            <p data-testid="metric-value" className="font-mono text-lg text-slate-900 dark:text-white">{service.completion_rate_30d.toFixed(0)}%</p>
          </div>
        </div>
      </div>
    </Link>
  )
}
