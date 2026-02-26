'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Loader2,
  TriangleAlert,
  ChevronRight,
  ChevronLeft,
} from '@/components/ui/lucide'
import { createClient } from '@/lib/supabase/client'

export default function NewServicePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 2

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    base_price: '',
    duration_hours: '',
  })

  const parsedValues = useMemo(() => {
    const rawPrice = formData.base_price.trim()
    const rawHours = formData.duration_hours.trim()
    return {
      parsedPrice: rawPrice === '' ? null : Number.parseFloat(rawPrice),
      parsedHours: rawHours === '' ? null : Number.parseFloat(rawHours),
    }
  }, [formData.base_price, formData.duration_hours])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('business_id, role')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) throw new Error('Could not load user profile')
      if (profile.role !== 'admin') throw new Error('Only admins can create services')
      if (!formData.name.trim()) throw new Error('Service name is required')

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

      const { error: insertError } = await supabase.from('services').insert({
        business_id: profile.business_id,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        base_price: parsedValues.parsedPrice,
        duration_minutes:
          parsedValues.parsedHours === null ? null : Math.round(parsedValues.parsedHours * 60),
        is_active: true,
      })

      if (insertError) throw new Error(insertError.message)

      setSuccess(true)
      setTimeout(() => {
        router.push('/admin/services')
        router.refresh()
      }, 700)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create service')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1))

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-32">
      <div className="flex items-center gap-4">
        <Link href="/admin/services">
          <Button variant="ghost" className="rounded-full p-3 hover:bg-white/20 dark:hover:bg-slate-800/50 backdrop-blur-md transition-all">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-indigo-500" />
            Service Architect
          </h1>
          <p className="font-sans text-sm text-slate-600 dark:text-slate-400 mt-1">
            Design and deploy a new service protocol for your dispatch matrix.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-8 relative px-4">
        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-slate-200 dark:bg-slate-800 rounded-full -z-10 overflow-hidden">
          <motion.div
            className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.6)]"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
        {[1, 2].map((step) => (
          <div key={step} className="flex flex-col items-center gap-2 bg-slate-50 dark:bg-[#030712] p-1 rounded-full">
            <motion.div
              className={`w-12 h-12 rounded-full flex items-center justify-center font-mono text-base font-bold border-2 transition-colors duration-300 ${currentStep >= step
                  ? 'bg-indigo-500 border-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                  : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-400'
                }`}
              animate={currentStep === step ? { scale: 1.1 } : { scale: 1 }}
            >
              {currentStep > step ? <CheckCircle2 className="w-6 h-6" /> : step}
            </motion.div>
            <span className={`text-[10px] absolute -bottom-6 font-mono tracking-widest uppercase font-bold whitespace-nowrap ${currentStep >= step ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
              }`}>
              {step === 1 ? 'Definition' : 'Protocol'}
            </span>
          </div>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/50 bg-white/70 dark:bg-slate-900/60 dark:border-white/10 p-8 md:p-12 backdrop-blur-3xl shadow-2xl min-h-[450px]">
        {/* Glow Effects */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />

        <form onSubmit={handleSubmit} className="relative z-10 flex flex-col h-full justify-between gap-8">

          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8 flex-1"
              >
                <div>
                  <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-white mb-2">Service Definition</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Establish the core identity and scope of the new service.</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label
                      htmlFor="name"
                      className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400"
                    >
                      <Briefcase className="h-4 w-4" />
                      Designation Matrix <span className="text-pink-500">*</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. HVAC Diagnostics Level 1"
                      className="w-full rounded-2xl flex-1 border border-slate-200 bg-white/50 px-5 py-4 font-sans text-base text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-100 placeholder:text-slate-400 shadow-inner"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <label
                      htmlFor="description"
                      className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400"
                    >
                      <FileText className="h-4 w-4" />
                      Scope & Parameters
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={4}
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Outline the steps and limits of this service..."
                      className="w-full resize-none rounded-2xl border border-slate-200 bg-white/50 px-5 py-4 font-sans text-base text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-100 placeholder:text-slate-400 shadow-inner"
                    />
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
                className="space-y-8 flex-1"
              >
                <div>
                  <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-white mb-2">Execution Protocol</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Configure pricing vectors and estimated time-to-completion metrics.</p>
                </div>

                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                  <div className="space-y-3 relative group">
                    <label
                      htmlFor="base_price"
                      className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400"
                    >
                      <DollarSign className="h-4 w-4" />
                      Base Exchange Value
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 font-display font-bold text-lg text-emerald-500 group-focus-within:text-emerald-400 transition-colors">
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
                        placeholder="0.00"
                        className="w-full rounded-2xl border border-slate-200 bg-white/50 py-4 pl-10 pr-5 font-mono text-lg font-medium text-slate-900 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-100 placeholder:text-slate-400 shadow-inner"
                      />
                    </div>
                    <span className="absolute right-2 -bottom-6 font-sans text-xs text-slate-500 italic mix-blend-difference">Leave empty for custom quotes</span>
                  </div>

                  <div className="space-y-3 relative group">
                    <label
                      htmlFor="duration_hours"
                      className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-500"
                    >
                      <Clock className="h-4 w-4" />
                      Time Delta Estimate
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
                        placeholder="1.5"
                        className="w-full rounded-2xl border border-slate-200 bg-white/50 px-5 py-4 pr-16 font-mono text-lg font-medium text-slate-900 outline-none transition-all focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-100 placeholder:text-slate-400 shadow-inner"
                      />
                      <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-amber-500 group-focus-within:text-amber-400 transition-colors">
                        HRS
                      </span>
                    </div>
                    <span className="absolute right-2 -bottom-6 font-sans text-xs text-slate-500 italic mix-blend-difference">Empty = variable execution</span>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-6 rounded-2xl border border-red-300 bg-red-50/80 backdrop-blur px-5 py-4 dark:border-red-500/30 dark:bg-red-500/10 shadow-lg"
                  >
                    <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest font-bold text-red-700 dark:text-red-400">
                      <TriangleAlert className="h-5 w-5" />
                      {error}
                    </p>
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-6 rounded-2xl border border-emerald-300 bg-emerald-50/80 backdrop-blur px-5 py-4 dark:border-emerald-500/30 dark:bg-emerald-500/10 shadow-lg"
                  >
                    <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest font-bold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-5 w-5" />
                      Service Matrix Deployed Successfully.
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-8 mt-4 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={currentStep === 1 ? () => router.push('/admin/services') : prevStep}
              className="rounded-full px-6 py-6 border-slate-200 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm font-semibold uppercase tracking-wider"
            >
              {currentStep === 1 ? 'Abort' : <><ChevronLeft className="w-4 h-4 mr-2" /> Back</>}
            </Button>

            {currentStep < 2 ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={!formData.name.trim()}
                className="rounded-full px-8 py-6 bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 text-sm font-bold uppercase tracking-widest flex items-center gap-2"
              >
                Proceed <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={loading || success || !formData.name.trim()}
                className="rounded-full px-8 py-6 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 disabled:opacity-50 text-sm font-bold uppercase tracking-widest min-w-[200px]"
              >
                {loading ? (
                  <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Processing...</>
                ) : (
                  'Deploy Matrix'
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
