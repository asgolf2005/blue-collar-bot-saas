'use client'

import { useEffect, useState, useCallback } from 'react'
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api'
import type { TechnicianLocation, User } from '@/lib/types'

interface LiveTrackingMapProps {
  technicianLocation: TechnicianLocation | null
  technician: User | null
  customerAddress: string
  customerCoords?: { lat: number; lng: number } | null
  eta: number | null
  jobStatus: string
  onRefresh?: () => void
}

const mapContainerStyle = {
  width: '100%',
  height: '100%'
}

const defaultCenter = {
  lat: 40.7128,
  lng: -74.0060
}

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ]
}

export default function LiveTrackingMap({
  technicianLocation,
  technician,
  customerAddress,
  customerCoords,
  eta,
  jobStatus,
  onRefresh
}: LiveTrackingMapProps) {
  const [showTechInfo, setShowTechInfo] = useState(false)
  const [geocodedCustomerCoords, setGeocodedCustomerCoords] = useState<{ lat: number; lng: number } | null>(null)

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  })

  // Geocode customer address if coords not provided
  useEffect(() => {
    if (!customerCoords && customerAddress && isLoaded && window.google) {
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode({ address: customerAddress }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          setGeocodedCustomerCoords({
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng()
          })
        }
      })
    }
  }, [customerAddress, customerCoords, isLoaded])

  const finalCustomerCoords = customerCoords || geocodedCustomerCoords

  // Calculate map center and bounds
  const getMapCenter = useCallback(() => {
    if (technicianLocation && finalCustomerCoords) {
      // Center between tech and customer
      return {
        lat: (technicianLocation.latitude + finalCustomerCoords.lat) / 2,
        lng: (technicianLocation.longitude + finalCustomerCoords.lng) / 2
      }
    }
    if (technicianLocation) {
      return { lat: technicianLocation.latitude, lng: technicianLocation.longitude }
    }
    if (finalCustomerCoords) {
      return finalCustomerCoords
    }
    return defaultCenter
  }, [technicianLocation, finalCustomerCoords])

  const formatETA = (minutes: number | null) => {
    if (!minutes) return 'Calculating...'
    if (minutes < 1) return 'Arriving now'
    if (minutes < 60) return `${Math.round(minutes)} min`
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}h ${mins}m`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_the_way': return 'bg-yellow-500'
      case 'arrived': return 'bg-green-500'
      case 'in_progress': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'on_the_way': return 'On the Way'
      case 'arrived': return 'Arrived'
      case 'in_progress': return 'Working'
      default: return status
    }
  }

  if (loadError) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>Unable to load map</p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-primary-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative w-full h-80 md:h-96 rounded-xl overflow-hidden shadow-lg border border-gray-200">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={13}
        center={getMapCenter()}
        options={mapOptions}
      >
        {/* Technician Marker */}
        {technicianLocation && (
          <Marker
            position={{
              lat: technicianLocation.latitude,
              lng: technicianLocation.longitude
            }}
            icon={{
              path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#1e40af',
              strokeWeight: 2,
              rotation: technicianLocation.heading || 0
            }}
            onClick={() => setShowTechInfo(true)}
          />
        )}

        {/* Technician Info Window */}
        {technicianLocation && showTechInfo && technician && (
          <InfoWindow
            position={{
              lat: technicianLocation.latitude,
              lng: technicianLocation.longitude
            }}
            onCloseClick={() => setShowTechInfo(false)}
          >
            <div className="p-2">
              <p className="font-semibold">{technician.full_name}</p>
              {technician.phone && (
                <a
                  href={`tel:${technician.phone}`}
                  className="text-primary-600 text-sm mt-1"
                >
                  {technician.phone}
                </a>
              )}
            </div>
          </InfoWindow>
        )}

        {/* Customer Location Marker */}
        {finalCustomerCoords && (
          <Marker
            position={finalCustomerCoords}
            icon={{
              url: 'data:image/svg+xml,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
                  <circle cx="12" cy="12" r="10" fill="#10b981" stroke="#fff" stroke-width="2"/>
                  <circle cx="12" cy="12" r="4" fill="#fff"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(32, 32),
              anchor: new window.google.maps.Point(16, 16)
            }}
          />
        )}
      </GoogleMap>

      {/* Status Overlay - Top Left */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor(jobStatus)} animate-pulse`}></div>
          <span className="font-medium text-gray-900">{getStatusText(jobStatus)}</span>
        </div>
        {eta && jobStatus === 'on_the_way' && (
          <div className="mt-2 text-sm text-gray-600">ETA: {formatETA(eta)}</div>
        )}
      </div>

      {/* Technician Quick Info - Bottom */}
      {technician && (
        <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3 text-primary-700 font-semibold">
                {(technician.full_name || 'T').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{technician.full_name}</p>
                <p className="text-sm text-gray-500">Your Technician</p>
              </div>
            </div>
            {technician.phone && (
              <a
                href={`tel:${technician.phone}`}
                className="btn btn-primary"
              >
                Call
              </a>
            )}
          </div>
          {technicianLocation && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Last updated: {new Date(technicianLocation.updated_at).toLocaleTimeString()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Refresh Button */}
      {onRefresh && (
        <button type="button"
          onClick={onRefresh}
          className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 z-10"
          title="Refresh location"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}

      {/* No Location Message */}
      {!technicianLocation && jobStatus === 'on_the_way' && (
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center z-20">
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-primary-600 animate-spin mx-auto mb-2" />
            <p className="text-gray-900 font-medium">Waiting for location...</p>
            <p className="text-sm text-gray-500">Technician is on their way</p>
          </div>
        </div>
      )}
    </div>
  )
}
