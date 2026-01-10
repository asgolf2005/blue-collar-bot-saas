'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DollarSign, Clock, Wrench, Save, Plus, X, CheckCircle } from 'lucide-react'

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
    <div className="bg-surface-50/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-4">
      <div className="flex items-center mb-4">
        <DollarSign className="w-5 h-5 text-muted mr-2" />
        <h2 className="font-semibold text-ink">Job Pricing</h2>
      </div>

      {/* Labor Section */}
      <div className="mb-4 p-4 bg-surface-100 rounded-xl border border-surface-200">
        <h3 className="font-medium text-ink mb-3 flex items-center text-sm">
          <Clock className="w-4 h-4 mr-2 text-muted" />
          Labor
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Hours Worked</label>
            <input
              type="number"
              step="0.25"
              value={laborHours}
              onChange={(e) => setLaborHours(e.target.value)}
              placeholder="0.0"
              className="w-full px-3 py-2 bg-surface-100 border border-surface-200 rounded-lg text-sm text-ink placeholder:text-muted focus:ring-primary/15 focus:border-primary/40 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Rate ($/hr)</label>
            <input
              type="number"
              step="1"
              value={laborRate}
              onChange={(e) => setLaborRate(e.target.value)}
              placeholder="100"
              className="w-full px-3 py-2 bg-surface-100 border border-surface-200 rounded-lg text-sm text-ink placeholder:text-muted focus:ring-primary/15 focus:border-primary/40 transition"
            />
          </div>
        </div>
        <div className="mt-3 text-right">
          <span className="text-sm text-muted">Labor Total: </span>
          <span className="font-semibold text-ink">
            ${((parseFloat(laborHours) || 0) * (parseFloat(laborRate) || 0)).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Parts Section */}
      <div className="mb-4 p-4 bg-surface-100 rounded-xl border border-surface-200">
        <h3 className="font-medium text-ink mb-3 flex items-center text-sm">
          <Wrench className="w-4 h-4 mr-2 text-muted" />
          Parts & Materials
        </h3>

        {/* Add Part Form */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newPartDesc}
            onChange={(e) => setNewPartDesc(e.target.value)}
            placeholder="Part description"
            className="flex-1 px-3 py-2 bg-surface-100 border border-surface-200 rounded-lg text-sm text-ink placeholder:text-muted focus:ring-primary/15 focus:border-primary/40 transition"
          />
          <input
            type="number"
            step="0.01"
            value={newPartCost}
            onChange={(e) => setNewPartCost(e.target.value)}
            placeholder="Cost"
            className="w-24 px-3 py-2 bg-surface-100 border border-surface-200 rounded-lg text-sm text-ink placeholder:text-muted focus:ring-primary/15 focus:border-primary/40 transition"
          />
          <button
            onClick={addPart}
            className="px-3 py-2 bg-primary text-white dark:text-midnight-950 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            disabled={!newPartDesc.trim() || !newPartCost}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Parts List */}
        {parts.length > 0 && (
          <div className="space-y-2 mb-3">
            {parts.map((part) => (
              <div
                key={part.id}
                className="flex items-center justify-between bg-surface-100 p-2 rounded-lg border border-surface-200"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">{part.description}</p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-sm font-medium text-surface-600">
                    ${part.cost.toFixed(2)}
                  </span>
                  <button
                    onClick={() => removePart(part.id)}
                    className="text-danger hover:text-danger/80 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-right">
          <span className="text-sm text-muted">Parts Total: </span>
          <span className="font-semibold text-ink">
            ${parts.reduce((sum, part) => sum + part.cost, 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Total Section */}
      <div className="mb-4 p-4 bg-warning/10 border border-warning/20 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-ink">Total Job Cost:</span>
          <span className="text-2xl font-bold text-warning">
            ${calculateTotal().toFixed(2)}
          </span>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving || !laborHours}
        className="w-full flex items-center justify-center py-3 px-4 bg-primary text-white dark:text-midnight-950 font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        <Save className="w-5 h-5 mr-2" />
        {saving ? 'Saving...' : 'Save Pricing'}
      </button>

      {showSuccess && (
        <div className="mt-3 p-3 bg-success/10 border border-success/20 rounded-xl flex items-center justify-center">
          <CheckCircle className="w-4 h-4 text-success mr-2" />
          <p className="text-sm font-medium text-success">Pricing saved successfully</p>
        </div>
      )}
    </div>
  )
}
