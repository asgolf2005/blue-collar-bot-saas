import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_RANGE_OPTIONS, getDateRange, type DateRangeKey } from '@/lib/analytics/dateUtils'
import {
  Briefcase,
  Filter,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  Clock3,
  DollarSign,
  Gauge,
  HardHat,
  Hourglass,
  Timer,
} from '@/components/ui/lucide'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type MetricStyleKey =
  | 'balanced'
  | 'minimal'
  | 'premium'
  | 'industrial'
  | 'terminal'
  | 'executive'

type MetricStyleOption = {
  key: MetricStyleKey
  label: string
}

type TechnicianActivityFilter = 'all' | 'active' | 'idle'
type TechnicianSortKey = 'collectedRevenue' | 'completionRate' | 'assignedJobs' | 'hoursWorked' | 'name'
type SortOrder = 'asc' | 'desc'

type MetricStyleTokens = {
  statCard: string
  statIconChip: string
  statIcon: string
  statLabel: string
  statValue: string
  track: string
  utilizationBar: string
  highlightCard: string
  highlightLabel: string
  highlightValue: string
  highlightSubtext: string
  collectionBar: string
  completionBar: string
  compactCard: string
  compactLabel: string
  compactValue: string
}

const METRIC_STYLE_OPTIONS: MetricStyleOption[] = [
  { key: 'balanced', label: 'Balanced' },
  { key: 'minimal', label: 'Ultra Minimal' },
  { key: 'premium', label: 'Premium Glass' },
  { key: 'industrial', label: 'Industrial Slate' },
  { key: 'terminal', label: 'Data Terminal' },
  { key: 'executive', label: 'Executive Report' },
]

