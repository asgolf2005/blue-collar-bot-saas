'use client'

import { useState, useMemo } from 'react'
import { Target, DollarSign, TrendingUp, Calendar } from 'lucide-react'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns'

interface Invoice {
  total: number | string
  status: string
  issue_date?: string
  paid_date?: string
  created_at?: string
}

interface JobRevenueProgressProps {
  invoices: Invoice[]
}

type TimePeriod = 'all' | 'today' | 'week' | 'month' | 'quarter'

export default function JobRevenueProgress({ invoices }: JobRevenueProgressProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('all')

  // Filter invoices by selected time period
  const filteredInvoices = useMemo(() => {
    if (selectedPeriod === 'all') return invoices

    const now = new Date()
    let startDate: Date
    let endDate: Date

    switch (selectedPeriod) {
      case 'today':
        startDate = startOfDay(now)
        endDate = endOfDay(now)
        break
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 })
        endDate = endOfWeek(now, { weekStartsOn: 1 })
        break
      case 'month':
        startDate = startOfMonth(now)
        endDate = endOfMonth(now)
        break
      case 'quarter':
        startDate = startOfQuarter(now)
        endDate = endOfQuarter(now)
        break
      default:
        return invoices
    }

    return invoices.filter(invoice => {
      // Use issue_date as the primary date, fall back to created_at
      const dateStr = invoice.issue_date || invoice.created_at
      if (!dateStr) return false

      const invoiceDate = new Date(dateStr)
      return invoiceDate >= startDate && invoiceDate <= endDate
    })
  }, [invoices, selectedPeriod])

  // Calculate revenue from filtered invoices
  const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0)
  const paidRevenue = filteredInvoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0)
  const outstandingRevenue = totalRevenue - paidRevenue
  const totalJobs = filteredInvoices.length
  const paidJobs = filteredInvoices.filter(inv => inv.status === 'paid').length

  const collectionPercentage = totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0

  const periods = [
    { value: 'all' as TimePeriod, label: 'All Time' },
    { value: 'today' as TimePeriod, label: 'Today' },
    { value: 'week' as TimePeriod, label: 'This Week' },
    { value: 'month' as TimePeriod, label: 'This Month' },
    { value: 'quarter' as TimePeriod, label: 'This Quarter' },
  ]

  const getPeriodLabel = () => {
    const period = periods.find(p => p.value === selectedPeriod)
    return period?.label || 'All Time'
  }

  return (
    <div className="glass-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-success/10 border border-success/20">
            <Target className="w-5 h-5 text-success" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ink">Revenue Collection Progress</h3>
            <p className="text-xs text-muted mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              {getPeriodLabel()} • {collectionPercentage}% collected
            </p>
          </div>
        </div>

        {/* Time Period Selector */}
        <div className="flex flex-wrap gap-2">
          {periods.map((period) => (
            <button
              key={period.value}
              onClick={() => setSelectedPeriod(period.value)}
              className={`
                px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200
                ${selectedPeriod === period.value
                  ? 'bg-success/10 text-success ring-2 ring-success/30 shadow-md'
                  : 'text-muted bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-700'
                }
              `}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-success" />
            <span className="font-mono font-semibold text-success">
              ${paidRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-muted">collected</span>
          </div>
          <div className="text-right">
            <span className="text-muted">of</span>
            <span className="ml-2 font-mono font-semibold text-ink">
              ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-4 rounded-full bg-surface-200 overflow-hidden relative">
          <div
            className="h-full rounded-full bg-gradient-to-r from-success to-success/70 transition-all duration-1000 relative"
            style={{
              width: `${collectionPercentage}%`,
              boxShadow: '0 0 20px rgba(46, 125, 107, 0.3)'
            }}
          >
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent shimmer-animation" />
          </div>

          {/* Percentage indicator */}
          {collectionPercentage > 15 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 text-xs font-bold text-white pointer-events-none"
              style={{ left: `${collectionPercentage / 2}%`, transform: 'translate(-50%, -50%)' }}
            >
              {collectionPercentage}%
            </div>
          )}
        </div>

        {/* Outstanding amount highlight */}
        <div className="flex items-center justify-between mt-2 text-xs">
          <div className="flex items-center gap-1.5 text-success">
            <div className="w-2 h-2 rounded-full bg-success"></div>
            <span>{paidJobs} of {totalJobs} jobs paid</span>
          </div>
          <div className="flex items-center gap-1.5 text-warning">
            <div className="w-2 h-2 rounded-full bg-warning"></div>
            <span className="font-semibold">
              ${outstandingRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} outstanding
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Paid */}
        <div className="p-4 rounded-xl bg-success/5 border border-success/20">
          <div className="text-xs text-muted uppercase tracking-wider mb-1">Paid</div>
          <div className="text-xl font-bold font-mono text-success">
            ${paidRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-success/70 mt-1">{paidJobs} invoices</div>
        </div>

        {/* Outstanding */}
        <div className="p-4 rounded-xl bg-warning/5 border border-warning/20">
          <div className="text-xs text-muted uppercase tracking-wider mb-1">Outstanding</div>
          <div className="text-xl font-bold font-mono text-warning">
            ${outstandingRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-warning/70 mt-1">{totalJobs - paidJobs} pending</div>
        </div>

        {/* Average Job Value */}
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="text-xs text-muted uppercase tracking-wider mb-1">Avg Value</div>
          <div className="text-xl font-bold font-mono text-primary">
            ${totalJobs > 0 ? (totalRevenue / totalJobs).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '0'}
          </div>
          <div className="text-xs text-primary/70 mt-1">per job</div>
        </div>
      </div>
    </div>
  )
}
