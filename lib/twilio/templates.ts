import { format } from 'date-fns'

export interface SMSTemplateData {
  customerName?: string
  businessName?: string
  technicianName?: string
  jobDescription?: string
  scheduledTime?: Date | string
  address?: string
  estimatedArrival?: string
  total?: number
  invoiceUrl?: string
}

export type SMSTemplate = (data: SMSTemplateData) => string

// Job Status Templates
export const smsTemplates = {
  // Job scheduled confirmation
  jobScheduled: ({ customerName, businessName, scheduledTime, jobDescription }: SMSTemplateData) => {
    const timeStr = scheduledTime ? format(new Date(scheduledTime), 'MMM d @ h:mm a') : 'soon'
    return `Hi ${customerName}, your ${jobDescription || 'service'} with ${businessName} is scheduled for ${timeStr}. We'll send updates as your technician heads your way!`
  },

  // Technician assigned
  technicianAssigned: ({ customerName, technicianName, businessName }: SMSTemplateData) => {
    return `Hi ${customerName}, ${technicianName} from ${businessName} has been assigned to your service request. You'll receive an update when they're on the way!`
  },

  // Technician on the way
  onTheWay: ({ customerName, technicianName, estimatedArrival, businessName }: SMSTemplateData) => {
    const eta = estimatedArrival || '20-30 minutes'
    return `${technicianName} from ${businessName} is on the way to your location! Estimated arrival: ${eta}. See you soon!`
  },

  // Technician arrived
  arrived: ({ customerName, technicianName }: SMSTemplateData) => {
    return `${technicianName} has arrived at your location. They'll be starting your service shortly.`
  },

  // Job in progress
  inProgress: ({ customerName, technicianName, jobDescription }: SMSTemplateData) => {
    return `${technicianName} has started working on your ${jobDescription || 'service'}. We'll notify you when it's complete!`
  },

  // Job completed
  completed: ({ customerName, businessName, jobDescription }: SMSTemplateData) => {
    return `Great news ${customerName}! Your ${jobDescription || 'service'} with ${businessName} is complete. Thank you for your business!`
  },

  // Invoice sent
  invoiceSent: ({ customerName, total, invoiceUrl, businessName }: SMSTemplateData) => {
    const amount = typeof total === 'number' ? `$${total.toFixed(2)}` : 'your invoice'
    const urlPart = invoiceUrl ? ` View and pay here: ${invoiceUrl}` : ''
    return `Hi ${customerName}, your invoice from ${businessName} for ${amount} is ready.${urlPart}`
  },

  // Payment received
  paymentReceived: ({ customerName, total, businessName }: SMSTemplateData) => {
    const amount = typeof total === 'number' ? `$${total.toFixed(2)}` : 'your payment'
    return `Thank you ${customerName}! We've received ${amount}. ${businessName} appreciates your business!`
  },

  // Job rescheduled
  rescheduled: ({ customerName, scheduledTime, businessName }: SMSTemplateData) => {
    const timeStr = scheduledTime ? format(new Date(scheduledTime), 'MMM d @ h:mm a') : 'a new time'
    return `Hi ${customerName}, your service with ${businessName} has been rescheduled to ${timeStr}. We'll see you then!`
  },

  // Job cancelled
  cancelled: ({ customerName, businessName, jobDescription }: SMSTemplateData) => {
    return `Your ${jobDescription || 'service appointment'} with ${businessName} has been cancelled. Please contact us if you have any questions.`
  },

  // Reminder (1 day before)
  reminderOneDayBefore: ({ customerName, scheduledTime, technicianName, businessName }: SMSTemplateData) => {
    const timeStr = scheduledTime ? format(new Date(scheduledTime), 'h:mm a') : 'your scheduled time'
    const tech = technicianName ? ` ${technicianName} will be` : ' We\'ll be'
    return `Reminder: ${businessName} has a service appointment tomorrow at ${timeStr}.${tech} there to help!`
  },

  // Reminder (1 hour before)
  reminderOneHourBefore: ({ customerName, technicianName, businessName }: SMSTemplateData) => {
    const tech = technicianName || 'Your technician'
    return `${tech} from ${businessName} will be arriving in approximately 1 hour. Please ensure someone is available to provide access.`
  },

  // Custom message template
  custom: ({ customerName }: SMSTemplateData, customMessage: string) => {
    return customMessage.replace('{{customerName}}', customerName || 'Customer')
  },
}

export type SMSTemplateName = keyof typeof smsTemplates

export function getSMSTemplate(templateName: SMSTemplateName, data: SMSTemplateData, customMessage?: string): string {
  if (templateName === 'custom' && customMessage) {
    return smsTemplates.custom(data, customMessage)
  }

  const template = smsTemplates[templateName]
  if (!template) {
    throw new Error(`SMS template '${templateName}' not found`)
  }

  return template(data)
}
