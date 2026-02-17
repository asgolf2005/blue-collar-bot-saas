'use client'

import { Service } from '@/lib/types'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Save, Loader2 } from '@/components/ui/icons'
import { useRouter } from 'next/navigation'
import { showToast } from '@/lib/utils/toast'

export default function ServiceForm({
  businessId,
  service,
  onClose,
}: {
  businessId: string
  service?: Service | null
  onClose: () => void
}) {
  const [name, setName] = useState(service?.name || '')
  const [description, setDescription] = useState(service?.description || '')
  const [basePrice, setBasePrice] = useState(
    service?.base_price ? service.base_price.toString() : ''
  )
  const [durationMinutes, setDurationMinutes] = useState(
    service?.duration_minutes ? service.duration_minutes.toString() : ''
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const serviceData = {
        business_id: businessId,
        name,
        description: description || null,
        base_price: basePrice ? parseFloat(basePrice) : null,
        duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
      }

      if (service?.id) {
        // Update existing service
        const { error: updateError } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', service.id)

        if (updateError) throw updateError

        showToast.success('Service updated successfully!')
      } else {
        // Create new service
        const { error: insertError } = await supabase
          .from('services')
          .insert(serviceData)

        if (insertError) throw insertError

        showToast.success('Service created successfully!')
      }

      router.refresh()
      onClose()
    } catch (err: any) {
      console.error('Error saving service:', err)
      const errorMessage = err.message || 'Failed to save service'
      setError(errorMessage)
      showToast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          {service ? 'Edit Service' : 'Add New Service'}
        </h2>
        <button type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Service Name */}
        <div>
          <label className="label">
            Service Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="e.g., Plumbing Repair, AC Installation"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="label">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input min-h-[100px]"
            placeholder="Brief description of the service..."
          />
        </div>

        {/* Pricing and Duration Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Base Price */}
          <div>
            <label className="label">Base Price ($)</label>
            <input
              type="number"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              className="input"
              placeholder="0.00"
              step="0.01"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave blank for custom pricing
            </p>
          </div>

          {/* Duration */}
          <div>
            <label className="label">Duration (minutes)</label>
            <input
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="input"
              placeholder="60"
              step="15"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Estimated service time
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="btn btn-primary flex items-center flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {service ? 'Update Service' : 'Create Service'}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

