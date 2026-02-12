'use client'

import { Customer } from '@/lib/types'
import Image from 'next/image'
import { User, Phone, Mail, MapPin, Navigation, ExternalLink } from 'lucide-react'

interface CustomerDetailsCardProps {
  customer: Customer
  showMap?: boolean
}

export default function CustomerDetailsCard({ customer, showMap = true }: CustomerDetailsCardProps) {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  const openMaps = () => {
    if (customer.address) {
      const encodedAddress = encodeURIComponent(customer.address)
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank')
    }
  }

  const openDirections = () => {
    if (customer.address) {
      const encodedAddress = encodeURIComponent(customer.address)
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank')
    }
  }

  const callCustomer = () => {
    if (customer.phone) {
      window.location.href = `tel:${customer.phone}`
    }
  }

  const emailCustomer = () => {
    if (customer.email) {
      window.location.href = `mailto:${customer.email}`
    }
  }

  const getStaticMapUrl = () => {
    if (!customer.address || !googleMapsApiKey) return null
    const encodedAddress = encodeURIComponent(customer.address)
    return `https://maps.googleapis.com/maps/api/staticmap?center=${encodedAddress}&zoom=15&size=400x200&markers=color:red%7C${encodedAddress}&key=${googleMapsApiKey}`
  }

  return (
    <div className="bg-surface-50/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-4">
      <div className="flex items-center mb-4">
        <User className="w-5 h-5 text-muted mr-2" />
        <h2 className="font-semibold text-ink">Customer Details</h2>
      </div>

      {/* Customer Info */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center">
          <User className="w-4 h-4 text-muted mr-3" />
          <span className="text-ink font-medium">{customer.name}</span>
        </div>

        {customer.phone && (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Phone className="w-4 h-4 text-muted mr-3" />
              <a
                href={`tel:${customer.phone}`}
                className="text-primary hover:text-primary transition"
              >
                {customer.phone}
              </a>
            </div>
            <button
              onClick={callCustomer}
              className="px-3 py-1 text-xs bg-success/10 text-success rounded-lg hover:bg-success/20 transition border border-success/20"
            >
              Call
            </button>
          </div>
        )}

        {customer.email && (
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0">
              <Mail className="w-4 h-4 text-muted mr-3 flex-shrink-0" />
              <a
                href={`mailto:${customer.email}`}
                className="text-primary hover:text-primary transition truncate"
              >
                {customer.email}
              </a>
            </div>
            <button
              onClick={emailCustomer}
              className="px-3 py-1 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition border border-primary/20 flex-shrink-0 ml-2"
            >
              Email
            </button>
          </div>
        )}

        {customer.address && (
          <div className="flex items-start">
            <MapPin className="w-4 h-4 text-muted mr-3 mt-0.5 flex-shrink-0" />
            <span className="text-surface-600 text-sm">{customer.address}</span>
          </div>
        )}
      </div>

      {/* Google Maps Preview */}
      {showMap && customer.address && googleMapsApiKey && (
        <div className="mb-4">
          <div className="rounded-xl overflow-hidden border border-surface-200 relative">
            <Image
              src={getStaticMapUrl() || ''}
              alt="Location map"
              width={400}
              height={160}
              unoptimized
              className="w-full h-40 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
            <button
              onClick={openMaps}
              className="absolute top-2 right-2 p-2 bg-surface-50/90 backdrop-blur-sm rounded-lg border border-surface-200 hover:bg-surface-50 transition"
              title="Open in Google Maps"
            >
              <ExternalLink className="w-4 h-4 text-muted" />
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {customer.address && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={openMaps}
            className="flex items-center justify-center py-2.5 px-4 bg-surface-100 text-surface-600 font-medium rounded-xl hover:bg-surface-50 transition text-sm border border-surface-200"
          >
            <MapPin className="w-4 h-4 mr-2" />
            View Map
          </button>
          <button
            onClick={openDirections}
            className="flex items-center justify-center py-2.5 px-4 bg-primary text-white dark:text-midnight-950 font-medium rounded-xl hover:bg-primary/90 transition text-sm"
          >
            <Navigation className="w-4 h-4 mr-2" />
            Get Directions
          </button>
        </div>
      )}
    </div>
  )
}
