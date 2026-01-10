'use server'

import { createClient } from '@/lib/supabase/server'
import {
  notifyJobStatusChange,
  notifyNewAssignment,
  notifyScheduleChange,
  notifyPaymentReceived,
} from './utils'

/**
 * Trigger notification when a job status changes
 * Call this after updating a job's status
 */
export async function triggerJobStatusNotification(jobId: string) {
  const supabase = await createClient()

  // Fetch job with related data
  const { data: job, error } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers(name, user_id),
      technician:users(id),
      old_status:status
    `)
    .eq('id', jobId)
    .single()

  if (error || !job) return

  // You'll need to track the old status separately
  // For now, we'll just notify on the current status
  await notifyJobStatusChange({
    jobId: job.id,
    oldStatus: 'scheduled', // This should come from your update logic
    newStatus: job.status,
    businessId: job.business_id,
    technicianId: job.technician_id,
    customerId: job.customer_id,
    customerName: job.customer?.name || 'Unknown Customer',
  })
}

/**
 * Trigger notification when a job is assigned to a technician
 * Call this after assigning a technician to a job
 */
export async function triggerNewAssignmentNotification(jobId: string, technicianId: string) {
  const supabase = await createClient()

  const { data: job } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers(name)
    `)
    .eq('id', jobId)
    .single()

  if (!job) return

  await notifyNewAssignment({
    jobId: job.id,
    technicianId,
    businessId: job.business_id,
    customerName: job.customer?.name || 'Unknown Customer',
    scheduledStart: job.scheduled_start,
  })
}

/**
 * Trigger notification when a job schedule is changed
 * Call this after updating a job's scheduled time
 */
export async function triggerScheduleChangeNotification(
  jobId: string,
  oldTime?: string,
  newTime?: string
) {
  const supabase = await createClient()

  const { data: job } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers(name, user_id)
    `)
    .eq('id', jobId)
    .single()

  if (!job) return

  await notifyScheduleChange({
    jobId: job.id,
    businessId: job.business_id,
    technicianId: job.technician_id,
    customerId: job.customer_id,
    customerName: job.customer?.name || 'Unknown Customer',
    oldTime,
    newTime,
  })
}

/**
 * Trigger notification when a payment is received
 * Call this after processing a payment
 */
export async function triggerPaymentNotification(invoiceId: string) {
  const supabase = await createClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(name, user_id)
    `)
    .eq('id', invoiceId)
    .single()

  if (!invoice) return

  await notifyPaymentReceived({
    invoiceId: invoice.id,
    businessId: invoice.business_id,
    customerId: invoice.customer_id,
    customerName: invoice.customer?.name || 'Unknown Customer',
    amount: invoice.total,
  })
}

/**
 * Example: Hook into job update to trigger notifications
 * This shows how you might integrate into your existing code
 */
export async function updateJobStatus(jobId: string, newStatus: string, oldStatus: string) {
  const supabase = await createClient()

  // Update the job
  const { error } = await supabase
    .from('jobs')
    .update({ status: newStatus })
    .eq('id', jobId)

  if (error) throw error

  // Trigger notification
  const { data: job } = await supabase
    .from('jobs')
    .select('*, customer:customers(name, user_id)')
    .eq('id', jobId)
    .single()

  if (job) {
    await notifyJobStatusChange({
      jobId: job.id,
      oldStatus,
      newStatus,
      businessId: job.business_id,
      technicianId: job.technician_id,
      customerId: job.customer_id,
      customerName: job.customer?.name || 'Unknown Customer',
    })
  }
}
