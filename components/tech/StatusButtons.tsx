'use client'

import { JobStatus } from '@/lib/types'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Navigation, MapPin, Wrench, CheckCircle, Loader2, MapPinOff } from 'lucide-react'

interface StatusButtonsProps {
  jobId: string
  currentStatus: JobStatus
  customerAddress?: string
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
  scheduled: { bg: 'bg-cyan-500', border: 'border-cyan-500', text: 'text-cyan-400', glow: 'shadow-[0_0_30px_rgba(34,211,238,0.5)]' },
  on_the_way: { bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-400', glow: 'shadow-[0_0_30px_rgba(251,191,36,0.5)]' },
  arrived: { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-400', glow: 'shadow-[0_0_30px_rgba(96,165,250,0.5)]' },
  in_progress: { bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-400', glow: 'shadow-[0_0_30px_rgba(251,191,36,0.5)]' },
  completed: { bg: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-400', glow: 'shadow-[0_0_30px_rgba(52,211,153,0.5)]' },
  cancelled: { bg: 'bg-red-500', border: 'border-red-500', text: 'text-red-400', glow: 'shadow-[0_0_30px_rgba(248,113,113,0.5)]' },
}

export default function StatusButtons({
  jobId,
  currentStatus,
  customerAddress,
}: StatusButtonsProps) {
  const [status, setStatus] = useState(currentStatus)
  const [updating, setUpdating] = useState(false)
  const [isTracking, setIsTracking] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
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
      () => {},
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
      const response = await fetch('/api/jobs/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ jobId, status: newStatus }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update status')
      }

      if (newStatus === 'on_the_way') {
        startTracking()
      }

      if (newStatus === 'completed' || newStatus === 'cancelled') {
        stopTracking()
      }

      setStatus(result.status || newStatus)
    } catch (error: any) {
      alert('Failed to update status: ' + error.message)
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
          icon: <Navigation className="w-5 h-5" />,
          color: statusColors.on_the_way,
        }
      case 'arrived':
        return {
          label: "I've arrived",
          icon: <MapPin className="w-5 h-5" />,
          color: statusColors.arrived,
        }
      case 'in_progress':
        return {
          label: 'Start work',
          icon: <Wrench className="w-5 h-5" />,
          color: statusColors.in_progress,
        }
      case 'completed':
        return {
          label: 'Complete job',
          icon: <CheckCircle className="w-5 h-5" />,
          color: statusColors.completed,
        }
      default:
        return { label: 'Update', icon: null, color: statusColors.scheduled }
    }
  }

  const nextStatus = getNextStatus()
  const buttonConfig = nextStatus ? getStatusButtonConfig(nextStatus) : null
  const colors = statusColors[status]

  if (status === 'completed') {
    return (
      <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-6 text-center">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-500/30">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-lg font-bold text-white">Job Completed</h3>
        <p className="text-sm text-emerald-400 mt-1">Great work! All done.</p>
      </div>
    )
  }

  if (status === 'cancelled') {
    return (
      <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-6 text-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-red-500/30">
          <MapPinOff className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-white">Job Cancelled</h3>
        <p className="text-sm text-red-400 mt-1">This job has been cancelled.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-white">Job Progress</h3>
        </div>
        {isTracking && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Live</span>
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 uppercase tracking-wider">Progress</span>
            <span className="font-bold text-white">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${colors.bg} ${colors.glow}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Current Status */}
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-700/30 border border-slate-600/30">
          <span className="text-sm text-slate-400">Current Status</span>
          <span className={`text-sm font-bold ${colors.text}`}>
            {statusLabels[status]}
          </span>
        </div>

        {/* Location Error */}
        {locationError && (status === 'on_the_way' || status === 'arrived') && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <MapPinOff className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-400">Location unavailable</p>
              <p className="text-xs text-slate-400 mt-0.5">{locationError}</p>
              <button
                onClick={startTracking}
                className="text-xs text-cyan-400 underline mt-1 hover:text-cyan-300"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Main Action Button */}
        {buttonConfig && nextStatus && (
          <button
            onClick={() => updateStatus(nextStatus)}
            disabled={updating}
            className={`w-full h-14 flex items-center justify-center gap-2 rounded-xl font-bold text-slate-900 transition-all active:scale-[0.98] disabled:opacity-50 ${buttonConfig.color.bg} ${buttonConfig.color.glow} hover:brightness-110`}
          >
            {updating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {buttonConfig.icon}
                {buttonConfig.label}
              </>
            )}
          </button>
        )}

        {/* Get Directions Button */}
        {customerAddress && (status === 'on_the_way' || status === 'scheduled') && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(customerAddress)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-12 px-4 bg-slate-700/50 text-white font-medium rounded-xl border border-slate-600 hover:border-cyan-500/30 hover:bg-slate-700 transition-all active:scale-[0.98]"
          >
            <Navigation className="w-5 h-5 text-cyan-400" />
            Get Directions
          </a>
        )}
      </div>
    </div>
  )
}
