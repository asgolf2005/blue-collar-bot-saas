'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Loader2,
  Trash2,
  TriangleAlert,
} from '@/components/ui/lucide'
import { createClient } from '@/lib/supabase/client'

interface Service {
  id: string
  name: string
  description: string | null
  base_price: number | null
  duration_minutes: number | null
  is_active: boolean
}

function toHours(minutes: number | null) {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) return ''
  return (minutes / 60).toString()
}

export default function EditServicePage() {
  const router = useRouter()
  const params = useParams()
  const serviceId = params.id as string

  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    base_price: '',
    duration_hours: '',
  })

  useEffect(() => {
    let mounted = true

    async function loadService() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.replace('/login')
          return
        }

        const { data: profile } = await supabase
          .from('users')
          .select('business_id, role')
          .eq('id', user.id)
          .single()

        if (!profile || profile.role !== 'admin') {
          router.replace('/tech/today')
          return
        }

        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select('*')
          .eq('id', serviceId)
          .eq('business_id', profile.business_id)
          .single()

        if (serviceError || !serviceData) {
          router.replace('/admin/services')
          return
        }

        if (!mounted) return
        setService(serviceData)
        setFormData({
          name: serviceData.name,
          description: serviceData.description || '',
          base_price:
            typeof serviceData.base_price === 'number' && Number.isFinite(serviceData.base_price)
              ? serviceData.base_price.toString()
              : '',
          duration_hours: toHours(serviceData.duration_minutes),
        })
      } catch {
        if (mounted) setError('Failed to load service')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadService()
    return () => {
      mounted = false
    }
  }, [router, serviceId])

  const parsedValues = useMemo(() => {
    const rawPrice = formData.base_price.trim()
    const rawHours = formData.duration_hours.trim()

    const parsedPrice = rawPrice === '' ? null : Number.parseFloat(rawPrice)
    const parsedHours = rawHours === '' ? null : Number.parseFloat(rawHours)

    return { parsedPrice, parsedHours }
  }, [formData.base_price, formData.duration_hours])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()

      if (!formData.name.trim()) {
        throw new Error('Service name is required')
      }

      if (parsedValues.parsedPrice !== null) {
        if (!Number.isFinite(parsedValues.parsedPrice) || parsedValues.parsedPrice < 0) {
          throw new Error('Price must be a valid number (0 or greater)')
        }
      }

      if (parsedValues.parsedHours !== null) {
        if (!Number.isFinite(parsedValues.parsedHours) || parsedValues.parsedHours <= 0) {
          throw new Error('Duration must be a positive number of hours')
        }
      }

      const { error: updateError } = await supabase
        .from('services')
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          base_price: parsedValues.parsedPrice,
          duration_minutes:
            parsedValues.parsedHours === null ? null : Math.round(parsedValues.parsedHours * 60),
          updated_at: new Date().toISOString(),
        })
        .eq('id', serviceId)

      if (updateError) throw new Error(updateError.message)

      setSuccess(true)
      setTimeout(() => {
        router.push(`/admin/services/${serviceId}`)
        router.refresh()
      }, 700)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update service')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async () => {
    if (!service) return
    setError(null)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('services')
        .update({
          is_active: !service.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', serviceId)

      if (updateError) throw new Error(updateError.message)
      setService({ ...service, is_active: !service.is_active })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update service status')
    }
  }

  const handleDelete = async () => {
    const confirmed = confirm('Delete this service? This cannot be undone.')
    if (!confirmed) return

    setError(null)
    try {
      const supabase = createClient()
      const { error: deleteError } = await supabase.from('services').delete().eq('id', serviceId)
      if (deleteError) throw new Error(deleteError.message)
      router.push('/admin/services')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete service')
    }
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="admin-card p-8">
          <p className="font-sans text-sm text-slate-500 dark:text-slate-400">Loading service...</p>
        </div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="admin-card p-8">
          <p className="font-sans text-sm text-slate-500 dark:text-slate-400">Service not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={`/admin/services/${serviceId}`}>
            <Button variant="ghost" className="rounded-full p-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="admin-page-header mb-1">EDIT SERVICE</h1>
            <p className="font-sans text-sm text-slate-600 dark:text-slate-400">
              Keep service details accurate for scheduling and billing.
            </p>
          </div>
        </div>
        <span
          className={`inline-flex rounded-sm border px-2 py-1 font-sans text-xs font-medium ${
            service.is_active
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {service.is_active ? 'Active' : 'Archived'}
        </span>
      </div>

      <div className="admin-card">
        <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">
          {error && (
            <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
              <p className="flex items-center gap-2 font-sans text-sm text-red-700 dark:text-red-300">
                <TriangleAlert className="h-4 w-4" />
                {error}
              </p>
            </div>
          )}

          {success && (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <p className="flex items-center gap-2 font-sans text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                Service updated successfully.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="name"
              className="flex items-center gap-2 font-sans text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400"
            >
              <Briefcase className="h-4 w-4" />
              Service name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Example: Emergency Pipe Repair"
              className="w-full rounded-md border border-slate-300 bg-white px-4 py-3 font-sans text-sm text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="description"
              className="flex items-center gap-2 font-sans text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400"
            >
              <FileText className="h-4 w-4" />
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              placeholder="What is included in this service?"
              className="w-full resize-none rounded-md border border-slate-300 bg-white px-4 py-3 font-sans text-sm text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="base_price"
                className="flex items-center gap-2 font-sans text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400"
              >
                <DollarSign className="h-4 w-4" />
                Price (optional)
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-slate-500">
                  $
                </span>
                <input
                  id="base_price"
                  name="base_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.base_price}
                  onChange={handleChange}
                  placeholder="Leave blank for custom quote"
                  className="w-full rounded-md border border-slate-300 bg-white py-3 pl-8 pr-4 font-mono text-sm text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="duration_hours"
                className="flex items-center gap-2 font-sans text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400"
              >
                <Clock className="h-4 w-4" />
                Duration (optional)
              </label>
              <div className="relative">
                <input
                  id="duration_hours"
                  name="duration_hours"
                  type="number"
                  min="0.25"
                  max="24"
                  step="0.25"
                  value={formData.duration_hours}
                  onChange={handleChange}
                  placeholder="Leave blank for variable duration"
                  className="w-full rounded-md border border-slate-300 bg-white px-4 py-3 pr-16 font-mono text-sm text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-sans text-xs text-slate-500 dark:text-slate-400">
                  hours
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleToggleActive}
                className="rounded-full px-4 py-2 text-xs font-semibold"
              >
                {service.is_active ? (
                  <>
                    <Archive className="h-4 w-4" />
                    ARCHIVE
                  </>
                ) : (
                  <>
                    <ArchiveRestore className="h-4 w-4" />
                    ACTIVATE
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleDelete}
                className="admin-btn-danger rounded-full px-4 py-2 text-xs font-semibold"
              >
                <Trash2 className="h-4 w-4" />
                DELETE
              </Button>
            </div>

            <div className="flex gap-2">
              <Link href={`/admin/services/${serviceId}`}>
                <Button type="button" variant="secondary" className="rounded-full px-4 py-2 text-xs font-semibold">
                  CANCEL
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={saving || success}
                className="admin-btn-primary rounded-full px-5 py-2 text-xs font-semibold"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    SAVING
                  </>
                ) : (
                  'SAVE CHANGES'
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
