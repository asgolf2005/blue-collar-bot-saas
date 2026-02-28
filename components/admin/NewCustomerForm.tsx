'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, Loader2, Mail, MapPin, Phone, Save, User } from '@/components/ui/lucide'

const INPUT_CLASS =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500'

export default function NewCustomerForm({
  businessId,
  existingCustomerCount = 0,
}: {
  businessId: string
  existingCustomerCount?: number
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!requiredReady) {
        throw new Error('Name and phone are required.')
      }

      const { error: insertError } = await supabase.from('customers').insert({
        business_id: businessId,
        name: trimmedName,
        phone: trimmedPhone,
        email: trimmedEmail || null,
        address: trimmedAddress || null,
      })

      if (insertError) throw insertError

      router.push('/admin/customers')
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Failed to create customer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-4xl">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Customer Details
            </h2>
            <p className="helper-text mt-0.5">Enter required information to create a customer record</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Record {existingCustomerCount + 1}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="customer" className="mb-1.5 flex items-center justify-between font-sans text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>Full Name</span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="customer"
                data-test="customer-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`${INPUT_CLASS} pl-10`}
                placeholder="Customer or company name"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="mb-1.5 flex items-center justify-between font-sans text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>Phone</span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`${INPUT_CLASS} pl-10 font-mono`}
                placeholder="0400 000 000"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block font-sans text-xs font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${INPUT_CLASS} pl-10`}
                placeholder="name@company.com"
              />
            </div>
            <p className="helper-text mt-1.5">Required for customer portal access</p>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="address" className="mb-1.5 block font-sans text-xs font-medium text-slate-700 dark:text-slate-300">
              Service Address
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <textarea
                id="address"
                data-test="address-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={`${INPUT_CLASS} min-h-[80px] resize-y pl-10`}
                placeholder="Street, suburb, state, postcode"
              />
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-rose-300/80 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
            <p className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Link
            href="/admin/customers"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </Link>

          <button
            type="submit"
            data-test="save-customer"
            disabled={loading || !requiredReady}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-cyan-600 dark:hover:bg-cyan-500"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Customer
              </>
            )}
          </button>
        </div>
      </section>
    </form>
  )
}
