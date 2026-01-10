'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Briefcase, Plus, Download, Zap } from 'lucide-react'
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  subWeeks,
  subDays,
  subMonths,
  subQuarters,
} from 'date-fns'
import JobMetricCards from '@/components/admin/JobMetricCards'
import JobFilters, { FilterState } from '@/components/admin/JobFilters'
import JobRevenueProgress from '@/components/admin/JobRevenueProgress'
import PremiumJobsTable from '@/components/admin/PremiumJobsTable'
import { MeshBackground } from '@/components/ui/effects'
import { useRealtimeJobsWithRelations } from '@/hooks/useRealtimeJobsWithRelations'
import KeyboardShortcutsCard from '@/components/ui/KeyboardShortcutsCard'
import TechLocationMap from '@/components/admin/TechLocationMap'
import Pagination from '@/components/ui/Pagination'
import type { JobWithDetails } from '@/lib/types'

const ACTIVE_STATUSES = new Set(['in_progress', 'on_the_way', 'arrived'])
const WEEK_STARTS_ON = 1

type JobStats = {
  totalJobs: number
  completedJobs: number
  inProgressJobs: number
  scheduledJobs: number
  completionRate: number
  thisWeekJobs: number
  lastWeekJobs: number
}

type JobTrends = {
  totalJobs: number | null
  activeJobs: number | null
  scheduledJobs: number | null
  completionRate: number | null
}

type TimeRangeKey = 'today' | 'week' | 'month' | 'quarter' | 'all'

const TIME_RANGE_LABELS: Record<TimeRangeKey, string> = {
  today: 'today',
  week: 'this week',
  month: 'this month',
  quarter: 'this quarter',
  all: 'all time',
}

const getWeekBounds = (reference: Date) => {
  const weekOptions = { weekStartsOn: WEEK_STARTS_ON as 0 | 1 | 2 | 3 | 4 | 5 | 6 }
  const startOfWeekRange = startOfWeek(reference, weekOptions)
  const endOfWeekRange = endOfWeek(reference, weekOptions)
  const startOfLastWeek = subWeeks(startOfWeekRange, 1)
  const endOfLastWeek = endOfWeek(startOfLastWeek, weekOptions)

  return {
    startOfWeek: startOfWeekRange,
    endOfWeek: endOfWeekRange,
    startOfLastWeek,
    endOfLastWeek,
  }
}

const filterByRange = (
  jobs: JobWithDetails[],
  range?: { start: Date | null; end: Date | null }
) => {
  if (!range || !range.start || !range.end) return jobs
  return jobs.filter(job => {
    if (!job.scheduled_start) return false
    const date = new Date(job.scheduled_start)
    if (Number.isNaN(date.getTime())) return false
    return date >= range.start! && date <= range.end!
  })
}

const calculateJobMetrics = (
  jobs: JobWithDetails[],
  currentRange?: { start: Date | null; end: Date | null },
  previousRange?: { start: Date | null; end: Date | null }
): { stats: JobStats; trends: JobTrends } => {
  const currentJobs = filterByRange(jobs, currentRange)
  const previousJobs = previousRange ? filterByRange(jobs, previousRange) : []

  const totalJobs = currentJobs.length

  let completedJobs = 0
  let inProgressJobs = 0
  let scheduledJobs = 0

  let thisPeriodJobs = currentJobs.length
  let lastPeriodJobs = previousJobs.length
  let thisPeriodActive = 0
  let lastPeriodActive = 0
  let thisPeriodScheduled = 0
  let lastPeriodScheduled = 0
  let thisPeriodCompleted = 0
  let lastPeriodCompleted = 0

  for (const job of currentJobs) {
    if (job.status === 'completed') {
      completedJobs += 1
      thisPeriodCompleted += 1
    }

    if (ACTIVE_STATUSES.has(job.status)) {
      inProgressJobs += 1
      thisPeriodActive += 1
    }

    if (job.status === 'scheduled') {
      scheduledJobs += 1
      thisPeriodScheduled += 1
    }
  }

  // Previous period aggregates for trends
  for (const job of previousJobs) {
    if (ACTIVE_STATUSES.has(job.status)) {
      lastPeriodActive += 1
    }
    if (job.status === 'scheduled') {
      lastPeriodScheduled += 1
    }
    if (job.status === 'completed') {
      lastPeriodCompleted += 1
    }
  }

  const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0
  const thisPeriodCompletionRate = thisPeriodJobs > 0 ? Math.round((thisPeriodCompleted / thisPeriodJobs) * 100) : 0
  const lastPeriodCompletionRate = lastPeriodJobs > 0 ? Math.round((lastPeriodCompleted / lastPeriodJobs) * 100) : 0

  const calcTrend = (current: number, previous: number) => {
    if (previous === 0) {
      return null
    }
    return Number((((current - previous) / previous) * 100).toFixed(1))
  }

  return {
    stats: {
      totalJobs,
      completedJobs,
      inProgressJobs,
      scheduledJobs,
      completionRate,
      thisWeekJobs: thisPeriodJobs,
      lastWeekJobs: lastPeriodJobs,
    },
    trends: {
      totalJobs: calcTrend(thisPeriodJobs, lastPeriodJobs),
      activeJobs: calcTrend(thisPeriodActive, lastPeriodActive),
      scheduledJobs: calcTrend(thisPeriodScheduled, lastPeriodScheduled),
      completionRate: calcTrend(thisPeriodCompletionRate, lastPeriodCompletionRate),
    },
  }
}

