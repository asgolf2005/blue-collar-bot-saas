export type UserRole = 'admin' | 'tech' | 'customer'

export type JobStatus =
  | 'scheduled'
  | 'on_the_way'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type JobSource = 'ai_caller' | 'manual'

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export type LineItemType = 'service' | 'labor' | 'parts'

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'

export type SubscriptionTier = 'starter' | 'professional' | 'enterprise'

export type NotificationType =
  | 'job_assigned'
  | 'job_status_changed'
  | 'invoice_sent'
  | 'payment_received'
  | 'appointment_reminder'

export type JobNoteType = 'note' | 'status_change' | 'photo_added' | 'system'

export type ExpenseCategory =
  | 'materials'
  | 'subcontractor'
  | 'equipment_rental'
  | 'travel'
  | 'permits'
  | 'other'

export interface Business {
  id: string
  name: string
  address: string | null
  email: string | null
  phone: string | null
  primary_calendar_id: string | null
  service_area_json: Record<string, any> | null
  logo_url: string | null
  primary_color: string
  slug: string | null
  stripe_customer_id: string | null
  onboarding_completed: boolean
  sms_enabled?: boolean
  sms_notifications?: Record<string, boolean>
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  business_id: string
  email: string
  full_name: string
  phone: string | null
  role: UserRole
  hourly_rate?: number
  created_at: string
}

export interface Customer {
  id: string
  business_id: string
  name: string
  phone: string
  email: string | null
  address: string | null
  user_id: string | null
  portal_access: boolean
  last_login: string | null
  created_at: string
}

export interface Job {
  id: string
  business_id: string
  customer_id: string
  technician_id: string | null
  status: JobStatus
  scheduled_start: string
  scheduled_end: string
  description: string | null
  urgency: string | null
  calendar_event_id: string | null
  source: JobSource
  labor_hours: number | null
  labor_rate: number | null
  parts_cost: number | null
  total_cost: number | null
  customer_signature: string | null
  // Estimated costs
  estimated_labor_hours?: number
  estimated_materials_cost?: number
  estimated_other_costs?: number
  // Actual costs (auto-calculated)
  actual_labor_cost?: number
  actual_materials_cost?: number
  actual_other_costs?: number
  // Profit metrics (auto-calculated)
  gross_profit?: number
  profit_margin?: number
  created_at: string
  updated_at: string
  // Relations
  customer?: Customer
  technician?: User
  services?: JobService[]
  expenses?: JobExpense[]
}

export interface Media {
  id: string
  job_id: string
  technician_id: string
  file_url: string
  file_type: string | null
  created_at: string
}

export interface JobNote {
  id: string
  job_id: string
  user_id: string
  note_type: JobNoteType
  content: string
  is_visible_to_customer: boolean
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  // Relations
  user?: User
}

export interface JobExpense {
  id: string
  job_id: string
  business_id: string
  category: ExpenseCategory
  description: string
  amount: number
  receipt_url: string | null
  vendor: string | null
  purchase_date: string
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Relations
  creator?: User
}

export interface Service {
  id: string
  business_id: string
  name: string
  description: string | null
  base_price: number | null
  estimated_cost?: number
  duration_minutes: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface JobService {
  id: string
  job_id: string
  service_id: string
  quantity: number
  notes: string | null
  created_at: string
  service?: Service
}

export interface Invoice {
  id: string
  business_id: string
  job_id: string
  customer_id: string
  invoice_number: string
  status: InvoiceStatus
  issue_date: string
  due_date: string | null
  subtotal: number
  tax: number
  total: number
  notes: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
  // Relations
  customer?: Customer
  job?: Job
  line_items?: InvoiceLineItem[]
}

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  service_id: string | null
  type: LineItemType
  description: string
  quantity: number
  unit_price: number
  total: number
  created_at: string
}

export interface Subscription {
  id: string
  business_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  tier: SubscriptionTier
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  read: boolean
  created_at: string
}

export interface JobWithDetails extends Omit<Job, 'customer' | 'technician' | 'services'> {
  customer: Customer
  technician: User | null
  media: Media[]
  services: JobService[]
}

export interface InvoiceWithDetails extends Invoice {
  customer: Customer
  job: Job
  line_items: InvoiceLineItem[]
}

// Analytics types
export interface RevenueData {
  date: string
  revenue: number
  jobs_completed: number
}

export interface PerformanceMetrics {
  total_jobs: number
  completed_jobs: number
  revenue_total: number
  average_job_value: number
  completion_rate: number
  tech_performance: TechPerformance[]
}

export interface TechPerformance {
  tech_id: string
  tech_name: string
  jobs_completed: number
  total_hours: number
  revenue_generated: number
}

export interface BusinessInsights {
  top_services: ServiceInsight[]
  peak_hours: HourInsight[]
  customer_retention: number
  repeat_customers: number
}

export interface ServiceInsight {
  service_id: string
  service_name: string
  times_booked: number
  revenue: number
}

export interface HourInsight {
  hour: number
  jobs_count: number
}

// Photo types for before/during/after categorization
export type PhotoType = 'before' | 'during' | 'after'

// Extended Media type with photo categorization
export interface MediaWithType extends Media {
  photo_type: PhotoType
}

// Technician real-time location tracking
export interface TechnicianLocation {
  id: string
  technician_id: string
  job_id: string | null
  latitude: number
  longitude: number
  heading: number | null
  speed: number | null
  accuracy: number | null
  updated_at: string
  created_at: string
}

// Job with tracking info for customer dashboard
export interface JobWithTracking extends Omit<Job, 'customer' | 'technician' | 'services'> {
  customer: Customer
  technician: User | null
  media: MediaWithType[]
  services: JobService[]
  technician_location?: TechnicianLocation
  eta_minutes?: number
  eta_updated_at?: string
}

// Job status with timestamps for timeline display
export interface JobStatusEvent {
  status: JobStatus
  timestamp: string
  note?: string
}

// Customer dashboard job card with all details
export interface CustomerJobDetails {
  job: JobWithTracking
  status_history: JobStatusEvent[]
  invoice?: Invoice
  total_photos: number
}

// Profit tracking and analytics types
export interface ProfitMetrics {
  estimated_total: number
  actual_total: number
  gross_profit: number
  profit_margin: number
  cost_variance: number
  cost_variance_percentage: number
}

export interface JobProfitSummary {
  job_id: string
  revenue: number
  estimated_cost: number
  actual_cost: number
  gross_profit: number
  profit_margin: number
  expenses_breakdown: ExpenseBreakdown
}

export interface ExpenseBreakdown {
  labor: number
  materials: number
  subcontractor: number
  equipment_rental: number
  travel: number
  permits: number
  other: number
  total: number
}

export interface BusinessProfitAnalytics {
  period: {
    start: string
    end: string
  }
  total_revenue: number
  total_costs: number
  gross_profit: number
  profit_margin: number
  jobs_analyzed: number
  top_profitable_jobs: JobProfitSummary[]
  least_profitable_jobs: JobProfitSummary[]
  expense_breakdown: ExpenseBreakdown
}
