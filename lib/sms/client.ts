import twilio from 'twilio'

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_PHONE_NUMBER

if (!accountSid || !authToken || !fromNumber) {
  console.warn('Twilio credentials not configured. SMS notifications will be disabled.')
}

// Initialize Twilio client (only if credentials are available)
const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null

/**
 * SMS Service for sending customer notifications
 */
class SMSService {
  private client: twilio.Twilio | null

  constructor() {
    this.client = twilioClient
  }

  /**
   * Check if SMS service is configured
   */
  isConfigured(): boolean {
    return this.client !== null && fromNumber !== undefined
  }

  /**
   * Send a generic SMS
   */
  async sendSMS(to: string, message: string): Promise<boolean> {
    if (!this.isConfigured() || !this.client) {
      console.warn('Twilio not configured. SMS not sent:', { to, message })
      return false
    }

    try {
      await this.client.messages.create({
        body: message,
        from: fromNumber,
        to: to,
      })
      console.log(`SMS sent to ${to}`)
      return true
    } catch (error) {
      console.error('Error sending SMS:', error)
      return false
    }
  }

  /**
   * Send job assignment notification to technician
   */
  async sendJobAssignment(
    techPhone: string,
    techName: string,
    customerName: string,
    address: string,
    scheduledTime: string,
    description: string,
    businessName: string
  ): Promise<boolean> {
    const message = `Hi ${techName}! New job assigned:\n\nCustomer: ${customerName}\nLocation: ${address}\nTime: ${scheduledTime}\nDetails: ${description}\n\n- ${businessName}`

    return this.sendSMS(techPhone, message)
  }

  /**
   * Send job status update to customer
   */
  async sendJobStatusUpdate(
    customerPhone: string,
    customerName: string,
    status: 'on_the_way' | 'arrived' | 'in_progress' | 'completed',
    techName: string,
    businessName: string,
    estimatedTime?: string
  ): Promise<boolean> {
    const statusMessages = {
      on_the_way: `Hi ${customerName}! Your technician ${techName} is on the way${estimatedTime ? ` (ETA: ${estimatedTime})` : ''}.`,
      arrived: `Hi ${customerName}! ${techName} has arrived at your location.`,
      in_progress: `Hi ${customerName}! ${techName} has started working on your service.`,
      completed: `Hi ${customerName}! ${techName} has completed your service. Thank you for choosing ${businessName}!`,
    }

    const message = statusMessages[status] || `Job status updated: ${status}`
    return this.sendSMS(customerPhone, message)
  }

  /**
   * Send invoice notification to customer
   */
  async sendInvoiceNotification(
    customerPhone: string,
    customerName: string,
    invoiceNumber: string,
    amount: number,
    paymentUrl: string,
    businessName: string
  ): Promise<boolean> {
    const message = `Hi ${customerName}! Your invoice ${invoiceNumber} for $${amount.toFixed(2)} is ready.\n\nPay online: ${paymentUrl}\n\n- ${businessName}`

    return this.sendSMS(customerPhone, message)
  }

  /**
   * Send payment confirmation to customer
   */
  async sendPaymentConfirmation(
    customerPhone: string,
    customerName: string,
    invoiceNumber: string,
    amount: number,
    businessName: string
  ): Promise<boolean> {
    const message = `Hi ${customerName}! Payment of $${amount.toFixed(2)} received for invoice ${invoiceNumber}. Thank you! - ${businessName}`

    return this.sendSMS(customerPhone, message)
  }

  /**
   * Send appointment reminder to customer
   */
  async sendAppointmentReminder(
    customerPhone: string,
    customerName: string,
    scheduledTime: string,
    techName: string,
    businessName: string
  ): Promise<boolean> {
    const message = `Reminder: Your appointment with ${techName} is scheduled for ${scheduledTime}. - ${businessName}`

    return this.sendSMS(customerPhone, message)
  }
}

// Export singleton instance
export const smsService = new SMSService()
