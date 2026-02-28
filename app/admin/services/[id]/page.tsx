'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  ListChecks,
  MapPin,
  PlayCircle,
  Receipt,
  Truck,
  Users,
  ChevronDown,
  Lightbulb,
} from '@/components/ui/lucide'
import { createClient } from '@/lib/supabase/client'

interface Service {
  id: string
  name: string
  description: string | null
  base_price: number | null
  duration_minutes: number | null
  is_active: boolean
  created_at: string
}

interface Job {
  id: string
  status: string
  scheduled_start: string
  scheduled_end: string | null
  total_cost: number | null
  customer?: {
    name: string
  }
  technician?: {
    full_name: string
  }
}

interface InvoiceRow {
  job_id: string | null
  total: number | null
}

type RangeOption = '7d' | '30d' | '90d' | '1y' | 'all'

const RANGE_OPTIONS: { value: RangeOption; label: string; days: number | null }[] = [
  { value: '7d', label: '7D', days: 7 },
  { value: '30d', label: '30D', days: 30 },
  { value: '90d', label: '90D', days: 90 },
  { value: '1y', label: '1Y', days: 365 },
  { value: 'all', label: 'ALL', days: null },
]

const statusColors: Record<string, string> = {
  scheduled:
    'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300',
  on_the_way:
    'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
  arrived: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
  in_progress:
    'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
  completed:
    'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  cancelled:
    'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPrice(value: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Custom quote'
  return formatMoney(value)
}

function formatDuration(minutes: number | null) {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) return 'Varies'
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (hours > 0 && remaining > 0) return `${hours}h ${remaining}m`
  if (hours > 0) return `${hours}h`
  return `${remaining}m`
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const day = date.getDate()
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  return `${month} ${day}, ${time}`
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getStatusLabel(status: string) {
  if (status === 'on_the_way') return 'EN ROUTE'
  return status.replace('_', ' ').toUpperCase()
}

function durationMinutes(start: string, end: string | null) {
  if (!end) return null
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null
  const mins = Math.round((endMs - startMs) / 60000)
  if (mins <= 0 || mins > 24 * 60) return null
  return mins
}

function getQuickTips(name: string): string[] {
  const serviceName = name.toLowerCase()
  const tips: string[] = []

  if (/\b(paint|repaint|stain|coating|touch-up|drywall)\b/.test(serviceName)) {
    tips.push('Check humidity and substrate conditions before starting')
    tips.push('Run a micro-test patch first to confirm color match')
    tips.push('Work by zone clusters to reduce tool switching')
    tips.push('Capture coat timestamps for precise follow-up scheduling')
    tips.push('Allow proper cure time between coats to avoid defects')
  } else if (/\b(fence|exterior|outdoor)\b/.test(serviceName)) {
    tips.push('Confirm weather and UV exposure before starting')
    tips.push('Paint following the sun path for wet-edge consistency')
    tips.push('Pre-scrape loose material before applying new coating')
    tips.push('Use exterior-grade products rated for local climate')
  } else if (/\b(interior|room)\b/.test(serviceName)) {
    tips.push('Validate furniture shielding during first walkthrough')
    tips.push('Batch similar rooms to compress cleanup cycles')
    tips.push('Ensure adequate airflow for drying and ventilation')
    tips.push('Cover floors completely before starting')
  } else if (/\b(drywall|patch)\b/.test(serviceName)) {
    tips.push('Photo substrate condition before patching')
    tips.push('Allow realistic cure windows between coats')
    tips.push('Feather edges beyond the patch perimeter')
    tips.push('Prime before painting for uniform finish')
  } else if (/\b(plumb|leak|drain|pipe|faucet|toilet)\b/.test(serviceName)) {
    tips.push('Shut off water supply before disassembly')
    tips.push('Have replacement washers and O-rings on hand')
    tips.push('Test thoroughly before leaving the site')
    tips.push('Check for secondary leaks after main repair')
  } else if (/\b(electrical|wire|outlet|switch|light|fan)\b/.test(serviceName)) {
    tips.push('Always test circuits with a non-contact voltage tester')
    tips.push('Label wires before disconnecting')
    tips.push('Match breaker capacity to load requirements')
    tips.push('Use GFCI protection where code requires')
  } else {
    tips.push('Lock scope boundaries before arrival')
    tips.push('Flag blockers early for dispatch to rebalance')
    tips.push('Capture before/after photos to reduce callbacks')
    tips.push('Confirm acceptance criteria with customer before starting')
    tips.push('Keep workspace clean throughout the job')
  }

  return tips.slice(0, 5)
}

