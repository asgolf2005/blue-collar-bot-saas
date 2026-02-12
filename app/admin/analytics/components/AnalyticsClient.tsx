'use client'

import { useState, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  DollarSign, 
  CheckCircle2, 
  TrendingUp,
  Activity,
  Briefcase,
  FileText,
  Filter,
  RefreshCw,
} from 'lucide-react'

import { AnalyticsMetrics, RevenueDataPoint, StatusData, TechnicianData, ServiceData } from '@/lib/analytics/types'
import LiveMetricCard from './LiveMetricCard'
import RevenueChart from './RevenueChart'
import JobsByStatusChart from './JobsByStatusChart'
import TopTechniciansChart from './TopTechniciansChart'
import ServiceBreakdownTable from './ServiceBreakdownTable'

type RangeKey = '7d' | '30d' | '90d' | 'ytd'

interface AnalyticsClientProps {
  initialRange: string
  metrics: AnalyticsMetrics
  revenueData: RevenueDataPoint[]
  statusData: StatusData[]
  technicianData: TechnicianData[]
  serviceData: ServiceData[]
}

const rangeOptions: Array<{ key: RangeKey; label: string; shortLabel: string }> = [
  { key: '7d', label: 'Last 7 days', shortLabel: '7D' },
  { key: '30d', label: 'Last 30 days', shortLabel: '30D' },
  { key: '90d', label: 'Last 90 days', shortLabel: '90D' },
  { key: 'ytd', label: 'Year to date', shortLabel: 'YTD' },
]

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
  statusData,
  technicianData,
  serviceData,
}: AnalyticsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const requestedRange = searchParams.get('range') as RangeKey | null
  const selectedRange = rangeOptions.find(r => r.key === requestedRange) || 
    rangeOptions.find(r => r.key === initialRange) || 
    rangeOptions[1]

  // State
  const [isLoading, setIsLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [selectedTechnician, setSelectedTechnician] = useState<TechnicianData | null>(null)
  const rangeQuery = `range=${selectedRange.key}`
  const formatStatusLabel = (status: string) =>
    status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  
  // Handlers
  const handleRangeChange = (range: RangeKey) => {
    setIsLoading(true)
    const params = new URLSearchParams(searchParams)
    params.set('range', range)
    router.push(`${pathname}?${params.toString()}`)
    setTimeout(() => setIsLoading(false), 500)
  }

  const handleRefresh = () => {
    setIsLoading(true)
    router.refresh()
    setTimeout(() => setIsLoading(false), 500)
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

  const handleStatusClick = (status: string | null) => {
    setStatusFilter(status)
    const params = new URLSearchParams()
    params.set('range', selectedRange.key)
    if (status) {
      params.set('status', status === 'en_route' ? 'on_the_way' : status)
    }
    router.push(`/admin/analytics/jobs?${params.toString()}`)
  }

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
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Range Selector */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full p-1">
            {rangeOptions.map((range) => (
              <button
                key={range.key}
                onClick={() => handleRangeChange(range.key)}
                className={`
                  px-4 py-1.5 rounded-full font-mono text-xs transition-all
                  ${range.key === selectedRange.key
                    ? 'bg-cyan-600 dark:bg-cyan-500 text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }
                `}
              >
                {range.shortLabel}
              </button>
            ))}
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full font-mono text-xs text-slate-700 dark:text-slate-300 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Export
          </button>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="w-9 h-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
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
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Link href={`/admin/analytics/revenue?${rangeQuery}`} className="block">
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
          <Link href={`/admin/analytics/jobs?${rangeQuery}`} className="block">
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
          <Link href={`/admin/analytics/completion?${rangeQuery}`} className="block">
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
          <Link href={`/admin/analytics/revenue?${rangeQuery}`} className="block">
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
      />

      {/* Section 3 & 4: Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jobs by Status */}
        <JobsByStatusChart 
          data={statusData} 
          onSegmentClick={handleStatusClick}
        />
        
        {/* Top Technicians */}
        <TopTechniciansChart 
          data={technicianData} 
          onTechnicianClick={handleTechnicianClick}
        />
      </div>

      {/* Section 5: Service Breakdown */}
      <ServiceBreakdownTable 
        data={serviceData}
        onRowClick={() => router.push(`/admin/services`)}
        onExport={handleServiceExport}
      />

      {/* Status Filter Indicator */}
      {statusFilter && (
        <div className="fixed bottom-4 right-4 bg-cyan-100 dark:bg-cyan-400/20 text-cyan-800 dark:text-cyan-200 px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2 animate-fade-in-up">
          <Filter className="w-4 h-4" />
          Filtered by: {formatStatusLabel(statusFilter)}
          <button 
            onClick={() => handleStatusClick(null)}
            className="ml-2 hover:text-cyan-600"
          >
            x
          </button>
        </div>
      )}

      {/* Technician Detail Modal */}
      {selectedTechnician && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTechnician(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full animate-scale-in"
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
              <button
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

