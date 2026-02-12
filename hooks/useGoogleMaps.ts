'use client'

import { useEffect, useState } from 'react'

// Google Maps loader hook
export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(
    () => typeof window !== 'undefined' && Boolean(window.google?.maps)
  )
  const [loadError, setLoadError] = useState<Error | null>(null)
  const missingApiKey = !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  useEffect(() => {
    if (missingApiKey) return

    const SCRIPT_ID = 'google-maps-script'

    // Check if already loaded
    if (window.google?.maps) {
      return
    }

    // Check if script is already in DOM
    const existingScript = document.getElementById(SCRIPT_ID)
    if (existingScript) {
      // Wait for it to load
      const checkLoaded = setInterval(() => {
        if (window.google?.maps) {
          setIsLoaded(true)
          clearInterval(checkLoaded)
        }
      }, 100)

      return () => clearInterval(checkLoaded)
    }

    // Load the script
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) return

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`
    script.async = true
    script.defer = true

    script.onload = () => {
      setIsLoaded(true)
    }

    script.onerror = () => {
      setLoadError(new Error('Failed to load Google Maps'))
    }

    document.head.appendChild(script)

    // Don't remove the script on unmount - keep it for other components
    return undefined
  }, [missingApiKey])

  return {
    isLoaded,
    loadError: loadError ?? (missingApiKey ? new Error('Google Maps API key not configured') : null),
  }
}

// TypeScript declarations for Google Maps
declare global {
  interface Window {
    google: typeof google
  }
}
