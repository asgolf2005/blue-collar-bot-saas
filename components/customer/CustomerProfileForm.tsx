'use client'

import { Customer } from '@/lib/types'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function CustomerProfileForm({
  customer,
  userEmail,
}: {
  customer: Customer
  userEmail: string
}) {
  const [name, setName] = useState(customer.name)
  const [phone, setPhone] = useState(customer.phone)
  const [email, setEmail] = useState(customer.email || '')
  const [address, setAddress] = useState(customer.address || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name,
          phone,
          email: email || null,
          address: address || null,
        })
        .eq('id', customer.id)

      if (error) throw error

      setMessage({
        type: 'success',
        text: 'Profile updated successfully!',
      })
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to update profile',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Personal Information</h2>

      <div className="space-y-4">
        <div>
          <label className="label">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            required
          />
        </div>

        <div>
          <label className="label">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input"
            required
          />
        </div>

        <div>
          <label className="label">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="Optional"
          />
          <p className="text-xs text-gray-500 mt-1">
            Your login email is: {userEmail}
          </p>
        </div>

        <div>
          <label className="label">Service Address</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="input min-h-[80px]"
            placeholder="123 Main St, City, State ZIP"
          />
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
