'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { 
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2
} from '@/components/ui/lucide'
import { createClient } from '@/lib/supabase/client'

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string
  address: string | null
  notes: string | null
  business_id: string
}

export default function EditCustomerPage() {
  const router = useRouter()
  const params = useParams()
  const customerId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [customer, setCustomer] = useState<Customer | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  })

  // Load customer data
  useEffect(() => {
    async function loadCustomer() {
      try {
        const supabase = createClient()
        
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Get user's business_id and check admin role
        const { data: profile } = await supabase
          .from('users')
          .select('business_id, role')
          .eq('id', user.id)
          .single()

        if (!profile || profile.role !== 'admin') {
          router.push('/tech/today')
          return
        }

        // Get customer details
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .eq('business_id', profile.business_id)
          .single()

        if (customerError || !customerData) {
          router.push('/admin/customers')
          return
        }

        setCustomer(customerData)
        setFormData({
          name: customerData.name || '',
          email: customerData.email || '',
          phone: customerData.phone || '',
          address: customerData.address || '',
          notes: customerData.notes || ''
        })
      } catch (err) {
        setError('Failed to load customer')
      } finally {
        setLoading(false)
      }
    }

    loadCustomer()
  }, [customerId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('Customer name is required')
      }
      if (!formData.phone.trim()) {
        throw new Error('Phone number is required')
      }

      // Update customer
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim(),
          address: formData.address.trim() || null,
          notes: formData.notes.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)

      if (updateError) {
        throw new Error(updateError.message)
      }

      setSuccess(true)
      
      // Redirect after a brief delay
      setTimeout(() => {
        router.push(`/admin/customers/${customerId}`)
        router.refresh()
      }, 1000)

    } catch (err: any) {
      setError(err.message || 'Failed to update customer')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${customer?.name}? This action cannot be undone.`)) {
      return
    }

    try {
      const supabase = createClient()
      
      const { error: deleteError } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      router.push('/admin/customers')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to delete customer')
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse font-mono text-sm text-slate-400">LOADING...</div>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="h-64 flex items-center justify-center text-slate-400">
          Customer not found
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/admin/customers/${customerId}`}>
          <Button variant="ghost" className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="admin-page-header">
            EDIT CLIENT
          </h1>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1 tracking-widest">
            UPDATE CLIENT INFORMATION
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="admin-card shadow-sm">
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="font-mono text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <p className="font-mono text-sm">Customer updated successfully! Redirecting...</p>
            </div>
          )}

          {/* Customer Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400 tracking-wider">
              <User className="w-4 h-4" />
              FULL NAME *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., John Smith"
              className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl 
                         bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                         placeholder-slate-400 font-mono text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                         transition-all"
              required
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label htmlFor="phone" className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400 tracking-wider">
              <Phone className="w-4 h-4" />
              PHONE NUMBER *
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="(555) 123-4567"
              className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl 
                         bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                         placeholder-slate-400 font-mono text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                         transition-all"
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="email" className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400 tracking-wider">
              <Mail className="w-4 h-4" />
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
              className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl 
                         bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                         placeholder-slate-400 font-mono text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                         transition-all"
            />
            <p className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
              Required for customer portal access
            </p>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label htmlFor="address" className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400 tracking-wider">
              <MapPin className="w-4 h-4" />
              SERVICE ADDRESS
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="123 Main St, City, State 12345"
              rows={3}
              className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl 
                         bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                         placeholder-slate-400 font-mono text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                         transition-all"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label htmlFor="notes" className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400 tracking-wider">
              <AlertCircle className="w-4 h-4" />
              INTERNAL NOTES
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add any internal notes about this customer..."
              rows={3}
              className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl 
                         bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                         placeholder-slate-400 font-mono text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                         transition-all"
            />
            <p className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
              These notes are only visible to admins
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button 
              type="button"
              variant="secondary"
              onClick={handleDelete}
              className="font-mono text-xs px-4 py-2.5 rounded-full admin-btn-danger w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              DELETE
            </Button>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Link href={`/admin/customers/${customerId}`} className="flex-1 sm:flex-none">
                <Button 
                  type="button"
                  variant="secondary" 
                  className="w-full sm:w-auto font-mono text-xs px-6 py-2.5 rounded-full border-slate-200 dark:border-slate-700"
                >
                  CANCEL
                </Button>
              </Link>
              <Button 
                type="submit"
                disabled={saving || success}
                className="flex-1 sm:flex-none admin-btn-primary font-sans text-xs px-6 py-2.5 rounded-md transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    SAVING...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    SAVE CHANGES
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Help Text */}
      <p className="text-center font-mono text-[10px] text-slate-400 dark:text-slate-500 mt-6">
        * Required fields. Changes are saved immediately.
      </p>
    </div>
  )
}






