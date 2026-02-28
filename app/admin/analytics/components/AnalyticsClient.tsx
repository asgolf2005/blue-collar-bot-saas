'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  DollarSign,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Activity,
  Briefcase,
  Download,
  RefreshCw,
  ChevronDown,
} from '@/components/ui/lucide'
import { Button } from '@/components/ui/Button'

import { AnalyticsMetrics, RevenueDataPoint, TechnicianData, ServiceData, OpsHealthData } from '@/lib/analytics/types'
import { ADMIN_RANGE_OPTIONS, type DateRangeKey } from '@/lib/analytics/dateUtils'
import LiveMetricCard from './LiveMetricCard'
import RevenueChart from './RevenueChart'
import TopTechniciansChart from './TopTechniciansChart'
import ServiceBreakdownTable from './ServiceBreakdownTable'

interface AnalyticsClientProps {
  initialRange: DateRangeKey
  metrics: AnalyticsMetrics
  revenueData: RevenueDataPoint[]
  opsHealth: OpsHealthData
  technicianData: TechnicianData[]
  serviceData: ServiceData[]
  dateRangeHint?: string | null
}

// CSV Export helper
function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) return

  const headers = Object.keys(data[0] || {})
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = row[h]
      if (typeof val === 'string' && val.includes(',')) return `"${val}"`
      return val
    }).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

