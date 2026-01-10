'use client'

import { MapPin, Navigation } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'

interface Job {
  id: string
  scheduled_start: string
  customer: {
    name: string
    address: string | null
  }
  service: {
    name: string
  }
}

interface MapCardProps {
  jobs: Job[]
}

// Load Google Maps script
function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window.google !== 'undefined') {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Maps script'))
    document.head.appendChild(script)
  })
}

export default function MapCard({ jobs }: MapCardProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)

  useEffect(() => {
    const initializeMap = async () => {
      try {
        setLoading(true)
        setError(null)

        // Load Google Maps script
        await loadGoogleMapsScript('AIzaSyDq-MYHeCkHbvXZxtxNkDmyRBbC3mNcGVw')

        if (!mapRef.current) return

        // Filter jobs with addresses
        const jobsWithAddresses = jobs.filter(job => job.customer.address)

        // Default center (will be updated if we have addresses)
        let center = { lat: 40.7128, lng: -74.0060 } // New York default

        // Create map
        const mapInstance = new google.maps.Map(mapRef.current, {
          zoom: 12,
          center,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            {
              featureType: 'all',
              elementType: 'geometry',
              stylers: [{ color: '#f5f5f5' }]
            },
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: [{ color: '#e0e8f0' }]
            },
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        })

        setMap(mapInstance)

        if (jobsWithAddresses.length > 0) {
          // Geocode addresses and add markers
          const geocoder = new google.maps.Geocoder()
          const bounds = new google.maps.LatLngBounds()

          for (let i = 0; i < jobsWithAddresses.length; i++) {
            const job = jobsWithAddresses[i]

            try {
              const result = await geocoder.geocode({ address: job.customer.address! })

              if (result.results[0]) {
                const position = result.results[0].geometry.location
                bounds.extend(position)

                // Create custom marker
                const marker = new google.maps.Marker({
                  position,
                  map: mapInstance,
                  title: job.customer.name,
                  label: {
                    text: (i + 1).toString(),
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  },
                  icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 20,
                    fillColor: '#2563eb',
                    fillOpacity: 1,
                    strokeColor: '#1d4ed8',
                    strokeWeight: 3
                  }
                })

                // Add click listener
                marker.addListener('click', () => {
                  setSelectedJob(job)
                })
              }
            } catch (err) {
              console.error(`Failed to geocode address for ${job.customer.name}:`, err)
            }
          }

          // Fit map to show all markers
          if (!bounds.isEmpty()) {
            mapInstance.fitBounds(bounds)
            // Add padding
            const paddedBounds = new google.maps.LatLngBounds()
            const ne = bounds.getNorthEast()
            const sw = bounds.getSouthWest()
            const padding = 0.01
            paddedBounds.extend(new google.maps.LatLng(ne.lat() + padding, ne.lng() + padding))
            paddedBounds.extend(new google.maps.LatLng(sw.lat() - padding, sw.lng() - padding))
            mapInstance.fitBounds(paddedBounds)
          }
        }

        setLoading(false)
      } catch (err) {
        console.error('Error initializing map:', err)
        setError('Failed to load map')
        setLoading(false)
      }
    }

    initializeMap()
  }, [jobs])

  const jobsWithAddresses = jobs.filter(job => job.customer.address)

  return (
    <div className="rounded-3xl bg-white dark:bg-surface-900 p-6 shadow-elevation-premium-2 border border-surface-200 dark:border-white/10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-ink dark:text-surface-100 mb-1">Today's Route</h3>
          <p className="text-sm text-muted">
            {jobsWithAddresses.length} location{jobsWithAddresses.length !== 1 ? 's' : ''} on your map
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Navigation className="w-5 h-5 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <div className="relative rounded-2xl overflow-hidden border border-surface-200 dark:border-white/10" style={{ height: '400px' }}>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-50 dark:bg-surface-800">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-sm text-muted">Loading map...</p>
                </div>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-50 dark:bg-surface-800">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-danger mx-auto mb-3" />
                  <p className="text-sm text-danger">{error}</p>
                </div>
              </div>
            )}
            {!loading && !error && jobsWithAddresses.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-50 dark:bg-surface-800">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-muted mx-auto mb-3" />
                  <p className="text-sm text-muted">No addresses available for today's jobs</p>
                </div>
              </div>
            )}
            <div ref={mapRef} className="w-full h-full" />
          </div>
        </div>

        {/* Locations List */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
          {jobsWithAddresses.length > 0 ? (
            jobsWithAddresses.map((job, index) => (
              <div
                key={job.id}
                className={`p-4 rounded-xl border transition-all motion-base cursor-pointer ${
                  selectedJob?.id === job.id
                    ? 'border-primary bg-primary/5'
                    : 'border-surface-200 dark:border-white/10 hover:border-primary/30 hover:bg-surface-50 dark:hover:bg-white/5'
                }`}
                onClick={() => setSelectedJob(job)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md shadow-blue-500/25">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-ink dark:text-surface-100 text-sm mb-1">
                      {job.customer.name}
                    </h4>
                    <p className="text-xs text-muted mb-2">{job.service.name}</p>
                    <div className="flex items-start gap-1.5 text-xs text-muted">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{job.customer.address}</span>
                    </div>
                    <div className="mt-2 text-xs text-primary font-medium">
                      {format(new Date(job.scheduled_start), 'HH:mm')}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted">No locations to display</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
