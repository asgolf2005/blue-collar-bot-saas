import twilio from 'twilio'

// Initialize Twilio client
let twilioClient: ReturnType<typeof twilio> | null = null

export function getTwilioClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials not configured. Please add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to your environment variables.')
  }

  if (!twilioClient) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )
  }

  return twilioClient
}

export interface SendSMSParams {
  to: string
  message: string
  from?: string
}

export async function sendSMS({ to, message, from }: SendSMSParams) {
  const client = getTwilioClient()

  const fromNumber = from || process.env.TWILIO_PHONE_NUMBER

  if (!fromNumber) {
    throw new Error('Twilio phone number not configured. Please add TWILIO_PHONE_NUMBER to your environment variables.')
  }

  // Validate phone number format (basic validation)
  const cleanedTo = to.replace(/\D/g, '')
  if (cleanedTo.length < 10) {
    throw new Error('Invalid phone number format')
  }

  // Ensure E.164 format (+1XXXXXXXXXX for US)
  const e164To = cleanedTo.startsWith('+') ? cleanedTo : `+1${cleanedTo}`

  try {
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: e164To,
    })

    return {
      success: true,
      messageId: result.sid,
      status: result.status,
      to: e164To,
    }
  } catch (error) {
    console.error('Twilio SMS Error:', error)
    throw new Error(`Failed to send SMS: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function validatePhoneNumber(phoneNumber: string): Promise<boolean> {
  try {
    const client = getTwilioClient()
    const lookup = await client.lookups.v2.phoneNumbers(phoneNumber).fetch()
    return lookup.valid || false
  } catch (error) {
    console.error('Phone validation error:', error)
    return false
  }
}
