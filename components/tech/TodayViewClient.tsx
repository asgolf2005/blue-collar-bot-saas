'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { addDays, differenceInMinutes, endOfDay, format, startOfDay } from 'date-fns'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Radio,
  Route,
  Wrench,
} from 'lucide-react'

import { useRealtimeJobsWithRelations } from '@/hooks/useRealtimeJobsWithRelations'
import KeyboardShortcutsCard from '@/components/ui/KeyboardShortcutsCard'
import { useGoogleMaps } from '@/hooks/useGoogleMaps'
import { createClient } from '@/lib/supabase/client'

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

const statusStyles: Record<string, string> = {
  scheduled:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/25 dark:bg-blue-400/10 dark:text-blue-300',
  on_the_way:
    'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-300',
  arrived:
    'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-300',
  in_progress:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300',
  completed:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300',
  cancelled:
    'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

const relationFirst = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

const formatStatusLabel = (status: string) =>
  status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

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
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-cyan-500" />
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
                <Radio className={`h-3.5 w-3.5 ${isConnected ? 'animate-pulse' : ''}`} />
                {isConnected ? 'Realtime Live' : 'Realtime Offline'}
              </span>
              {isRefreshing && (
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan-700 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-300">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
              <CalendarDays className="h-3.5 w-3.5" />
              Full Schedule
            </Link>
            <Link
              href="/tech/stats"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-white transition-colors hover:bg-blue-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
            >
              Performance
              <ArrowRight className="h-3.5 w-3.5" />
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

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
              <div>
                <h2 className="font-display text-2xl tracking-wide text-slate-900 dark:text-white">Today Schedule</h2>
                <p className="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  {totalJobs} jobs, {scheduledCount} still scheduled
                </p>
              </div>
              <Link
                href="/tech/schedule"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Open Calendar
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {jobs.length === 0 ? (
              <div className="p-10 text-center">
                <CalendarDays className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-500" />
                <p className="mt-3 font-mono text-sm text-slate-600 dark:text-slate-300">No jobs assigned for today.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {jobs.map((job) => (
                  <div key={job.id} className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                    <Link href={`/tech/jobs/${job.id}`} className="flex min-w-0 flex-1 items-start gap-4">
                      <div className="w-16 shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-center dark:border-slate-700 dark:bg-slate-800">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Start</p>
                        <p className="mt-1 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {format(new Date(job.scheduled_start), 'h:mm')}
                        </p>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{job.customer.name}</p>
                          <span
                            className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${
                              statusStyles[job.status] || statusStyles.scheduled
                            }`}
                          >
                            {formatStatusLabel(job.status)}
                          </span>
                        </div>
                        <p className="mt-1 truncate font-mono text-xs text-slate-600 dark:text-slate-300">
                          {job.description || job.service.name}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {job.scheduled_end
                              ? `${format(new Date(job.scheduled_start), 'h:mm a')} - ${format(new Date(job.scheduled_end), 'h:mm a')}`
                              : format(new Date(job.scheduled_start), 'h:mm a')}
                          </span>
                          {job.customer.address && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {job.customer.address}
                            </span>
                          )}
                          {job.total_cost ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />${Number(job.total_cost).toFixed(0)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/tech/jobs/${job.id}`}
                        className="rounded-lg bg-blue-600 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-blue-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
                      >
                        Open Job
                      </Link>
                      {job.customer.phone && (
                        <a
                          href={`tel:${job.customer.phone}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          Call
                        </a>
                      )}
                      {job.customer.address && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.customer.address)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Navigation className="h-3.5 w-3.5" />
                          Route
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="font-display text-xl tracking-wide text-slate-900 dark:text-white">Critical Watch</h3>
            </div>
            <p className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              {overdueActive > 0
                ? `${overdueActive} active jobs are running behind scheduled end times`
                : 'No active delays detected in today queue'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-xl tracking-wide text-slate-900 dark:text-white">Route Overview</h3>
              <Route className="h-4 w-4 text-cyan-500" />
            </div>
            <RouteMap jobs={jobs} />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-display text-xl tracking-wide text-slate-900 dark:text-white">Shift Window</h3>
            <div className="mt-3 space-y-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Start</p>
                <p className="mt-1 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {shiftStart ? format(new Date(shiftStart), 'h:mm a') : '--'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Finish</p>
                <p className="mt-1 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {shiftEnd ? format(new Date(shiftEnd), 'h:mm a') : '--'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl tracking-wide text-slate-900 dark:text-white">Tomorrow Preview</h3>
              <Link href="/tech/schedule" className="font-mono text-[11px] uppercase tracking-[0.12em] text-cyan-600 dark:text-cyan-300">
                Open
              </Link>
            </div>
            {tomorrowJobs.length === 0 ? (
              <p className="mt-3 font-mono text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">No jobs scheduled tomorrow.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {tomorrowJobs.map((job) => {
                  const customer = relationFirst(job.customer)
                  const service = relationFirst(job.service)
                  return (
                    <div key={job.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                      <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-200">
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
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-display text-xl tracking-wide text-slate-900 dark:text-white">Action Dock</h3>
            <div className="mt-3 space-y-2">
              <Link
                href="/tech/schedule"
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <CalendarDays className="h-4 w-4 text-blue-500" />
                Open Calendar
              </Link>
              <Link
                href="/tech/stats"
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Wrench className="h-4 w-4 text-cyan-500" />
                View Performance
              </Link>
            </div>
          </div>
        </div>
      </section>

      <KeyboardShortcutsCard role="tech" defaultExpanded={false} />
    </div>
  )
}
