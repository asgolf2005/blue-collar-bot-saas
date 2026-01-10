'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Save, Loader2, User, Phone, Mail, MapPin } from 'lucide-react'
import { FormAlert } from '@/components/shared'

export default function NewCustomerForm({ businessId }: { businessId: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!name || !phone) {
        throw new Error('Please fill in all required fields')
      }

      // Create the customer
      const { error: customerError } = await supabase
        .from('customers')
        .insert({
          business_id: businessId,
          name,
          email: email || null,
          phone,
          address: address || null,
        })

      if (customerError) throw customerError

      router.push('/admin/customers')
      router.refresh()
    } catch (err: any) {
      console.error('Error creating customer:', err)
      setError(err.message || 'Failed to create customer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="glass-card">
        <h2 className="text-lg font-semibold text-ink mb-4">Customer Information</h2>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="label flex items-center">
              <User className="w-4 h-4 mr-2" />
              Full Name <span className="text-danger ml-1">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-premium"
              placeholder="John Smith"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="label flex items-center">
              <Phone className="w-4 h-4 mr-2" />
              Phone Number <span className="text-danger ml-1">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-premium"
              placeholder="(555) 123-4567"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="label flex items-center">
              <Mail className="w-4 h-4 mr-2" />
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-premium"
              placeholder="john@example.com"
            />
          </div>

          {/* Address */}
          <div>
            <label className="label flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Service Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="input-premium"
              placeholder="123 Main St, City, State 12345"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <FormAlert type="danger" message={error} onClose={() => setError(null)} />
      )}

      {/* Submit Button */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="glass-btn-primary flex items-center"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Customer...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Create Customer
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="glass-btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
