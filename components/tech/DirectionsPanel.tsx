'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { showToast } from '@/lib/utils/toast'

interface DirectionsPanelProps {
  isOpen: boolean
  jobId?: string
  jobStatus?: string
  destinationAddress: string
  customerName?: string
  onClose: () => void
}

interface SharingStatus {
  loading: boolean
  active: boolean
  lastUpdated: string | null
  accuracy: number | null
  error: string | null
}

export default function DirectionsPanel({
  isOpen,
  jobId,
  jobStatus,
  destinationAddress,
  customerName,
  onClose,
}: DirectionsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [origin, setOrigin] = useState('')
  const [locating, setLocating] = useState(false)
  const [sharingStatus, setSharingStatus] = useState<SharingStatus>({
    loading: false,
    active: false,
    lastUpdated: null,
    accuracy: null,
    error: null,
  })

  const destination = destinationAddress.trim()
  const destinationLabel = customerName ? `${customerName} - ${destination}` : destination
  const canAutoShare = useMemo(
    () => jobStatus === 'on_the_way' || jobStatus === 'arrived' || jobStatus === 'in_progress',
    [jobStatus]
  )

  const closePanel = () => {
    setIsExpanded(false)
    onClose()
  }

  const buildNavigationUrl = () => {
    const query = new URLSearchParams({
      api: '1',
      destination: destination,
      travelmode: 'driving',
      dir_action: 'navigate',
    })

    const originValue = origin.trim()
    if (originValue) {
      query.set('origin', originValue)
    }

    return `https://www.google.com/maps/dir/?${query.toString()}`
  }

  const openNavigation = () => {
    if (!destination) {
      showToast.error('Destination address is required.')
      return
    }

    window.location.assign(buildNavigationUrl())
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast.error('Location is unavailable in this browser.')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin(`${position.coords.latitude},${position.coords.longitude}`)
        setLocating(false)
        showToast.success('Current location added as starting point.')
      },
      (error) => {
        setLocating(false)
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Location permission denied.'
            : 'Could not get your current location.'
        showToast.error(message)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )
  }

  const refreshSharingStatus = useCallback(async () => {
    if (!jobId) return

    setSharingStatus((previous) => ({ ...previous, loading: true, error: null }))
    try {
      const response = await fetch(`/api/technician/location?job_id=${encodeURIComponent(jobId)}`, {
        cache: 'no-store',
      })
      const payload = (await response.json()) as {
        location?: { updated_at?: string; recorded_at?: string; accuracy?: number | null } | null
        error?: string
      }

      if (!response.ok) {
        throw new Error(payload.error || 'Could not load live sharing status.')
      }

      const updatedAt = payload.location?.updated_at || payload.location?.recorded_at || null
      const updatedMs = updatedAt ? new Date(updatedAt).getTime() : 0
      const active = Boolean(updatedMs && Date.now() - updatedMs <= 2 * 60 * 1000)

      setSharingStatus({
        loading: false,
        active,
        lastUpdated: updatedAt,
        accuracy: payload.location?.accuracy ?? null,
        error: null,
      })
    } catch (statusError) {
      setSharingStatus((previous) => ({
        ...previous,
        loading: false,
        error: statusError instanceof Error ? statusError.message : 'Could not load live sharing status.',
      }))
    }
  }, [jobId])

  useEffect(() => {
    if (!isOpen || !jobId) return

    void refreshSharingStatus()
    const intervalId = setInterval(() => {
      void refreshSharingStatus()
    }, 20_000)

    return () => clearInterval(intervalId)
  }, [isOpen, jobId, refreshSharingStatus])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-3 sm:p-4" onClick={closePanel}>
      <section
        className={`w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-elevation-2 transition-all dark:border-slate-700 dark:bg-slate-900 ${
          isExpanded ? 'h-[calc(100vh-1.5rem)] max-w-none' : 'max-w-xl'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Directions</p>
            <p className="truncate text-xs text-slate-600 dark:text-slate-300">{destinationLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExpanded((current) => !current)}
              className="min-h-12 rounded-full border border-slate-300 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
            <button
              type="button"
              onClick={closePanel}
              className="min-h-12 rounded-full border border-slate-300 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>

        <div className={`space-y-3 p-4 ${isExpanded ? 'h-[calc(100%-76px)] overflow-y-auto' : ''}`}>
          <div className="space-y-1">
            <label htmlFor="directions-start" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
              Starting point
            </label>
            <input
              id="directions-start"
              type="text"
              value={origin}
              onChange={(event) => setOrigin(event.target.value)}
              placeholder="Current location or street address"
              className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="directions-destination" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
              Destination
            </label>
            <input
              id="directions-destination"
              type="text"
              value={destination}
              placeholder="Job address"
              readOnly
              className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locating}
              className="min-h-12 rounded-2xl border border-slate-300 bg-slate-100 px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-200 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              {locating ? 'Getting location...' : 'Use current location'}
            </button>
            <button
              type="button"
              onClick={openNavigation}
              className="min-h-12 rounded-2xl border border-emerald-600 bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500 dark:border-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400"
            >
              Start navigation
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/40">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Live sharing {sharingStatus.active ? 'active' : 'inactive'}
                </p>
                <p className="truncate text-xs text-slate-600 dark:text-slate-300">
                  {sharingStatus.lastUpdated
                    ? `Last update: ${new Date(sharingStatus.lastUpdated).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        second: '2-digit',
                      })}`
                    : 'No location updates received yet.'}
                </p>
                {sharingStatus.accuracy !== null && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Accuracy: +/-{Math.round(sharingStatus.accuracy)}m
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void refreshSharingStatus()}
                disabled={sharingStatus.loading || !jobId}
                className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {sharingStatus.loading ? 'Refreshing...' : 'Refresh status'}
              </button>
            </div>

            {sharingStatus.error && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-300">{sharingStatus.error}</p>
            )}

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {canAutoShare
                ? 'Sharing should update automatically while this job is active.'
                : 'Set status to On the way, Arrived, or In progress to auto-share location to admin and customer.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
