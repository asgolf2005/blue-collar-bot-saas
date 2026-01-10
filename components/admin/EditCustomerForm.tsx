'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { showToast } from '@/lib/utils/toast'
import { Save, Trash2 } from 'lucide-react'
import { Customer } from '@/lib/types'

interface EditCustomerFormProps {
  customer: Customer
  businessId: string
}

export default function EditCustomerForm({ customer, businessId }: EditCustomerFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [formData, setFormData] = useState({
    name: customer.name || '',
    email: customer.email || '',
    phone: customer.phone || '',
    address: customer.address || '',
    notes: (customer as any).notes || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update customer')
      }

      showToast.success('Customer updated successfully')
      router.refresh()
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to update customer')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${customer.name}? This action cannot be undone.`)) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/customers/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerIds: [customer.id] }),
      })

      if (!response.ok) throw new Error('Failed to delete customer')

      showToast.success('Customer deleted successfully')
      router.push('/admin/customers')
    } catch (error) {
      showToast.error('Failed to delete customer')
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-ink mb-2">
          Customer Name *
        </label>
        <input
          type="text"
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="glass-input w-full"
          placeholder="John Doe"
        />
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-ink mb-2">
          Phone Number *
        </label>
        <input
          type="tel"
          id="phone"
          required
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="glass-input w-full"
          placeholder="(555) 123-4567"
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-ink mb-2">
          Email Address
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="glass-input w-full"
          placeholder="john@example.com"
        />
        <p className="text-xs text-muted mt-1">Required for customer portal access</p>
      </div>

      {/* Address */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-ink mb-2">
          Service Address
        </label>
        <textarea
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          className="glass-input w-full"
          rows={3}
          placeholder="123 Main St, City, State 12345"
        />
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-ink mb-2">
          Internal Notes
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="glass-input w-full"
          rows={4}
          placeholder="Add any internal notes about this customer..."
        />
        <p className="text-xs text-muted mt-1">These notes are only visible to admins</p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-6 border-t border-surface-200">
        <button
          type="submit"
          disabled={loading || deleting}
          className="glass-btn-primary flex items-center gap-2 flex-1"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting || loading}
          className="glass-btn-primary flex items-center gap-2 flex-1 !bg-red-600 hover:!bg-red-700"
        >
          <Trash2 className="w-4 h-4" />
          {deleting ? 'Deleting...' : 'Delete Customer'}
        </button>
      </div>
    </form>
  )
}
