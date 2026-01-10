'use client'

import { Service } from '@/lib/types'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Edit2, Archive, ArchiveRestore, DollarSign, Clock, CheckCircle, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ServiceWithStats extends Service {
  times_booked?: number
  times_completed?: number
}

export default function ServiceCard({
  service,
  onEdit,
}: {
  service: ServiceWithStats
  onEdit: (service: ServiceWithStats) => void
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleToggleActive = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !service.is_active })
        .eq('id', service.id)

      if (error) throw error

      router.refresh()
    } catch (error) {
      console.error('Error toggling service:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number | null) => {
    if (!price) return 'Custom pricing'
    return `$${price.toFixed(2)}`
  }

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'Flexible'
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  return (
    <div className={`card ${!service.is_active ? 'border-surface-300' : ''}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-ink text-lg">
            {service.name}
          </h3>
          {service.description && (
            <p className="text-sm text-muted mt-1 line-clamp-2">
              {service.description}
            </p>
          )}
        </div>
        <div className="flex gap-2 ml-3">
          <button
            onClick={() => onEdit(service)}
            className="text-muted hover:text-primary transition-colors"
            title="Edit service"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleToggleActive}
            disabled={loading}
            className="text-muted hover:text-warning transition-colors"
            title={service.is_active ? 'Archive service' : 'Restore service'}
          >
            {service.is_active ? (
              <Archive className="w-4 h-4" />
            ) : (
              <ArchiveRestore className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Pricing and Duration */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center text-sm">
          <DollarSign className="w-4 h-4 text-success mr-2" />
          <span className="font-medium text-ink">
            {formatPrice(service.base_price)}
          </span>
        </div>
        <div className="flex items-center text-sm">
          <Clock className="w-4 h-4 text-info mr-2" />
          <span className="text-surface-600">
            {formatDuration(service.duration_minutes)}
          </span>
        </div>
      </div>

      {/* Usage Stats */}
      {(service.times_booked !== undefined || service.times_completed !== undefined) && (
        <div className="border-t border-surface-200 pt-3 mt-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 text-muted mr-2" />
              <div>
                <p className="text-muted text-xs">Booked</p>
                <p className="font-semibold text-ink">
                  {service.times_booked || 0}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-muted mr-2" />
              <div>
                <p className="text-muted text-xs">Completed</p>
                <p className="font-semibold text-ink">
                  {service.times_completed || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Badge */}
      {!service.is_active && (
        <div className="mt-3 pt-3 border-t border-surface-200">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-100 text-surface-600">
            Archived
          </span>
        </div>
      )}
    </div>
  )
}
