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
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6 text-center shadow-sm dark:border-emerald-400/25 dark:bg-emerald-400/10">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Job Completed</h3>
        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">Great work. All done.</p>
      </div>
    )
  }

  if (status === 'cancelled') {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50/70 p-6 text-center shadow-sm dark:border-red-400/25 dark:bg-red-400/10">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Job Cancelled</h3>
        <p className="mt-1 text-sm text-red-700 dark:text-red-300">This job has been cancelled.</p>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.14),transparent_50%)] dark:opacity-80 dark:[background:radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.18),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background:linear-gradient(to_right,rgba(15,23,42,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.07)_1px,transparent_1px)] [background-size:28px_28px] dark:opacity-15 dark:[background:linear-gradient(to_right,rgba(148,163,184,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.10)_1px,transparent_1px)]" />
      {/* Header */}
      <div className="relative mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Job Progress</h3>
        </div>
        {isTracking && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Live</span>
          </div>
        )}
      </div>

      <div className="relative space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="uppercase tracking-wider text-slate-500 dark:text-slate-400">Progress</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${colors.bg} ${colors.glow}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Current Status */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/40">
          <span className="text-sm text-slate-600 dark:text-slate-300">Current Status</span>
          <span className={`text-sm font-bold ${colors.text}`}>
            {statusLabels[status]}
          </span>
        </div>

        {/* Location Error */}
        {locationError && (status === 'on_the_way' || status === 'arrived') && (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-400/25 dark:bg-amber-400/10">
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Location unavailable</p>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{locationError}</p>
              <button
                type="button"
                onClick={startTracking}
                className="mt-1 text-xs font-medium text-cyan-700 underline hover:text-cyan-600 dark:text-cyan-300 dark:hover:text-cyan-200"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {completionNotice && (
          <div
            className={`rounded-2xl border p-3 ${completionNotice.status === 'block'
              ? 'border-red-200 bg-red-50/70 dark:border-red-400/25 dark:bg-red-400/10'
              : 'border-amber-200 bg-amber-50/70 dark:border-amber-400/25 dark:bg-amber-400/10'
              }`}
          >
            <p
              className={`text-sm font-medium ${completionNotice.status === 'block'
                ? 'text-red-800 dark:text-red-200'
                : 'text-amber-800 dark:text-amber-200'
                }`}
            >
              Completion verification
            </p>
            <p className="mt-1 text-xs text-slate-700 dark:text-slate-200">{completionNotice.message}</p>
          </div>
        )}

        {/* Main Action Button */}
        {buttonConfig && nextStatus && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void updateStatus(nextStatus)
            }}
            disabled={updating}
            className={`w-full h-14 flex items-center justify-center gap-2 rounded-xl font-bold text-slate-900 transition-all active:scale-[0.98] disabled:opacity-50 ${buttonConfig.color.bg} ${buttonConfig.color.glow} hover:brightness-110`}
          >
            {updating ? (
              <div className="h-5 w-5 rounded-full border-2 border-slate-900/30 border-t-slate-900 animate-spin" />
            ) : (
              <>{buttonConfig.label}</>
            )}
          </button>
        )}

        {/* Get Directions Button */}
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
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-4 font-semibold text-slate-800 backdrop-blur transition-colors hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:hover:bg-slate-800/60"
          >
            Get Directions
          </button>
        )}
      </div>
    </div>
  )
}
