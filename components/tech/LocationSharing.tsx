'use client'

import { useEffect, useState, useCallback } from 'react'
import { MapPin, MapPinOff, Navigation } from 'lucide-react'
import { showToast } from '@/lib/utils/toast'

interface LocationSharingProps {
  jobId?: string
  autoStart?: boolean
}

export default function LocationSharing({ jobId, autoStart = false }: LocationSharingProps) {
  const [isSharing, setIsSharing] = useState(false)
  const [watchId, setWatchId] = useState<number | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sendLocation = useCallback(async (position: GeolocationPosition) => {
    try {
      const response = await fetch('/api/tracking/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          job_id: jobId
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const message = errorData?.error || 'Failed to send location'
        throw new Error(message)
      }

      setLastUpdate(new Date())
      setError(null)
    } catch (error) {
      console.error('Error sending location:', error)
      setError(error instanceof Error ? error.message : 'Failed to update location')
    }
  }, [jobId])

  const stopSharing = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      setWatchId(null)
      setIsSharing(false)
      setLastUpdate(null)
      showToast.success('Location sharing stopped')
    }
  }, [watchId])

  const startSharing = useCallback(() => {
    if (!navigator.geolocation) {
      showToast.error('Geolocation is not supported by your browser')
      return
    }

    // Request permission and start watching
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Initial location
        sendLocation(position)

        // Start watching for updates
        const id = navigator.geolocation.watchPosition(
          sendLocation,
          (error) => {
            console.error('Location error:', error)
            setError(error.message)

            if (error.code === error.PERMISSION_DENIED) {
              showToast.error('Location permission denied')
              stopSharing()
            }
          },
          {
            enableHighAccuracy: true,
            maximumAge: 10000, // 10 seconds
            timeout: 30000 // 30 seconds
          }
        )

        setWatchId(id)
        setIsSharing(true)
        showToast.success('Location sharing started')
      },
      (error) => {
        console.error('Initial location error:', error)
        showToast.error('Failed to get your location')
      }
    )
  }, [sendLocation, stopSharing])

  // Auto-start if requested
  useEffect(() => {
    if (autoStart && !isSharing) {
      startSharing()
    }

    // Cleanup on unmount
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [autoStart, isSharing, startSharing, watchId])

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Navigation className={`w-5 h-5 ${isSharing ? 'text-primary animate-pulse' : 'text-muted'}`} />
          <span className="font-semibold">Location Sharing</span>
        </div>
        {isSharing && lastUpdate && (
          <span className="text-xs text-muted">
            Updated {Math.floor((Date.now() - lastUpdate.getTime()) / 1000)}s ago
          </span>
        )}
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <button
        onClick={isSharing ? stopSharing : startSharing}
        className={`w-full ${isSharing ? 'glass-btn-danger' : 'glass-btn-primary'}`}
      >
        {isSharing ? (
          <>
            <MapPinOff className="w-4 h-4" />
            Stop Sharing Location
          </>
        ) : (
          <>
            <MapPin className="w-4 h-4" />
            Start Sharing Location
          </>
        )}
      </button>

      {isSharing && (
        <p className="text-xs text-muted mt-2 text-center">
          Your location is being shared in real-time
        </p>
      )}
    </div>
  )
}
