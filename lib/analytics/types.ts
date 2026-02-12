/**
 * Analytics Type Definitions
 * Centralized types for all analytics components
 */

// ============================================================================
// DATABASE ENTITY TYPES
// ============================================================================

export interface InvoiceWithRelations {
  id: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  total: number
  subtotal: number
  tax: number
  created_at: string
  paid_at: string | null
  issue_date: string
  due_date: string | null
  customer: { name: string } | null
  job: {
    id: string
    technician: { full_name: string; id: string } | null
    service: { name: string } | null
    status: string
  } | null
}

export interface JobWithRelations {
  id: string
  status: 'scheduled' | 'on_the_way' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'
  total_cost: number | null
  created_at: string
  scheduled_start: string | null
  scheduled_end: string | null
  completed_at: string | null
  description: string | null
  customer: { name: string } | null
  technician: { full_name: string; id: string } | null
  service: { name: string } | null
}

// ============================================================================
// CHART DATA TYPES
// ============================================================================

export interface RevenueDataPoint {
  date: string           // YYYY-MM-DD
  displayDate: string    // Formatted for display
  revenue: number        // Paid invoice total for the day
  jobs: number           // Jobs created/completed that day
  hours: number          // Estimated hours (optional)
}

export interface StatusData {
  status: string
  count: number
  color: string
}

export interface TechnicianData {
  id: string
  name: string
  jobs: number           // Completed jobs count
  revenue: number        // Revenue from their completed jobs
  completedJobs: number
  totalJobs: number
}

export interface ServiceData {
  id: string
  name: string
  icon: string
  revenue: number
  jobs: number
  avgTicket: number
  trend: number
}

// ============================================================================
// METRICS TYPE
// ============================================================================

export interface AnalyticsMetrics {
  // Core metrics
  revenue: number                    // Total paid invoice amount
  outstandingRevenue: number         // Sent/overdue invoice amount
  jobs: number                       // Total job count
  completedJobs: number              // Completed job count
  completionRate: number             // Percentage (0-100)
  avgTicket: number                  // Average revenue per completed job
  
  // Trends vs previous period
  revenueChange: number              // Percentage change
  jobsChange: number                 // Percentage change
  completionChange: number           // Percentage point change
  ticketChange: number               // Percentage change
}

// ============================================================================
// DAILY DETAIL TYPES
// ============================================================================

export interface JobDetail {
  id: string
  time: string
  technician: string
  service: string
  customer: string
  amount: number
  status: 'done' | 'active' | 'soon'
  location?: string
}

export interface DailyBreakdownData {
  date: string
  displayDate: string
  revenue: number
  jobCount: number
  hours: number
  jobs: JobDetail[]
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export type StatusFilter = 'all' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type InvoiceStatusFilter = 'all' | 'draft' | 'sent' | 'paid' | 'overdue'

// ============================================================================
// SERVICE BREAKDOWN TYPES
// ============================================================================

export interface ServiceBreakdownItem {
  id: string
  name: string
  icon: string
  revenue: number
  jobs: number
  avgTicket: number
  trend: number
  percentageOfTotal: number
}

// ============================================================================
// TECHNICIAN BREAKDOWN TYPES
// ============================================================================

export interface TechnicianBreakdownItem {
  id: string
  name: string
  avatar?: string
  initials: string
  jobsCompleted: number
  totalJobs: number
  revenue: number
  completionRate: number
  avgTicket: number
}
