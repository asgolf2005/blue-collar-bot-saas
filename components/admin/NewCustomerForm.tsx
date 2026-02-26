'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
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

  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 2

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps))
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1))

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full -z-10 overflow-hidden">
          <motion.div
            className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
        {[1, 2].map((step) => (
          <div key={step} className="flex flex-col items-center gap-2">
            <motion.div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-mono text-sm font-bold border-2 transition-colors duration-300 ${currentStep >= step
                  ? 'bg-cyan-500 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-400'
                }`}
              animate={currentStep === step ? { scale: 1.1 } : { scale: 1 }}
            >
              {currentStep > step ? <CheckCircle2 className="w-5 h-5" /> : step}
            </motion.div>
            <span className={`text-[10px] font-mono tracking-widest uppercase font-semibold ${currentStep >= step ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'
              }`}>
              {step === 1 ? 'Identity & Location' : 'Contact Vectors'}
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/50 bg-white/60 dark:bg-slate-900/40 dark:border-white/10 p-6 md:p-8 backdrop-blur-2xl shadow-xl min-h-[400px]">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="mb-6">
                  <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <User className="h-5 w-5 text-cyan-500" /> Identity Matrix
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">Provide the primary name and service location.</p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                      <input
                        id="customer"
                        data-test="customer-input"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-2xl border border-border bg-white/50 px-4 py-4 pl-11 text-sm text-text-primary transition-colors placeholder:text-text-muted focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:bg-slate-900/50 backdrop-blur shadow-sm"
                        placeholder="e.g. Acme Corp or John Doe"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                      Service Address
                    </label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                      <input
                        id="address"
                        data-test="address-input"
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full rounded-2xl border border-border bg-white/50 px-4 py-4 pl-11 text-sm text-text-primary transition-colors placeholder:text-text-muted focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:bg-slate-900/50 backdrop-blur shadow-sm"
                        placeholder="123 Innovation Drive, Tech City"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="mb-6">
                  <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Phone className="h-5 w-5 text-emerald-500" /> Comm Channels
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">Configure contact methods for notifications and billing.</p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                      Primary Phone <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-2xl border border-border bg-white/50 px-4 py-4 pl-11 text-sm text-text-primary transition-colors placeholder:text-text-muted focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:bg-slate-900/50 backdrop-blur shadow-sm font-mono"
                        placeholder="555-0199"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-2xl border border-border bg-white/50 px-4 py-4 pl-11 text-sm text-text-primary transition-colors placeholder:text-text-muted focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:bg-slate-900/50 backdrop-blur shadow-sm font-mono"
                        placeholder="comms@acme.corp"
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 rounded-xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
                    <p className="flex items-center gap-2 font-mono uppercase tracking-wider text-[10px] font-bold">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-8 pt-6 border-t border-slate-200/50 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              className={`px-6 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-semibold transition-all hover:bg-slate-100 dark:hover:bg-slate-800 ${currentStep === 1 ? 'opacity-0 pointer-events-none' : ''}`}
              onClick={prevStep}
            >
              ← Back
            </button>

            {currentStep < 2 ? (
              <button
                type="button"
                className="px-6 py-2 rounded-full bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/30 text-sm font-bold tracking-wide transition-all hover:scale-105"
                onClick={nextStep}
                disabled={!trimmedName}
              >
                Continue →
              </button>
            ) : (
              <button
                type="submit"
                data-test="save-customer"
                disabled={loading || !requiredReady}
                className="inline-flex items-center gap-2 px-8 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/30 font-mono text-sm uppercase tracking-widest font-bold transition-all disabled:opacity-50 hover:scale-105"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Registering...</>
                ) : (
                  <><Save className="h-4 w-4" /> Initialize Client</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Live Preview Aside */}
        <aside className="hidden xl:block space-y-4 xl:sticky xl:top-24 xl:h-fit">
          <motion.section
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-[2rem] border border-slate-200/50 bg-white/40 p-6 shadow-xl backdrop-blur-3xl dark:border-white/10 dark:bg-slate-900/40 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 blur-[40px] rounded-full pointer-events-none" />

            <div className="mb-6 flex items-center gap-2 relative z-10">
              <Users className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
              <h3 className="text-[11px] font-bold font-mono uppercase tracking-[0.2em] text-slate-800 dark:text-slate-200">Live Telemetry</h3>
            </div>

            <div className="relative z-10 flex flex-col items-center mb-6 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 p-[2px] shadow-xl mb-4">
                <div className="w-full h-full bg-white dark:bg-slate-900 rounded-full flex items-center justify-center font-display text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-cyan-600 to-indigo-600 dark:from-cyan-400 dark:to-indigo-400">
                  {initials}
                </div>
              </div>
              <p className="font-display text-xl font-bold text-slate-900 dark:text-white truncate w-full">
                {trimmedName || 'Unidentified'}
              </p>
              <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-500 mt-1 flex items-center gap-1">
                <Circle className="w-2 h-2 fill-emerald-500 animate-pulse" /> Active Draft
              </span>
            </div>

            <dl className="space-y-3 text-sm relative z-10">
              <div className="rounded-xl border border-white/50 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/60 shadow-sm p-3 backdrop-blur-sm">
                <dt className="text-[9px] uppercase font-mono tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" /> COMMS</dt>
                <dd className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">{trimmedPhone || <span className="text-slate-400 opacity-50">Awaiting input...</span>}</dd>
              </div>
              <div className="rounded-xl border border-white/50 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/60 shadow-sm p-3 backdrop-blur-sm">
                <dt className="text-[9px] uppercase font-mono tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" /> NET</dt>
                <dd className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">{trimmedEmail || <span className="text-slate-400 opacity-50">Offline</span>}</dd>
              </div>
              <div className="rounded-xl border border-white/50 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/60 shadow-sm p-3 backdrop-blur-sm">
                <dt className="text-[9px] uppercase font-mono tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> LOC</dt>
                <dd className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 line-clamp-2">{trimmedAddress || <span className="text-slate-400 opacity-50">Grid unassigned</span>}</dd>
              </div>
            </dl>
          </motion.section>
        </aside>
      </div>
    </form>
  )
}