const METRIC_STYLE_TOKENS: Record<MetricStyleKey, MetricStyleTokens> = {
  balanced: {
    statCard:
      'rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-white/85 dark:bg-slate-900/70 shadow-sm p-3.5',
    statIconChip:
      'inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/80',
    statIcon: 'text-slate-500 dark:text-slate-300',
    statLabel: 'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400',
    statValue: 'mt-2 font-display text-2xl font-semibold text-slate-950 dark:text-slate-50',
    track: 'mt-2 h-1.5 rounded-full bg-slate-200/90 dark:bg-slate-700/80 overflow-hidden',
    utilizationBar: 'h-full rounded-full bg-gradient-to-r from-sky-500/80 to-cyan-500/80 transition-all duration-500',
    highlightCard:
      'rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-white/90 dark:bg-slate-900/70 shadow-sm p-3.5',
    highlightLabel:
      'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400',
    highlightValue: 'mt-1 font-display text-3xl font-semibold text-slate-950 dark:text-slate-50',
    highlightSubtext: 'mt-1 text-xs text-slate-600 dark:text-slate-300',
    collectionBar:
      'h-full rounded-full bg-gradient-to-r from-emerald-500/80 to-teal-500/80 transition-all duration-500',
    completionBar:
      'h-full rounded-full bg-gradient-to-r from-blue-500/80 to-cyan-500/80 transition-all duration-500',
    compactCard: 'rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3',
    compactLabel: 'font-sans text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400',
    compactValue: 'mt-1 font-display text-lg font-semibold text-slate-900 dark:text-white',
  },
  minimal: {
    statCard:
      'rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 p-3.5 shadow-none',
    statIconChip:
      'inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-200/80 dark:bg-slate-800/90',
    statIcon: 'text-slate-600 dark:text-slate-300',
    statLabel: 'text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400',
    statValue: 'mt-2 font-display text-2xl font-semibold text-slate-900 dark:text-slate-100',
    track: 'mt-2 h-1.5 rounded-full bg-slate-300/80 dark:bg-slate-700 overflow-hidden',
    utilizationBar: 'h-full rounded-full bg-slate-700 dark:bg-slate-300 transition-all duration-500',
    highlightCard:
      'rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900 p-3.5 shadow-none',
    highlightLabel: 'text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400',
    highlightValue: 'mt-1 font-display text-3xl font-semibold text-slate-900 dark:text-slate-100',
    highlightSubtext: 'mt-1 text-xs text-slate-500 dark:text-slate-400',
    collectionBar: 'h-full rounded-full bg-slate-700 dark:bg-slate-200 transition-all duration-500',
    completionBar: 'h-full rounded-full bg-slate-700 dark:bg-slate-200 transition-all duration-500',
    compactCard:
      'rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900 p-3 shadow-none',
    compactLabel: 'text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400',
    compactValue: 'mt-1 font-display text-lg font-semibold text-slate-900 dark:text-slate-100',
  },
  premium: {
    statCard:
      'rounded-xl border border-white/50 dark:border-cyan-500/20 bg-white/60 dark:bg-slate-900/55 backdrop-blur-md shadow-[0_12px_28px_rgba(15,23,42,0.14)] p-3.5',
    statIconChip:
      'inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/70 dark:border-slate-700/70 bg-white/75 dark:bg-slate-800/70',
    statIcon: 'text-sky-600/80 dark:text-cyan-300',
    statLabel: 'text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-600 dark:text-slate-300',
    statValue: 'mt-2 font-display text-2xl font-semibold text-slate-950 dark:text-white',
    track: 'mt-2 h-1.5 rounded-full bg-white/80 dark:bg-slate-700/70 overflow-hidden',
    utilizationBar:
      'h-full rounded-full bg-gradient-to-r from-cyan-400/90 via-sky-500/90 to-blue-500/90 transition-all duration-500',
    highlightCard:
      'rounded-xl border border-white/55 dark:border-cyan-500/20 bg-gradient-to-br from-white/80 to-sky-50/70 dark:from-slate-900/70 dark:to-slate-900/55 backdrop-blur-md shadow-[0_14px_34px_rgba(15,23,42,0.16)] p-3.5',
    highlightLabel: 'text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-600 dark:text-slate-300',
    highlightValue: 'mt-1 font-display text-3xl font-semibold text-slate-950 dark:text-white',
    highlightSubtext: 'mt-1 text-xs text-slate-700 dark:text-slate-300',
    collectionBar:
      'h-full rounded-full bg-gradient-to-r from-emerald-400/90 via-teal-400/90 to-cyan-500/90 transition-all duration-500',
    completionBar:
      'h-full rounded-full bg-gradient-to-r from-indigo-400/90 via-blue-500/90 to-cyan-500/90 transition-all duration-500',
    compactCard:
      'rounded-xl border border-white/45 dark:border-cyan-500/20 bg-white/65 dark:bg-slate-900/55 backdrop-blur-md p-3 shadow-[0_10px_24px_rgba(15,23,42,0.12)]',
    compactLabel: 'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300',
    compactValue: 'mt-1 font-display text-lg font-semibold text-slate-900 dark:text-slate-100',
  },
  industrial: {
    statCard:
      'rounded-lg border border-slate-500/35 dark:border-slate-600/55 bg-slate-800/95 dark:bg-slate-900 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
    statIconChip:
      'inline-flex h-7 w-7 items-center justify-center rounded-sm border border-slate-500/50 dark:border-slate-600/70 bg-slate-700/90 dark:bg-slate-800',
    statIcon: 'text-slate-200 dark:text-slate-200',
    statLabel: 'text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300 dark:text-slate-300',
    statValue: 'mt-2 font-display text-2xl font-semibold text-slate-50 dark:text-slate-50',
    track: 'mt-2 h-1.5 rounded-sm bg-slate-600/80 dark:bg-slate-700/90 overflow-hidden',
    utilizationBar: 'h-full rounded-sm bg-sky-400/80 transition-all duration-500',
    highlightCard:
      'rounded-lg border border-slate-500/35 dark:border-slate-600/55 bg-slate-800/95 dark:bg-slate-900 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
    highlightLabel: 'text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300 dark:text-slate-300',
    highlightValue: 'mt-1 font-display text-3xl font-semibold text-slate-50 dark:text-slate-50',
    highlightSubtext: 'mt-1 text-xs text-slate-300/90 dark:text-slate-300/90',
    collectionBar: 'h-full rounded-sm bg-emerald-400/80 transition-all duration-500',
    completionBar: 'h-full rounded-sm bg-sky-400/80 transition-all duration-500',
    compactCard:
      'rounded-lg border border-slate-500/35 dark:border-slate-600/55 bg-slate-800/95 dark:bg-slate-900 p-3',
    compactLabel: 'text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300 dark:text-slate-300',
    compactValue: 'mt-1 font-display text-lg font-semibold text-slate-50 dark:text-slate-50',
  },
  terminal: {
    statCard:
      'rounded-xl border border-slate-300 dark:border-cyan-900 bg-white dark:bg-slate-950 p-3.5 shadow-none',
    statIconChip:
      'inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-300 dark:border-cyan-900 bg-slate-100 dark:bg-slate-900',
    statIcon: 'text-cyan-700 dark:text-cyan-300',
    statLabel: 'font-sans text-[10px] uppercase tracking-[0.16em] text-slate-600 dark:text-cyan-300',
    statValue: 'mt-2 font-display text-2xl font-semibold text-slate-900 dark:text-cyan-100',
    track: 'mt-2 h-1.5 rounded-none bg-slate-200 dark:bg-slate-800 overflow-hidden',
    utilizationBar: 'h-full rounded-none bg-cyan-600 dark:bg-cyan-300 transition-all duration-500',
    highlightCard:
      'rounded-md border border-slate-300 dark:border-cyan-900 bg-white dark:bg-slate-950 p-3.5 shadow-none',
    highlightLabel: 'font-sans text-[10px] uppercase tracking-[0.16em] text-slate-600 dark:text-cyan-300',
    highlightValue: 'mt-1 font-display text-3xl font-semibold text-slate-900 dark:text-cyan-100',
    highlightSubtext: 'mt-1 font-sans text-[11px] text-slate-600 dark:text-cyan-200',
    collectionBar: 'h-full rounded-none bg-cyan-700 dark:bg-cyan-300 transition-all duration-500',
    completionBar: 'h-full rounded-none bg-cyan-700 dark:bg-cyan-300 transition-all duration-500',
    compactCard:
      'rounded-xl border border-slate-300 dark:border-cyan-900 bg-white dark:bg-slate-950 p-3 shadow-none',
    compactLabel: 'font-sans text-[10px] uppercase tracking-[0.16em] text-slate-600 dark:text-cyan-300',
    compactValue: 'mt-1 font-display text-lg font-semibold text-slate-900 dark:text-cyan-100',
  },
  executive: {
    statCard:
      'rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/90 dark:bg-slate-900/70 p-3.5 shadow-[0_8px_18px_rgba(15,23,42,0.08)]',
    statIconChip:
      'inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100/90 dark:bg-slate-800/80',
    statIcon: 'text-slate-600 dark:text-slate-300',
    statLabel: 'text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400',
    statValue: 'mt-2 font-display text-2xl font-semibold text-slate-900 dark:text-slate-50',
    track: 'mt-2 h-1.5 rounded-full bg-slate-200/90 dark:bg-slate-700/80 overflow-hidden',
    utilizationBar: 'h-full rounded-full bg-gradient-to-r from-slate-500 to-slate-700 dark:from-slate-400 dark:to-slate-300 transition-all duration-500',
    highlightCard:
      'rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900/80 dark:to-slate-900/60 p-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.10)]',
    highlightLabel: 'text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400',
    highlightValue: 'mt-1 font-display text-3xl font-semibold text-slate-900 dark:text-slate-50',
    highlightSubtext: 'mt-1 text-xs text-slate-600 dark:text-slate-300',
    collectionBar:
      'h-full rounded-full bg-gradient-to-r from-slate-600 to-blue-700 dark:from-slate-400 dark:to-blue-300 transition-all duration-500',
    completionBar:
      'h-full rounded-full bg-gradient-to-r from-slate-600 to-blue-700 dark:from-slate-400 dark:to-blue-300 transition-all duration-500',
    compactCard:
      'rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/90 dark:bg-slate-900/70 p-3 shadow-[0_8px_16px_rgba(15,23,42,0.08)]',
    compactLabel: 'text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400',
    compactValue: 'mt-1 font-display text-lg font-semibold text-slate-900 dark:text-slate-100',
  },
}

