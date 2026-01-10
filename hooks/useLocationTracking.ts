'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface LocationState {
  latitude: number | null
  longitude: number | null
  heading: number | null
  speed: number | null
  accuracy: number | null
  error: string | null
  isTracking: boolean
  lastUpdated: Date | null
}

interface UseLocationTrackingOptions {
  jobId: string
  updateInterval?: number // in milliseconds
  enableHighAccuracy?: boolean
}

export function useLocationTracking(options: UseLocationTrackingOptions) {
  const { jobId, updateInterval = 30000, enableHighAccuracy = true } = options

  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    heading: null,
    speed: null,
    accuracy: null,
    error: null,
    isTracking: false,
    lastUpdated: null
  })

  const watchIdRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPositionRef = useRef<GeolocationPosition | null>(null)

  // Send location to server
  const sendLocationToServer = useCallback(async (position: GeolocationPosition) => {
    try {
      const response = await fetch('/api/technician/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
          accuracy: position.coords.accuracy
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update location')
      }

      setState(prev => ({
        ...prev,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        heading: position.coords.heading,
        speed: position.coords.speed,
        accuracy: position.coords.accuracy,
        error: null,
        lastUpdated: new Date()
      }))
    } catch (error: any) {
      console.error('Error sending location:', error)
      setState(prev => ({ ...prev, error: error.message }))
    }
  }, [jobId])

  // Start tracking
  const startTracking = useCallback(async () => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocation is not supported by this browser' }))
      return false
    }

    // Request permission
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' })
      if (permission.state === 'denied') {
        setState(prev => ({ ...prev, error: 'Location permission denied. Please enable location access.' }))
        return false
      }
    } catch (e) {
      // Some browsers don't support permissions API, continue anyway
    }

    setState(prev => ({ ...prev, isTracking: true, error: null }))

    // Watch position for real-time updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        lastPositionRef.current = position
        // Update local state immediately
        setState(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
          accuracy: position.coords.accuracy
        }))
      },
      (error) => {
        let errorMessage = 'Unknown error'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out'
            break
        }
        setState(prev => ({ ...prev, error: errorMessage }))
      },
      {
        enableHighAccuracy,
        timeout: 10000,
        maximumAge: 5000
      }
    )

    // Send to server immediately on start
    navigator.geolocation.getCurrentPosition(
      (position) => {
        lastPositionRef.current = position
        sendLocationToServer(position)
      },
      () => {},
      { enableHighAccuracy }
    )

    // Set up interval to send to server
    intervalRef.current = setInterval(() => {
      if (lastPositionRef.current) {
        sendLocationToServer(lastPositionRef.current)
      }
    }, updateInterval)

    return true
  }, [sendLocationToServer, updateInterval, enableHighAccuracy])

  // Stop tracking
  const stopTracking = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Clear location from server
    try {
      await fetch(`/api/technician/location?job_id=${jobId}`, {
        method: 'DELETE'
      })
    } catch (error) {
      console.error('Error clearing location:', error)
    }

    setState({
      latitude: null,
      longitude: null,
      heading: null,
      speed: null,
      accuracy: null,
      error: null,
      isTracking: false,
      lastUpdated: null
    })
  }, [jobId])

  // Cleanup on unmount
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

  return {
    ...state,
    startTracking,
    stopTracking
  }
}
