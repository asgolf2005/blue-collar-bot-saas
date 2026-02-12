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
  AnalyticsMetrics
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
    revenue: number
    jobs: number
  }>()
  
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
    if (job.status !== 'completed') return
    
    const serviceName = job.service?.name || 'General Service'
    const icon = getServiceIcon(serviceName)
    
    if (!serviceMap.has(serviceName)) {
      serviceMap.set(serviceName, {
        name: serviceName,
        icon,
        revenue: 0,
        jobs: 0
      })
    }
    
    const service = serviceMap.get(serviceName)!
    service.jobs++
    
    // Add revenue from associated paid invoice
    const invoice = jobInvoiceMap.get(job.id)
    if (invoice) {
      service.revenue += invoice.total || 0
    }
  })
  
  return Array.from(serviceMap.values())
    .map(s => ({
      id: `${s.name}-${s.icon}`,
      name: s.name,
      icon: s.icon,
      revenue: Math.round(s.revenue),
      jobs: s.jobs,
      avgTicket: s.jobs > 0 ? Math.round(s.revenue / s.jobs) : 0,
      trend: 0 // Would require historical data
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
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
