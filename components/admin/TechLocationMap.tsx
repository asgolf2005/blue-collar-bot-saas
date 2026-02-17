'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useGoogleMaps } from '@/hooks/useGoogleMaps'
import { MapPin, Navigation, RefreshCw } from '@/components/ui/icons'

interface TechLocation {
  tech_id: string
  tech_name: string
  latitude: number
  longitude: number
  accuracy?: number
  speed?: number
  heading?: number
  job_id?: string
  recorded_at: string
  job?: {
    id: string
    customer: {
      address: string
      name: string
    }
  }
}

export default function TechLocationMap() {
  const [locations, setLocations] = useState<TechLocation[]>([])
  const [selectedTech, setSelectedTech] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [etas, setEtas] = useState<Map<string, { distance: string; duration: string; eta: string }>>(new Map())
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<google.maps.Map | null>(null)
  const techMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map())
  const jobMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map())
  const polylinesRef = useRef<Map<string, google.maps.Polyline>>(new Map())
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)

  const { isLoaded, loadError } = useGoogleMaps()

  // Fetch locations
  const fetchLocations = useCallback(async () => {
    try {
      const response = await fetch('/api/tracking/location')
      const data = await response.json()

      // Ensure data is an array
      if (Array.isArray(data)) {
        setLocations(data)
      } else if (data?.error) {
        console.error('API error:', data.error)
        setLocations([])
      } else {
        console.warn('Unexpected API response:', data)
        setLocations([])
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
      setLocations([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || googleMapRef.current) return

    // Create map
    const map = new google.maps.Map(mapRef.current, {
      zoom: 11,
      center: { lat: 37.7749, lng: -122.4194 }, // Default center
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    })

    googleMapRef.current = map
    infoWindowRef.current = new google.maps.InfoWindow()

    // Fetch initial locations
    fetchLocations()
  }, [isLoaded, fetchLocations])

  // Update markers when locations change
  useEffect(() => {
    if (!googleMapRef.current || !isLoaded || !locations.length) return

    const map = googleMapRef.current
    const techMarkers = techMarkersRef.current
    const jobMarkers = jobMarkersRef.current
    const polylines = polylinesRef.current

    const updateMap = async () => {
      const bounds = new google.maps.LatLngBounds()
      const newEtas = new Map()

      for (const location of locations) {
        const techPos = { lat: Number(location.latitude), lng: Number(location.longitude) }
        bounds.extend(techPos)

        // Update tech marker
        let techMarker = techMarkers.get(location.tech_id)
        if (!techMarker) {
          techMarker = new google.maps.Marker({
            map,
            position: techPos,
            title: location.tech_name,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2
            }
          })
          techMarkers.set(location.tech_id, techMarker)
        } else {
          techMarker.setPosition(techPos)
        }

        // Handle job location if exists
        if (location.job_id && location.job?.customer?.address && location.job.customer.address.trim()) {
          try {
            // Geocode job address
            const geocoder = new google.maps.Geocoder()
            const geocodeResult = await geocoder.geocode({ address: location.job.customer.address })

            if (geocodeResult.results && geocodeResult.results.length > 0) {
              const jobPos = geocodeResult.results[0].geometry.location
              bounds.extend(jobPos)

              // Create/update job marker
              let jobMarker = jobMarkers.get(location.job_id)
              if (!jobMarker) {
                jobMarker = new google.maps.Marker({
                  map,
                  position: jobPos,
                  label: { text: 'ðŸ“', fontSize: '24px' },
                  title: location.job.customer.name
                })
                jobMarkers.set(location.job_id, jobMarker)
              } else {
                jobMarker.setPosition(jobPos)
              }

              // Create/update route line
              let polyline = polylines.get(location.tech_id)
              if (!polyline) {
                polyline = new google.maps.Polyline({
                  map,
                  path: [techPos, jobPos],
                  strokeColor: '#3b82f6',
                  strokeOpacity: 0.7,
                  strokeWeight: 4,
                  geodesic: true
                })
                polylines.set(location.tech_id, polyline)
              } else {
                polyline.setPath([techPos, jobPos])
              }

              // Calculate distance & ETA
              const distance = google.maps.geometry.spherical.computeDistanceBetween(
                new google.maps.LatLng(techPos),
                jobPos
              )
              const distanceKm = (distance / 1000).toFixed(1)
              const avgSpeed = location.speed && location.speed > 1 ? location.speed : 13.9 // 50km/h default
              const durationMin = Math.round(distance / avgSpeed / 60)
              const etaTime = new Date(Date.now() + durationMin * 60000)

              newEtas.set(location.tech_id, {
                distance: `${distanceKm} km`,
                duration: `${durationMin} min`,
                eta: etaTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              })
            } else {
              console.warn('No geocoding results for address:', location.job.customer.address)
            }
          } catch (err) {
            console.warn('Geocoding failed for address:', location.job.customer.address, err)
          }
        }

        // Set up marker click
        const etaInfo = newEtas.get(location.tech_id)
        google.maps.event.clearListeners(techMarker, 'click')
        techMarker.addListener('click', () => {
          setSelectedTech(location.tech_id)
          const minutesAgo = Math.floor((Date.now() - new Date(location.recorded_at).getTime()) / 60000)

          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(`
              <div style="padding: 8px; min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; font-weight: 600;">${location.tech_name}</h3>
                <p style="margin: 0 0 4px 0; font-size: 13px; color: #666;">
                  ðŸ“ ${minutesAgo === 0 ? 'Just now' : `${minutesAgo} min ago`}
                </p>
                ${location.speed ? `<p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">
                  ðŸš— ${Math.round((location.speed || 0) * 3.6)} km/h
                </p>` : ''}
                ${etaInfo ? `
                  <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600;">En route to:</p>
                    <p style="margin: 0 0 6px 0; font-size: 13px;">${location.job?.customer?.name || 'Unknown'}</p>
                    <p style="margin: 0; font-size: 13px; color: #059669;">
                      ðŸ“ ${etaInfo.distance} â€¢ â±ï¸ ${etaInfo.duration} (${etaInfo.eta})
                    </p>
                  </div>
                ` : ''}
              </div>
            `)
            infoWindowRef.current.open(map, techMarker)
          }
        })
      }

      // Clean up old markers
      const currentTechIds = new Set(locations.map(l => l.tech_id))
      const currentJobIds = new Set(locations.filter(l => l.job_id).map(l => l.job_id!))

      techMarkers.forEach((marker, id) => {
        if (!currentTechIds.has(id)) {
          marker.setMap(null)
          techMarkers.delete(id)
        }
      })

      jobMarkers.forEach((marker, id) => {
        if (!currentJobIds.has(id)) {
          marker.setMap(null)
          jobMarkers.delete(id)
        }
      })

      polylines.forEach((line, id) => {
        if (!currentTechIds.has(id)) {
          line.setMap(null)
          polylines.delete(id)
        }
      })

      // Fit bounds
      if (locations.length > 0) {
        map.fitBounds(bounds)
        if (locations.length === 1) {
          google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
            const zoom = map.getZoom()
            if (zoom && zoom > 15) map.setZoom(15)
          })
        }
      }

      setEtas(newEtas)
    }

    updateMap()
  }, [isLoaded, locations])

  // Subscribe to real-time updates
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('tech-locations')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'technician_locations' }, () => {
        fetchLocations()
      })
      .subscribe()

    const interval = setInterval(fetchLocations, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [fetchLocations])

  if (loadError) {
    return (
      <div className="card p-6 text-center">
        <p className="text-red-600">Failed to load map: {loadError.message}</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="card p-6 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-primary mr-2" />
        <span className="text-muted">Loading map...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Live Technician Locations</h2>
        </div>
        <button type="button" onClick={fetchLocations} className="glass-btn-secondary glass-btn-sm" disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {locations.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Navigation className="w-4 h-4" />
          <span>{locations.length} technician{locations.length !== 1 ? 's' : ''} sharing location</span>
        </div>
      )}

      <div className="relative">
        <div ref={mapRef} className="w-full h-[500px] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700" />
        {locations.length === 0 && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-muted mx-auto mb-2" />
              <p className="text-lg font-semibold">No active technicians</p>
              <p className="text-sm text-muted">Techs will appear here when they share their location</p>
            </div>
          </div>
        )}
      </div>

      <div className="card p-4">
        <h3 className="font-semibold text-ink dark:text-white mb-2">Technicians ({locations.length})</h3>
        <div className="space-y-2">
          {locations.map((location) => {
            const minutesAgo = Math.floor((Date.now() - new Date(location.recorded_at).getTime()) / 60000)
            const etaInfo = etas.get(location.tech_id)

            return (
              <div
                key={location.tech_id}
                className={`p-3 rounded-lg cursor-pointer transition ${
                  selectedTech === location.tech_id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
                }`}
                onClick={() => {
                  setSelectedTech(location.tech_id)
                  if (googleMapRef.current) {
                    googleMapRef.current.panTo({ lat: Number(location.latitude), lng: Number(location.longitude) })
                    googleMapRef.current.setZoom(15)
                  }
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span className="font-medium">{location.tech_name}</span>
                  </div>
                  <span className="text-xs text-muted">{minutesAgo === 0 ? 'Just now' : `${minutesAgo}m ago`}</span>
                </div>
                {etaInfo && location.job?.customer?.name && (
                  <div className="ml-6 mt-2 text-xs space-y-1">
                    <div className="flex items-center gap-2 text-muted">
                      <span>â†’</span>
                      <span className="font-medium text-ink">{location.job.customer.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-success">
                      <span>ðŸ“ {etaInfo.distance}</span>
                      <span>â±ï¸ {etaInfo.duration}</span>
                      <span className="text-muted">ETA: {etaInfo.eta}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

