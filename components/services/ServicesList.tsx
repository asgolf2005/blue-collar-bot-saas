'use client'

import { Service } from '@/lib/types'
import { useState } from 'react'
import ServiceCard from './ServiceCard'
import ServiceForm from './ServiceForm'
import { Plus } from '@/components/ui/icons'
import { EmptyServices } from '@/components/ui/EmptyState'

interface ServiceWithStats extends Service {
  times_booked?: number
  times_completed?: number
}

export default function ServicesList({
  services,
  businessId,
}: {
  services: ServiceWithStats[]
  businessId: string
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingService, setEditingService] = useState<ServiceWithStats | null>(null)

  const activeServices = services.filter(s => s.is_active)
  const inactiveServices = services.filter(s => !s.is_active)

  const handleEdit = (service: ServiceWithStats) => {
    setEditingService(service)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingService(null)
  }

  return (
    <div>
      {/* Add Service Button */}
      <div className="mb-6">
        <button type="button"
          onClick={() => setShowForm(true)}
          className="btn btn-primary flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add New Service
        </button>
      </div>

      {/* Service Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <ServiceForm
              businessId={businessId}
              service={editingService}
              onClose={handleCloseForm}
            />
          </div>
        </div>
      )}

      {/* Active Services */}
      {activeServices.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Active Services ({activeServices.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeServices.map(service => (
              <ServiceCard
                key={service.id}
                service={service}
                onEdit={handleEdit}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {activeServices.length === 0 && (
        <div className="card p-6">
          <EmptyServices
            onCreateService={() => setShowForm(true)}
          />
        </div>
      )}

      {/* Inactive Services */}
      {inactiveServices.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-500 mb-4">
            Archived Services ({inactiveServices.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
            {inactiveServices.map(service => (
              <ServiceCard
                key={service.id}
                service={service}
                onEdit={handleEdit}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

