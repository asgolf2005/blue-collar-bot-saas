'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { addDays, endOfDay, format, isSameDay, startOfDay } from 'date-fns'
import { CalendarDays, ChevronDown, ListChecks, Route as RouteIcon, Sparkles, Wrench } from '@/components/ui/icons'

import { useRealtimeJobsWithRelations } from '@/hooks/useRealtimeJobsWithRelations'
import { useGoogleMaps } from '@/hooks/useGoogleMaps'
import { createClient } from '@/lib/supabase/client'
import DispatchJobCard from '@/components/tech/DispatchJobCard'
import TechAIAssistantPanel from '@/components/tech/TechAIAssistantPanel'

interface RawCustomer {
  id?: string
  name?: string
  phone?: string | null
  address?: string | null
}

interface RawService {
  name?: string
  category?: string | null
}

interface RawJob {
  id: string
  business_id?: string
  technician_id?: string
  scheduled_start?: string | null
  scheduled_end?: string | null
  status?: string
  description?: string | null
  urgency?: string | null
  total_cost?: number | null
  customer?: RawCustomer | RawCustomer[] | null
  service?: RawService | RawService[] | null
  services?: Array<{ service?: RawService | RawService[] | null }> | null
}

interface NormalizedJob {
  id: string
  business_id?: string
  technician_id?: string
  scheduled_start: string
  scheduled_end: string | null
  status: string
  description: string | null
  urgency: string | null
  total_cost: number | null
  customer: {
    id: string
    name: string
    phone: string | null
    address: string | null
  }
  service: {
    name: string
    category: string | null
  }
}

interface TomorrowJob {
  id: string
  scheduled_start: string | null
  status: string
  description: string | null
  customer?: RawCustomer | RawCustomer[] | null
  services?: Array<{ service?: RawService | RawService[] | null }> | null
}

const activeStatuses = new Set(['on_the_way', 'arrived', 'in_progress'])

const relationFirst = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

const formatStatusLabel = (status: string) =>
  status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ')

function normalizeJob(job: RawJob): NormalizedJob | null {
  if (!job.scheduled_start || !job.id) return null

  const customer = relationFirst(job.customer)
  const directService = relationFirst(job.service)
  const mappedService = relationFirst(relationFirst(job.services)?.service)
  const service = directService || mappedService

  return {
    id: job.id,
    business_id: job.business_id,
    technician_id: job.technician_id,
    scheduled_start: job.scheduled_start,
    scheduled_end: job.scheduled_end || null,
    status: job.status || 'scheduled',
    description: job.description || null,
    urgency: job.urgency || null,
    total_cost: typeof job.total_cost === 'number' ? job.total_cost : Number(job.total_cost) || 0,
    customer: {
      id: customer?.id || '',
      name: customer?.name || 'Unknown customer',
      phone: customer?.phone || null,
      address: customer?.address || null,
    },
    service: {
      name: service?.name || 'General service',
      category: service?.category || null,
    },
  }
}