function getPlaybookSections(name: string) {
  const serviceName = name.toLowerCase()
  const sections: { title: string; content: string }[] = []

  if (/\b(paint|repaint|stain|coating)\b/.test(serviceName)) {
    sections.push({
      title: 'Surface Prep',
      content: 'Clean, sand, and prime all surfaces. Remove loose paint and fill cracks. Mask adjacent areas. Usually takes 30-60 minutes per room.',
    })
    sections.push({
      title: 'Application',
      content: 'Apply 1-2 coats as needed. Cut in edges first, then roll. Work in sections to maintain wet edges. Charge $200-$600 depending on room size.',
    })
    sections.push({
      title: 'Cleanup',
      content: 'Remove tape while paint is tacky. Clean brushes and rollers. Touch up any misses. Dispose of materials properly.',
    })
  } else if (/\b(drywall|patch|repair)\b/.test(serviceName)) {
    sections.push({
      title: 'Prep',
      content: 'Mark cut lines. Remove damaged section cleanly. Secure backing if needed. Usually takes 15-30 minutes.',
    })
    sections.push({
      title: 'Patching',
      content: 'Install new piece with screws. Tape seams and apply joint compound. Feather edges wide. Charge $150-$400 per patch.',
    })
    sections.push({
      title: 'Finishing',
      content: 'Sand smooth between coats. Prime patched area before painting. Match texture to existing wall.',
    })
  } else {
    sections.push({
      title: 'Setup',
      content: 'Arrive 10 minutes early. Greet customer and review scope. Lay down protection. Gather tools. Usually takes 10-15 minutes.',
    })
    sections.push({
      title: 'Execution',
      content: 'Follow standard procedures for the service type. Work efficiently and cleanly. Communicate any scope changes immediately.',
    })
    sections.push({
      title: 'Closeout',
      content: 'Clean work area completely. Review work with customer. Collect payment or signature. Update job status in app.',
    })
  }

  return sections
}

