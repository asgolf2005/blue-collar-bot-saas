import { createClient } from '@/lib/supabase/server'
import type { CreateNotificationParams, NotificationType } from './types'

interface NotificationRecipient {
  userId: string
  role: 'admin' | 'tech' | 'customer'
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('create_notification', {
    p_user_id: params.userId,
    p_type: params.type,
    p_title: params.title,
    p_message: params.message,
    p_link: params.link || null,
  })

  if (error) {
    console.error('Failed to create notification:', error)
    return null
  }

  return data
}

/**
 * Create notifications for multiple users
 */
export async function createBulkNotifications(
  userIds: string[],
  params: Omit<CreateNotificationParams, 'userId'>
): Promise<void> {
  await Promise.all(
    userIds.map((userId) =>
      createNotification({ ...params, userId })
    )
  )
}

/**
 * Get recipients for a notification based on smart defaults
 */
export async function getNotificationRecipients(params: {
  businessId: string
  eventType: 'job_status' | 'new_assignment' | 'schedule_change' | 'payment'
  jobId?: string
  technicianId?: string
  customerId?: string
}): Promise<NotificationRecipient[]> {
  const supabase = await createClient()
  const recipients: NotificationRecipient[] = []

  // Get all admins for this business
  const { data: admins } = await supabase
    .from('users')
    .select('id, role')
    .eq('business_id', params.businessId)
    .eq('role', 'admin')

  if (admins) {
    recipients.push(...admins.map((admin) => ({ userId: admin.id, role: 'admin' })))
  }

  let customerUserId: string | null = null
  if (params.customerId) {
    const { data: customer } = await supabase
      .from('customers')
      .select('user_id')
      .eq('id', params.customerId)
      .single()
    const candidateUserId = customer?.user_id || null

    if (candidateUserId) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', candidateUserId)
        .maybeSingle()

      customerUserId = existingUser?.id || null
    }
  }

  // Add specific recipients based on event type
  switch (params.eventType) {
    case 'new_assignment':
    case 'job_status':
    case 'schedule_change':
      // Notify the assigned technician
      if (params.technicianId) {
        recipients.push({ userId: params.technicianId, role: 'tech' })
      }
      if (customerUserId) {
        recipients.push({ userId: customerUserId, role: 'customer' })
      }
      break

    case 'payment':
      // Notify admins (already added above)
      if (customerUserId) {
        recipients.push({ userId: customerUserId, role: 'customer' })
      }
      break
  }

  // Remove duplicates
  const unique = new Map<string, NotificationRecipient>()
  for (const recipient of recipients) {
    if (!unique.has(recipient.userId)) {
      unique.set(recipient.userId, recipient)
    }
  }
  return Array.from(unique.values())
}

/**
 * Notify about job status change
 */
export async function notifyJobStatusChange(params: {
  jobId: string
  oldStatus: string
  newStatus: string
  businessId: string
  technicianId?: string
  customerId?: string
  customerName?: string
}): Promise<void> {
  const recipients = await getNotificationRecipients({
    businessId: params.businessId,
    eventType: 'job_status',
    jobId: params.jobId,
    technicianId: params.technicianId,
    customerId: params.customerId,
  })
  const adminRecipients = recipients.filter((recipient) => recipient.role === 'admin')
  const techRecipients = recipients.filter((recipient) => recipient.role === 'tech')
  const customerRecipients = recipients.filter((recipient) => recipient.role === 'customer')

  const statusLabels: Record<string, string> = {
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    on_the_way: 'On The Way',
    arrived: 'Arrived',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }

  const title = 'Job Status Updated'
  const message = `Job for ${params.customerName || 'customer'} changed from ${statusLabels[params.oldStatus] || params.oldStatus} to ${statusLabels[params.newStatus] || params.newStatus}`

  const notificationPayload = {
    type: 'job_status_changed' as NotificationType,
    title,
    message,
    businessId: params.businessId,
    relatedJobId: params.jobId,
  }

  if (adminRecipients.length > 0) {
    await createBulkNotifications(
      adminRecipients.map((recipient) => recipient.userId),
      {
        ...notificationPayload,
        link: `/admin/jobs/${params.jobId}`,
      }
    )
  }

  if (techRecipients.length > 0) {
    await createBulkNotifications(
      techRecipients.map((recipient) => recipient.userId),
      {
        ...notificationPayload,
        link: `/tech/jobs/${params.jobId}`,
      }
    )
  }

  if (customerRecipients.length > 0) {
    await createBulkNotifications(
      customerRecipients.map((recipient) => recipient.userId),
      {
        ...notificationPayload,
        link: '/customer/appointments',
      }
    )
  }
}

