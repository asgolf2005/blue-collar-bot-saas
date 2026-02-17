'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
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
  Loader2,
  Trash2,
  Archive,
  ArchiveRestore
} from '@/components/ui/icons'
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

interface Service {
  id: string
  name: string
  description: string | null
  base_price: number
  duration_minutes: number
  is_active: boolean
  created_at: string
}

export default function EditServicePage() {
  const router = useRouter()
  const params = useParams()
  const serviceId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [service, setService] = useState<Service | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    base_price: '',
    duration_hours: '',
    category: 'Plumbing'
  })

  // Load service data
  useEffect(() => {
    async function loadService() {
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

        // Get service details
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select('*')
          .eq('id', serviceId)
          .eq('business_id', profile.business_id)
          .single()

        if (serviceError || !serviceData) {
          router.push('/admin/services')
          return
        }

        setService(serviceData)
        setFormData({
          name: serviceData.name,
          description: serviceData.description || '',
          base_price: serviceData.base_price.toString(),
          duration_hours: (serviceData.duration_minutes / 60).toString(),
          category: 'Plumbing' // Default since we don't store category separately
        })
      } catch (err) {
        setError('Failed to load service')
      } finally {
        setLoading(false)
      }
    }

    loadService()
  }, [serviceId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      
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

      // Update service
      const { error: updateError } = await supabase
        .from('services')
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          base_price: parseFloat(formData.base_price),
          duration_minutes: Math.round(parseFloat(formData.duration_hours) * 60),
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId)

      if (updateError) {
        throw new Error(updateError.message)
      }

      setSuccess(true)
      
      // Redirect after a brief delay
      setTimeout(() => {
        router.push(`/admin/services/${serviceId}`)
        router.refresh()
      }, 1000)

    } catch (err: any) {
      setError(err.message || 'Failed to update service')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async () => {
    if (!service) return
    
    try {
      const supabase = createClient()
      
      const { error: updateError } = await supabase
        .from('services')
        .update({
          is_active: !service.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId)

      if (updateError) {
        throw new Error(updateError.message)
      }

      setService({ ...service, is_active: !service.is_active })
    } catch (err: any) {
      setError(err.message || 'Failed to update status')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      return
    }

    try {
      const supabase = createClient()
      
      const { error: deleteError } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId)

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      router.push('/admin/services')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to delete service')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
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

  if (!service) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="h-64 flex items-center justify-center text-slate-400">
          Service not found
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/admin/services/${serviceId}`}>
          <Button variant="ghost" className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-wide">
            EDIT SERVICE
          </h1>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1 tracking-widest">
            UPDATE SERVICE DETAILS
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
              <p className="font-mono text-sm">Service updated successfully! Redirecting...</p>
            </div>
          )}

          {/* Status Badge */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">STATUS:</span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs ${
              service.is_active 
                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}>
              {service.is_active ? 'ACTIVE' : 'ARCHIVED'}
            </span>
          </div>

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
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">Hours</span>
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                type="button"
                variant="secondary"
                onClick={handleToggleActive}
                className="font-mono text-xs px-4 py-2.5 rounded-full border-slate-200 dark:border-slate-700"
              >
                {service.is_active ? (
                  <><Archive className="w-4 h-4 mr-2" /> ARCHIVE</>
                ) : (
                  <><ArchiveRestore className="w-4 h-4 mr-2" /> ACTIVATE</>
                )}
              </Button>
              <Button 
                type="button"
                variant="secondary"
                onClick={handleDelete}
                className="font-mono text-xs px-4 py-2.5 rounded-full border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Link href={`/admin/services/${serviceId}`} className="flex-1 sm:flex-none">
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
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white font-mono text-xs px-6 py-2.5 rounded-full transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    SAVING...
                  </>
                ) : (
                  'SAVE CHANGES'
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

