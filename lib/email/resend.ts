export interface SendEmailPayload {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
  replyTo,
}: SendEmailPayload) {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = from || process.env.FROM_EMAIL || process.env.RESEND_FROM_EMAIL

  if (!apiKey || !fromEmail) {
    console.warn('Email not sent: missing RESEND_API_KEY or FROM_EMAIL')
    return { skipped: true, reason: 'missing_config' }
  }

  if (!to) {
    console.warn('Email not sent: missing recipient')
    return { skipped: true, reason: 'missing_recipient' }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject,
      html,
      text,
      reply_to: replyTo,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Resend error (${response.status}): ${errorText}`)
  }

  return response.json()
}
