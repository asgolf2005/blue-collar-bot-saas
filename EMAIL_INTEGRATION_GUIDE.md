# 📧 Email Integration Guide

## Overview
This guide shows you where and how to wire up email notifications in the application.

**Status**: Email service ready, needs wiring to actions
**Service**: Resend (already integrated in `lib/email/client.ts`)

---

## 🎯 Email Templates Available

Located in `lib/email/templates.ts`:

1. **Customer Welcome** - When customer portal account created
2. **Invoice Sent** - When invoice is sent to customer
3. **Job Status Updates** - Tech on way, arrived, completed
4. **Tech Assignment** - When job assigned to technician

---

## 🔌 Where to Wire Email Sending

### 1. Customer Welcome Email ✅ READY TO WIRE

**File**: `lib/utils/create-customer-account.ts`
**When**: Customer portal account created
**Template**: `sendCustomerWelcome`

```typescript
// Add after customer account creation (around line 50)
import { emailService } from '@/lib/email/client'

// After successful user creation
await emailService.sendCustomerWelcome(
  email,
  name,
  businessName, // Get from business table
  `${process.env.NEXT_PUBLIC_SITE_URL}/login`
)
```

**To implement**:
1. Read file: `lib/utils/create-customer-account.ts`
2. Find where user is created successfully
3. Query business name from businesses table
4. Add email sending code above
5. Wrap in try-catch (log errors, don't fail if email fails)

---

### 2. Invoice Sent Email ⚠️ TODO

**File**: `app/api/invoices/bulk-send/route.ts` (line 41)
**When**: Invoice marked as "sent"
**Template**: `sendInvoice`

**Current Code** (line 41):
```typescript
// TODO: Send actual emails to customers here
```

**Replace with**:
```typescript
import { emailService } from '@/lib/email/client'
import { format } from 'date-fns'

// For each invoice
for (const invoiceId of body.invoice_ids) {
  // Fetch invoice with customer and business data
  const { data: invoice } = await supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(email, name),
      business:businesses(name)
    `)
    .eq('id', invoiceId)
    .single()

  if (invoice?.customer?.email) {
    try {
      await emailService.sendInvoice(
        invoice.customer.email,
        invoice.customer.name,
        invoice.business.name,
        invoice.invoice_number,
        invoice.total / 100, // Convert cents to dollars
        format(new Date(invoice.due_date), 'MMMM dd, yyyy'),
        `${process.env.NEXT_PUBLIC_SITE_URL}/customer/invoices/${invoice.id}`
      )
    } catch (emailError) {
      console.error(`Failed to send invoice email for ${invoiceId}:`, emailError)
      // Continue processing other invoices even if one fails
    }
  }
}
```

---

### 3. Job Status Update Emails ⚠️ TODO

**File**: `app/api/jobs/update-status/route.ts`
**When**: Job status changes to: on_the_way, arrived, completed
**Template**: `sendJobUpdate`

**Add after status update** (around line 40-50):
```typescript
import { emailService } from '@/lib/email/client'

// Get full job details with customer and technician
const { data: job } = await supabase
  .from('jobs')
  .select(`
    *,
    customer:customers(email, name),
    technician:users(full_name),
    business:businesses(name)
  `)
  .eq('id', body.job_id)
  .single()

// Send email for status changes customers care about
const emailStatuses = ['on_the_way', 'arrived', 'completed']
if (emailStatuses.includes(body.status) && job?.customer?.email) {
  try {
    // Calculate ETA if on_the_way
    let eta = undefined
    if (body.status === 'on_the_way') {
      // TODO: Call ETA API here if needed
      eta = '20-30 minutes' // Default
    }

    await emailService.sendJobUpdate(
      job.customer.email,
      job.customer.name,
      job.business.name,
      body.status,
      job.technician?.full_name || 'Your technician',
      eta
    )
  } catch (emailError) {
    console.error('Failed to send job status email:', emailError)
    // Don't fail the status update if email fails
  }
}
```

---

### 4. Tech Assignment Email ⚠️ TODO

**File**: `app/api/jobs/route.ts` (POST - create job)
**When**: Job created with assigned technician
**Template**: `sendTechAssignment`

**Add after job creation** (around line 100):
```typescript
import { emailService } from '@/lib/email/client'
import { format } from 'date-fns'