/**
 * Notify about new job assignment
 */
export async function notifyNewAssignment(params: {
  jobId: string
  technicianId: string
  businessId: string
  customerName: string
  scheduledStart?: string
}): Promise<void> {
  const supabase = await createClient()

  // Get technician details
  const { data: technician } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', params.technicianId)
    .single()

  const title = 'New Job Assigned'
  const message = `You have been assigned to a job for ${params.customerName}${params.scheduledStart ? ` on ${new Date(params.scheduledStart).toLocaleDateString()}` : ''}`

  // Notify the technician
  await createNotification({
    userId: params.technicianId,
    type: 'new_assignment',
    title,
    message,
    link: `/tech/jobs/${params.jobId}`,
    businessId: params.businessId,
    relatedJobId: params.jobId,
  })

  // Also notify admins
  const { data: admins } = await supabase
    .from('users')
    .select('id')
    .eq('business_id', params.businessId)
    .eq('role', 'admin')

  if (admins) {
    await createBulkNotifications(
      admins.map((a) => a.id),
      {
        type: 'new_assignment',
        title: 'Job Assigned',
        message: `${technician?.full_name || 'Technician'} assigned to ${params.customerName}`,
        link: `/admin/jobs/${params.jobId}`,
        businessId: params.businessId,
        relatedJobId: params.jobId,
      }
    )
  }
}

/**
 * Notify about schedule change
 */
export async function notifyScheduleChange(params: {
  jobId: string
  businessId: string
  technicianId?: string
  customerId?: string
  customerName: string
  oldTime?: string
  newTime?: string
}): Promise<void> {
  const recipients = await getNotificationRecipients({
    businessId: params.businessId,
    eventType: 'schedule_change',
    jobId: params.jobId,
    technicianId: params.technicianId,
    customerId: params.customerId,
  })
  const adminRecipients = recipients.filter((recipient) => recipient.role === 'admin')
  const techRecipients = recipients.filter((recipient) => recipient.role === 'tech')
  const customerRecipients = recipients.filter((recipient) => recipient.role === 'customer')

  const title = 'Schedule Changed'
  const timeInfo =
    params.oldTime && params.newTime
      ? ` from ${new Date(params.oldTime).toLocaleString()} to ${new Date(params.newTime).toLocaleString()}`
      : ''

  const message = `Job schedule for ${params.customerName} has been updated${timeInfo}`

  const notificationPayload = {
    type: 'schedule_changed' as NotificationType,
    title,
    message,
    businessId: params.businessId,
    relatedJobId: params.jobId,
  }

  if (adminRecipients.length > 0) {
    await createBulkNotifications(
      adminRecipients.map((recipient) => recipient.userId),
      {
        ...notificationPayload,
        link: `/admin/jobs/${params.jobId}`,
      }
    )
  }

  if (techRecipients.length > 0) {
    await createBulkNotifications(
      techRecipients.map((recipient) => recipient.userId),
      {
        ...notificationPayload,
        link: `/tech/jobs/${params.jobId}`,
      }
    )
  }

  if (customerRecipients.length > 0) {
    await createBulkNotifications(
      customerRecipients.map((recipient) => recipient.userId),
      {
        ...notificationPayload,
        link: '/customer/appointments',
      }
    )
  }
}

/**
 * Notify about payment received
 */
export async function notifyPaymentReceived(params: {
  invoiceId: string
  businessId: string
  customerId: string
  customerName: string
  amount: number
}): Promise<void> {
  const recipients = await getNotificationRecipients({
    businessId: params.businessId,
    eventType: 'payment',
    customerId: params.customerId,
  })
  const adminRecipients = recipients.filter((recipient) => recipient.role === 'admin')
  const customerRecipients = recipients.filter((recipient) => recipient.role === 'customer')

  const title = 'Payment Received'
  const message = `Payment of $${params.amount.toFixed(2)} received from ${params.customerName}`

  if (adminRecipients.length > 0) {
    await createBulkNotifications(
      adminRecipients.map((recipient) => recipient.userId),
      {
        type: 'payment_received',
        title,
        message,
        link: `/admin/invoices/${params.invoiceId}`,
        businessId: params.businessId,
        relatedInvoiceId: params.invoiceId,
      }
    )
  }

  if (customerRecipients.length > 0) {
    await createBulkNotifications(
      customerRecipients.map((recipient) => recipient.userId),
      {
        type: 'payment_received',
        title: 'Payment Confirmed',
        message: `We received your payment of $${params.amount.toFixed(2)}.`,
        link: '/customer/invoices',
        businessId: params.businessId,
        relatedInvoiceId: params.invoiceId,
      }
    )
  }
}