export default function ServiceDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [range, setRange] = useState<RangeOption>('30d')
  const [service, setService] = useState<Service | null>(null)
  const [bookedJobs, setBookedJobs] = useState<Job[]>([])
  const [invoiceByJob, setInvoiceByJob] = useState<Map<string, InvoiceRow>>(new Map())
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

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

      const { data: serviceData } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .eq('business_id', profile.business_id)
        .single()

      if (!serviceData) {
        setLoading(false)
        return
      }
      setService(serviceData)

      // Get sibling services with same normalized name
      const normalizedTarget = serviceData.name
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ')

      const { data: siblingServices } = await supabase
        .from('services')
        .select('id, name')
        .eq('business_id', profile.business_id)

      const serviceIdsInScope = (siblingServices || [])
        .filter((row: { name?: string }) =>
          row.name
            ?.normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim()
            .replace(/\s+/g, ' ') === normalizedTarget
        )
        .map((row: { id: string }) => row.id)

      const { data: jobServiceLinks } = await supabase
        .from('job_services')
        .select('job_id, service_id')
        .in('service_id', serviceIdsInScope.length > 0 ? serviceIdsInScope : [id])

      const jobIds = Array.from(new Set((jobServiceLinks || []).map((row: { job_id: string }) => row.job_id)))

      let jobs: Job[] = []
      if (jobIds.length > 0) {
        const { data: jobsData } = await supabase
          .from('jobs')
          .select(
            `
            id,
            status,
            scheduled_start,
            scheduled_end,
            total_cost,
            customer:customers(name)
          `
          )
          .in('id', jobIds)
          .eq('business_id', profile.business_id)
          .order('scheduled_start', { ascending: true })

        jobs = ((jobsData || []) as any[]).map((row) => ({
          id: row.id,
          status: row.status,
          scheduled_start: row.scheduled_start,
          scheduled_end: row.scheduled_end,
          total_cost: row.total_cost,
          customer: Array.isArray(row.customer) ? row.customer[0] : row.customer,
        }))
      }
      setBookedJobs(jobs)

      const invoiceMap = new Map<string, InvoiceRow>()
      if (jobIds.length > 0) {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('job_id, total')
          .eq('business_id', profile.business_id)
          .in('job_id', jobIds)

        for (const row of (invoices || []) as InvoiceRow[]) {
          if (!row.job_id || invoiceMap.has(row.job_id)) continue
          invoiceMap.set(row.job_id, row)
        }
      }
      setInvoiceByJob(invoiceMap)
      setLoading(false)
    }

    loadData()
  }, [id])

  const rangeDays = useMemo(() => {
    const option = RANGE_OPTIONS.find((o) => o.value === range)
    return option?.days ?? null
  }, [range])

  const filteredJobs = useMemo(() => {
    if (rangeDays === null) return bookedJobs
    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - rangeDays)

    return bookedJobs.filter((job) => {
      const scheduled = new Date(job.scheduled_start)
      return scheduled >= startDate && scheduled <= now
    })
  }, [bookedJobs, rangeDays])

  const stats = useMemo(() => {
    const totalJobs = filteredJobs.length
    const completedJobs = filteredJobs.filter((j) => j.status === 'completed').length
    const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0
    const billed = filteredJobs.reduce((sum, job) => {
      const invoiceTotal = invoiceByJob.get(job.id)?.total
      return sum + Number(invoiceTotal ?? job.total_cost ?? 0)
    }, 0)

    const durations = filteredJobs
      .map((job) => durationMinutes(job.scheduled_start, job.scheduled_end))
      .filter((v): v is number => typeof v === 'number')
    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null

    const billedValues = filteredJobs
      .map((job) => Number(invoiceByJob.get(job.id)?.total ?? job.total_cost ?? 0))
      .filter((v) => Number.isFinite(v) && v > 0)
    const minBilled = billedValues.length > 0 ? Math.min(...billedValues) : null
    const maxBilled = billedValues.length > 0 ? Math.max(...billedValues) : null

    const now = new Date()
    const activeToday = bookedJobs.filter((job) => {
      const date = new Date(job.scheduled_start)
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate() &&
        ['scheduled', 'on_the_way', 'arrived', 'in_progress'].includes(job.status)
      )
    }).length

    return {
      totalJobs,
      completedJobs,
      completionRate,
      billed,
      avgDuration,
      minBilled,
      maxBilled,
      activeToday,
    }
  }, [filteredJobs, invoiceByJob, bookedJobs])

  const upcomingJobs = useMemo(() => {
    const now = new Date()
    return bookedJobs
      .filter((job) => new Date(job.scheduled_start).getTime() >= now.getTime())
      .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime())
      .slice(0, 10)
  }, [bookedJobs])

  const pastJobs = useMemo(() => {
    const now = new Date()
    return bookedJobs
      .filter((job) => new Date(job.scheduled_start).getTime() < now.getTime())
      .sort((a, b) => new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime())
      .slice(0, 10)
  }, [bookedJobs])

  const topTechs = useMemo(() => {
    const techMap = new Map<string, { name: string; total: number; completed: number }>()
    for (const job of bookedJobs) {
      const techName = job.technician?.full_name || 'Unassigned'
      const current = techMap.get(techName) || { name: techName, total: 0, completed: 0 }
      current.total += 1
      if (job.status === 'completed') current.completed += 1
      techMap.set(techName, current)
    }
    return Array.from(techMap.values())
      .filter((tech) => tech.name !== 'Unassigned')
      .sort((a, b) => (b.completed === a.completed ? b.total - a.total : b.completed - a.completed))
      .slice(0, 4)
  }, [bookedJobs])

  const quickTips = useMemo(() => (service ? getQuickTips(service.name) : []), [service])
  const playbookSections = useMemo(() => (service ? getPlaybookSections(service.name) : []), [service])

  const completionTone =
    stats.completionRate >= 80 ? 'text-emerald-600 dark:text-emerald-300'
      : stats.completionRate >= 60 ? 'text-cyan-600 dark:text-cyan-300'
        : stats.completionRate >= 40 ? 'text-amber-600 dark:text-amber-300'
          : 'text-rose-600 dark:text-rose-300'

  const toggleSection = (title: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(title)) {
      newExpanded.delete(title)
    } else {
      newExpanded.add(title)
    }
    setExpandedSections(newExpanded)
  }

  if (loading) {
    return (
      <div className="space-y-6 pb-10">
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse font-mono text-sm text-slate-400">LOADING...</div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
        <h1 className="font-display text-4xl text-slate-900 dark:text-white tracking-wide">SERVICE PLAYBOOK</h1>
        <p className="mt-2 font-sans text-sm text-slate-600 dark:text-slate-400">
          Admin access is required for service playbook controls.
        </p>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
        <h1 className="font-display text-4xl text-slate-900 dark:text-white tracking-wide">SERVICE NOT FOUND</h1>
        <p className="mt-2 font-sans text-sm text-slate-600 dark:text-slate-400">
          The requested service could not be found.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/services" prefetch={false}>
            <Button
              variant="ghost"
              className="rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-2 text-slate-700 backdrop-blur-md hover:bg-white dark:border-slate-700/80 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-800/70"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-4xl tracking-[0.08em] text-slate-900 dark:text-slate-100">SERVICE PLAYBOOK</h1>
            <p className="font-sans text-sm text-slate-600 dark:text-slate-400">
              Operational defaults and performance context for this service.
            </p>
          </div>
        </div>

        <Link href={`/admin/services/${id}/edit`} prefetch={false}>
          <Button className="rounded-2xl border border-cyan-300/50 bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 py-2 text-xs font-mono tracking-wider text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-cyan-400">
            EDIT PLAYBOOK
          </Button>
        </Link>
      </div>

      {/* Range Selector */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">RANGE:</span>
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setRange(option.value)}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all ${
                range === option.value
                  ? 'bg-cyan-500 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Service Header */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 dark:border-slate-700/70 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-3xl uppercase tracking-wide text-slate-900 dark:text-slate-100">
                {service.name}
              </h2>
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-wider ${
                  service.is_active
                    ? 'border-emerald-300/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {service.is_active ? 'ACTIVE' : 'ARCHIVED'}
              </span>
            </div>
            {service.description ? (
              <p className="mt-2 max-w-2xl font-sans text-sm text-slate-600 dark:text-slate-400">
                {service.description}
              </p>
            ) : (
              <p className="mt-2 font-sans text-sm text-slate-500 dark:text-slate-500">
                No description set for this service.
              </p>
            )}
          </div>
          <p className="font-mono text-xs tracking-wider text-slate-500 dark:text-slate-400">
            Created {formatDate(service.created_at)}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-5">
          <StatTile label="Jobs" value={String(stats.totalJobs)} icon={Calendar} />
          <StatTile label="Completion" value={`${stats.completionRate.toFixed(0)}%`} icon={CheckCircle2} valueClass={completionTone} />
          <StatTile label="Revenue" value={formatMoney(stats.billed)} icon={Receipt} />
          <StatTile label="Duration" value={formatDuration(stats.avgDuration || service.duration_minutes)} icon={Clock} />
          <StatTile label="Active Today" value={String(stats.activeToday)} icon={Truck} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Playbook Accordions */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 dark:border-slate-700/70 dark:bg-slate-900">
          <h2 className="font-display text-xl tracking-[0.08em] text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-indigo-500" />
            Playbook
          </h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Standard operating procedures
          </p>

          <div className="mt-4 space-y-2">
            {playbookSections.map((section) => (
              <div
                key={section.title}
                className="rounded-xl border border-slate-200/80 bg-slate-50 dark:border-slate-700/80 dark:bg-slate-800/50 overflow-hidden"
              >
                <button
                  onClick={() => toggleSection(section.title)}
                  className="w-full flex items-center justify-between p-3 text-left"
                >
                  <span className="font-display text-sm uppercase tracking-wide text-slate-900 dark:text-slate-100">
                    {section.title}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform ${
                      expandedSections.has(section.title) ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all ${
                    expandedSections.has(section.title) ? 'max-h-40' : 'max-h-0'
                  }`}
                >
                  <div className="px-3 pb-3 pt-0 border-t border-slate-200/60 dark:border-slate-700/60">
                    <p className="font-sans text-xs leading-relaxed text-slate-700 dark:text-slate-300 pt-2">
                      {section.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Tips */}
          <div className="mt-4 rounded-xl border border-amber-200/60 bg-amber-50/50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <h3 className="font-display text-sm uppercase tracking-wide text-slate-900 dark:text-slate-100">
                Quick Tips
              </h3>
            </div>
            <ul className="space-y-1.5">
              {quickTips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-500 shrink-0" />
                  <span className="font-sans text-xs text-slate-700 dark:text-slate-300">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Dispatch Control */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 dark:border-slate-700/70 dark:bg-slate-900 space-y-3">
          <h2 className="font-display text-xl tracking-[0.08em] text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            Dispatch Control
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Pricing and time guidelines
          </p>

          <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-700/80 dark:bg-slate-800/50">
            <p className="font-mono text-[11px] uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Pricing
            </p>
            <p className="mt-1 font-sans text-xs text-slate-600 dark:text-slate-400">
              Default: {formatPrice(service.base_price)}
            </p>
            <p className="font-sans text-xs text-slate-600 dark:text-slate-400">
              Recent range:{' '}
              {stats.minBilled !== null && stats.maxBilled !== null
                ? `${formatMoney(stats.minBilled)} - ${formatMoney(stats.maxBilled)}`
                : 'Not enough data'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-700/80 dark:bg-slate-800/50">
            <p className="font-mono text-[11px] uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Time
            </p>
            <p className="mt-1 font-sans text-xs text-slate-600 dark:text-slate-400">
              Default: {formatDuration(service.duration_minutes)}
            </p>
            <p className="font-sans text-xs text-slate-600 dark:text-slate-400">
              Typical: {formatDuration(stats.avgDuration)}
            </p>
          </div>

          <div className="rounded-xl border border-cyan-200/80 bg-cyan-50/50 p-3 dark:border-cyan-500/30 dark:bg-cyan-500/10">
            <p className="font-mono text-[11px] uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
              Customer Message
            </p>
            <p className="mt-1 font-sans text-xs text-slate-700 dark:text-slate-300">
              Hi customer, your {service.name} is booked. Usually takes {formatDuration(stats.avgDuration || service.duration_minutes)}.
            </p>
          </div>
        </div>
      </div>

      {/* Technician Coverage */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 dark:border-slate-700/70 dark:bg-slate-900">
        <h2 className="font-display text-xl tracking-[0.08em] text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Users className="h-4 w-4 text-cyan-500" />
          Technician Coverage
        </h2>
        <div className="mt-3 space-y-2">
          {topTechs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700">
              <p className="font-sans text-sm text-slate-500 dark:text-slate-400">
                No technician coverage data yet.
              </p>
            </div>
          ) : (
            topTechs.map((tech) => {
              const completionRate = tech.total > 0 ? (tech.completed / tech.total) * 100 : 0
              return (
                <div
                  key={tech.name}
                  className="rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-3 dark:border-slate-700/80 dark:bg-slate-800/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-display text-lg uppercase tracking-[0.06em] text-slate-900 dark:text-slate-100">
                      {tech.name}
                    </p>
                    <span className="inline-flex rounded-full border border-slate-300/80 bg-white px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-700 dark:border-slate-600/80 dark:bg-slate-900/70 dark:text-slate-200">
                      {tech.completed}/{tech.total} closed
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/90 dark:bg-slate-700/80">
                    <div
                      className="h-full rounded-full bg-cyan-500 transition-all duration-700"
                      style={{ width: `${Math.max(0, Math.min(100, completionRate))}%` }}
                    />
                  </div>
                  <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                    {completionRate.toFixed(0)}% completion
                  </p>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Booked Appointments */}
      <div className="rounded-2xl border border-slate-200/60 bg-white dark:border-slate-700/70 dark:bg-slate-900">
        <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-700/70">
          <h2 className="font-display text-xl tracking-[0.08em] text-slate-900 dark:text-slate-100">
            Booked Appointments
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {bookedJobs.length} total bookings
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-4">
          <div className="space-y-2">
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-cyan-600 dark:text-cyan-300">
              Upcoming ({upcomingJobs.length})
            </h3>
            <JobSection jobs={upcomingJobs} emptyMessage="No upcoming jobs linked to this service." />
          </div>

          <div className="space-y-2">
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Past ({pastJobs.length})
            </h3>
            <JobSection jobs={pastJobs} emptyMessage="No past jobs linked to this service." />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatTile({
  label,
  value,
  icon: Icon,
  valueClass,
}: {
  label: string
  value: string
  icon: React.ElementType
  valueClass?: string
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-700/80 dark:bg-slate-800/50">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <p className={`mt-1 font-mono text-lg text-slate-900 dark:text-slate-100 ${valueClass || ''}`}>
        {value}
      </p>
    </div>
  )
}

function JobSection({ jobs, emptyMessage }: { jobs: Job[]; emptyMessage: string }) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700">
        <p className="font-sans text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-700/80">
      {jobs.map((job) => {
        const StatusIcon =
          job.status === 'on_the_way'
            ? Truck
            : job.status === 'arrived'
              ? MapPin
              : job.status === 'in_progress'
                ? PlayCircle
                : job.status === 'completed'
                  ? CheckCircle2
                  : Calendar

        return (
          <Link
            key={job.id}
            href={`/admin/jobs/${job.id}`}
            prefetch={false}
            className="flex items-center gap-3 border-b border-slate-200 bg-white px-3 py-2 transition hover:bg-slate-50 last:border-b-0 dark:border-slate-800 dark:bg-slate-950/70 dark:hover:bg-slate-900/80"
          >
            <div className="w-32 shrink-0">
              <p className="font-mono text-xs text-slate-900 dark:text-slate-100">
                {formatDateTime(job.scheduled_start)}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-sans text-sm font-medium text-slate-900 dark:text-slate-100">
                {job.customer?.name || 'Unknown customer'}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] tracking-wider ${
                statusColors[job.status] || statusColors.scheduled
              }`}
            >
              <StatusIcon className="h-3 w-3" />
              {getStatusLabel(job.status)}
            </span>
            <ArrowRight className="h-4 w-4 text-slate-300" />
          </Link>
        )
      })}
    </div>
  )
}
