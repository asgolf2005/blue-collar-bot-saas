'use client'

import { JobStatus } from '@/lib/types'
import { useState, useEffect, useRef, useCallback } from 'react'
import { showToast } from '@/lib/utils/toast'

interface StatusButtonsProps {
  jobId: string
  currentStatus: JobStatus
  customerAddress?: string
  onGetDirections?: () => void
}

const statusSteps: JobStatus[] = ['scheduled', 'on_the_way', 'arrived', 'in_progress', 'completed']

const statusLabels: Record<JobStatus, string> = {
  scheduled: 'Scheduled',
  on_the_way: 'On the way',
  arrived: 'Arrived',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const statusColors: Record<JobStatus, { bg: string; border: string; text: string; glow: string }> = {
  scheduled: { bg: 'bg-cyan-500', border: 'border-cyan-500', text: 'text-cyan-700 dark:text-cyan-300', glow: 'shadow-[0_0_30px_rgba(34,211,238,0.35)]' },
  on_the_way: { bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-700 dark:text-amber-300', glow: 'shadow-[0_0_30px_rgba(251,191,36,0.30)]' },
  arrived: { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-700 dark:text-blue-300', glow: 'shadow-[0_0_30px_rgba(96,165,250,0.30)]' },
  in_progress: { bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-700 dark:text-amber-300', glow: 'shadow-[0_0_30px_rgba(251,191,36,0.30)]' },
  completed: { bg: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', glow: 'shadow-[0_0_30px_rgba(52,211,153,0.30)]' },
  cancelled: { bg: 'bg-red-500', border: 'border-red-500', text: 'text-red-700 dark:text-red-300', glow: 'shadow-[0_0_30px_rgba(248,113,113,0.25)]' },
}

export default function StatusButtons({
  jobId,
  currentStatus,
  customerAddress,
  onGetDirections,
}: StatusButtonsProps) {
  const [status, setStatus] = useState(currentStatus)
  const [updating, setUpdating] = useState(false)
  const [isTracking, setIsTracking] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [completionNotice, setCompletionNotice] = useState<{
    status: 'warning' | 'block'
    message: string
  } | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPositionRef = useRef<GeolocationPosition | null>(null)

  const currentStepIndex = statusSteps.indexOf(status)
  const progress = status === 'completed' ? 100 : (currentStepIndex / (statusSteps.length - 1)) * 100

  const sendLocation = useCallback(async (position: GeolocationPosition) => {
    try {
      await fetch('/api/technician/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          job_id: jobId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
          accuracy: position.coords.accuracy
        })
      })
      setLocationError(null)
    } catch (error) {
      console.error('Error sending location:', error)
    }
  }, [jobId])

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported')
      return
    }

    setIsTracking(true)
    setLocationError(null)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        lastPositionRef.current = position
      },
      (error) => {
        console.error('Geolocation error:', error)
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Location permission denied'
            : error.code === error.POSITION_UNAVAILABLE
              ? 'Location unavailable'
              : error.code === error.TIMEOUT
                ? 'Location request timed out'
                : 'Location unavailable'

        setLocationError(message)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )

    navigator.geolocation.getCurrentPosition(
      (position) => {
        lastPositionRef.current = position
        sendLocation(position)
      },
      () => { },
      { enableHighAccuracy: true }
    )

    intervalRef.current = setInterval(() => {
      if (lastPositionRef.current) {
        sendLocation(lastPositionRef.current)
      }
    }, 30000)
  }, [sendLocation])

  const stopTracking = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    try {
      await fetch(`/api/technician/location?job_id=${jobId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
    } catch (e) {
      console.error('Error clearing location:', e)
    }

    setIsTracking(false)
  }, [jobId])

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if ((status === 'on_the_way' || status === 'arrived') && !isTracking) {
      startTracking()
    }
    if (status === 'completed' || status === 'cancelled' || status === 'scheduled') {
      stopTracking()
    }
  }, [isTracking, startTracking, status, stopTracking])

  const updateStatus = async (newStatus: JobStatus) => {
    setUpdating(true)
    try {
      if (newStatus === 'completed') {
        const verificationResponse = await fetch('/api/ai/verify-completion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ jobId }),
        })

        const verificationPayload = (await verificationResponse.json()) as {
          result?: { status?: 'pass' | 'warning' | 'block'; summary?: string }
          error?: string
        }

        if (verificationResponse.ok && verificationPayload.result) {
          if (verificationPayload.result.status === 'block') {
            setCompletionNotice({
              status: 'block',
              message:
                verificationPayload.result.summary ||
                'Completion verification blocked completion. Add before/after proof that problem is solved.',
            })
            showToast.error('Completion verification blocked completion.')
            return
          }

          if (verificationPayload.result.status === 'warning') {
            setCompletionNotice({
              status: 'warning',
              message:
                verificationPayload.result.summary ||
                'Completion verification has warnings. Review evidence before completion.',
            })
            showToast.warning('Completion verification returned warnings.')
          } else {
            setCompletionNotice(null)
          }
        }
      }

      const response = await fetch('/api/jobs/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ jobId, status: newStatus }),
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.code === 'COMPLETION_VERIFICATION_BLOCKED') {
          setCompletionNotice({
            status: 'block',
            message:
              result.error ||
              'Completion verification blocked completion. Add before/after evidence first.',
          })
          showToast.error(result.error || 'Completion verification blocked completion.')
          return
        }
        throw new Error(result.error || 'Failed to update status')
      }

      if (newStatus === 'on_the_way') {
        startTracking()
      }

      if (newStatus === 'completed' || newStatus === 'cancelled') {
        stopTracking()
      }

      setStatus(result.status || newStatus)
      setCompletionNotice(null)
    } catch (error: any) {
      showToast.error('Failed to update status: ' + error.message)
    } finally {
      setUpdating(false)
    }
  }

  const getNextStatus = (): JobStatus | null => {
    const currentIndex = statusSteps.indexOf(status)
    if (currentIndex < statusSteps.length - 1 && status !== 'cancelled') {
      return statusSteps[currentIndex + 1]
    }
    return null
  }

  const getStatusButtonConfig = (nextStatus: JobStatus) => {
    switch (nextStatus) {
      case 'on_the_way':
        return {
          label: "I'm on the way",
          color: statusColors.on_the_way,
        }
      case 'arrived':
        return {
          label: "I've arrived",
          color: statusColors.arrived,
        }
      case 'in_progress':
        return {
          label: 'Start work',
          color: statusColors.in_progress,
        }
      case 'completed':
        return {
          label: 'Complete job',
          color: statusColors.completed,
        }
      default:
        return { label: 'Update', color: statusColors.scheduled }
    }
  }

  const nextStatus = getNextStatus()
  const buttonConfig = nextStatus ? getStatusButtonConfig(nextStatus) : null
  const colors = statusColors[status]

  if (status === 'completed') {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center shadow-[0_0_30px_rgba(52,211,153,0.15)] backdrop-blur-xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 ring-1 ring-emerald-500/50">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">Mission Accomplished</h3>
        <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-200">Great work. Job completed.</p>
      </div>
    )
  }

  if (status === 'cancelled') {
    return (
      <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-center shadow-[0_0_30px_rgba(248,113,113,0.15)] backdrop-blur-xl">
        <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-red-50">Mission Aborted</h3>
        <p className="mt-1 text-sm font-medium text-red-700 dark:text-red-200">This job has been cancelled.</p>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-white/40 p-6 shadow-2xl backdrop-blur-2xl ring-1 ring-slate-200/50 dark:border-slate-800/60 dark:bg-slate-900/40 dark:ring-slate-800/50">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.15),transparent_60%)] dark:opacity-60 dark:[background:radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.2),transparent_70%)]" />

      {/* Header */}
      <div className="relative mb-5 flex items-center justify-between">
        <h3 className="font-display-soft text-lg font-bold text-slate-900 dark:text-white">Active Phase</h3>
        {isTracking && (
          <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-2 py-1 ring-1 ring-emerald-500/30">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Live GPS</span>
          </div>
        )}
      </div>

      <div className="relative space-y-6">
        {/* Ultra-sleek Progress Bar */}
        <div className="space-y-3">
          <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
            <span className="text-slate-500 dark:text-slate-400">Trajectory</span>
            <span className="text-slate-900 dark:text-slate-100">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/50 dark:bg-slate-800/80">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out flex justify-end ${colors.bg} ${colors.glow}`}
              style={{ width: `${progress}%` }}
            >
              <div className="w-10 h-full bg-white/50 blur-[2px]" />
            </div>
          </div>
        </div>

        {/* Current Status Hologram */}
        <div className="flex items-center justify-between rounded-2xl bg-white/50 px-5 py-4 shadow-inner ring-1 ring-slate-200/50 dark:bg-slate-950/40 dark:ring-slate-800/50">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Current Vector</span>
          <span className={`text-sm font-black uppercase tracking-wider ${colors.text} drop-shadow-sm`}>
            {statusLabels[status]}
          </span>
        </div>

        {/* Location Error Component */}
        {locationError && (status === 'on_the_way' || status === 'arrived') && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-sm backdrop-blur-md">
            <div className="mt-0.5 rounded-full bg-amber-500/20 p-1">
              <svg className="h-4 w-4 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Telemetry Lost</p>
              <p className="mt-1 text-xs font-medium text-amber-700/80 dark:text-amber-200/80">{locationError}</p>
              <button
                type="button"
                onClick={startTracking}
                className="mt-2 text-xs font-bold uppercase tracking-wider text-amber-700 underline underline-offset-4 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200"
              >
                Re-establish Link
              </button>
            </div>
          </div>
        )}

        {completionNotice && (
          <div
            className={`rounded-2xl border p-4 backdrop-blur-md shadow-sm ${completionNotice.status === 'block'
              ? 'border-red-500/30 bg-red-500/10'
              : 'border-amber-500/30 bg-amber-500/10'
              }`}
          >
            <p
              className={`text-sm font-bold uppercase tracking-widest ${completionNotice.status === 'block'
                ? 'text-red-700 dark:text-red-400'
                : 'text-amber-700 dark:text-amber-400'
                }`}
            >
              Verification {completionNotice.status}
            </p>
            <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-700 dark:text-slate-300">
              {completionNotice.message}
            </p>
          </div>
        )}

        {/* Main Action Touch Target */}
        {buttonConfig && nextStatus && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void updateStatus(nextStatus)
            }}
            disabled={updating}
            className={`group flex h-16 w-full items-center justify-center gap-3 rounded-2xl font-display-soft text-xl font-bold tracking-wide text-slate-900 shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:brightness-110 active:scale-95 disabled:pointer-events-none disabled:opacity-50 ${buttonConfig.color.bg} ${buttonConfig.color.glow}`}
          >
            {updating ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" />
            ) : (
              <>
                {buttonConfig.label}
                <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        )}

        {/* Get Directions Secondary Swipe */}
        {customerAddress && (status === 'on_the_way' || status === 'scheduled') && (
          <button
            type="button"
            onClick={() => {
              if (onGetDirections) {
                onGetDirections()
                return
              }
              window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(customerAddress)}`,
                '_blank',
                'noopener,noreferrer'
              )
            }}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-100/50 px-4 font-bold text-slate-800 transition-colors hover:bg-slate-200/50 active:scale-[0.98] dark:bg-slate-800/50 dark:text-slate-200 dark:hover:bg-slate-700/50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Commence Navigation
          </button>
        )}
      </div>
    </div>
  )
}