export default function AnalyticsClient({
  initialRange,
  metrics,
  revenueData,
  opsHealth,
  technicianData,
  serviceData,
  dateRangeHint,
}: AnalyticsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const requestedRange = searchParams.get('range') as DateRangeKey | null
  const selectedRange = ADMIN_RANGE_OPTIONS.find(r => r.key === requestedRange) ||
    ADMIN_RANGE_OPTIONS.find(r => r.key === initialRange) ||
    ADMIN_RANGE_OPTIONS[2]

  // State
  const [isPending, startTransition] = useTransition()
  const [selectedTechnician, setSelectedTechnician] = useState<TechnicianData | null>(null)
  const isLoading = isPending
  const rangeQuery = `range=${selectedRange.key}`
  const isForecastView = pathname.includes('/admin/analytics/forecast')

  // Handlers
  const handleRefresh = () => {
    startTransition(() => {
      router.refresh()
    })
  }

  const handleExport = () => {
    const exportData = revenueData.map(d => ({
      date: d.date,
      revenue: d.revenue,
      jobs: d.jobs,
      hours: d.hours,
    }))
    exportToCSV(exportData, `analytics-${selectedRange.key}-${new Date().toISOString().split('T')[0]}.csv`)
  }

  const handleServiceExport = () => {
    exportToCSV(serviceData, `services-${new Date().toISOString().split('T')[0]}.csv`)
  }

  const handleDataPointClick = useCallback((data: RevenueDataPoint) => {
    // Navigate to revenue detail page with date filter
    const params = new URLSearchParams()
    params.set('date', data.date)
    params.set('range', selectedRange.key)
    router.push(`/admin/analytics/revenue?${params.toString()}`)
  }, [router, selectedRange.key])

  const handleTechnicianClick = (tech: TechnicianData) => {
    setSelectedTechnician(selectedTechnician?.id === tech.id ? null : tech)
  }

  // Current date for header
  const sysTime = new Date().toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).toUpperCase().replace(/,/g, '')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl sm:text-6xl text-slate-900 dark:text-white tracking-wide">
            ANALYTICS
          </h1>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1 tracking-widest">
            Performance Overview - SYS.TIME: {sysTime}
          </p>
          <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
            <Link
              href={`/admin/analytics?${rangeQuery}`}
              className={`rounded-full px-3 py-1.5 font-mono text-xs transition-colors ${!isForecastView
                  ? 'bg-slate-800 text-white dark:bg-slate-700'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              Overview
            </Link>
            <Link
              href={`/admin/analytics/forecast?${rangeQuery}`}
              className={`rounded-full px-3 py-1.5 font-mono text-xs transition-colors ${isForecastView
                  ? 'bg-slate-800 text-white dark:bg-slate-700'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              Forecast
            </Link>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            {/* Range Selector - Standard Pattern */}
            <details className="relative group/range z-20">
              <summary
                title="Select report period"
                aria-label="Select report period"
                className="list-none cursor-pointer inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl px-4 py-2.5 shadow-lg shadow-slate-200/20 dark:shadow-cyan-500/10 transition-colors hover:border-cyan-400/40"
              >
                <span className="font-sans text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Period
                </span>
                <span className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-slate-800 dark:text-cyan-200">
                  {selectedRange.label}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-500 dark:text-cyan-300 transition-transform duration-300 group-open/range:rotate-180" />
              </summary>
              <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl p-1.5 shadow-xl shadow-slate-200/30 dark:shadow-cyan-500/10">
                {ADMIN_RANGE_OPTIONS.map((range) => {
                  const active = range.key === selectedRange.key
                  const params = new URLSearchParams(searchParams)
                  params.set('range', range.key)
                  return (
                    <Link
                      key={range.key}
                      href={`${pathname}?${params.toString()}`}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 font-sans text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-slate-800 text-white dark:bg-slate-700'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{range.label}</span>
                      {active ? <span className="font-mono text-[9px] uppercase tracking-widest">Current</span> : null}
                    </Link>
                  )
                })}
              </div>
            </details>

            {/* Export Button */}
            <Button
              onClick={handleExport}
              variant="secondary"
              size="md"
              icon={<Download className="w-4 h-4" />}
            >
              Export
            </Button>

            {/* Refresh Button */}
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              variant="ghost"
              size="md"
              icon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Section 1: Live Metrics */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-emerald-500" />
          <h2 className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Key Metrics
          </h2>
          <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Live Data
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
          <Link href={`/admin/analytics/revenue?${rangeQuery}`} className="block h-full">
            <LiveMetricCard
              label="Revenue"
              value={`$${metrics.revenue.toLocaleString()}`}
              change={metrics.revenueChange}
              changeLabel="vs last period"
              icon={DollarSign}
              color="emerald"
              delay={0}
            />
          </Link>
          <Link href={`/admin/analytics/jobs?${rangeQuery}`} className="block h-full">
            <LiveMetricCard
              label="Jobs"
              value={metrics.jobs}
              change={metrics.jobsChange}
              changeLabel="vs last period"
              icon={Briefcase}
              color="cyan"
              delay={100}
            />
          </Link>
          <Link href={`/admin/analytics/completion?${rangeQuery}`} className="block h-full">
            <LiveMetricCard
              label="Completion"
              value={`${metrics.completionRate}%`}
              change={metrics.completionChange}
              changeLabel="vs last period"
              icon={CheckCircle2}
              color="blue"
              delay={200}
            />
          </Link>
          <Link href={`/admin/analytics/revenue?${rangeQuery}`} className="block h-full">
            <LiveMetricCard
              label="Avg Ticket"
              value={`$${metrics.avgTicket}`}
              change={metrics.ticketChange}
              changeLabel="vs last period"
              icon={TrendingUp}
              color="purple"
              delay={300}
            />
          </Link>
        </div>
      </div>

      {/* Section 2: Revenue Chart */}
      <RevenueChart
        data={revenueData}
        onDataPointClick={handleDataPointClick}
        dateRangeHint={dateRangeHint}
      />

      {/* Section 3: Capacity + On-Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="admin-card p-6 flex flex-col justify-between hover:shadow-lg transition-shadow duration-300">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg tracking-widest text-slate-900 dark:text-white uppercase flex items-center gap-3">
                <div className="w-1.5 h-5 rounded-full bg-cyan-500" />
                Capacity & Utilization
              </h2>
              <Briefcase className="w-5 h-5 text-cyan-500 opacity-80" />
            </div>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {opsHealth.activeTechnicians} Active Techs • {opsHealth.capacityHours.toFixed(0)} Hrs Base Capacity
            </p>
          </div>

          <div className="mt-8">
            <div className="flex items-end gap-3 mb-3">
              <span className="font-display text-5xl font-bold text-slate-900 dark:text-white tracking-tight">
                {opsHealth.capacityUtilizationPct.toFixed(0)}%
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-bold">
                Utilized
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${opsHealth.capacityUtilizationPct > 90 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]'}`}
                style={{ width: `${Math.max(0, Math.min(100, opsHealth.capacityUtilizationPct))}%` }}
              />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-6 pt-5 border-t border-slate-100 dark:border-white/5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500 font-bold">Demand</p>
              <p className="font-display text-2xl font-semibold text-slate-900 dark:text-white mt-1">
                {opsHealth.demandJobs} <span className="text-xs font-sans font-normal text-slate-400">jobs</span>
              </p>
              <p className="text-[10px] font-sans text-slate-400 mt-0.5">{opsHealth.scheduledHours.toFixed(0)} total hrs</p>
            </div>
            <div className="pl-6 border-l border-slate-100 dark:border-white/5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-500 font-bold">Unassigned</p>
              <p className="font-display text-2xl font-semibold text-amber-600 dark:text-amber-400 mt-1">
                {opsHealth.unassignedJobs} <span className="text-xs font-sans font-normal text-amber-600/60 dark:text-amber-400/60">jobs</span>
              </p>
            </div>
          </div>
        </div>

        <div className="admin-card p-6 flex flex-col justify-between hover:shadow-lg transition-shadow duration-300">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg tracking-widest text-slate-900 dark:text-white uppercase flex items-center gap-3">
                <div className="w-1.5 h-5 rounded-full bg-emerald-500" />
                On-Time Performance
              </h2>
              <CheckCircle2 className="w-5 h-5 text-emerald-500 opacity-80" />
            </div>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Schedule adherence for {opsHealth.activeWindowJobs} active pipeline jobs
            </p>
          </div>

          <div className="mt-8">
            <div className="flex items-end gap-3 mb-3">
              <span className="font-display text-5xl font-bold text-slate-900 dark:text-white tracking-tight">
                {opsHealth.onTimeRate.toFixed(0)}%
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-bold">
                On Track
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden shadow-inner flex">
              <div
                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-1000"
                style={{ width: `${Math.max(0, Math.min(100, opsHealth.onTimeRate))}%` }}
              />
              <div
                className="h-full bg-amber-500 transition-all duration-1000"
                style={{ width: `${Math.max(0, Math.min(100, (opsHealth.lateStartJobs / Math.max(1, opsHealth.activeWindowJobs)) * 100))}%` }}
              />
              <div
                className="h-full bg-rose-500 transition-all duration-1000"
                style={{ width: `${Math.max(0, Math.min(100, (opsHealth.overdueInProgressJobs / Math.max(1, opsHealth.activeWindowJobs)) * 100))}%` }}
              />
            </div>
          </div>

          <div className="mt-8 flex divide-x divide-slate-100 dark:divide-white/5 pt-5 border-t border-slate-100 dark:border-white/5">
            <div className="flex-1 pr-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-500 font-bold">On Track</p>
              <p className="font-display text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">{Math.max(0, opsHealth.activeWindowJobs - opsHealth.lateStartJobs - opsHealth.overdueInProgressJobs)}</p>
            </div>
            <div className="flex-1 px-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-500 font-bold">Late Start</p>
              <p className="font-display text-2xl font-semibold text-amber-600 dark:text-amber-400 mt-1">{opsHealth.lateStartJobs}</p>
            </div>
            <div className="flex-1 pl-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-rose-600 dark:text-rose-500 font-bold">Overdue</p>
              <p className="font-display text-2xl font-semibold text-rose-600 dark:text-rose-400 mt-1">{opsHealth.overdueInProgressJobs}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Technician Performance */}
      <TopTechniciansChart
        data={technicianData}
        onTechnicianClick={handleTechnicianClick}
      />

      {/* Section 5: Service Breakdown */}
      <ServiceBreakdownTable
        data={serviceData}
        onRowClick={() => router.push(`/admin/services`)}
        onExport={handleServiceExport}
      />

      {/* Technician Detail Modal */}
      {selectedTechnician && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTechnician(null)}
        >
          <div
            className="admin-card p-6 max-w-md w-full animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-mono text-xl font-bold">
                {selectedTechnician.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h3 className="font-display text-2xl text-slate-900 dark:text-white">{selectedTechnician.name}</h3>
                <p className="font-mono text-sm text-slate-500 dark:text-slate-400">
                  {selectedTechnician.completedJobs}/{selectedTechnician.totalJobs} jobs completed
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center">
                <p className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase">Completed Jobs</p>
                <p className="font-display text-2xl text-cyan-600 dark:text-cyan-400">{selectedTechnician.jobs}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center">
                <p className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase">Revenue</p>
                <p className="font-display text-2xl text-emerald-600 dark:text-emerald-400">
                  ${(selectedTechnician.revenue / 1000).toFixed(1)}k
                </p>
              </div>
            </div>

            <div className="mb-4">
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase mb-2">Completion Rate</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full transition-all"
                    style={{
                      width: `${selectedTechnician.totalJobs > 0
                        ? (selectedTechnician.completedJobs / selectedTechnician.totalJobs) * 100
                        : 0}%`
                    }}
                  />
                </div>
                <span className="font-mono text-sm font-medium text-slate-700 dark:text-slate-300">
                  {selectedTechnician.totalJobs > 0
                    ? Math.round((selectedTechnician.completedJobs / selectedTechnician.totalJobs) * 100)
                    : 0}%
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                href={`/admin/jobs?view=all&timing=all&technician=${selectedTechnician.id}`}
                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-mono text-sm transition-colors text-center"
              >
                View Jobs
              </Link>
              <button type="button"
                onClick={() => setSelectedTechnician(null)}
                className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-mono text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
