export interface SMSNotification {
  id: string
  business_id: string
  job_id?: string
  customer_id?: string
  invoice_id?: string
  to_phone: string
  message: string
  template_name?: string
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'undelivered'
  twilio_message_id?: string
  error_message?: string
  sent_at?: string
  delivered_at?: string
  created_at: string
  updated_at: string
}

export interface SMSSettings {
  enabled: boolean
  notifications: {
    jobScheduled: boolean
    technicianAssigned: boolean
    onTheWay: boolean
    arrived: boolean
    inProgress: boolean
    completed: boolean
    invoiceSent: boolean
    paymentReceived: boolean
    rescheduled: boolean
    cancelled: boolean
    reminderOneDayBefore: boolean
    reminderOneHourBefore: boolean
  }
  businessName?: string
  fromNumber?: string
}

export interface SendSMSRequest {
  to: string
  templateName: string
  data: {
    customerName?: string
    businessName?: string
    technicianName?: string
    jobDescription?: string
    scheduledTime?: string
    address?: string
    estimatedArrival?: string
    total?: number
    invoiceUrl?: string
  }
  jobId?: string
  customerId?: string
  invoiceId?: string
}

export interface SendSMSResponse {
  success: boolean
  messageId?: string
  error?: string
}