const ACTIVE_STATUSES = new Set(['scheduled', 'on_the_way', 'arrived', 'in_progress'])

type TechnicianRow = {
  id: string
  full_name: string
  email: string | null
}

type JobRow = {
  id: string
  technician_id: string | null
  status: string
  scheduled_start: string
  scheduled_end: string | null
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
  topServices: Array<{ name: string; count: number; share: number }>
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

function resolveMetricStyle(rawStyle?: string | string[]): MetricStyleKey {
  const value = Array.isArray(rawStyle) ? rawStyle[0] : rawStyle
  const valid = new Set(METRIC_STYLE_OPTIONS.map((option) => option.key))
  return value && valid.has(value as MetricStyleKey) ? (value as MetricStyleKey) : 'balanced'
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

function formatDurationHours(start: string, end: string | null): number {
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
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  businessId: string
  startIso: string
  endIso: string
}): Promise<JobRow[]> {
  const pageSize = 1000
  const allRows: JobRow[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('jobs')
      .select('id, technician_id, status, scheduled_start, scheduled_end, labor_hours, total_cost')
      .eq('business_id', businessId)
      .not('technician_id', 'is', null)
      .gte('scheduled_start', startIso)
      .lte('scheduled_start', endIso)
      .order('scheduled_start', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw error

    const batch = (data || []) as JobRow[]
    allRows.push(...batch)
    if (batch.length < pageSize) break

    from += pageSize
    if (from > 50000) break
  }

  return allRows
}

async function fetchFutureActiveJobs({
  supabase,
  businessId,
  endIso,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  businessId: string
  endIso: string
}): Promise<JobRow[]> {
  const pageSize = 1000
  const allRows: JobRow[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('jobs')
      .select('id, technician_id, status, scheduled_start, scheduled_end, labor_hours, total_cost')
      .eq('business_id', businessId)
      .not('technician_id', 'is', null)
      .gt('scheduled_start', endIso)
      .in('status', Array.from(ACTIVE_STATUSES))
      .order('scheduled_start', { ascending: true })
      .range(from, from + pageSize - 1)

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
    style?: string | string[]
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
    style?: string | string[]
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
  const metricStyle = resolveMetricStyle(searchParams?.style)
  const searchQuery = (readParam(searchParams?.q) || '').trim()
  const activityFilter = resolveActivityFilter(searchParams?.activity)
  const minCompletionRate = resolvePositiveNumber(searchParams?.minCompletion)
  const minAssignedJobs = Math.round(resolvePositiveNumber(searchParams?.minAssigned))
  const minRevenue = resolvePositiveNumber(searchParams?.minRevenue)
  const sortBy = resolveSortKey(searchParams?.sort)
  const sortOrder = resolveSortOrder(searchParams?.order)
  const metricUi = METRIC_STYLE_TOKENS[metricStyle]
  const rangeWindow = getDateRange(range)
  const startIso = rangeWindow.start.toISOString()
  const endIso = rangeWindow.end.toISOString()

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
  const [jobsInRange, futureActiveJobs] = await Promise.all([
    fetchAllJobsForRange({
      supabase,
      businessId: profile.business_id,
      startIso,
      endIso,
    }),
    fetchFutureActiveJobs({
      supabase,
      businessId: profile.business_id,
      endIso,
    }),
  ])
  const jobs = [...jobsInRange, ...futureActiveJobs]
  const futureActiveJobIds = new Set(futureActiveJobs.map((job) => job.id))

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
      topServices: [],
      workedDays: new Set<string>(),
      completedHoursAccumulator: 0,
      serviceCounts: new Map<string, number>(),
      jobRevenueFallback: 0,
    })
  }

  for (const job of jobs) {
    if (!job.technician_id) continue
    const tech = metricsByTech.get(job.technician_id)
    if (!tech) continue
    const isFutureActiveJob = futureActiveJobIds.has(job.id)

    tech.assignedJobs += 1

    if (ACTIVE_STATUSES.has(job.status)) {
      tech.activeJobs += 1
    }

    if (job.status !== 'completed' && job.status !== 'cancelled') {
      tech.upcomingJobs += 1
    }

    // Future pipeline jobs should affect capacity metrics, but not historical productivity/revenue.
    if (isFutureActiveJob) {
      continue
    }

    if (job.status === 'completed') {
      tech.completedJobs += 1
    }

    if (job.status === 'cancelled') {
      tech.cancelledJobs += 1
    }

    const dayKey = job.scheduled_start.split('T')[0]
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

    const isCollected = invoice.status === 'paid' || !!invoice.paid_at
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
        topServices,
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
  if (metricStyle !== 'balanced') baseQueryParams.set('style', metricStyle)
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
    if (metricStyle !== 'balanced') params.set('style', metricStyle)
    return `/admin/technicians?${params.toString()}`
  })()

  const totals = {
    technicians: technicianMetrics.length,
    jobsAssigned: sum(technicianMetrics.map((tech) => tech.assignedJobs)),
    jobsCompleted: sum(technicianMetrics.map((tech) => tech.completedJobs)),
    hoursWorked: sum(technicianMetrics.map((tech) => tech.hoursWorked)),
    collectedRevenue: sum(technicianMetrics.map((tech) => tech.collectedRevenue)),
    completionRate:
      safeDivide(
        sum(technicianMetrics.map((tech) => tech.completedJobs)),
        Math.max(1, sum(technicianMetrics.map((tech) => tech.assignedJobs)))
      ) * 100,
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
          <details className="relative w-full sm:w-auto group/range z-20">
            <summary
              title="Select report period"
              aria-label="Select report period"
              className="list-none cursor-pointer inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl px-4 py-2.5 shadow-lg shadow-slate-200/20 dark:shadow-cyan-500/10 transition-colors hover:border-cyan-400/40"
            >
              <span className="font-sans text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Period
              </span>
              <span className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-slate-800 dark:text-cyan-200">
                {selectedRangeOption.label}
              </span>
              <ChevronDown className="h-4 w-4 text-slate-500 dark:text-cyan-300 transition-transform duration-300 group-open/range:rotate-180" />
            </summary>
            <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl p-1.5 shadow-xl shadow-slate-200/30 dark:shadow-cyan-500/10">
              {ADMIN_RANGE_OPTIONS.map((option) => {
                const active = option.key === range
                return (
                  <Link
                    key={option.key}
                    href={getRangeHref(option.key)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 font-sans text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-cyan-500 text-slate-950 shadow-[0_0_16px_rgba(6,182,212,0.32)]'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{option.label}</span>
                    {active ? <span className="font-mono text-[9px] uppercase tracking-widest">Current</span> : null}
                  </Link>
                )
              })}
            </div>
          </details>

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
              {metricStyle !== 'balanced' && <input type="hidden" name="style" value={metricStyle} />}

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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="admin-card p-5">
          <div className="flex items-center justify-between">
            <p className="font-sans text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Technicians
            </p>
            <HardHat className="w-4 h-4 text-cyan-500" />
          </div>
          <p className="mt-2 font-display text-3xl font-semibold text-slate-900 dark:text-white">{totals.technicians}</p>
        </div>

        <div className="admin-card p-5">
          <div className="flex items-center justify-between">
            <p className="font-sans text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Assigned Jobs
            </p>
            <Briefcase className="w-4 h-4 text-blue-500" />
          </div>
          <p className="mt-2 font-display text-3xl font-semibold text-slate-900 dark:text-white">{totals.jobsAssigned}</p>
        </div>

        <div className="admin-card p-5">
          <div className="flex items-center justify-between">
            <p className="font-sans text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Hours Worked
            </p>
            <Clock3 className="w-4 h-4 text-purple-500" />
          </div>
          <p className="mt-2 font-display text-3xl font-semibold text-slate-900 dark:text-white">
            {totals.hoursWorked.toFixed(1)}
          </p>
        </div>

        <div className="admin-card p-5">
          <div className="flex items-center justify-between">
            <p className="font-sans text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Collected Revenue
            </p>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="mt-2 font-display text-3xl font-semibold text-slate-900 dark:text-white">
            {asMoney(totals.collectedRevenue)}
          </p>
        </div>
      </div>

      <div className="admin-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <h2 className="admin-section-title">Team Completion Rate</h2>
        </div>
        <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
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
            const pipelineLoad = tech.activeJobs + tech.upcomingJobs
            const cancellationRate = clampPercent(safeDivide(tech.cancelledJobs, tech.assignedJobs) * 100)
            const utilizationTone =
              utilizationMeter >= 85
                ? 'from-emerald-500 to-teal-500'
                : utilizationMeter >= 60
                  ? 'from-amber-500 to-orange-500'
                  : 'from-slate-400 to-slate-500'
            const collectionTone =
              collectionRate >= 85
                ? 'text-emerald-700 dark:text-emerald-300'
                : collectionRate >= 60
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-rose-700 dark:text-rose-300'
            const shellClass = 'group relative overflow-hidden rounded-[2rem] border border-slate-200/60 dark:border-white/10 bg-white/65 dark:bg-slate-900/45 backdrop-blur-3xl shadow-xl shadow-slate-200/20 dark:shadow-indigo-500/5 hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-500 ease-out xl:col-span-1 open:xl:col-span-2 open:-translate-y-1'
            const summaryClass = 'relative z-10 list-none cursor-pointer px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 [&::-webkit-details-marker]:hidden transition-all duration-300 hover:bg-white/45 dark:hover:bg-white/5 before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/45 before:via-white/0 before:to-cyan-50/30 dark:before:from-indigo-500/5 dark:before:via-transparent dark:before:to-cyan-500/10 before:pointer-events-none'
            const bodyDividerClass = 'relative z-10 px-6 pb-6 pt-5 border-t border-slate-200/50 dark:border-white/10 bg-white/30 dark:bg-slate-900/20'
            const emailClass = 'font-mono text-[10px] uppercase tracking-widest text-slate-500 dark:text-cyan-400/80 drop-shadow-sm'
            return (
              <details
                key={tech.id}
                className={shellClass}
                data-metric-theme={metricUi.statCard.includes('dark:') ? 'dark-aware' : 'light-only'}
              >
                <summary className={summaryClass}>
                  <h3 className="font-display text-xl tracking-wider text-slate-900 dark:text-white uppercase drop-shadow-sm flex items-center gap-3 min-w-0">
                    <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-cyan-400" />
                    <span className="truncate">{tech.name}</span>
                  </h3>
                  <ChevronDown className="w-5 h-5 text-slate-400 dark:text-cyan-300 transition-transform duration-300 group-open:rotate-180 drop-shadow-[0_0_8px_rgba(34,211,238,0.35)]" />
                </summary>

                <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out group-open:grid-rows-[1fr]">
                  <div className="overflow-hidden">
                    <div className={bodyDividerClass}>
                      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className={emailClass}>
                          {tech.email || 'No email on file'}
                        </p>
                        <Link
                          href={`/admin/jobs?view=all&technician=${encodeURIComponent(tech.id)}`}
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-300/70 dark:border-slate-600/70 bg-white/80 dark:bg-slate-800/70 px-5 py-2.5 font-mono text-[10px] uppercase tracking-widest font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          Open Job Queue
                        </Link>
                      </div>

                      <div
                        className="mt-4 space-y-4 opacity-0 translate-y-2 transition-all duration-300 group-open:opacity-100 group-open:translate-y-0"
                        style={{ transitionDelay: '45ms' }}
                      >
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                          <section className="xl:col-span-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 bg-white/85 dark:bg-slate-900/70 p-4">
                            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                              Workload & Capacity
                            </p>
                            <div className="mt-3 flex items-end justify-between">
                              <div>
                                <p className="font-display text-4xl leading-none text-slate-900 dark:text-white">{pipelineLoad}</p>
                                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Total pipeline load</p>
                              </div>
                              <span className={`rounded-full px-3 py-1 font-mono text-[9px] uppercase tracking-widest ${
                                tech.activeJobs > 0
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700/70 dark:text-slate-300'
                              }`}>
                                {tech.activeJobs > 0 ? 'Live Shift' : 'Standby'}
                              </span>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-slate-50 dark:bg-slate-800/60 p-3">
                                <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Active</p>
                                <p className="mt-1 font-display text-2xl text-slate-900 dark:text-white">{tech.activeJobs}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-slate-50 dark:bg-slate-800/60 p-3">
                                <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Queued</p>
                                <p className="mt-1 font-display text-2xl text-slate-900 dark:text-white">{tech.upcomingJobs}</p>
                              </div>
                            </div>
                            <div className="mt-4">
                              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                <span>Utilization</span>
                                <span>{utilizationMeter.toFixed(1)}%</span>
                              </div>
                              <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700/70 overflow-hidden">
                                <div className={`h-full rounded-full bg-gradient-to-r ${utilizationTone}`} style={{ width: `${utilizationMeter}%` }} />
                              </div>
                              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                                {asHours(tech.hoursWorked)} worked across {tech.daysWorked} active days.
                              </p>
                            </div>
                          </section>

                          <section className="xl:col-span-7 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 bg-white/85 dark:bg-slate-900/70 p-4">
                            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                              Quality & Throughput
                            </p>
                            <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2">
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-slate-50 dark:bg-slate-800/60 p-3">
                                <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Completion</p>
                                <p className="mt-1 font-display text-2xl text-slate-900 dark:text-white">{completionMeter.toFixed(1)}%</p>
                              </div>
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-slate-50 dark:bg-slate-800/60 p-3">
                                <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Cancellation</p>
                                <p className="mt-1 font-display text-2xl text-slate-900 dark:text-white">{cancellationRate.toFixed(1)}%</p>
                              </div>
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-slate-50 dark:bg-slate-800/60 p-3">
                                <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Avg Job Time</p>
                                <p className="mt-1 font-display text-2xl text-slate-900 dark:text-white">{asHours(tech.avgServiceHours)}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-slate-50 dark:bg-slate-800/60 p-3">
                                <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Jobs / Day</p>
                                <p className="mt-1 font-display text-2xl text-slate-900 dark:text-white">{tech.avgJobsPerDay.toFixed(1)}</p>
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-white/70 dark:bg-slate-900/60 p-3">
                                <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Assigned</p>
                                <p className="mt-1 font-display text-xl text-slate-900 dark:text-white">{tech.assignedJobs}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-white/70 dark:bg-slate-900/60 p-3">
                                <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Completed</p>
                                <p className="mt-1 font-display text-xl text-slate-900 dark:text-white">{tech.completedJobs}</p>
                              </div>
                            </div>
                          </section>

                          <section className="xl:col-span-12 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 bg-white/85 dark:bg-slate-900/70 p-4">
                            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                              Commercial Impact
                            </p>
                            <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2">
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-slate-50 dark:bg-slate-800/60 p-3">
                                <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Collected</p>
                                <p className="mt-1 font-display text-2xl text-slate-900 dark:text-white">{asMoney(tech.collectedRevenue)}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-slate-50 dark:bg-slate-800/60 p-3">
                                <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Billed</p>
                                <p className="mt-1 font-display text-2xl text-slate-900 dark:text-white">{asMoney(tech.billedRevenue)}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-slate-50 dark:bg-slate-800/60 p-3">
                                <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Revenue / Hour</p>
                                <p className="mt-1 font-display text-2xl text-slate-900 dark:text-white">{asMoney(tech.revenuePerHour)}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-slate-50 dark:bg-slate-800/60 p-3">
                                <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Revenue / Completed</p>
                                <p className="mt-1 font-display text-2xl text-slate-900 dark:text-white">{asMoney(tech.revenuePerCompletedJob)}</p>
                              </div>
                            </div>
                            <div className="mt-3">
                              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                <span>Collection Realization</span>
                                <span className={collectionTone}>{collectionRate.toFixed(1)}%</span>
                              </div>
                              <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700/70 overflow-hidden">
                                <div
                                  className={`h-full rounded-full bg-gradient-to-r ${
                                    collectionRate >= 85
                                      ? 'from-emerald-500 to-teal-500'
                                      : collectionRate >= 60
                                        ? 'from-amber-500 to-orange-500'
                                        : 'from-rose-500 to-red-500'
                                  }`}
                                  style={{ width: `${collectionRate}%` }}
                                />
                              </div>
                            </div>
                          </section>
                        </div>

                        <section className="rounded-2xl border border-slate-200/80 dark:border-slate-700/70 bg-white/85 dark:bg-slate-900/70 p-4">
                          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                            Service Mix
                          </p>
                          {tech.topServices.length === 0 ? (
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No service history in this range.</p>
                          ) : (
                            <div className="mt-3 space-y-2.5">
                              {tech.topServices.map((service, index) => {
                                const share = clampPercent(service.share)
                                const tone =
                                  index === 0
                                    ? 'from-emerald-500 to-teal-500'
                                    : index === 1
                                      ? 'from-indigo-500 to-blue-500'
                                      : 'from-slate-500 to-slate-600'

                                return (
                                  <div
                                    key={`${tech.id}-${service.name}`}
                                    className="rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-slate-50 dark:bg-slate-800/60 p-3"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                          Rank #{index + 1}
                                        </p>
                                        <p className="mt-0.5 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                          {service.name}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-sans text-xs text-slate-700 dark:text-slate-200">{service.count} jobs</p>
                                        <p className="font-sans text-[10px] text-slate-500 dark:text-slate-400">{share.toFixed(1)}% of non-cancelled jobs</p>
                                      </div>
                                    </div>
                                    <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/70 overflow-hidden">
                                      <div className={`h-full rounded-full bg-gradient-to-r ${tone} transition-all duration-500`} style={{ width: `${share}%` }} />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </section>
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
