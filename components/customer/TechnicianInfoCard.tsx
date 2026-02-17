'use client'

import type { User as UserType } from '@/lib/types'

interface TechnicianInfoCardProps {
  technician: UserType | null
  eta: number | null
  status: string
  lastUpdated?: string
  variant?: 'default' | 'compact' | 'banner'
}

export default function TechnicianInfoCard({
  technician,
  eta,
  status,
  lastUpdated,
  variant = 'default'
}: TechnicianInfoCardProps) {
  const formatETA = (minutes: number | null) => {
    if (!minutes) return null
    if (minutes < 1) return 'Arriving now'
    if (minutes < 60) return `${Math.round(minutes)} min away`
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}h ${mins}m away`
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'on_the_way':
        return {
          text: 'On the Way',
          color: 'text-yellow-700',
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          dot: 'bg-yellow-500'
        }
      case 'arrived':
        return {
          text: 'Arrived',
          color: 'text-green-700',
          bg: 'bg-green-50',
          border: 'border-green-200',
          dot: 'bg-green-500'
        }
      case 'in_progress':
        return {
          text: 'Working on Your Job',
          color: 'text-blue-700',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          dot: 'bg-blue-500'
        }
      default:
        return {
          text: 'Scheduled',
          color: 'text-gray-700',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          dot: 'bg-gray-500'
        }
    }
  }

  const statusConfig = getStatusConfig(status)
  const etaFormatted = formatETA(eta)

  if (!technician) {
    return (
      <div className="card p-4 text-center text-gray-500">
        <p>Technician not yet assigned</p>
      </div>
    )
  }

  // Banner variant - horizontal, for top of page
  if (variant === 'banner') {
    return (
      <div className={`rounded-xl p-4 ${statusConfig.bg} ${statusConfig.border} border`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full ${statusConfig.dot} animate-pulse mr-3`}></div>
            <div>
              <p className={`font-semibold ${statusConfig.color}`}>{statusConfig.text}</p>
              <p className="text-sm text-gray-600">
                {technician.full_name} is {status === 'on_the_way' ? 'heading to your location' : status === 'arrived' ? 'at your location' : 'working on your job'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {etaFormatted && status === 'on_the_way' && (
              <div className="flex items-center text-gray-700">
                <span className="font-medium">{etaFormatted}</span>
              </div>
            )}

            {technician.phone && (
              <a
                href={`tel:${technician.phone}`}
                className="btn btn-primary flex items-center"
              >
                Call Technician
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Compact variant - for sidebars or smaller spaces
  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
            <span className="text-primary-700 font-semibold">{technician.full_name.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">{technician.full_name}</p>
            <div className="flex items-center mt-0.5">
              <div className={`w-2 h-2 rounded-full ${statusConfig.dot} mr-1.5`}></div>
              <span className="text-xs text-gray-500">{statusConfig.text}</span>
            </div>
          </div>
        </div>
        {technician.phone && (
          <a
            href={`tel:${technician.phone}`}
            className="p-2 rounded-full bg-primary-100 text-primary-600 hover:bg-primary-200 transition-colors"
          >
            Call
          </a>
        )}
      </div>
    )
  }

  // Default variant - full card
  return (
    <div className="card overflow-hidden">
      {/* Status Header */}
      <div className={`px-6 py-4 ${statusConfig.bg} ${statusConfig.border} border-b`}>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full ${statusConfig.dot} animate-pulse mr-3`}></div>
          <span className={`font-semibold ${statusConfig.color}`}>{statusConfig.text}</span>
          {etaFormatted && status === 'on_the_way' && (
            <span className="ml-auto flex items-center text-gray-600">
              {etaFormatted}
            </span>
          )}
        </div>
      </div>

      {/* Technician Info */}
      <div className="p-6">
        <div className="flex items-start">
          <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-xl font-bold mr-4 shadow-lg">
            {technician.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-900">{technician.full_name}</h3>
            <p className="text-sm text-gray-500">Your Technician</p>

            {/* Contact Options */}
            <div className="mt-4 space-y-2">
              {technician.phone && (
                <a
                  href={`tel:${technician.phone}`}
                  className="flex items-center text-sm text-gray-600 hover:text-primary-600 transition-colors"
                >
                  {technician.phone}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          {technician.phone && (
            <a
              href={`tel:${technician.phone}`}
              className="flex-1 btn btn-primary flex items-center justify-center"
            >
              Call Now
            </a>
          )}
          {status === 'on_the_way' && (
            <button className="flex-1 btn btn-secondary flex items-center justify-center">
              Track Location
            </button>
          )}
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <p className="mt-4 text-xs text-gray-400 text-center">
            Location updated {new Date(lastUpdated).toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  )
}