// If technician assigned, send email
if (body.technician_id) {
  const { data: tech } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('id', body.technician_id)
    .single()

  const { data: customer } = await supabase
    .from('customers')
    .select('name, address')
    .eq('id', body.customer_id)
    .single()

  if (tech?.email) {
    try {
      await emailService.sendTechAssignment(
        tech.email,
        tech.full_name,
        customer?.name || 'Customer',
        customer?.address || 'Address not provided',
        format(new Date(body.scheduled_start), 'MMMM dd, yyyy at h:mm a'),
        body.description || 'Service call',
        `${process.env.NEXT_PUBLIC_SITE_URL}/tech/jobs/${newJobId}`
      )
    } catch (emailError) {
      console.error('Failed to send tech assignment email:', emailError)
    }
  }
}
```

---

### 5. Failed Payment Email ⚠️ TODO

**File**: `app/api/stripe/webhook/route.ts` (line 278)
**When**: Stripe payment fails
**Template**: Custom or create new template

**Replace TODO** (line 278):
```typescript
// Get business owner email
const { data: business } = await supabase
  .from('businesses')
  .select('name, users:users!businesses_id_fkey(email, full_name, role)')
  .eq('stripe_subscription_id', invoice.subscription as string)
  .single()

// Find admin users
const adminEmails = business?.users
  ?.filter(u => u.role === 'admin')
  ?.map(u => u.email) || []

// Send alert to all admins
for (const email of adminEmails) {
  try {
    // TODO: Create a payment failed template or use custom
    await emailService.sendCustomEmail({
      to: email,
      subject: `⚠️ Payment Failed - ${business?.name}`,
      html: `
        <h2>Payment Failed</h2>
        <p>Your subscription payment failed.</p>
        <p>Amount: $${(invoice.amount_due / 100).toFixed(2)}</p>
        <p>Please update your payment method to avoid service interruption.</p>
        <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/settings">Update Payment Method</a>
      `
    })
  } catch (emailError) {
    console.error('Failed to send payment failed email:', emailError)
  }
}
```

---

## 🧪 Testing Email Integration

### 1. Use Resend Test Mode:
```env
# In .env.local
FROM_EMAIL=onboarding@resend.dev
```
This allows testing without domain verification.

### 2. Test Each Email:
```bash
# Create a test customer
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Customer","email":"your@email.com","phone":"1234567890"}'

# Update job status
curl -X POST http://localhost:3000/api/jobs/update-status \
  -H "Content-Type: application/json" \
  -d '{"job_id":"xxx","status":"on_the_way"}'
```

### 3. Check Resend Dashboard:
- Go to https://resend.com/emails
- See all sent emails
- Check delivery status
- View email content

---

## 🚨 Error Handling Best Practices

### Always wrap email sending in try-catch:
```typescript
try {
  await emailService.sendXXX(...)
} catch (emailError) {
  // Log error but don't fail the main operation
  console.error('Email sending failed:', emailError)

  // Optional: Log to monitoring service
  // await logError(emailError)
}
```

### Why?
- Email failures shouldn't break core functionality
- Job status updates should work even if email fails
- Invoice creation should succeed even if notification fails

---

## 📊 Implementation Checklist

### Required (High Priority):
- [ ] Invoice sent emails (customers need to know)
- [ ] Job status updates (customers track progress)

### Recommended (Medium Priority):
- [ ] Tech assignment emails (techs get notified)
- [ ] Customer welcome emails (better onboarding)

### Optional (Low Priority):
- [ ] Failed payment emails (admin alert)
- [ ] Job reminders (24h before)
- [ ] Payment received confirmation

---

## 🔧 Quick Implementation Script

Run this to wire up all emails at once:

```bash
# 1. Make sure RESEND_API_KEY is in .env.local
# 2. Set FROM_EMAIL=onboarding@resend.dev for testing
# 3. Review each file location above
# 4. Add the code snippets
# 5. Test with real API calls
# 6. Check Resend dashboard for sent emails
```

---

## 💡 Pro Tips

1. **Test First**: Use `onboarding@resend.dev` before setting up your domain
2. **Don't Block**: Always use try-catch so emails don't break core features
3. **Log Errors**: Keep track of failed emails for debugging
4. **Add Delays**: If sending many emails, add small delays to avoid rate limits
5. **Template Variables**: Use the template functions - they handle formatting

---

## 🎯 Next Steps

1. Set up Resend account and get API key
2. Add `RESEND_API_KEY` and `FROM_EMAIL` to .env.local
3. Start with invoice emails (highest priority)
4. Test each email type
5. Switch to verified domain when ready for production

**Estimated Time**: 30-45 minutes to wire all emails