function RouteMap({ jobs }: { jobs: NormalizedJob[] }) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const routeRef = useRef<google.maps.Polyline | null>(null)
  const geocodeCacheRef = useRef<Map<string, google.maps.LatLngLiteral>>(new Map())
  const { isLoaded, loadError } = useGoogleMaps()

  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current || mapRef.current) return

    mapRef.current = new google.maps.Map(mapContainerRef.current, {
      zoom: 12,
      center: { lat: 37.7749, lng: -122.4194 },
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    })
  }, [isLoaded])

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return

    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []
    if (routeRef.current) {
      routeRef.current.setMap(null)
      routeRef.current = null
    }

    const withAddress = jobs.filter((job) => job.customer.address)
    if (withAddress.length === 0) return

    const geocoder = new google.maps.Geocoder()
    const map = mapRef.current
    const bounds = new google.maps.LatLngBounds()

    Promise.all(
      withAddress.map(async (job, index) => {
        try {
          const address = job.customer.address || ''
          let cached = geocodeCacheRef.current.get(address)

          if (!cached) {
            const result = await geocoder.geocode({ address })
            const location = result.results?.[0]?.geometry?.location
            if (!location) return null
            cached = { lat: location.lat(), lng: location.lng() }
            geocodeCacheRef.current.set(address, cached)
          }

          const point = new google.maps.LatLng(cached.lat, cached.lng)

          bounds.extend(point)

          const marker = new google.maps.Marker({
            map,
            position: point,
            label: {
              text: String(index + 1),
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: '700',
            },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: job.status === 'completed' ? '#10b981' : '#06b6d4',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
              scale: 14,
            },
          })

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding:8px 10px;min-width:180px;">
                <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">${formatStatusLabel(job.status)}</p>
                <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#0f172a;">${job.customer.name}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#64748b;">${format(new Date(job.scheduled_start), 'h:mm a')}</p>
              </div>
            `,
          })

          marker.addListener('click', () => infoWindow.open(map, marker))
          markersRef.current.push(marker)
          return point
        } catch {
          return null
        }
      })
    ).then((points) => {
      const path = points.filter(Boolean) as google.maps.LatLng[]
      if (path.length === 0) return

      routeRef.current = new google.maps.Polyline({
        map,
        path,
        strokeColor: '#06b6d4',
        strokeOpacity: 0.8,
        strokeWeight: 3,
      })

      map.fitBounds(bounds)
      if (path.length === 1) {
        google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
          const zoom = map.getZoom()
          if (zoom && zoom > 15) map.setZoom(15)
        })
      }
    })
  }, [isLoaded, jobs])

  if (loadError) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          Google Maps unavailable. Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to enable route map.
        </p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto h-6 w-6 rounded-full border-2 border-slate-300 border-t-cyan-500 animate-spin dark:border-white/10 dark:border-t-cyan-400" />
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Loading route map</p>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div ref={mapContainerRef} className="h-[280px] w-full" />
      {jobs.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/85 backdrop-blur-sm dark:bg-slate-900/85">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">No route points for today</p>
        </div>
      )}
    </div>
  )
}

function KpiCard({
  label,
  value,
  helper,
}: {
  label: string
  value: string | number
  helper?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
      {helper ? <p className="mt-1 font-sans text-xs text-slate-500 dark:text-slate-400">{helper}</p> : null}
    </div>
  )
}

function CollapsiblePanel({
  title,
  subtitle,
  icon: Icon,
  open,
  onToggle,
  right,
  children,
}: {
  title: string
  subtitle?: string
  icon: React.ElementType
  open: boolean
  onToggle: () => void
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section
      className={cx(
        'group overflow-hidden rounded-2xl bg-white/40 shadow-sm backdrop-blur transition-all dark:bg-slate-900/30 w-full',
        open && 'bg-white/70 dark:bg-slate-900/60 shadow-[0_8px_30px_-15px_rgba(2,132,199,0.2)] dark:shadow-[0_12px_40px_-20px_rgba(34,211,238,0.15)]'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg uppercase tracking-[0.08em] text-slate-900 dark:text-white">{title}</p>
            {subtitle ? (
              <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {right}
          <span
            className={cx(
              'inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform duration-200 dark:bg-slate-800 dark:text-slate-400',
              open && 'rotate-180 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
            )}
            aria-hidden="true"
          >
            <ChevronDown className="h-4 w-4" />
          </span>
        </div>
      </button>

      <div
        className={cx(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cx(
              'px-4 pb-4 transition-all duration-300',
              open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function TodayViewClient({
  initialJobs,
  initialNextJob,
  userId,
  businessId,
  nowIso,
  startOfTodayIso,
  endOfTodayIso,
}: {
  initialJobs: RawJob[]
  initialNextJob: RawJob | null
  userId: string
  businessId: string
  nowIso: string
  startOfTodayIso: string
  endOfTodayIso: string
}) {
  const [tomorrowJobs, setTomorrowJobs] = useState<TomorrowJob[]>([])
  const [liveNextJob, setLiveNextJob] = useState<NormalizedJob | null>(null)
  const [currentNowMs, setCurrentNowMs] = useState(() => new Date(nowIso).getTime())
  const supabase = useMemo(() => createClient(), [])
  const startOfTodayDate = useMemo(() => new Date(startOfTodayIso), [startOfTodayIso])
  const endOfTodayDate = useMemo(() => new Date(endOfTodayIso), [endOfTodayIso])
  const todayDate = useMemo(() => startOfTodayDate, [startOfTodayDate])

  useEffect(() => {
    const syncNow = () => setCurrentNowMs(Date.now())
    const initialSyncTimer = setTimeout(syncNow, 0)
    const timer = setInterval(() => {
      setCurrentNowMs(Date.now())
    }, 60_000)
    return () => {
      clearTimeout(initialSyncTimer)
      clearInterval(timer)
    }
  }, [])

  const { jobs: allJobs, isConnected, isRefreshing } = useRealtimeJobsWithRelations({
    businessId: businessId || initialJobs[0]?.business_id || '',
    initialJobs: initialJobs as any[],
    technicianId: userId,
    startDate: startOfTodayDate,
    endDate: endOfTodayDate,
  })

  const jobs = useMemo(() => {
    const filtered = (allJobs as RawJob[]).filter((job) => {
      if (job.technician_id !== userId || !job.scheduled_start) return false
      const start = new Date(job.scheduled_start)
      return start >= startOfTodayDate && start <= endOfTodayDate
    })

    return filtered
      .map(normalizeJob)
      .filter((job): job is NormalizedJob => Boolean(job))
      .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime())
  }, [allJobs, endOfTodayDate, startOfTodayDate, userId])
  const fallbackNextJob = useMemo(() => {
    if (!initialNextJob) return null
    const normalized = normalizeJob(initialNextJob)
    if (!normalized) return null
    return ['completed', 'cancelled'].includes(normalized.status) ? null : normalized
  }, [initialNextJob])

  useEffect(() => {
    let active = true

    async function fetchLiveNextJob() {
      const { data } = await supabase
        .from('jobs')
        .select(
          `
          id,
          business_id,
          technician_id,
          status,
          description,
          scheduled_start,
          scheduled_end,
          total_cost,
          customer:customers(id, name, phone, address),
          services:job_services(service:services(name, category))
        `
        )
        .eq('technician_id', userId)
        .gte('scheduled_start', nowIso)
        .order('scheduled_start', { ascending: true })
        .limit(30)

      if (!active) return
      const nextCandidate =
        (data || [])
          .map((job) => normalizeJob(job as RawJob))
          .filter((job): job is NormalizedJob => Boolean(job))
          .find((job) => !['completed', 'cancelled'].includes(job.status)) || null
      setLiveNextJob(nextCandidate)
    }

    void fetchLiveNextJob()
    return () => {
      active = false
    }
  }, [nowIso, supabase, userId])

  useEffect(() => {
    let active = true

    async function fetchTomorrowJobs() {
      if (!businessId) return

      const tomorrow = addDays(startOfTodayDate, 1)
      const startOfTomorrow = startOfDay(tomorrow)
      const endOfTomorrow = endOfDay(tomorrow)

      const { data } = await supabase
        .from('jobs')
        .select(
          `
          id,
          scheduled_start,
          status,
          description,
          customer:customers(id, name, address),
          services:job_services(service:services(name, category))
        `
        )
        .eq('technician_id', userId)
        .gte('scheduled_start', startOfTomorrow.toISOString())
        .lte('scheduled_start', endOfTomorrow.toISOString())
        .order('scheduled_start', { ascending: true })
        .limit(5)

      if (!active) return
      setTomorrowJobs((data || []) as TomorrowJob[])
    }

    fetchTomorrowJobs()

    return () => {
      active = false
    }
  }, [businessId, startOfTodayDate, supabase, userId])

  const jobSummary = useMemo(() => {
    const nowMs = currentNowMs
    let completed = 0
    let active = 0
    let scheduled = 0
    let billedRevenueLocal = 0
    let overdueActiveLocal = 0
    let next: NormalizedJob | null = null
    let activeFallback: NormalizedJob | null = null
    let firstOpen: NormalizedJob | null = null

    for (const job of jobs) {
      const cost = Number(job.total_cost) || 0
      if (job.status !== 'cancelled') {
        billedRevenueLocal += cost
      }

      if (!['completed', 'cancelled'].includes(job.status)) {
        if (!firstOpen) {
          firstOpen = job
        }
        const startMs = new Date(job.scheduled_start).getTime()
        if (!next && startMs >= nowMs) {
          next = job
        }
        if (!activeFallback && activeStatuses.has(job.status)) {
          activeFallback = job
        }
      }

      if (job.status === 'completed') {
        completed += 1
      }

      if (job.status === 'scheduled') {
        scheduled += 1
      }

      if (activeStatuses.has(job.status)) {
        active += 1
        if (job.scheduled_end && new Date(job.scheduled_end).getTime() < nowMs) {
          overdueActiveLocal += 1
        }
      }
    }

    if (!next && fallbackNextJob) next = fallbackNextJob
    if (!next && liveNextJob) next = liveNextJob
    if (!next && activeFallback) next = activeFallback
    if (!next && firstOpen) next = firstOpen

    const total = jobs.length
    return {
      totalJobs: total,
      completedCount: completed,
      activeCount: active,
      scheduledCount: scheduled,
      nextJob: next,
      billedRevenue: billedRevenueLocal,
      shiftStart: jobs[0]?.scheduled_start || null,
      shiftEnd: jobs[Math.max(jobs.length - 1, 0)]?.scheduled_end || null,
      overdueActive: overdueActiveLocal,
    }
  }, [currentNowMs, fallbackNextJob, jobs, liveNextJob])

  const {
    totalJobs,
    completedCount,
    activeCount,
    scheduledCount,
    nextJob,
    billedRevenue,
    shiftStart,
    shiftEnd,
    overdueActive,
  } = jobSummary
  const [queueMode, setQueueMode] = useState<'all' | 'active' | 'scheduled' | 'completed'>('all')

  const queueJobs = useMemo(() => {
    if (queueMode === 'active') return jobs.filter((job) => activeStatuses.has(job.status))
    if (queueMode === 'scheduled') return jobs.filter((job) => job.status === 'scheduled')
    if (queueMode === 'completed') return jobs.filter((job) => job.status === 'completed')
    return jobs
  }, [jobs, queueMode])

  const [panels, setPanels] = useState(() => ({
    queue: true,
    route: false,
    tomorrow: false,
    ai: initialJobs.length > 0,
    tools: false,
  }))

  const togglePanel = (key: keyof typeof panels) => {
    setPanels((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const aiJobOptions = useMemo(
    () =>
      jobs.map((job) => ({
        id: job.id,
        customerName: job.customer.name,
        serviceName: job.service.name,
        scheduledStart: job.scheduled_start,
        status: job.status,
        description: job.description,
      })),
    [jobs]
  )
  const nextJobDisplay = useMemo(() => {
    if (!nextJob) return '--'
    const nextStart = new Date(nextJob.scheduled_start)
    return isSameDay(nextStart, todayDate) ? format(nextStart, 'h:mm a') : format(nextStart, 'EEE h:mm a')
  }, [nextJob, todayDate])

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-white to-slate-50 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:from-slate-900 dark:to-slate-950 dark:shadow-[0_8px_30px_rgba(34,211,238,0.06)]">
        <div className="absolute top-0 right-0 -m-16 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl dark:bg-cyan-500/20" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              {format(todayDate, 'EEEE, MMM d')}
            </p>
            <div className="flex items-center gap-1.5">
              {isRefreshing && (
                <span className="h-2 w-2 rounded-full border border-cyan-400 border-t-transparent animate-spin dark:border-cyan-300" aria-hidden="true" />
              )}
              <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            </div>
          </div>

          <h1 className="mt-2 font-display-soft text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dispatch
          </h1>

          <div className="mt-4 flex gap-2">
            <Link
              href="/tech/schedule"
              className="flex-1 rounded-full bg-slate-900 py-2.5 text-center font-sans text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              Schedule
            </Link>
            <Link
              href="/tech/stats"
              className="flex-1 rounded-full bg-cyan-500 py-2.5 text-center font-sans text-xs font-semibold uppercase tracking-[0.14em] text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-colors hover:bg-cyan-400"
            >
              Stats
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Next Job"
          value={nextJobDisplay}
        />
        <KpiCard label="Completed" value={completedCount} />
        <KpiCard label="Active Now" value={activeCount} />
        <KpiCard label="Billed Today" value={`$${billedRevenue.toFixed(0)}`} />
      </section>

      {totalJobs === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="font-display text-2xl uppercase tracking-[0.08em] text-slate-900 dark:text-slate-100">
            No Jobs Scheduled Today
          </p>
          <p className="mt-1 font-sans text-sm text-slate-600 dark:text-slate-300">
            Check tomorrow queue or open full schedule to review upcoming assignments.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/tech/schedule"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Open Schedule
            </Link>
            <button
              type="button"
              onClick={() => setPanels((prev) => ({ ...prev, tomorrow: true }))}
              className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-4 py-2 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-slate-950 transition-colors hover:bg-cyan-400"
            >
              Show Tomorrow Queue
            </button>
          </div>
        </section>
      ) : null}

      <section className="-mx-3 overflow-hidden">
        <div className="space-y-0.5">
          <CollapsiblePanel
            title="Queue"
            subtitle={`${totalJobs} total jobs`}
            icon={ListChecks}
            open={panels.queue}
            onToggle={() => togglePanel('queue')}
          >
            <div className="mb-2 flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
              {([
                { key: 'all', label: `All ${jobs.length}` },
                { key: 'active', label: `Active ${activeCount}` },
                { key: 'scheduled', label: `Scheduled ${scheduledCount}` },
                { key: 'completed', label: `Done ${completedCount}` },
              ] as const).map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => setQueueMode(mode.key)}
                  className={`rounded-full px-3 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.1em] transition ${queueMode === mode.key
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                    }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {queueJobs.length === 0 ? (
              <div className="py-10 text-center text-slate-500 dark:text-slate-400">
                <p className="font-sans text-sm">No jobs match this queue filter.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {queueJobs.map((job, idx) => (
                  <div key={job.id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(idx * 35, 240)}ms` }}>
                    <DispatchJobCard job={job} />
                  </div>
                ))}
              </div>
            )}

          </CollapsiblePanel>
        </div>
        <CollapsiblePanel
          title="Route"
          subtitle={jobs.length ? 'Map your stops for today' : 'No route points yet'}
          icon={RouteIcon}
          open={panels.route}
          onToggle={() => togglePanel('route')}
        >
          {panels.route ? <RouteMap jobs={jobs} /> : null}
        </CollapsiblePanel>

        <CollapsiblePanel
          title="Tomorrow"
          subtitle={tomorrowJobs.length ? `${tomorrowJobs.length} jobs queued` : 'No jobs scheduled'}
          icon={CalendarDays}
          open={panels.tomorrow}
          onToggle={() => togglePanel('tomorrow')}
          right={
            <Link
              href="/tech/schedule"
              className="hidden sm:inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              Open
            </Link>
          }
        >
          {tomorrowJobs.length === 0 ? (
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              No jobs scheduled tomorrow.
            </p>
          ) : (
            <div className="space-y-2">
              {tomorrowJobs.map((job) => {
                const customer = relationFirst(job.customer)
                const service = relationFirst(relationFirst(job.services)?.service)
                return (
                  <div
                    key={job.id}
                    className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950/20"
                  >
                    <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-slate-800 dark:text-slate-100">
                      {customer?.name || 'Unknown customer'}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {job.scheduled_start ? format(new Date(job.scheduled_start), 'EEE d MMM, h:mm a') : 'Time TBD'}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {job.description || service?.name || 'Service call'}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </CollapsiblePanel>

        <CollapsiblePanel
          title="AI Copilot"
          subtitle={aiJobOptions.length ? `${aiJobOptions.length} jobs available` : 'No jobs available'}
          icon={Sparkles}
          open={panels.ai}
          onToggle={() => togglePanel('ai')}
        >
          <TechAIAssistantPanel jobs={aiJobOptions} embedded />
        </CollapsiblePanel>

        <CollapsiblePanel
          title="Tools"
          subtitle="Shift window and quick actions"
          icon={Wrench}
          open={panels.tools}
          onToggle={() => togglePanel('tools')}
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950/20">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Start</p>
              <p className="mt-1 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                {shiftStart ? format(new Date(shiftStart), 'h:mm a') : '--'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950/20">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Finish</p>
              <p className="mt-1 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                {shiftEnd ? format(new Date(shiftEnd), 'h:mm a') : '--'}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href="/tech/schedule"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-slate-700 transition-all hover:-translate-y-[1px] hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              Calendar
            </Link>
            <Link
              href="/tech/stats"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-slate-700 transition-all hover:-translate-y-[1px] hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              Performance
            </Link>
          </div>
        </CollapsiblePanel>

      </section>
    </div>
  )
}
