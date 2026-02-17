'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { addDays, differenceInMinutes, endOfDay, format, startOfDay } from 'date-fns'
import { CalendarDays, ChevronDown, Keyboard, ListChecks, Route as RouteIcon, Wrench } from '@/components/ui/icons'

import { useRealtimeJobsWithRelations } from '@/hooks/useRealtimeJobsWithRelations'
import KeyboardShortcutsCard from '@/components/ui/KeyboardShortcutsCard'
import { useGoogleMaps } from '@/hooks/useGoogleMaps'
import { createClient } from '@/lib/supabase/client'
import DispatchJobCard from '@/components/tech/DispatchJobCard'

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
  service?: RawService | RawService[] | null
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
  const service = relationFirst(job.service)

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
          const result = await geocoder.geocode({ address: job.customer.address! })
          const location = result.results?.[0]?.geometry?.location
          if (!location) return null

          bounds.extend(location)

          const marker = new google.maps.Marker({
            map,
            position: location,
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
          return location
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
  helper: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-display text-3xl text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">{helper}</p>
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
        'group overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-sm transition-all dark:border-slate-800 dark:bg-slate-900/70',
        open && 'shadow-[0_18px_50px_-35px_rgba(2,132,199,0.35)] dark:shadow-[0_24px_60px_-40px_rgba(34,211,238,0.25)]'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg tracking-wide text-slate-900 dark:text-white">{title}</p>
            {subtitle ? (
              <p className="mt-0.5 truncate font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {right}
          <span
            className={cx(
              'inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-600 shadow-sm transition-transform duration-200 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300',
              open && 'rotate-180'
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
              'px-5 pb-5 transition-all duration-300',
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
  userId,
  businessId,
  today,
}: {
  initialJobs: RawJob[]
  userId: string
  businessId: string
  today: Date
}) {
  const [tomorrowJobs, setTomorrowJobs] = useState<TomorrowJob[]>([])
  const startOfTodayDate = useMemo(() => startOfDay(today), [today])
  const endOfTodayDate = useMemo(() => endOfDay(today), [today])

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

  useEffect(() => {
    async function fetchTomorrowJobs() {
      if (!businessId) return

      const supabase = createClient()
      const tomorrow = addDays(today, 1)
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
          customer:customers(name, address),
          service:services(name)
        `
        )
        .eq('technician_id', userId)
        .gte('scheduled_start', startOfTomorrow.toISOString())
        .lte('scheduled_start', endOfTomorrow.toISOString())
        .order('scheduled_start', { ascending: true })
        .limit(5)

      setTomorrowJobs((data || []) as TomorrowJob[])
    }

    fetchTomorrowJobs()
  }, [businessId, today, userId])

  const now = new Date()
  const totalJobs = jobs.length
  const completedCount = jobs.filter((job) => job.status === 'completed').length
  const activeCount = jobs.filter((job) => activeStatuses.has(job.status)).length
  const scheduledCount = jobs.filter((job) => job.status === 'scheduled').length
  const completionRate = totalJobs > 0 ? Math.round((completedCount / totalJobs) * 100) : 0

  const nextJob = jobs.find((job) => !['completed', 'cancelled'].includes(job.status)) || null
  const totalRevenue = jobs.reduce((sum, job) => sum + (Number(job.total_cost) || 0), 0)
  const earnedRevenue = jobs
    .filter((job) => job.status === 'completed')
    .reduce((sum, job) => sum + (Number(job.total_cost) || 0), 0)

  const shiftStart = jobs[0]?.scheduled_start || null
  const shiftEnd = jobs[Math.max(jobs.length - 1, 0)]?.scheduled_end || null
  const overdueActive = jobs.filter(
    (job) => activeStatuses.has(job.status) && job.scheduled_end && new Date(job.scheduled_end) < now
  ).length
  const dueSoon = jobs.filter((job) => {
    if (job.status !== 'scheduled') return false
    const mins = differenceInMinutes(new Date(job.scheduled_start), now)
    return mins >= 0 && mins <= 90
  }).length

  const [panels, setPanels] = useState(() => ({
    queue: true,
    route: false,
    tomorrow: false,
    tools: false,
    shortcuts: false,
  }))

  const togglePanel = (key: keyof typeof panels) => {
    setPanels((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_42%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.2),transparent_42%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Field Operations</p>
            <h1 className="mt-2 font-display text-4xl tracking-wide text-slate-900 dark:text-white sm:text-5xl">Today Dispatch Board</h1>
            <p className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              {format(today, 'EEEE, d MMM yyyy')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${
                  isConnected
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300'
                    : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400 dark:bg-slate-600'}`} aria-hidden="true" />
                {isConnected ? 'Realtime Live' : 'Realtime Offline'}
              </span>
              {isRefreshing && (
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan-700 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-300">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-cyan-300 border-t-transparent animate-spin dark:border-cyan-300/40" aria-hidden="true" />
                  Syncing
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/tech/schedule"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Full Schedule
            </Link>
            <Link
              href="/tech/stats"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-white transition-colors hover:bg-blue-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
            >
              Performance
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Next Job"
          value={nextJob ? format(new Date(nextJob.scheduled_start), 'h:mm a') : '--'}
          helper={nextJob ? nextJob.customer.name : 'No pending dispatch'}
        />
        <KpiCard label="Completed" value={completedCount} helper={`${completionRate}% completion today`} />
        <KpiCard label="Active Now" value={activeCount} helper={`${dueSoon} jobs due within 90 minutes`} />
        <KpiCard label="Revenue Today" value={`$${earnedRevenue.toFixed(0)}`} helper={`$${totalRevenue.toFixed(0)} total booked`} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <CollapsiblePanel
            title="Queue"
            subtitle={`${totalJobs} jobs · ${scheduledCount} scheduled · ${activeCount} active`}
            icon={ListChecks}
            open={panels.queue}
            onToggle={() => togglePanel('queue')}
            right={
              <Link
                href="/tech/schedule"
                className="hidden sm:inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={(e) => e.stopPropagation()}
              >
                Calendar
              </Link>
            }
          >
            {jobs.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="font-mono text-sm text-slate-600 dark:text-slate-300">No jobs assigned for today.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job, idx) => (
                  <div key={job.id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(idx * 35, 240)}ms` }}>
                    <DispatchJobCard job={job} />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Critical Watch
              </p>
              <p className="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
                {overdueActive > 0
                  ? `${overdueActive} active jobs are running behind scheduled end times`
                  : 'No active delays detected in today queue'}
              </p>
            </div>
          </CollapsiblePanel>
        </div>

        <div className="space-y-4">
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
                  const service = relationFirst(job.service)
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

          <CollapsiblePanel
            title="Shortcuts"
            subtitle="Keyboard navigation"
            icon={Keyboard}
            open={panels.shortcuts}
            onToggle={() => togglePanel('shortcuts')}
          >
            <KeyboardShortcutsCard role="tech" defaultExpanded={false} />
          </CollapsiblePanel>
        </div>
      </section>
    </div>
  )
}
