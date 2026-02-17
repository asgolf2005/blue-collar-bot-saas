'use client'

import { Customer } from '@/lib/types'

interface CustomerDetailsCardProps {
  customer: Customer
  showMap?: boolean
  onGetDirections?: () => void
}

export default function CustomerDetailsCard({ customer, showMap = true, onGetDirections }: CustomerDetailsCardProps) {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  const openMaps = () => {
    if (customer.address) {
      const encodedAddress = encodeURIComponent(customer.address)
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank')
    }
  }

  const openDirections = () => {
    if (onGetDirections) {
      onGetDirections()
      return
    }

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
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(circle_at_25%_0%,rgba(34,211,238,0.10),transparent_55%)] dark:opacity-70 dark:[background:radial-gradient(circle_at_25%_0%,rgba(34,211,238,0.12),transparent_55%)]" />
      <div className="relative mb-4">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Customer Details</h2>
      </div>

      {/* Customer Info */}
      <div className="relative mb-4 space-y-3">
        <div className="font-medium text-slate-900 dark:text-slate-100">{customer.name}</div>

        {customer.phone && (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <a
                href={`tel:${customer.phone}`}
                className="text-cyan-700 hover:text-cyan-800 dark:text-cyan-300 dark:hover:text-cyan-200 transition"
              >
                {customer.phone}
              </a>
            </div>
            <button type="button"
              onClick={callCustomer}
              className="px-3 py-1 text-xs font-semibold rounded-lg transition border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200 dark:hover:bg-emerald-400/15"
            >
              Call
            </button>
          </div>
        )}

        {customer.email && (
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0">
              <a
                href={`mailto:${customer.email}`}
                className="truncate text-cyan-700 hover:text-cyan-800 dark:text-cyan-300 dark:hover:text-cyan-200 transition"
              >
                {customer.email}
              </a>
            </div>
            <button type="button"
              onClick={emailCustomer}
              className="ml-2 flex-shrink-0 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-100 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-200 dark:hover:bg-cyan-400/15"
            >
              Email
            </button>
          </div>
        )}

        {customer.address && (
          <div className="flex items-start">
            <span className="text-sm text-slate-700 dark:text-slate-200">{customer.address}</span>
          </div>
        )}
      </div>

      {/* Google Maps Preview */}
      {showMap && customer.address && googleMapsApiKey && (
        <div className="mb-4">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <img
              src={getStaticMapUrl() || ''}
              alt="Location map"
              className="h-40 w-full object-cover"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
            <button type="button"
              onClick={openMaps}
              className="absolute top-2 right-2 rounded-xl border border-slate-200 bg-white/85 px-2.5 py-1.5 text-xs font-semibold text-slate-700 backdrop-blur-sm transition hover:bg-white dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-200 dark:hover:bg-slate-900"
              title="Open in Google Maps"
            >
              Open
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {customer.address && (
        <div className="grid grid-cols-2 gap-3">
          <button type="button"
            onClick={openMaps}
            className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-800 backdrop-blur transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:hover:bg-slate-800/60"
          >
            View Map
          </button>
          <button type="button"
            onClick={openDirections}
            className="group relative flex items-center justify-center overflow-hidden rounded-2xl px-4 py-2.5 text-sm font-semibold text-white"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 opacity-90 transition-opacity group-hover:opacity-100 dark:from-cyan-500 dark:to-blue-500" />
            <span className="absolute inset-0 opacity-50 [background:radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.35),transparent_55%)]" />
            <span className="relative inline-flex items-center justify-center gap-2">Get Directions</span>
          </button>
        </div>
      )}
    </div>
  )
}
