# SMS Notifications Setup Guide

This guide will help you set up SMS notifications using Twilio for your Blue Collar Bot SaaS application.

## Prerequisites

1. A Twilio account (sign up at https://www.twilio.com)
2. A Twilio phone number capable of sending SMS

## Step 1: Get Twilio Credentials

1. Log in to your Twilio Console (https://console.twilio.com)
2. Find your **Account SID** and **Auth Token** on the dashboard
3. Purchase a phone number or use an existing one from the Phone Numbers section

## Step 2: Add Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

Replace the placeholder values with your actual Twilio credentials.

## Step 3: Run Database Migration

You need to run the SMS notifications migration to create the required database tables.

### Option A: Using Supabase Dashboard (Recommended)

1. Log in to your Supabase Dashboard
2. Go to the SQL Editor
3. Open the migration file: `supabase/migrations/011_sms_notifications.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click "Run" to execute the migration

### Option B: Using Supabase CLI

If you have the Supabase CLI linked to your project:

```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```

## Step 4: Configure Twilio Webhook (Optional)

To receive delivery status updates from Twilio:

1. Go to your Twilio Console
2. Navigate to Phone Numbers → Manage → Active numbers
3. Select your SMS-capable phone number
4. Under "Messaging", set the webhook URL for "A message comes in":
   ```
   https://your-domain.com/api/sms/webhook
   ```
5. Set the HTTP method to POST
6. Save the configuration

## Step 5: Enable SMS in Admin Settings

1. Log in to your application as an admin
2. Navigate to Settings
3. Scroll to the "SMS Notifications" section
4. Toggle "Enable SMS" to ON
5. Configure which notification types you want to send
6. Click "Save Changes"

## Features

Once configured, your application will automatically send SMS notifications for:

- **Job Scheduled**: When a new job is created
- **Technician Assigned**: When a technician is assigned to a job
- **On the Way**: When technician updates status to "on the way"
- **Arrived**: When technician arrives at customer location
- **In Progress**: When work begins
- **Completed**: When job is marked as complete
- **Rescheduled**: When job date/time is changed
- **Cancelled**: When a job is cancelled
- **Invoice Sent**: When an invoice is generated
- **Payment Received**: When payment is confirmed
- **Reminders**: 24 hours and 1 hour before scheduled time

## Manual SMS

Admins can also manually send SMS notifications:

1. Open any job detail page
2. Find the "Send SMS Update" card in the sidebar
3. Select a message type from the dropdown
4. Click "Send SMS"

## SMS History

View all SMS notifications sent for a job:

1. Open the job detail page
2. Scroll to the "SMS Notifications" section
3. See delivery status, timestamps, and message content

## Troubleshooting

### SMS not sending

- Verify Twilio credentials in environment variables
- Check that SMS is enabled in Admin Settings
- Ensure customer has a valid phone number
- Check Supabase logs for error messages

### Phone number format issues

- Phone numbers should be in E.164 format: +1234567890
- US numbers will be automatically formatted if area code is provided
- For international numbers, include the country code

### Delivery status not updating

- Verify webhook URL is configured in Twilio
- Ensure webhook URL is publicly accessible
- Check that the webhook endpoint doesn't require authentication

## Cost Considerations

- Twilio charges per SMS sent (typically $0.0075 - $0.01 per message in the US)
- Monitor your Twilio usage dashboard regularly
- Consider limiting notification types to essential updates only
- Set up billing alerts in your Twilio account

## Security Best Practices

1. **Never commit credentials**: Keep Twilio credentials in environment variables
2. **Rotate credentials**: Periodically rotate your Auth Token
3. **Use subaccounts**: Consider using Twilio subaccounts for isolation
4. **Monitor usage**: Set up alerts for unusual sending patterns
5. **Validate webhooks**: Verify webhook requests are from Twilio

## Testing

To test SMS notifications without sending real messages:

1. Use Twilio's test credentials (starts with "AC" for SID)
2. Test phone numbers: +15005550006 (success), +15005550007 (failure)
3. Monitor the SMS History component for delivery status
4. Check Twilio logs in the console for debugging

## Support

For Twilio-specific issues:
- Twilio Documentation: https://www.twilio.com/docs/sms
- Twilio Support: https://support.twilio.com

For application issues:
- Check application logs
- Review Supabase error logs
- Contact your development team
