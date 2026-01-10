// Notification Types and Interfaces

export type NotificationType =
  | 'job_assigned'
  | 'job_status_changed'
  | 'invoice_sent'
  | 'payment_received'
  | 'appointment_reminder'
  | 'schedule_changed'
  | 'new_assignment'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  link?: string
  read: boolean
  created_at: string
  business_id?: string
  related_job_id?: string
  related_invoice_id?: string
}

export interface NotificationPreference {
  id: string
  user_id: string
  notification_type: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
  businessId?: string
  relatedJobId?: string
  relatedInvoiceId?: string
}

// Notification configuration for each type
export const NOTIFICATION_CONFIG: Record<NotificationType, {
  label: string
  description: string
  icon: string
  defaultEnabled: boolean
}> = {
  job_assigned: {
    label: 'Job Assigned',
    description: 'When you are assigned to a new job',
    icon: 'briefcase',
    defaultEnabled: true,
  },
  new_assignment: {
    label: 'New Assignment',
    description: 'When a new job is assigned to you',
    icon: 'user-plus',
    defaultEnabled: true,
  },
  job_status_changed: {
    label: 'Job Status Changed',
    description: 'When a job status is updated',
    icon: 'refresh',
    defaultEnabled: true,
  },
  schedule_changed: {
    label: 'Schedule Changed',
    description: 'When a job schedule is modified',
    icon: 'calendar',
    defaultEnabled: true,
  },
  invoice_sent: {
    label: 'Invoice Sent',
    description: 'When an invoice is sent to a customer',
    icon: 'file-text',
    defaultEnabled: true,
  },
  payment_received: {
    label: 'Payment Received',
    description: 'When a payment is received',
    icon: 'dollar-sign',
    defaultEnabled: true,
  },
  appointment_reminder: {
    label: 'Appointment Reminder',
    description: 'Reminders for upcoming appointments',
    icon: 'bell',
    defaultEnabled: true,
  },
}

// Get human-readable notification type label
export function getNotificationTypeLabel(type: NotificationType): string {
  return NOTIFICATION_CONFIG[type]?.label || type
}

// Get notification icon
export function getNotificationIcon(type: NotificationType): string {
  return NOTIFICATION_CONFIG[type]?.icon || 'bell'
}

// Format notification time (e.g., "2 hours ago", "just now")
export function formatNotificationTime(timestamp: string): string {
  const now = new Date()
  const notifTime = new Date(timestamp)
  const diffMs = now.getTime() - notifTime.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return notifTime.toLocaleDateString()
}
