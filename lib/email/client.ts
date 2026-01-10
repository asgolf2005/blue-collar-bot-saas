/**
 * Email service using Resend
 *
 * Setup instructions:
 * 1. Sign up at https://resend.com
 * 2. Get your API key
 * 3. Add RESEND_API_KEY to .env.local
 * 4. Verify your domain (optional for production)
 */

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
}

export class EmailService {
  private readonly defaultFrom: string

  constructor() {
    // Use verified domain in production, test email in development
    this.defaultFrom = process.env.EMAIL_FROM || 'onboarding@resend.dev'
  }

  /**
   * Send an email
   */
  async send(options: EmailOptions) {
    try {
      const { data, error } = await resend.emails.send({
        from: options.from || this.defaultFrom,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        replyTo: options.replyTo,
      })

      if (error) {
        console.error('Email send error:', error)
        throw new Error(`Failed to send email: ${error.message}`)
      }

      console.log('Email sent successfully:', data)
      return data
    } catch (error: any) {
      console.error('Email service error:', error)
      throw error
    }
  }

  /**
   * Send welcome email to new customer
   */
  async sendCustomerWelcome(
    customerEmail: string,
    customerName: string,
    businessName: string,
    loginUrl: string
  ) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1f3a5f 0%, #2e7d6b 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to ${businessName}!</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${customerName},</p>

