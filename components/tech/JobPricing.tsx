'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface JobPricingProps {
  jobId: string
  initialData?: {
    labor_hours?: number
    labor_rate?: number
    parts_cost?: number
    total_cost?: number
  }
}

interface PartItem {
  id: string
  description: string
  cost: number
}

export default function JobPricing({ jobId, initialData }: JobPricingProps) {
  const [laborHours, setLaborHours] = useState(initialData?.labor_hours?.toString() || '')
  const [laborRate, setLaborRate] = useState(initialData?.labor_rate?.toString() || '100')
  const [parts, setParts] = useState<PartItem[]>([])
  const [newPartDesc, setNewPartDesc] = useState('')
  const [newPartCost, setNewPartCost] = useState('')
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (initialData?.parts_cost && initialData.parts_cost > 0) {
      setParts([{ id: '1', description: 'Parts & Materials', cost: initialData.parts_cost }])
    }
  }, [initialData])

  const addPart = () => {
    if (!newPartDesc.trim() || !newPartCost) return

    const newPart: PartItem = {
      id: Date.now().toString(),
      description: newPartDesc,
      cost: parseFloat(newPartCost),
    }

    setParts([...parts, newPart])
    setNewPartDesc('')
    setNewPartCost('')
  }

  const removePart = (id: string) => {
    setParts(parts.filter((p) => p.id !== id))
  }

  const calculateTotal = () => {
    const labor = (parseFloat(laborHours) || 0) * (parseFloat(laborRate) || 0)
    const partsTotal = parts.reduce((sum, part) => sum + part.cost, 0)
    return labor + partsTotal
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const laborCost = (parseFloat(laborHours) || 0) * (parseFloat(laborRate) || 0)
      const partsCost = parts.reduce((sum, part) => sum + part.cost, 0)
      const total = laborCost + partsCost

      const { error } = await supabase
        .from('jobs')
        .update({
          labor_hours: parseFloat(laborHours) || 0,
          labor_rate: parseFloat(laborRate) || 0,
          parts_cost: partsCost,
          total_cost: total,
        })
        .eq('id', jobId)

      if (error) throw error

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error: any) {
      alert('Failed to save pricing: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <details className="group overflow-hidden rounded-[2rem] bg-white/40 shadow-xl ring-1 ring-slate-200/50 backdrop-blur-xl transition-all dark:bg-slate-900/40 dark:ring-slate-800/50">
      <summary className="flex cursor-pointer items-center justify-between p-5 [&::-webkit-details-marker]:hidden">
        <div>
          <p className="font-display-soft text-lg font-bold text-slate-900 dark:text-white">Job Pricing</p>
          <p className="font-sans text-xs text-slate-500 dark:text-slate-400">Labor, Parts & Materials</p>
        </div>
        <div className="rounded-full bg-white/50 p-2 text-slate-500 ring-1 ring-slate-200/50 transition-transform group-open:rotate-180 dark:bg-slate-800/50 dark:text-slate-400 dark:ring-slate-700/50">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </summary>

      <div className="px-5 pb-5">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(circle_at_25%_0%,rgba(34,211,238,0.10),transparent_55%)] dark:opacity-70 dark:[background:radial-gradient(circle_at_25%_0%,rgba(34,211,238,0.12),transparent_55%)]" />

        {/* Labor Section */}
        <div className="relative mb-4 rounded-2xl bg-white/50 p-4 ring-1 ring-slate-200/50 dark:bg-slate-950/20 dark:ring-slate-800/50 shadow-inner">
          <h3 className="mb-3 font-sans text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-white">Labor</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Hours</label>
              <input
                type="number"
                step="0.25"
                value={laborHours}
                onChange={(e) => setLaborHours(e.target.value)}
                placeholder="0.0"
                className="w-full rounded-xl bg-white px-3 py-2.5 font-mono text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
              />
            </div>
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Rate</label>
              <input
                type="number"
                step="1"
                value={laborRate}
                onChange={(e) => setLaborRate(e.target.value)}
                placeholder="100"
                className="w-full rounded-xl bg-white px-3 py-2.5 font-mono text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Labor Subtotal</span>
            <span className="font-mono text-sm font-bold text-slate-900 dark:text-cyan-400">
              ${((parseFloat(laborHours) || 0) * (parseFloat(laborRate) || 0)).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Parts Section */}
        <div className="relative mb-4 rounded-2xl bg-white/50 p-4 ring-1 ring-slate-200/50 dark:bg-slate-950/20 dark:ring-slate-800/50 shadow-inner">
          <h3 className="mb-3 font-sans text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-white">Parts & Materials</h3>

          {/* Add Part Form */}
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={newPartDesc}
              onChange={(e) => setNewPartDesc(e.target.value)}
              placeholder="Filter..."
              className="flex-1 rounded-xl bg-white px-3 py-2 font-mono text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
            />
            <input
              type="number"
              step="0.01"
              value={newPartCost}
              onChange={(e) => setNewPartCost(e.target.value)}
              placeholder="0.00"
              className="w-20 rounded-xl bg-white px-2 py-2 font-mono text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
            />
            <button type="button"
              onClick={addPart}
              className="rounded-xl bg-cyan-500 px-3 py-2 font-bold text-slate-950 transition hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!newPartDesc.trim() || !newPartCost}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Parts List */}
          {parts.length > 0 && (
            <div className="mb-3 space-y-2">
              {parts.map((part) => (
                <div
                  key={part.id}
                  className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 ring-1 ring-slate-200/50 backdrop-blur dark:bg-slate-900/60 dark:ring-slate-700/50"
                >
                  <p className="truncate font-sans text-sm font-semibold text-slate-900 dark:text-slate-100">{part.description}</p>
                  <div className="ml-2 flex flex-shrink-0 items-center gap-3">
                    <span className="font-mono text-sm font-bold text-slate-700 dark:text-cyan-400">
                      ${part.cost.toFixed(2)}
                    </span>
                    <button type="button"
                      onClick={() => removePart(part.id)}
                      className="rounded-full bg-red-500/10 p-1.5 text-red-600 transition hover:bg-red-500/20 dark:text-red-400"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-slate-200/50 pt-3 dark:border-slate-800/50">
            <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Parts Subtotal</span>
            <span className="font-mono text-sm font-bold text-slate-900 dark:text-cyan-400">
              ${parts.reduce((sum, part) => sum + part.cost, 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Total & Save Section */}
        <div className="relative mb-4 flex items-center justify-between rounded-2xl bg-amber-500/10 p-4 ring-1 ring-amber-500/30">
          <span className="font-sans text-sm font-bold uppercase tracking-widest text-amber-900 dark:text-amber-50">Total Value</span>
          <span className="font-mono text-2xl font-black tracking-tight text-amber-700 drop-shadow-sm dark:text-amber-400">
            ${calculateTotal().toFixed(2)}
          </span>
        </div>

        <button type="button"
          onClick={handleSave}
          disabled={saving || !laborHours}
          className="group relative flex w-full h-14 items-center justify-center overflow-hidden rounded-2xl font-display-soft text-lg font-bold text-slate-950 transition-all hover:brightness-110 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
        >
          <span className="absolute inset-0 bg-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-opacity" />
          <span className="absolute inset-0 opacity-50 [background:radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.4),transparent_55%)]" />
          <span className="relative inline-flex items-center justify-center gap-2">{saving ? 'Computing...' : 'Finalize Pricing'}</span>
        </button>

        {showSuccess && (
          <div className="mt-3 flex animate-pulse items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 shadow-[0_0_15px_rgba(52,211,153,0.15)]">
            <p className="font-sans text-sm font-bold tracking-widest text-emerald-800 dark:text-emerald-400">PRICING SYNCED</p>
          </div>
        )}
      </div>
    </details>
  )
}
