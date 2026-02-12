'use client'

import { useLoadScript } from '@react-google-maps/api'
import { createContext, useContext, ReactNode, useMemo } from 'react'

// Define libraries as a constant outside the component to prevent re-initialization
const libraries: ("places" | "geometry" | "marker")[] = ["places", "geometry", "marker"]

interface GoogleMapsContextType {
  isLoaded: boolean
  loadError: Error | undefined
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  loadError: undefined,
})

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
    // Prevent loading multiple times
    preventGoogleFontsLoading: true,
  })

  const { mapsReady, resolvedError } = useMemo(() => {
    if (typeof window === 'undefined') {
      return { mapsReady: false, resolvedError: loadError }
    }

    const ready = isLoaded && typeof window.google?.maps?.Map === 'function'
    if (ready) {
      return { mapsReady: true, resolvedError: loadError }
    }

    if (isLoaded && !ready) {
      return { mapsReady: false, resolvedError: loadError || new Error('Google Maps failed to initialize') }
    }

    return { mapsReady: false, resolvedError: loadError }
  }, [isLoaded, loadError])

  return (
    <GoogleMapsContext.Provider value={{ isLoaded: mapsReady, loadError: resolvedError }}>
      {children}
    </GoogleMapsContext.Provider>
  )
}

// Custom hook to use the Google Maps context
export function useGoogleMapsContext() {
  const context = useContext(GoogleMapsContext)
  if (!context) {
    throw new Error('useGoogleMapsContext must be used within GoogleMapsProvider')
  }
  return context
}
