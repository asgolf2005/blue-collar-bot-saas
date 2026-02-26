/**
 * Analytics Calculation Utilities
 * Pure functions for calculating metrics from database data
 */

import { 
  InvoiceWithRelations, 
  JobWithRelations, 
  RevenueDataPoint,
  StatusData,
  TechnicianData,
  ServiceData,
  AnalyticsMetrics,
  ForecastData,
} from './types'
import { formatDisplayDate, formatSQLDate, generateDateRange, DateRange } from './dateUtils'

// ============================================================================
// COLOR CONSTANTS
// ============================================================================

const STATUS_COLORS: Record<string, string> = {
  completed: '#22c55e',
  scheduled: '#06b6d4',
  on_the_way: '#f59e0b',
  arrived: '#f97316',
  in_progress: '#8b5cf6',
  cancelled: '#94a3b8',
  pending: '#6366f1',
}

// ============================================================================
// REVENUE CALCULATIONS
// ============================================================================

/**
 * Calculate total paid revenue from invoices
 */
export function calculatePaidRevenue(invoices: InvoiceWithRelations[]): number {
  return invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + (inv.total || 0), 0)
}

/**
 * Calculate outstanding revenue (sent + overdue invoices)
 */
export function calculateOutstandingRevenue(invoices: InvoiceWithRelations[]): number {
  return invoices
    .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + (inv.total || 0), 0)
}

/**
 * Calculate average ticket from paid invoices
 */
export function calculateAverageTicket(invoices: InvoiceWithRelations[]): number {
  const paidInvoices = invoices.filter(inv => inv.status === 'paid')
  if (paidInvoices.length === 0) return 0
  return Math.round(calculatePaidRevenue(paidInvoices) / paidInvoices.length)
}

// ============================================================================
// JOB CALCULATIONS
// ============================================================================

/**
 * Calculate job counts by status
 */
