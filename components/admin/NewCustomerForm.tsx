'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  User,
  Users,
} from '@/components/ui/icons'

const PANEL_CLASS =
  'rounded-3xl border border-border bg-bg-secondary/95 p-5 shadow-elevation-1 backdrop-blur sm:p-6'
const INPUT_CLASS =
  'w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-primary transition-colors placeholder:text-text-muted focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:bg-slate-900/90'

export default function NewCustomerForm({
  businessId,
  existingCustomerCount = 0,
}: {
  businessId: string
  existingCustomerCount?: number
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const trimmedName = name.trim()
  const trimmedPhone = phone.trim()
  const trimmedEmail = email.trim()
  const trimmedAddress = address.trim()
  const requiredReady = Boolean(trimmedName && trimmedPhone)

  const initials = useMemo(() => {
    if (!trimmedName) return 'NC'
    const parts = trimmedName.split(/\s+/).filter(Boolean).slice(0, 2)
    if (parts.length === 0) return 'NC'
    return parts.map((part) => part[0]?.toUpperCase() || '').join('')
  }, [trimmedName])

  const completionItems = [
    { id: 'name', label: 'Customer full name', done: Boolean(trimmedName), required: true },
    { id: 'phone', label: 'Primary phone number', done: Boolean(trimmedPhone), required: true },
    { id: 'email', label: 'Email for invoices/reminders', done: Boolean(trimmedEmail), required: false },
    { id: 'address', label: 'Service address on file', done: Boolean(trimmedAddress), required: false },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!trimmedName || !trimmedPhone) {
        throw new Error('Please fill in all required fields')
      }

      const { error: customerError } = await supabase
        .from('customers')
        .insert({
          business_id: businessId,
          name: trimmedName,
          email: trimmedEmail || null,
          phone: trimmedPhone,
          address: trimmedAddress || null,
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
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className={PANEL_CLASS}>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-text-primary">Customer Profile</h2>
                <p className="mt-1 text-xs text-text-secondary">
                  Add the customer details your team needs for dispatch, invoices, and updates.
                </p>
              </div>
              <span className="rounded-full border border-border bg-bg-secondary px-3 py-1 text-[10px] uppercase tracking-wide text-text-secondary">
                Required fields marked *
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                  Full Name <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`${INPUT_CLASS} pl-9`}
                    placeholder="John Smith"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                  Phone Number <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`${INPUT_CLASS} pl-9`}
                    placeholder="0412 345 678"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`${INPUT_CLASS} pl-9`}
                    placeholder="john@example.com"
                  />
                </div>
                <p className="mt-1 text-[11px] text-text-muted">Used for invoice and reminder delivery.</p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                  Service Address
                </label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={`${INPUT_CLASS} pl-9`}
                    placeholder="123 Collins St, Melbourne VIC 3000"
                  />
                </div>
              </div>
            </div>
          </section>

          {error && (
            <div className="rounded-2xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
              <p className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            </div>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:h-fit">
          <section className={`${PANEL_CLASS} p-4`}>
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Live Preview</h3>
            </div>

            <div className="rounded-2xl border border-border bg-bg-secondary p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-100 text-sm font-semibold text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {trimmedName || 'New customer'}
                  </p>
                  <p className="truncate text-xs text-text-secondary">
                    {trimmedPhone || 'No phone yet'}
                  </p>
                </div>
              </div>

              <dl className="mt-3 space-y-1.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <dt className="text-text-muted">Email</dt>
                  <dd className="truncate text-right text-text-secondary">{trimmedEmail || 'Not set'}</dd>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <dt className="text-text-muted">Address</dt>
                  <dd className="line-clamp-2 text-right text-text-secondary">{trimmedAddress || 'Not set'}</dd>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <dt className="text-text-muted">Customers</dt>
                  <dd className="text-text-secondary">{existingCustomerCount + (trimmedName ? 1 : 0)} total after create</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className={`${PANEL_CLASS} p-4`}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Completion</h3>
            <div className="space-y-2">
              {completionItems.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border px-3 py-2 ${
                    item.done
                      ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                      : item.required
                        ? 'border-rose-200 bg-rose-50/70 dark:border-rose-500/30 dark:bg-rose-500/10'
                        : 'border-amber-200 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10'
                  }`}
                >
                  <p className="flex items-center gap-2 text-xs">
                    {item.done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-text-muted" />
                    )}
                    <span className="text-text-secondary">{item.label}</span>
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className={`${PANEL_CLASS} p-4`}>
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={loading || !requiredReady}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating customer...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Customer
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/customers')}
                className="inline-flex w-full items-center justify-center rounded-2xl border border-border bg-bg-secondary px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
              >
                Cancel
              </button>
              <p className="text-center text-[11px] text-text-muted">
                Name and phone are required before you can save.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </form>
  )
}

