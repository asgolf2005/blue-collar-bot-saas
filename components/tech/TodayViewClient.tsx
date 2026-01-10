'use client'

import { useMemo, useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { format, differenceInMinutes, addDays, startOfDay, endOfDay, addMinutes } from 'date-fns'
import { useRealtimeJobsWithRelations } from '@/hooks/useRealtimeJobsWithRelations'
import KeyboardShortcutsCard from '@/components/ui/KeyboardShortcutsCard'
import { useGoogleMaps } from '@/hooks/useGoogleMaps'
import { createClient } from '@/lib/supabase/client'

// Clean Circular Progress Component
function CircularProgress({ value, size = 100, strokeWidth = 6 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-surface-200"
          opacity="0.2"
        />
      </svg>
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary transition-all duration-500 ease-out"
        />
      </svg>
      <div className="relative flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-ink">{value}%</span>
      </div>
    </div>
  )
}

// Route Map Component
function RouteMap({ jobs }: { jobs: any[] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const polylineRef = useRef<google.maps.Polyline | null>(null)
  const { isLoaded } = useGoogleMaps()

  useEffect(() => {
    if (!isLoaded || !mapRef.current || googleMapRef.current) return

    const map = new google.maps.Map(mapRef.current, {
      zoom: 12,
      center: { lat: 37.7749, lng: -122.4194 },
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
      ]
    })

    googleMapRef.current = map
  }, [isLoaded])

  useEffect(() => {
    if (!googleMapRef.current || !isLoaded || !jobs.length) return

    const map = googleMapRef.current
    const geocoder = new google.maps.Geocoder()
    const bounds = new google.maps.LatLngBounds()

    // Clear existing markers and polyline
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []
    if (polylineRef.current) {
      polylineRef.current.setMap(null)
    }

    const geocodePromises = jobs
      .filter(job => job.customer?.address)
      .map(async (job, index) => {
        try {
          const result = await geocoder.geocode({ address: job.customer.address })
          if (result.results && result.results.length > 0) {
            const position = result.results[0].geometry.location
            bounds.extend(position)

            const marker = new google.maps.Marker({
              map,
              position,
              label: {
                text: String(index + 1),
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold'
              },
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 16,
                fillColor: job.status === 'completed' ? '#10b981' : job.status === 'in_progress' ? '#3b82f6' : '#6b7280',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2
              }
            })

            const infoWindow = new google.maps.InfoWindow({
              content: `
                <div style="padding: 8px; min-width: 180px;">
                  <h3 style="margin: 0 0 4px 0; font-weight: 600; font-size: 14px;">${job.customer.name}</h3>
                  <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
                    ${job.scheduled_start ? format(new Date(job.scheduled_start), 'h:mm a') : 'Time TBD'}
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #666;">${job.description || 'Service call'}</p>
                </div>
              `
            })

            marker.addListener('click', () => {
              infoWindow.open(map, marker)
            })

            markersRef.current.push(marker)
            return position
          }
        } catch (error) {
          console.error('Geocoding error:', error)
        }
        return null
      })

    Promise.all(geocodePromises).then(positions => {
      const validPositions = positions.filter(p => p !== null) as google.maps.LatLng[]

      if (validPositions.length > 0) {
        // Draw route line
        const polyline = new google.maps.Polyline({
          map,
          path: validPositions,
          strokeColor: '#3b82f6',
          strokeOpacity: 0.6,
          strokeWeight: 3,
          geodesic: true
        })
        polylineRef.current = polyline

        // Fit bounds
        map.fitBounds(bounds)
        if (validPositions.length === 1) {
          google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
            const zoom = map.getZoom()
            if (zoom && zoom > 15) map.setZoom(15)
          })
        }
      }
    })
  }, [jobs, isLoaded])

  if (!isLoaded) {
    return (
      <div className="glass-card h-[300px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm text-muted">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-0 overflow-hidden">
      <div ref={mapRef} className="w-full h-[300px]" />
      {jobs.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-50/90 backdrop-blur-sm">
          <div className="text-center">
            <svg className="w-12 h-12 text-muted mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p className="text-sm text-muted">No jobs to display</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TodayViewClient({
  initialJobs,
  userId,
  businessId,
  today
}: {
  initialJobs: any[],
  userId: string,
  businessId: string,
  today: Date
}) {
  const [tomorrowJobs, setTomorrowJobs] = useState<any[]>([])
  const startOfTodayDate = startOfDay(today)
  const endOfTodayDate = endOfDay(today)

  // Real-time subscription for today's jobs
  const { jobs: allJobs, isConnected } = useRealtimeJobsWithRelations({
    businessId: businessId || initialJobs[0]?.business_id || '',
    initialJobs,
    technicianId: userId,
    startDate: startOfTodayDate,
    endDate: endOfTodayDate,
  })

  // Filter to only today's jobs for this technician
  const jobs = useMemo(() => {
    return allJobs.filter(job => {
      if (job.technician_id !== userId || !job.scheduled_start) return false
      const start = new Date(job.scheduled_start)
      return start >= startOfTodayDate && start <= endOfTodayDate
    })
  }, [allJobs, userId, startOfTodayDate, endOfTodayDate])

  // Fetch tomorrow's jobs
  useEffect(() => {
    async function fetchTomorrowJobs() {
      if (!businessId) return

      const supabase = createClient()
      const tomorrow = addDays(today, 1)
      const startOfTomorrow = startOfDay(tomorrow)
      const endOfTomorrow = endOfDay(tomorrow)

      const { data } = await supabase
        .from('jobs')
        .select(`
          id,
          customer:customers(name, address),
          scheduled_start,
          description
        `)
        .eq('technician_id', userId)
        .gte('scheduled_start', startOfTomorrow.toISOString())
        .lte('scheduled_start', endOfTomorrow.toISOString())
        .order('scheduled_start', { ascending: true })
        .limit(3)

      setTomorrowJobs(data || [])
    }

    fetchTomorrowJobs()
  }, [businessId, userId, today])

  const totalJobs = jobs?.length || 0
  const completedCount = jobs?.filter(j => j.status === 'completed').length || 0
  const inProgressCount = jobs?.filter(j => ['in_progress', 'arrived', 'on_the_way'].includes(j.status)).length || 0
  const scheduledCount = jobs?.filter(j => j.status === 'scheduled').length || 0
  const completionRate = totalJobs > 0 ? Math.round((completedCount / totalJobs) * 100) : 0
  const nextJob = jobs?.find(job => job.status !== 'completed')

  // Calculate total revenue
  const totalRevenue = jobs?.reduce((sum, job) => {
    return sum + (Number(job.total_cost) || 0)
  }, 0) || 0
  const earnedRevenue = jobs?.filter(j => j.status === 'completed').reduce((sum, job) => {
    return sum + (Number(job.total_cost) || 0)
  }, 0) || 0
  const revenueRate = totalRevenue > 0 ? Math.round((earnedRevenue / totalRevenue) * 100) : 0

  // Calculate estimated finish time
  const scheduledMinutes = jobs?.reduce((sum, job) => {
    if (!job.scheduled_start || !job.scheduled_end) return sum
    return sum + Math.max(0, differenceInMinutes(new Date(job.scheduled_end), new Date(job.scheduled_start)))
  }, 0) || 0
  const remainingJobs = jobs?.filter(j => j.status !== 'completed') || []
  const remainingMinutes = remainingJobs.reduce((sum, job) => {
    if (!job.scheduled_start || !job.scheduled_end) return sum
    return sum + Math.max(0, differenceInMinutes(new Date(job.scheduled_end), new Date(job.scheduled_start)))
  }, 0)
  const estimatedFinishTime = remainingJobs.length > 0 && remainingJobs[remainingJobs.length - 1]?.scheduled_end
    ? new Date(remainingJobs[remainingJobs.length - 1].scheduled_end)
    : null

  const scheduledHours = Math.floor(scheduledMinutes / 60)
  const scheduledRemainder = scheduledMinutes % 60
  const shiftStart = jobs?.[0]?.scheduled_start
  const shiftEnd = jobs?.[Math.max((jobs?.length || 1) - 1, 0)]?.scheduled_end

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success/10 text-success border border-success/20'
      case 'in_progress': return 'bg-primary/10 text-primary border border-primary/20'
      case 'on_the_way': return 'bg-warning/10 text-warning border border-warning/20'
      case 'arrived': return 'bg-info/10 text-info border border-info/20'
      case 'scheduled': return 'bg-surface-100 text-muted border border-surface-200'
      default: return 'bg-surface-100 text-muted border border-surface-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'in_progress':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63" />
          </svg>
        )
      case 'on_the_way':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-ink">Today's Jobs</h1>
            <p className="text-muted mt-1">{format(today, 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            isConnected
              ? 'bg-success/10 text-success border border-success/20'
              : 'bg-surface-200 text-muted border border-surface-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-success animate-pulse' : 'bg-muted'
            }`} />
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Progress Card */}
        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-muted font-medium uppercase tracking-wide mb-2">Daily Progress</p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-bold text-ink">{completedCount}</span>
                <span className="text-lg text-muted">/</span>
                <span className="text-xl font-semibold text-muted">{totalJobs}</span>
              </div>
              <p className="text-xs text-muted">Jobs completed</p>
            </div>
            <div className="ml-4">
              <CircularProgress value={completionRate} size={80} strokeWidth={5} />
            </div>
          </div>
        </div>

        {/* Revenue Card */}
        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-muted font-medium uppercase tracking-wide mb-2">Today's Revenue</p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-bold text-success">${earnedRevenue.toFixed(0)}</span>
                <span className="text-lg text-muted">/</span>
                <span className="text-xl font-semibold text-muted">${totalRevenue.toFixed(0)}</span>
              </div>
              <p className="text-xs text-muted">{revenueRate}% earned</p>
            </div>
            <div className="ml-4">
              <CircularProgress value={revenueRate} size={80} strokeWidth={5} />
            </div>
          </div>
        </div>

        {/* Shift Window Card */}
        <div className="glass-card">
          <p className="text-xs text-muted font-medium uppercase tracking-wide mb-3">Shift Window</p>
          <div className="space-y-1 mb-3">
            <div className="text-xl font-bold text-ink">
              {shiftStart ? format(new Date(shiftStart), 'h:mm a') : '--:--'}
            </div>
            <div className="text-xs text-muted">to</div>
            <div className="text-xl font-bold text-ink">
              {shiftEnd ? format(new Date(shiftEnd), 'h:mm a') : '--:--'}
            </div>
          </div>
          {estimatedFinishTime && (
            <div className="pt-3 border-t border-surface-200">
              <div className="text-xs text-muted">Est. finish time</div>
              <div className="text-lg font-semibold text-primary mt-0.5">
                {format(estimatedFinishTime, 'h:mm a')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Route Map */}
      <div>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Today's Route</h2>
        <RouteMap jobs={jobs || []} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/tech/schedule" className="glass-card p-4 hover:border-primary/30 transition-all group">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75" />
            </svg>
          </div>
          <div className="text-xs text-muted">Schedule</div>
          <div className="text-sm font-semibold text-ink mt-0.5">View All</div>
        </Link>

        <Link href="/tech/stats" className="glass-card p-4 hover:border-primary/30 transition-all group">
          <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <div className="text-xs text-muted">Stats</div>
          <div className="text-sm font-semibold text-ink mt-0.5">Performance</div>
        </Link>

        {nextJob ? (
          <Link href={`/tech/jobs/${nextJob.id}`} className="glass-card p-4 bg-primary/5 border-primary/20 hover:border-primary/30 transition-all group">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63" />
              </svg>
            </div>
            <div className="text-xs text-primary">Next Job</div>
            <div className="text-sm font-semibold text-ink mt-0.5">Open</div>
          </Link>
        ) : (
          <div className="glass-card p-4 opacity-50">
            <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-xs text-muted">Next Job</div>
            <div className="text-sm font-semibold text-muted mt-0.5">None</div>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts */}
      <div>
        <KeyboardShortcutsCard role="tech" defaultExpanded={false} />
      </div>

      {/* Jobs List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Today's Schedule</h2>
          <span className="text-xs text-muted font-medium">{totalJobs} {totalJobs === 1 ? 'job' : 'jobs'}</span>
        </div>

        <div className="space-y-3">
          {jobs?.map((job, index) => (
            <Link key={job.id} href={`/tech/jobs/${job.id}`} className="block glass-card hover:border-primary/30 transition-all group">
              <div className="flex items-start gap-4">
                {/* Time */}
                <div className="text-center min-w-[60px] shrink-0">
                  <div className="text-lg font-bold text-ink">
                    {job.scheduled_start ? format(new Date(job.scheduled_start), 'h:mm') : '--:--'}
                  </div>
                  <div className="text-xs text-muted uppercase">
                    {job.scheduled_start ? format(new Date(job.scheduled_start), 'a') : ''}
                  </div>
                </div>

                {/* Timeline Indicator */}
                <div className="flex flex-col items-center pt-1">
                  <div className={`w-3 h-3 rounded-full border-2 ${
                    job.status === 'completed' ? 'bg-success border-success' :
                    job.status === 'in_progress' || job.status === 'arrived' ? 'bg-primary border-primary animate-pulse' :
                    job.status === 'on_the_way' ? 'bg-warning border-warning' :
                    'bg-surface-300 border-surface-400'
                  }`} />
                  {index < (jobs?.length || 0) - 1 && (
                    <div className="w-0.5 h-full min-h-[30px] bg-surface-200 mt-2" />
                  )}
                </div>

                {/* Job Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-ink group-hover:text-primary transition-colors">
                        {job.customer?.name || 'Unknown Customer'}
                      </h3>
                      <p className="text-sm text-muted mt-0.5 line-clamp-1">
                        {job.description || 'Service call'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {job.total_cost && (
                        <span className="text-sm font-semibold text-success">
                          ${Number(job.total_cost).toFixed(0)}
                        </span>
                      )}
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${getStatusColor(job.status)}`}>
                        {getStatusIcon(job.status)}
                        {formatStatus(job.status)}
                      </span>
                    </div>
                  </div>

                  {/* Address & Duration */}
                  <div className="flex items-center gap-4 text-xs text-muted mt-2">
                    {job.customer?.address && (
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        <span className="truncate">{job.customer.address}</span>
                      </div>
                    )}
                    {job.scheduled_start && job.scheduled_end && (
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{differenceInMinutes(new Date(job.scheduled_end), new Date(job.scheduled_start))} min</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <svg className="w-5 h-5 text-surface-400 group-hover:text-primary transition-colors shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </Link>
          ))}

          {(!jobs || jobs.length === 0) && (
            <div className="glass-card text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-ink mb-1">No jobs today</h3>
              <p className="text-muted text-sm">You have no scheduled jobs for today</p>
            </div>
          )}
        </div>
      </div>

      {/* Tomorrow's Preview */}
      {tomorrowJobs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Tomorrow's Preview</h2>
            <Link href="/tech/schedule" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="glass-card">
            <div className="space-y-3">
              {tomorrowJobs.map((job, index) => (
                <div key={job.id} className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center text-xs font-semibold text-muted shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-ink truncate">{job.customer?.name || 'Unknown'}</p>
                      <span className="text-xs text-muted shrink-0">
                        {job.scheduled_start ? format(new Date(job.scheduled_start), 'h:mm a') : 'TBD'}
                      </span>
                    </div>
                    {job.description && (
                      <p className="text-xs text-muted truncate mt-0.5">{job.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
