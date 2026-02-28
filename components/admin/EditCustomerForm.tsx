'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { showToast } from '@/lib/utils/toast'
import { CheckCircle2, Save } from '@/components/ui/lucide'
import { Customer } from '@/lib/types'

interface EditCustomerFormProps {
  customer: Customer
  businessId: string
  onSaved?: () => void
}

export default function EditCustomerForm({ customer, businessId, onSaved }: EditCustomerFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [savedPulse, setSavedPulse] = useState(false)

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

      setSavedPulse(true)
      onSaved?.()
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to update customer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label htmlFor="name" className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Full Name</span>
          <span className="text-xs text-rose-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          placeholder="John Doe"
        />
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Phone Number</span>
          <span className="text-xs text-rose-500">*</span>
        </label>
        <input
          type="tel"
          id="phone"
          required
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          placeholder="(555) 123-4567"
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="text-xs font-medium text-slate-700 dark:text-slate-300">
          Email Address
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          placeholder="john@example.com"
        />
        <p className="helper-text mt-1">Required for customer portal access</p>
      </div>

      {/* Address */}
      <div>
        <label htmlFor="address" className="text-xs font-medium text-slate-700 dark:text-slate-300">
          Service Address
        </label>
        <textarea
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          rows={3}
          placeholder="123 Main St, City, State 12345"
        />
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="text-xs font-medium text-slate-700 dark:text-slate-300">
          Internal Notes
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          rows={3}
          placeholder="Add any internal notes about this customer..."
        />
        <p className="helper-text mt-1">Visible to admins only</p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/70 dark:border-slate-700/70">
        <button
          type="submit"
          disabled={loading || savedPulse}
          className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            savedPulse
              ? 'border-emerald-300 bg-emerald-500 dark:border-emerald-400 dark:bg-emerald-500'
              : 'border-cyan-300 bg-cyan-500 hover:bg-cyan-600 dark:border-cyan-400 dark:bg-cyan-500 dark:hover:bg-cyan-400'
          }`}
        >
          {savedPulse ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {loading ? 'Saving...' : savedPulse ? 'Saved' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
