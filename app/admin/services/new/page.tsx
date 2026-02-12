'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { 
  ArrowLeft,
  Briefcase,
  DollarSign,
  Clock,
  Tag,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Service categories
const categories = [
  'Plumbing',
  'Drain Cleaning',
  'Heating',
  'Installation',
  'Repair',
  'Emergency',
  'Maintenance',
  'Inspection',
  'Other'
]

export default function NewServicePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    base_price: '',
    duration_hours: '',
    category: 'Plumbing'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Get user's business_id
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('business_id, role')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        throw new Error('Could not load user profile')
      }

      if (profile.role !== 'admin') {
        throw new Error('Only admins can create services')
      }

      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('Service name is required')
      }
      if (!formData.base_price || parseFloat(formData.base_price) < 0) {
        throw new Error('Base price is required')
      }
      if (!formData.duration_hours || parseFloat(formData.duration_hours) <= 0) {
        throw new Error('Duration is required')
      }

      // Create service
      const { error: insertError } = await supabase
        .from('services')
        .insert({
          business_id: profile.business_id,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          base_price: parseFloat(formData.base_price),
          duration_minutes: Math.round(parseFloat(formData.duration_hours) * 60),
          is_active: true
        })

      if (insertError) {
        throw new Error(insertError.message)
      }

      setSuccess(true)
      
      // Redirect after a brief delay
      setTimeout(() => {
        router.push('/admin/services')
        router.refresh()
      }, 1000)

    } catch (err: any) {
      setError(err.message || 'Failed to create service')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/services">
          <Button variant="ghost" className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-wide">
            NEW SERVICE
          </h1>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1 tracking-widest">
            CREATE A NEW SERVICE OFFERING
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
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
              <p className="font-mono text-sm">Service created successfully! Redirecting...</p>
            </div>
          )}

          {/* Service Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400 tracking-wider">
              <Briefcase className="w-4 h-4" />
              SERVICE NAME *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Emergency Pipe Repair"
              className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl 
                         bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                         placeholder-slate-400 font-mono text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                         transition-all"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400 tracking-wider">
              <FileText className="w-4 h-4" />
              DESCRIPTION
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe what this service includes..."
              rows={3}
              className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl 
                         bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                         placeholder-slate-400 font-mono text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                         transition-all"
            />
          </div>

          {/* Price & Duration Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Base Price */}
            <div className="space-y-2">
              <label htmlFor="base_price" className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400 tracking-wider">
                <DollarSign className="w-4 h-4" />
                BASE PRICE *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">$</span>
                <input
                  type="number"
                  id="base_price"
                  name="base_price"
                  value={formData.base_price}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="block w-full pl-8 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl 
                             bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                             placeholder-slate-400 font-mono text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                             transition-all"
                  required
                />
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label htmlFor="duration_hours" className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400 tracking-wider">
                <Clock className="w-4 h-4" />
                DURATION (HOURS) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="duration_hours"
                  name="duration_hours"
                  value={formData.duration_hours}
                  onChange={handleChange}
                  placeholder="1.0"
                  min="0.5"
                  max="24"
                  step="0.5"
                  className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl 
                             bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                             placeholder-slate-400 font-mono text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                             transition-all"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">hrs</span>
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label htmlFor="category" className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400 tracking-wider">
              <Tag className="w-4 h-4" />
              CATEGORY
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl 
                         bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                         font-mono text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                         transition-all appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Link href="/admin/services" className="w-full sm:w-auto">
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
              disabled={loading || success}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white font-mono text-xs px-6 py-2.5 rounded-full transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  CREATING...
                </>
              ) : (
                'CREATE SERVICE'
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Help Text */}
      <p className="text-center font-mono text-[10px] text-slate-400 dark:text-slate-500 mt-6">
        * Required fields. The service will be active immediately after creation.
      </p>
    </div>
  )
}