            <p style="font-size: 16px; margin-bottom: 20px;">
              Your customer portal account has been created! You can now view your appointments,
              invoices, and service history anytime.
            </p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2e7d6b;">
              <h3 style="margin-top: 0; color: #1f3a5f;">What you can do:</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">View upcoming and past appointments</li>
                <li style="margin-bottom: 8px;">Track technician arrival in real-time</li>
                <li style="margin-bottom: 8px;">View and download invoices</li>
                <li style="margin-bottom: 8px;">Update your contact information</li>
                <li style="margin-bottom: 8px;">See photos from completed jobs</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}"
                 style="display: inline-block; background: linear-gradient(135deg, #1f3a5f 0%, #2e7d6b 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Access Your Portal
              </a>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Need help? Just reply to this email and we'll be happy to assist you.
            </p>

            <div style="border-top: 1px solid #ddd; margin-top: 30px; padding-top: 20px; text-align: center; color: #999; font-size: 12px;">
              <p>© ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `

    return this.send({
      to: customerEmail,
      subject: `Welcome to ${businessName} - Your Portal is Ready!`,
      html,
    })
  }

  /**
   * Send invoice to customer
   */
  async sendInvoice(
    customerEmail: string,
    customerName: string,
    businessName: string,
    invoiceNumber: string,
    amount: number,
    dueDate: string,
    invoiceUrl: string
  ) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1f3a5f 0%, #2e7d6b 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Invoice from ${businessName}</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${customerName},</p>

            <p style="font-size: 16px; margin-bottom: 20px;">
              Thank you for your business! Your invoice is ready to view.
            </p>

            <div style="background: white; padding: 25px; border-radius: 8px; margin: 25px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Invoice Number:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">${invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Amount Due:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: 600; font-size: 18px; color: #2e7d6b;">$${amount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #666;">Due Date:</td>
                  <td style="padding: 10px 0; text-align: right; font-weight: 600;">${dueDate}</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${invoiceUrl}"
                 style="display: inline-block; background: linear-gradient(135deg, #1f3a5f 0%, #2e7d6b 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Invoice
              </a>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Questions about this invoice? Reply to this email and we'll help you out.
            </p>

            <div style="border-top: 1px solid #ddd; margin-top: 30px; padding-top: 20px; text-align: center; color: #999; font-size: 12px;">
              <p>© ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `

    return this.send({
      to: customerEmail,
      subject: `Invoice ${invoiceNumber} from ${businessName}`,
      html,
    })
  }

  /**
   * Send job status update to customer
   */
  async sendJobUpdate(
    customerEmail: string,
    customerName: string,
    businessName: string,
    status: string,
    techName: string,
    estimatedArrival?: string
  ) {
    const statusMessages: Record<string, { title: string; message: string; icon: string }> = {
      on_the_way: {
        title: 'Your technician is on the way!',
        message: `${techName} is heading to your location${estimatedArrival ? ` and should arrive around ${estimatedArrival}` : ''}.`,
        icon: '🚗',
      },
      arrived: {
        title: 'Your technician has arrived',
        message: `${techName} is now at your location and ready to get started.`,
        icon: '📍',
      },
      in_progress: {
        title: 'Work in progress',
        message: `${techName} is currently working on your service request.`,
        icon: '🔧',
      },
      completed: {
        title: 'Job completed!',
        message: `${techName} has completed the work. We hope everything meets your expectations!`,
        icon: '✅',
      },
    }

    const statusInfo = statusMessages[status] || statusMessages.in_progress

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1f3a5f 0%, #2e7d6b 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 10px;">${statusInfo.icon}</div>
            <h1 style="color: white; margin: 0; font-size: 24px;">${statusInfo.title}</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${customerName},</p>

            <p style="font-size: 16px; margin-bottom: 20px;">
              ${statusInfo.message}
            </p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2e7d6b;">
              <p style="margin: 0; color: #666; font-size: 14px;">Technician:</p>
              <p style="margin: 5px 0 0 0; font-weight: 600; font-size: 16px;">${techName}</p>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Need to contact us? Just reply to this email.
            </p>

            <div style="border-top: 1px solid #ddd; margin-top: 30px; padding-top: 20px; text-align: center; color: #999; font-size: 12px;">
              <p>© ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `

    return this.send({
      to: customerEmail,
      subject: `Update: ${statusInfo.title} - ${businessName}`,
      html,
    })
  }

  /**
   * Send tech assignment notification
   */
  async sendTechAssignment(
    techEmail: string,
    techName: string,
    customerName: string,
    customerAddress: string,
    scheduledTime: string,
    description: string,
    jobUrl: string
  ) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1f3a5f 0%, #2e7d6b 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 10px;">📋</div>
            <h1 style="color: white; margin: 0; font-size: 24px;">New Job Assigned</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${techName},</p>

            <p style="font-size: 16px; margin-bottom: 20px;">
              You've been assigned a new job!
            </p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Customer:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">${customerName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Address:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">${customerAddress}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Scheduled:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">${scheduledTime}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding: 15px 0 5px 0; color: #666;">Description:</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding: 5px 0;">${description}</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${jobUrl}"
                 style="display: inline-block; background: linear-gradient(135deg, #1f3a5f 0%, #2e7d6b 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Job Details
              </a>
            </div>
          </div>
        </body>
      </html>
    `

    return this.send({
      to: techEmail,
      subject: `New Job Assignment - ${customerName}`,
      html,
    })
  }

  /**
   * Send payment receipt to customer
   */
  async sendPaymentReceipt(
    customerEmail: string,
    customerName: string,
    businessName: string,
    invoiceNumber: string,
    amount: number,
    paymentDate: string,
    paymentMethod: string,
    transactionId: string,
    invoiceUrl: string
  ) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1f3a5f 0%, #2e7d6b 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
            <h1 style="color: white; margin: 0; font-size: 28px;">Payment Received!</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${customerName},</p>

            <p style="font-size: 16px; margin-bottom: 20px;">
              Thank you for your payment! This email confirms that we've received your payment for Invoice ${invoiceNumber}.
            </p>

            <div style="background: white; padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid #2e7d6b;">
              <h3 style="margin: 0 0 20px 0; color: #1f3a5f; text-align: center;">Payment Receipt</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Invoice Number:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">${invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Payment Date:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">${paymentDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Payment Method:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">${paymentMethod}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 2px solid #2e7d6b; color: #666;">Amount Paid:</td>
                  <td style="padding: 10px 0; border-bottom: 2px solid #2e7d6b; text-align: right; font-weight: 700; font-size: 20px; color: #2e7d6b;">$${amount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #666; font-size: 12px;">Transaction ID:</td>
                  <td style="padding: 10px 0; text-align: right; font-family: monospace; font-size: 11px; color: #999;">${transactionId}</td>
                </tr>
              </table>
            </div>

            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2e7d6b;">
              <p style="margin: 0; font-size: 14px; color: #2e7d6b;">
                <strong>✓ Payment Status:</strong> Successfully Processed
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${invoiceUrl}"
                 style="display: inline-block; background: linear-gradient(135deg, #1f3a5f 0%, #2e7d6b 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Full Invoice
              </a>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Please save this email for your records. If you have any questions about this payment, feel free to reply to this email.
            </p>

            <div style="border-top: 1px solid #ddd; margin-top: 30px; padding-top: 20px; text-align: center; color: #999; font-size: 12px;">
              <p>© ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `

    return this.send({
      to: customerEmail,
      subject: `Payment Receipt - Invoice ${invoiceNumber} - ${businessName}`,
      html,
    })
  }
}

// Singleton instance
export const emailService = new EmailService()