const getServiceLabel = (job: JobWithDetails) => {
  const names = job.services
    ?.map((item) => item.service?.name)
    .filter((name): name is string => Boolean(name))

  return names && names.length > 0 ? names.join(', ') : ''
}

interface Invoice {
  total: number | string
  status: string
  issue_date?: string
  paid_date?: string
  created_at?: string
}

interface PremiumDashboardClientProps {
  jobs: JobWithDetails[]
  invoices?: Invoice[]
  businessId: string
}

const ITEMS_PER_PAGE = 20

export default function PremiumDashboardClient({ jobs: initialJobs, invoices = [], businessId }: PremiumDashboardClientProps) {
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    search: '',
    technician: 'all',
    dateRange: 'all',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('week')

  // Real-time subscription for jobs
  const { jobs, isConnected } = useRealtimeJobsWithRelations({
    businessId,
    initialJobs,
  })

  const rangeDefinition = useMemo(() => {
    const now = new Date()
    const weekOptions = { weekStartsOn: WEEK_STARTS_ON as 0 | 1 | 2 | 3 | 4 | 5 | 6 }

    const ranges: Record<TimeRangeKey, { current: { start: Date | null; end: Date | null }; previous?: { start: Date | null; end: Date | null } }> = {
      today: {
        current: { start: startOfDay(now), end: endOfDay(now) },
        previous: { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) },
      },
      week: {
        current: { start: startOfWeek(now, weekOptions), end: endOfWeek(now, weekOptions) },
        previous: { start: startOfWeek(subWeeks(now, 1), weekOptions), end: endOfWeek(subWeeks(now, 1), weekOptions) },
      },
      month: {
        current: { start: startOfMonth(now), end: endOfMonth(now) },
        previous: { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) },
      },
      quarter: {
        current: { start: startOfQuarter(now), end: endOfQuarter(now) },
        previous: { start: startOfQuarter(subQuarters(now, 1)), end: endOfQuarter(subQuarters(now, 1)) },
      },
      all: {
        current: { start: null, end: null },
        previous: undefined,
      },
    }

    return ranges[timeRange]
  }, [timeRange])

  const { stats, trends } = useMemo(
    () => calculateJobMetrics(jobs, rangeDefinition.current, rangeDefinition.previous),
    [jobs, rangeDefinition]
  )

  // Extract unique technicians from jobs
  const technicians = useMemo(() => {
    const techMap = new Map()
    jobs.forEach(job => {
      if (job.technician) {
        techMap.set(job.technician.id, job.technician)
      }
    })
    return Array.from(techMap.values())
  }, [jobs])

  // Apply filters
  const filteredJobs = useMemo(() => {
    const now = new Date()
    const weekOptions = { weekStartsOn: WEEK_STARTS_ON as 0 | 1 | 2 | 3 | 4 | 5 | 6 }
    const dateRanges = {
      today: { start: startOfDay(now), end: endOfDay(now) },
      week: { start: startOfWeek(now, weekOptions), end: endOfWeek(now, weekOptions) },
      month: { start: startOfMonth(now), end: endOfMonth(now) },
      quarter: { start: startOfQuarter(now), end: endOfQuarter(now) },
    }
    const activeRange =
      filters.dateRange !== 'all'
        ? dateRanges[filters.dateRange as keyof typeof dateRanges]
        : null

    return jobs.filter(job => {
      // Status filter
      if (filters.status !== 'all') {
        // Handle active status (includes in_progress, on_the_way, arrived)
        if (filters.status === 'in_progress') {
          if (!['in_progress', 'on_the_way', 'arrived'].includes(job.status)) {
            return false
          }
        } else if (job.status !== filters.status) {
          return false
        }
      }

      // Search filter
      const searchValue = filters.search.trim().toLowerCase()
      if (searchValue) {
        // Only show upcoming/active jobs when searching
        if (!['scheduled', 'in_progress', 'on_the_way', 'arrived'].includes(job.status)) {
          return false
        }

        const tokens = searchValue.split(/\s+/).filter(Boolean)

        const combined = [
          job.customer?.name,
          job.customer?.phone,
          job.customer?.email,
          job.customer?.address,
          getServiceLabel(job),
          job.technician?.full_name,
          job.technician?.email,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        const allTokensPresent = tokens.every(token => combined.includes(token))
        if (!allTokensPresent) return false
      }

      // Technician filter
      if (filters.technician !== 'all' && job.technician?.id !== filters.technician) {
        return false
      }

      // Date range filter
      if (activeRange) {
        if (!job.scheduled_start) return false
        const jobDate = new Date(job.scheduled_start)
        if (Number.isNaN(jobDate.getTime())) return false
        if (jobDate < activeRange.start || jobDate > activeRange.end) return false
      }

      return true
    })
  }, [jobs, filters])

  // Reset to page 1 when filters change
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }

  // Calculate pagination
  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE)
  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredJobs.slice(startIndex, endIndex)
  }, [filteredJobs, currentPage])

  const handleExport = () => {
    // Convert filtered jobs to CSV
    const headers = ['Customer', 'Service', 'Technician', 'Scheduled', 'Status', 'Amount']
    const rows = filteredJobs.map(job => [
      job.customer?.name || '',
      job.description || getServiceLabel(job) || '',
      job.technician?.full_name || 'Unassigned',
      job.scheduled_start || '',
      job.status,
      job.total_cost ? `$${job.total_cost.toFixed(2)}` : ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jobs-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <>
      <MeshBackground variant="default" />

      <div className="space-y-8 animate-fade-in relative">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-ink dark:text-white tracking-tight">Job Management</h1>
              <span className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                isConnected
                  ? 'bg-success/10 text-success border border-success/20'
                  : 'bg-surface-100 dark:bg-surface-800 text-muted dark:text-gray-400 border border-surface-200 dark:border-surface-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-success animate-pulse' : 'bg-muted'
                }`} />
                {isConnected ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
            <p className="text-muted dark:text-gray-400">Real-time operations dashboard for all service jobs</p>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-ink dark:text-white bg-white dark:bg-slate-800/80 border border-surface-200 dark:border-slate-600 shadow-sm hover:border-primary/40 hover:text-primary dark:hover:text-primary transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <Link
              href="/admin/jobs/new"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-colors shadow-md flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Job
            </Link>
          </div>
        </div>

        {/* Metric Cards and Keyboard Shortcuts */}
        <div className="space-y-4">
          <JobMetricCards
            stats={stats}
            trends={trends}
            periodLabel={TIME_RANGE_LABELS[timeRange]}
          />
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {(['today', 'week', 'month', 'quarter', 'all'] as TimeRangeKey[]).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                    timeRange === range
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white dark:bg-slate-800 text-ink dark:text-gray-200 border-surface-200 dark:border-slate-700 hover:border-primary/40'
                  }`}
                >
                  {TIME_RANGE_LABELS[range].replace('this ', '').replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
            </div>
            <div className="w-full md:w-auto">
              <KeyboardShortcutsCard role="admin" defaultExpanded={false} compact />
            </div>
          </div>
        </div>

        {/* Revenue Progress (if invoice data available) */}
        {invoices.length > 0 && (
          <JobRevenueProgress invoices={invoices} />
        )}

        {/* Live Technician Tracking Map */}
        <TechLocationMap />

        {/* Filters & Jobs Table - Combined */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-surface-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Filters Section */}
          <div className="p-6 bg-slate-50 dark:bg-slate-800 border-b border-surface-200 dark:border-slate-700">
            <JobFilters
              onFilterChange={handleFilterChange}
              technicians={technicians}
              totalCount={jobs.length}
              filteredCount={filteredJobs.length}
            />
          </div>

          {/* Table Header */}
          <div className="px-6 py-4 bg-slate-100 dark:bg-slate-900 border-b border-surface-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-ink dark:text-white">
                    All Jobs
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-primary/10 dark:bg-primary/20 text-primary border border-primary/20 dark:border-primary/30">
                    {filteredJobs.length}
                  </span>
                  {filteredJobs.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-success/10 dark:bg-success/20 border border-success/20 dark:border-success/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                      <span className="text-xs font-medium text-success">Live</span>
                    </div>
                  )}
                </div>
                <p className="text-muted dark:text-gray-300 text-sm mt-1">
                  {filteredJobs.length === jobs.length
                    ? `Showing all ${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'}`
                    : `${filteredJobs.length} of ${jobs.length} jobs`
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Jobs Table */}
          <div className="bg-white dark:bg-slate-800">
            <PremiumJobsTable jobs={paginatedJobs} />
          </div>

          {/* Pagination */}
          {filteredJobs.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredJobs.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          )}
        </div>
      </div>
    </>
  )
}
