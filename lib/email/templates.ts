const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const formatCurrency = (value: number) => currencyFormatter.format(value)

const formatDate = (value?: string | null) =>
  value ? dateFormatter.format(new Date(value)) : 'on receipt'

export function buildCustomerWelcomeEmail({
  customerName,
  businessName,
  loginUrl,
  email,
  tempPassword,
}: {
  customerName: string
  businessName: string
  loginUrl: string
  email: string
  tempPassword: string
}) {
  const safeCustomer = escapeHtml(customerName)
  const safeBusiness = escapeHtml(businessName)
  const safeLoginUrl = escapeHtml(loginUrl)
  const safeEmail = escapeHtml(email)
  const safePassword = escapeHtml(tempPassword)

  return {
    subject: `Welcome to ${businessName}`,
    text: [
      `Hi ${customerName},`,
      '',
      `Your customer portal is ready for ${businessName}.`,
      `Login: ${loginUrl}`,
      `Email: ${email}`,
      `Temporary password: ${tempPassword}`,
      '',
      'We recommend changing your password after your first login.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827;">
        <p>Hi ${safeCustomer},</p>
        <p>Your customer portal is ready for ${safeBusiness}.</p>
        <p>
          <strong>Login:</strong>
          <a href="${safeLoginUrl}">${safeLoginUrl}</a><br />
          <strong>Email:</strong> ${safeEmail}<br />
          <strong>Temporary password:</strong> ${safePassword}
        </p>
        <p>We recommend changing your password after your first login.</p>
      </div>
    `.trim(),
  }
}

export function buildInvoiceEmail({
  customerName,
  businessName,
  invoiceNumber,
  total,
  dueDate,
  invoiceUrl,
}: {
  customerName: string
  businessName: string
  invoiceNumber: string
  total: number
  dueDate?: string | null
  invoiceUrl: string
}) {
  const safeCustomer = escapeHtml(customerName)
  const safeBusiness = escapeHtml(businessName)
  const safeInvoiceNumber = escapeHtml(invoiceNumber)
  const safeInvoiceUrl = escapeHtml(invoiceUrl)
  const totalFormatted = formatCurrency(total)
  const dueDateFormatted = formatDate(dueDate)

  return {
    subject: `Invoice ${invoiceNumber} from ${businessName}`,
    text: [
      `Hi ${customerName},`,
      '',
      `Your invoice ${invoiceNumber} from ${businessName} is ready.`,
      `Total: ${totalFormatted}`,
      `Due: ${dueDateFormatted}`,
      `View invoice: ${invoiceUrl}`,
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827;">
        <p>Hi ${safeCustomer},</p>
        <p>Your invoice <strong>${safeInvoiceNumber}</strong> from ${safeBusiness} is ready.</p>
        <p>
          <strong>Total:</strong> ${totalFormatted}<br />
          <strong>Due:</strong> ${dueDateFormatted}
        </p>
        <p>
          <a href="${safeInvoiceUrl}">View your invoice</a>
        </p>
      </div>
    `.trim(),
  }
}
