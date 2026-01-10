'use client'

import { JobStatus } from '@/lib/types'
import { useState, useEffect, useRef } from 'react'
import { Navigation, MapPin, Wrench, CheckCircle, Loader2, MapPinOff } from 'lucide-react'

export default function StatusButtons({
  jobId,
  currentStatus,
  customerAddress,
}: {
  jobId: string
  currentStatus: JobStatus
  customerAddress?: string
}) {
  const [status, setStatus] = useState(currentStatus)
  const [updating, setUpdating] = useState(false)
  const [isTracking, setIsTracking] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPositionRef = useRef<GeolocationPosition | null>(null)

  const sendLocation = async (position: GeolocationPosition) => {
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
  }

  const startTracking = () => {
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
  }

  const stopTracking = async () => {
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
  }

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
  }, [status])

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

  const statusButtons = [
    {
      status: 'on_the_way' as JobStatus,
      label: "I'm on the way",
      activeLabel: "On the way",
      icon: Navigation,
      color: 'bg-primary hover:bg-primary/90 text-white dark:text-midnight-950',
      disabled: status !== 'scheduled',
    },
    {
      status: 'arrived' as JobStatus,
      label: "I've arrived",
      activeLabel: "Arrived",
      icon: MapPin,
      color: 'bg-info hover:bg-info/90 text-white dark:text-midnight-950',
      disabled: status !== 'on_the_way',
    },
    {
      status: 'in_progress' as JobStatus,
      label: 'Start work',
      activeLabel: "Working",
      icon: Wrench,
      color: 'bg-warning hover:bg-warning/90 text-white dark:text-midnight-950',
      disabled: status !== 'arrived' && status !== 'on_the_way',
    },
    {
      status: 'completed' as JobStatus,
      label: 'Complete job',
      activeLabel: "Completed",
      icon: CheckCircle,
      color: 'bg-success hover:bg-success/90 text-white dark:text-midnight-950',
      disabled: status !== 'in_progress',
    },
  ]

  if (status === 'completed') {
    return (
      <div className="bg-surface-50/90 backdrop-blur-xl rounded-2xl border border-success/20 p-6 text-center">
        <CheckCircle className="w-12 h-12 text-success mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-ink">Job Completed</h3>
        <p className="text-muted text-sm mt-1">Great work!</p>
      </div>
    )
  }

  return (
    <div className="bg-surface-50/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-ink">Update Status</h2>
        {isTracking && (
          <div className="flex items-center text-xs text-success">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse mr-1.5"></div>
            Sharing location
          </div>
        )}
      </div>

      {locationError && (status === 'on_the_way' || status === 'arrived') && (
        <div className="mb-4 p-3 bg-warning/10 border border-warning/20 rounded-xl flex items-start">
          <MapPinOff className="w-5 h-5 text-warning mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-warning font-medium">Location sharing unavailable</p>
            <p className="text-xs text-warning/80 mt-0.5">{locationError}</p>
            <button
              onClick={startTracking}
              className="text-xs text-warning underline mt-1 hover:text-warning"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {statusButtons.map((btn) => {
          const Icon = btn.icon
          const isActive = status === btn.status

          return (
            <button
              key={btn.status}
              onClick={() => updateStatus(btn.status)}
              disabled={btn.disabled || updating || isActive}
              className={`w-full flex items-center justify-center py-3 px-4 rounded-xl font-medium transition ${
                isActive
                  ? 'bg-surface-100 text-muted cursor-not-allowed border border-surface-200'
                  : btn.disabled || updating
                  ? 'bg-surface-100 text-muted cursor-not-allowed opacity-50 border border-surface-200'
                  : btn.color
              }`}
            >
              {updating && !isActive ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Icon className={`w-5 h-5 mr-2 ${isActive && btn.status === 'on_the_way' ? 'animate-pulse' : ''}`} />
              )}
              {isActive ? btn.activeLabel : btn.label}
              {isActive && <CheckCircle className="w-4 h-4 ml-2" />}
            </button>
          )
        })}
      </div>

      {customerAddress && (status === 'on_the_way' || status === 'scheduled') && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(customerAddress)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 w-full flex items-center justify-center py-3 px-4 rounded-xl bg-surface-100 hover:bg-surface-50 text-surface-600 font-medium transition border border-surface-200"
        >
          <Navigation className="w-5 h-5 mr-2" />
          Open in Maps
        </a>
      )}
    </div>
  )
}
