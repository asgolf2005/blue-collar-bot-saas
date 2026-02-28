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
    <div className="relative overflow-hidden rounded-[2.5rem] bg-white/40 p-6 shadow-xl ring-1 ring-slate-200/50 backdrop-blur-xl dark:bg-slate-900/40 dark:ring-slate-800/50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.1),transparent_60%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.15),transparent_60%)]" />
      <div className="relative mb-5">
        <h2 className="font-display-soft text-xl font-bold tracking-tight text-slate-900 dark:text-white">Customer Details</h2>
      </div>

      {/* Customer Info */}
      <div className="relative mb-5 space-y-4 rounded-[1.5rem] bg-white/50 p-5 ring-1 ring-slate-200/50 dark:bg-slate-950/20 dark:ring-slate-800/50 shadow-inner">
        <div className="font-sans text-lg font-bold tracking-tight text-slate-900 dark:text-white">{customer.name}</div>

        {customer.phone && (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <a
                href={`tel:${customer.phone}`}
                className="font-mono text-[13px] font-semibold text-cyan-600 transition hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
              >
                {customer.phone}
              </a>
            </div>
            <button type="button"
              onClick={callCustomer}
              className="rounded-xl bg-cyan-500/10 px-4 py-2 font-sans text-xs font-bold uppercase tracking-widest text-cyan-700 ring-1 ring-cyan-500/30 transition hover:bg-cyan-500/20 dark:bg-cyan-400/10 dark:text-cyan-300 dark:hover:bg-cyan-400/20"
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
                className="truncate font-mono text-[13px] font-semibold text-cyan-600 transition hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
              >
                {customer.email}
              </a>
            </div>
            <button type="button"
              onClick={emailCustomer}
              className="ml-2 flex-shrink-0 rounded-xl bg-cyan-500/10 px-4 py-2 font-sans text-xs font-bold uppercase tracking-widest text-cyan-700 ring-1 ring-cyan-500/30 transition hover:bg-cyan-500/20 dark:bg-cyan-400/10 dark:text-cyan-300 dark:hover:bg-cyan-400/20"
            >
              Email
            </button>
          </div>
        )}

        {customer.address && (
          <div className="flex items-start pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
            <span className="font-sans text-[13px] font-medium leading-relaxed text-slate-700 dark:text-slate-300">{customer.address}</span>
          </div>
        )}
      </div>

      {/* Google Maps Preview */}
      {showMap && customer.address && googleMapsApiKey && (
        <div className="mb-5">
          <div className="group relative overflow-hidden rounded-[1.5rem] bg-white/50 ring-1 ring-slate-200/50 dark:bg-slate-900/50 dark:ring-slate-800/50 shadow-inner">
            <img
              src={getStaticMapUrl() || ''}
              alt="Location map"
              className="h-44 w-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={(e) => {
                ; (e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <button type="button"
              onClick={openMaps}
              className="absolute bottom-4 right-4 rounded-xl bg-white/90 px-4 py-2 font-sans text-xs font-bold uppercase tracking-widest text-slate-800 shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:bg-white dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-900"
              title="Open in Google Maps"
            >
              Open Maps
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {customer.address && (
        <div className="grid grid-cols-2 gap-3">
          <button type="button"
            onClick={openMaps}
            className="flex h-12 items-center justify-center rounded-[1.2rem] bg-white/50 px-4 font-sans text-[13px] font-bold tracking-wide text-slate-800 shadow-sm ring-1 ring-slate-200/50 backdrop-blur-md transition-all hover:bg-white/80 dark:bg-slate-900/50 dark:text-slate-200 dark:ring-slate-800/50 dark:hover:bg-slate-900/80 hover:scale-[1.02]"
          >
            View Map
          </button>
          <button type="button"
            onClick={openDirections}
            className="group relative flex h-12 items-center justify-center overflow-hidden rounded-[1.2rem] px-4 font-sans text-[13px] font-bold tracking-wide text-slate-950 transition-all hover:scale-[1.02]"
          >
            <span className="absolute inset-0 bg-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-opacity" />
            <span className="absolute inset-0 opacity-50 [background:radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.4),transparent_55%)]" />
            <span className="relative inline-flex items-center justify-center gap-2">Get Directions</span>
          </button>
        </div>
      )}
    </div>
  )
}
