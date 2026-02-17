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
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(circle_at_25%_0%,rgba(34,211,238,0.10),transparent_55%)] dark:opacity-70 dark:[background:radial-gradient(circle_at_25%_0%,rgba(34,211,238,0.12),transparent_55%)]" />
      <div className="relative mb-4">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Job Pricing</h2>
      </div>

      {/* Labor Section */}
      <div className="relative mb-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/40">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Labor</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Hours Worked</label>
            <input
              type="number"
              step="0.25"
              value={laborHours}
              onChange={(e) => setLaborHours(e.target.value)}
              placeholder="0.0"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-cyan-500/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Rate ($/hr)</label>
            <input
              type="number"
              step="1"
              value={laborRate}
              onChange={(e) => setLaborRate(e.target.value)}
              placeholder="100"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-cyan-500/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
        <div className="mt-3 text-right">
          <span className="text-sm text-slate-600 dark:text-slate-300">Labor Total: </span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            ${((parseFloat(laborHours) || 0) * (parseFloat(laborRate) || 0)).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Parts Section */}
      <div className="relative mb-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/40">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Parts & Materials</h3>

        {/* Add Part Form */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newPartDesc}
            onChange={(e) => setNewPartDesc(e.target.value)}
            placeholder="Part description"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-cyan-500/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <input
            type="number"
            step="0.01"
            value={newPartCost}
            onChange={(e) => setNewPartCost(e.target.value)}
            placeholder="Cost"
            className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-cyan-500/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <button type="button"
            onClick={addPart}
            className="rounded-xl bg-cyan-600 px-3 py-2 text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
            disabled={!newPartDesc.trim() || !newPartCost}
          >
            Add
          </button>
        </div>

        {/* Parts List */}
        {parts.length > 0 && (
          <div className="space-y-2 mb-3">
            {parts.map((part) => (
              <div
                key={part.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 p-2 backdrop-blur dark:border-slate-700 dark:bg-slate-900/40"
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm text-slate-900 dark:text-slate-100">{part.description}</p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    ${part.cost.toFixed(2)}
                  </span>
                  <button type="button"
                    onClick={() => removePart(part.id)}
                    className="text-red-600 transition hover:text-red-700 dark:text-red-300 dark:hover:text-red-200"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-right">
          <span className="text-sm text-slate-600 dark:text-slate-300">Parts Total: </span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            ${parts.reduce((sum, part) => sum + part.cost, 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Total Section */}
      <div className="relative mb-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-400/25 dark:bg-amber-400/10">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">Total Job Cost:</span>
          <span className="text-2xl font-bold text-amber-700 dark:text-amber-200">
            ${calculateTotal().toFixed(2)}
          </span>
        </div>
      </div>

      {/* Save Button */}
      <button type="button"
        onClick={handleSave}
        disabled={saving || !laborHours}
        className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl px-4 py-3 font-semibold text-white transition-opacity hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 opacity-90 transition-opacity group-hover:opacity-100 dark:from-cyan-500 dark:to-blue-500" />
        <span className="absolute inset-0 opacity-50 [background:radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.35),transparent_55%)]" />
        <span className="relative inline-flex items-center justify-center gap-2">{saving ? 'Saving...' : 'Save Pricing'}</span>
      </button>

      {showSuccess && (
        <div className="mt-3 flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-400/25 dark:bg-emerald-400/10">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Pricing saved</p>
        </div>
      )}
    </div>
  )
}