export function calculateStatusData(jobs: JobWithRelations[]): StatusData[] {
  const counts = new Map<string, number>()
  
  jobs.forEach(job => {
    const status = job.status || 'unknown'
    counts.set(status, (counts.get(status) || 0) + 1)
  })
  
  return Array.from(counts.entries())
    .map(([status, count]) => ({
      status,
      count,
      color: STATUS_COLORS[status] || '#94a3b8'
    }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Calculate completion rate
 */
export function calculateCompletionRate(jobs: JobWithRelations[]): number {
  if (jobs.length === 0) return 0
  const completed = jobs.filter(j => j.status === 'completed').length
  return Math.round((completed / jobs.length) * 100)
}

// ============================================================================
// TECHNICIAN CALCULATIONS
// ============================================================================

/**
 * Calculate technician performance metrics
 * Uses job data (not invoices) since jobs are assigned to technicians
 */
export function calculateTechnicianData(
  jobs: JobWithRelations[],
  invoices: InvoiceWithRelations[]
): TechnicianData[] {
  const techMap = new Map<string, {
    name: string
    completedJobs: number
    totalJobs: number
    revenue: number
  }>()
  
  // Build map of job ID to invoice total for completed jobs
  const jobRevenueMap = new Map<string, number>()
  invoices
    .filter(inv => inv.status === 'paid' && inv.job?.id)
    .forEach(inv => {
      if (inv.job?.id) {
        jobRevenueMap.set(inv.job.id, inv.total || 0)
      }
    })
  
  // Aggregate by technician
  jobs.forEach(job => {
    if (!job.technician) return
    
    const techId = job.technician.id
    const techName = job.technician.full_name || 'Unknown'
    
    if (!techMap.has(techId)) {
      techMap.set(techId, {
        name: techName,
        completedJobs: 0,
        totalJobs: 0,
        revenue: 0
      })
    }
    
    const tech = techMap.get(techId)!
    tech.totalJobs++
    
    if (job.status === 'completed') {
      tech.completedJobs++
      // Add revenue from associated paid invoice
      const revenue = jobRevenueMap.get(job.id) || 0
      tech.revenue += revenue
    }
  })
  
  return Array.from(techMap.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      jobs: data.completedJobs,
      revenue: Math.round(data.revenue),
      completedJobs: data.completedJobs,
      totalJobs: data.totalJobs
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
}

// ============================================================================
// SERVICE CALCULATIONS
// ============================================================================

const SERVICE_ICONS: Record<string, string> = {
  toilet: 'toilet',
  heater: 'heater',
  drain: 'drain',
  electrical: 'electrical',
  leak: 'leak',
  pipe: 'pipe',
  repair: 'repair',
  emergency: 'emergency',
  general: 'general'
}

function getServiceIcon(serviceName: string): string {
  const lower = serviceName.toLowerCase()
  for (const [keyword, icon] of Object.entries(SERVICE_ICONS)) {
    if (lower.includes(keyword)) return icon
  }
  return 'general'
}

/**
 * Calculate service performance metrics
 */
export function calculateServiceData(
  jobs: JobWithRelations[],
  invoices: InvoiceWithRelations[]
): ServiceData[] {
  const serviceMap = new Map<string, {
    name: string
    icon: string
    totalRevenue: number
    jobs: number
    completedJobs: number
    durationHoursTotal: number
    pricedJobs: number
  }>()

  const estimateDurationHours = (job: JobWithRelations) => {
    if (!job.scheduled_start || !job.scheduled_end) return 2
    const startMs = new Date(job.scheduled_start).getTime()
    const endMs = new Date(job.scheduled_end).getTime()
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return 2
    return (endMs - startMs) / (1000 * 60 * 60)
  }
  
  // Build map of job ID to invoice
  const jobInvoiceMap = new Map<string, InvoiceWithRelations>()
  invoices
    .filter(inv => inv.status === 'paid' && inv.job?.id)
    .forEach(inv => {
      if (inv.job?.id) {
        jobInvoiceMap.set(inv.job.id, inv)
      }
    })
  
  // Aggregate by service
  jobs.forEach(job => {
    if (job.status === 'cancelled') return
    
    const serviceName = job.service?.name || 'General Service'
    const icon = getServiceIcon(serviceName)
    
    if (!serviceMap.has(serviceName)) {
      serviceMap.set(serviceName, {
        name: serviceName,
        icon,
        totalRevenue: 0,
        jobs: 0,
        completedJobs: 0,
        durationHoursTotal: 0,
        pricedJobs: 0,
      })
    }
    
    const service = serviceMap.get(serviceName)!
    service.jobs++
    service.durationHoursTotal += Math.max(0.25, estimateDurationHours(job))
    if (job.status === 'completed') {
      service.completedJobs++
    }
    
    // Prefer paid invoice totals; fallback to completed job estimate.
    const invoice = jobInvoiceMap.get(job.id)
    if (invoice) {
      service.totalRevenue += invoice.total || 0
      service.pricedJobs++
    } else if (job.status === 'completed' && typeof job.total_cost === 'number' && job.total_cost > 0) {
      service.totalRevenue += job.total_cost
      service.pricedJobs++
    }
  })
  
  return Array.from(serviceMap.values())
    .map(s => ({
      id: `${s.name}-${s.icon}`,
      name: s.name,
      icon: s.icon,
      revenue: Math.round(s.totalRevenue),
      jobs: s.jobs,
      avgTicket: s.pricedJobs > 0 ? Math.round(s.totalRevenue / s.pricedJobs) : 0,
      trend: 0, // Would require historical comparison baseline
      completedJobs: s.completedJobs,
      avgDurationHours: s.jobs > 0 ? s.durationHoursTotal / s.jobs : 0,
      avgPrice: s.pricedJobs > 0 ? Math.round(s.totalRevenue / s.pricedJobs) : 0,
      totalRevenue: Math.round(s.totalRevenue),
      revenuePerJob: s.jobs > 0 ? Math.round(s.totalRevenue / s.jobs) : 0,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue || b.jobs - a.jobs)
}

const DAY_MS = 1000 * 60 * 60 * 24

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function hoursBetween(start: string | null, end: string | null): number {
  if (!start || !end) return 2
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return 2
  return (endMs - startMs) / (1000 * 60 * 60)
}

// ============================================================================
// DAILY REVENUE CHART DATA
// ============================================================================

/**
 * Generate daily revenue data for charts
 * Uses invoice paid_at date for paid invoices
 */
export function generateDailyRevenueData(
  invoices: InvoiceWithRelations[],
  jobs: JobWithRelations[],
  dateRange: DateRange
): RevenueDataPoint[] {
  const dates = generateDateRange(dateRange.start, dateRange.end)
  
  return dates.map(date => {
    const dateStr = formatSQLDate(date)
    const displayDate = formatDisplayDate(date)
    
    // Find invoices paid on this date
    const paidInvoicesToday = invoices.filter(inv => {
      if (inv.status !== 'paid') return false
      const paidDate = inv.paid_at 
        ? inv.paid_at.split('T')[0]
        : inv.created_at.split('T')[0]
      return paidDate === dateStr
    })
    
    // Find jobs scheduled for this date (not created_at - that was seed date)
    const jobsToday = jobs.filter(job => 
      job.scheduled_start?.startsWith(dateStr)
    )
    
    const revenue = paidInvoicesToday.reduce((sum, inv) => sum + (inv.total || 0), 0)
    
    return {
      date: dateStr,
      displayDate,
      revenue: Math.round(revenue),
      jobs: jobsToday.length,
      hours: Math.round(jobsToday.reduce((sum, j) => sum + (j.total_cost || 0), 0) / 100)
    }
  })
}

// ============================================================================
// FORECAST CALCULATIONS
// ============================================================================

export interface ForecastInput {
  currentJobs: JobWithRelations[]
  allJobs: JobWithRelations[]
  currentInvoices: InvoiceWithRelations[]
  techCount: number
  rangeStart: Date
  rangeEnd: Date
  horizonDays?: number
  now?: Date
}

export function calculateForecastData(input: ForecastInput): ForecastData {
  const {
    currentJobs,
    allJobs,
    currentInvoices,
    techCount,
    rangeStart,
    rangeEnd,
  } = input
  const now = input.now ?? new Date()
  const horizonDays = Math.max(1, input.horizonDays ?? 30)
  const horizonEnd = new Date(now.getTime() + horizonDays * DAY_MS)

  const openStatuses = new Set(['scheduled', 'on_the_way', 'arrived', 'in_progress'])
  const closedJobs = currentJobs.filter(job => job.status === 'completed' || job.status === 'cancelled')
  const completedJobs = closedJobs.filter(job => job.status === 'completed').length
  const cancelledJobs = closedJobs.filter(job => job.status === 'cancelled').length

  const historicalDemandJobs = currentJobs.filter(job => job.status !== 'cancelled').length
  const rangeDays = Math.max(1, Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / DAY_MS))
  const dailyDemandRunRate = historicalDemandJobs / rangeDays

  const pipelineJobs = allJobs.filter(job => {
    if (!openStatuses.has(job.status)) return false
    if (!job.scheduled_start) return false
    const scheduled = new Date(job.scheduled_start)
    if (Number.isNaN(scheduled.getTime())) return false
    return scheduled >= now && scheduled <= horizonEnd
  })
  const scheduledPipelineJobs = pipelineJobs.length

  const expectedJobVolume = Math.max(
    scheduledPipelineJobs,
    Math.round(dailyDemandRunRate * horizonDays)
  )

  const paidRevenue = calculatePaidRevenue(currentInvoices)
  const avgRevenuePerCompletedJob = completedJobs > 0 ? paidRevenue / completedJobs : 0
  const completionRate = closedJobs.length > 0
    ? completedJobs / closedJobs.length
    : (historicalDemandJobs > 0 ? completedJobs / historicalDemandJobs : 0.82)

  const projectedCompletedJobs = Math.round(expectedJobVolume * clamp(completionRate, 0.2, 1))
  const projectedRevenue = Math.round(projectedCompletedJobs * avgRevenuePerCompletedJob)

  const activeWindowJobs = currentJobs.filter(job => openStatuses.has(job.status))
  const lateStartJobs = activeWindowJobs.filter(job => {
    if (!job.scheduled_start) return false
    if (!['scheduled', 'on_the_way', 'arrived'].includes(job.status)) return false
    return new Date(job.scheduled_start) < now
  }).length
  const overdueInProgressJobs = activeWindowJobs.filter(job => {
    if (job.status !== 'in_progress' || !job.scheduled_end) return false
    return new Date(job.scheduled_end) < now
  }).length

  const lateRate = activeWindowJobs.length > 0 ? lateStartJobs / activeWindowJobs.length : 0
  const overdueRate = activeWindowJobs.length > 0 ? overdueInProgressJobs / activeWindowJobs.length : 0

  const futureUnassigned = pipelineJobs.filter(job => !job.technician?.id).length
  const unassignedRate = scheduledPipelineJobs > 0 ? futureUnassigned / scheduledPipelineJobs : 0

  const scheduledHours = pipelineJobs.reduce(
    (sum, job) => sum + Math.max(0.25, hoursBetween(job.scheduled_start, job.scheduled_end)),
    0
  )
  const capacityHours = Math.max(0, techCount * horizonDays * 8)
  const utilizationPct = capacityHours > 0 ? (scheduledHours / capacityHours) * 100 : 0
  const utilizationPressure = clamp((utilizationPct - 85) / 15, 0, 1)

  const delayRiskScore = clamp(
    (lateRate * 35 + overdueRate * 30 + unassignedRate * 20 + utilizationPressure * 15) * 100,
    0,
    100
  )

  const historicalCancellationRate = closedJobs.length > 0
    ? cancelledJobs / closedJobs.length
    : 0.05
  const cancellationRateAdjusted = clamp(
    historicalCancellationRate + unassignedRate * 0.2 + (delayRiskScore / 100) * 0.08,
    0.01,
    0.75
  )
  const cancellationRisk = cancellationRateAdjusted * 100
  const predictedCancelledJobs = Math.round(expectedJobVolume * cancellationRateAdjusted)

  let confidence: ForecastData['confidence'] = 'low'
  if (closedJobs.length >= 80 && scheduledPipelineJobs >= 30) confidence = 'high'
  else if (closedJobs.length >= 25 || scheduledPipelineJobs >= 12) confidence = 'medium'

  return {
    horizonDays,
    projectedRevenue,
    expectedJobVolume,
    delayRiskScore: Math.round(delayRiskScore * 10) / 10,
    cancellationRisk: Math.round(cancellationRisk * 10) / 10,
    predictedCancelledJobs,
    scheduledPipelineJobs,
    confidence,
    drivers: {
      completionRate: Math.round(clamp(completionRate, 0, 1) * 1000) / 10,
      avgRevenuePerCompletedJob: Math.round(avgRevenuePerCompletedJob),
      unassignedRate: Math.round(unassignedRate * 1000) / 10,
      utilizationPct: Math.round(utilizationPct * 10) / 10,
      historicalCancellationRate: Math.round(historicalCancellationRate * 1000) / 10,
    },
  }
}

// ============================================================================
// FULL METRICS CALCULATION
// ============================================================================

export interface CalculationInput {
  currentJobs: JobWithRelations[]
  currentInvoices: InvoiceWithRelations[]
  prevJobs: JobWithRelations[]
  prevInvoices: InvoiceWithRelations[]
}

/**
 * Calculate all analytics metrics
 */
export function calculateMetrics(input: CalculationInput): AnalyticsMetrics {
  const { currentJobs, currentInvoices, prevJobs, prevInvoices } = input
  
  // Current period calculations
  const revenue = calculatePaidRevenue(currentInvoices)
  const outstandingRevenue = calculateOutstandingRevenue(currentInvoices)
  const jobs = currentJobs.length
  const completedJobs = currentJobs.filter(j => j.status === 'completed').length
  const completionRate = jobs > 0 ? Math.round((completedJobs / jobs) * 100) : 0
  const avgTicket = completedJobs > 0 ? Math.round(revenue / completedJobs) : 0
  
  // Previous period calculations
  const prevRevenue = calculatePaidRevenue(prevInvoices)
  const prevJobsCount = prevJobs.length
  const prevCompletedJobs = prevJobs.filter(j => j.status === 'completed').length
  const prevCompletionRate = prevJobsCount > 0 ? Math.round((prevCompletedJobs / prevJobsCount) * 100) : 0
  const prevAvgTicket = prevCompletedJobs > 0 ? Math.round(prevRevenue / prevCompletedJobs) : 0
  
  // Calculate changes
  const revenueChange = prevRevenue > 0 
    ? Number(((revenue - prevRevenue) / prevRevenue * 100).toFixed(1)) 
    : 0
  const jobsChange = prevJobsCount > 0 
    ? Number(((jobs - prevJobsCount) / prevJobsCount * 100).toFixed(1)) 
    : 0
  const completionChange = prevCompletionRate > 0 
    ? Number((completionRate - prevCompletionRate).toFixed(1)) 
    : 0
  const ticketChange = prevAvgTicket > 0 
    ? Number(((avgTicket - prevAvgTicket) / prevAvgTicket * 100).toFixed(1)) 
    : 0
  
  return {
    revenue,
    outstandingRevenue,
    jobs,
    completedJobs,
    completionRate,
    avgTicket,
    revenueChange,
    jobsChange,
    completionChange,
    ticketChange
  }
}
