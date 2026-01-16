# 🔄 n8n Webhook Secret Update Guide

## Quick Answer

**New Webhook Secret:**
```
RW0RGhXr3UeJ42AtG9pWPC4Mi52e1KigeUciS3i8Rvs=
```

---

## Where to Update

### Option 1: You Have n8n Running

If you're using n8n for your AI receptionist:

#### Step 1: Open n8n

**Local Installation:**
- Go to: `http://localhost:5678`

**Cloud Installation:**
- Go to: `https://your-instance.n8n.cloud`
- Or whatever URL you use to access n8n

#### Step 2: Find Your Workflow

Look for a workflow with:
- Name like "Blue Collar Bot AI Receptionist" or similar
- A node that calls your webhook endpoint

#### Step 3: Locate the HTTP Request Node

Your workflow should look something like this:

```
┌─────────────┐      ┌──────────────┐      ┌────────────────────┐
│ Trigger     │─────>│ Process Data │─────>│ HTTP Request Node  │
│ (When call  │      │ (Extract     │      │ (Send to           │
│  received)  │      │  customer    │      │  Blue Collar Bot)  │
└─────────────┘      │  info)       │      └────────────────────┘
                     └──────────────┘              ↑
                                            UPDATE THIS NODE
```

#### Step 4: Update the Node Settings

Click on the **HTTP Request** node, then:

**A. URL Section:**
- Should be: `http://localhost:3000/api/webhooks/n8n`
- Or your production URL: `https://yourdomain.com/api/webhooks/n8n`

**B. Authentication/Headers Section:**

**Method 1: If using "Headers" section**
```
┌──────────────────────────────────────────────┐
│ Headers                                       │
├──────────────────────────────────────────────┤
│ Name:  Authorization                         │
│ Value: Bearer RW0RGhXr3UeJ42AtG9pWPC4Mi52e1KigeUciS3i8Rvs= │
└──────────────────────────────────────────────┘
```

**Method 2: If using "Authentication" section**
```
┌──────────────────────────────────────────────┐
│ Authentication                                │
├──────────────────────────────────────────────┤
│ Type: Header Auth                            │
│ Name: Authorization                          │
│ Value: Bearer RW0RGhXr3UeJ42AtG9pWPC4Mi52e1KigeUciS3i8Rvs= │
└──────────────────────────────────────────────┘
```

**C. Body Section (Should Already Be Configured):**
```json
{
  "business_id": "{{$json.business_id}}",
  "customer_name": "{{$json.customer_name}}",
  "customer_phone": "{{$json.customer_phone}}",
  "customer_email": "{{$json.customer_email}}",
  "customer_address": "{{$json.customer_address}}",
  "scheduled_start": "{{$json.scheduled_start}}",
  "scheduled_end": "{{$json.scheduled_end}}",
  "description": "{{$json.description}}",
  "urgency": "{{$json.urgency}}"
}
```

#### Step 5: Save and Test

1. Click **"Save"** button (usually top right)
2. Click **"Execute Workflow"** to test
3. Check your Blue Collar Bot app to verify the job was created

---

### Option 2: You DON'T Have n8n Set Up Yet

If you haven't set up the AI receptionist integration:

**✅ No action needed right now!**

When you set up n8n in the future:
1. Use this secret from the start: `RW0RGhXr3UeJ42AtG9pWPC4Mi52e1KigeUciS3i8Rvs=`
2. Configure it in your HTTP Request node as shown above

---

## Testing the Webhook

Once updated, test it:

### Test 1: Manual Test in n8n

1. In n8n, click **"Execute Workflow"**
2. Check the execution log
3. Should see: `✓ Success` or `200 OK`

### Test 2: Check Your App

1. Go to your Blue Collar Bot admin dashboard
2. Navigate to Jobs page
3. Look for the newly created job from the test

### Test 3: Test with curl (Advanced)

```bash
curl -X POST http://localhost:3000/api/webhooks/n8n \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer RW0RGhXr3UeJ42AtG9pWPC4Mi52e1KigeUciS3i8Rvs=" \
  -d '{
    "business_id": "your-business-id-here",
    "customer_name": "Test Customer",
    "customer_phone": "+1234567890",
    "customer_email": "test@example.com",
    "scheduled_start": "2024-01-15T10:00:00Z",
    "scheduled_end": "2024-01-15T11:00:00Z",
    "description": "Test job from webhook"
  }'
```

Expected response:
```json
{
  "success": true,
  "job_id": "...",
  "customer_id": "...",
  "message": "Job created successfully"
}
```

---

## Troubleshooting

### Error: "Unauthorized"

**Problem:** Old webhook secret still in use

**Solution:**
- Make sure you copied the FULL secret including the `=` at the end
- Make sure format is: `Bearer RW0RGhXr3UeJ42AtG9pWPC4Mi52e1KigeUciS3i8Rvs=`
- No extra spaces before or after

### Error: "Validation failed"

**Problem:** Missing required fields or invalid data format

**Solution:**
- Check that all required fields are present:
  - `business_id`
  - `customer_name`
  - `customer_phone`
  - `scheduled_start`
  - `scheduled_end`
- Make sure dates are in ISO format: `2024-01-15T10:00:00Z`
- Make sure phone number is valid (10+ digits)

### Can't Find n8n Workflow

**You might not have n8n set up yet!**

Check if you're actually using n8n:
- Do you have an AI phone receptionist?
- Do you have n8n installed locally or in the cloud?
- Have you configured a workflow for Blue Collar Bot?

If NO to all these: **You don't need to update anything!** Just use the new secret when you eventually set it up.

---

## Quick Reference Card

**Copy/Paste This:**

```
Header Name:  Authorization
Header Value: Bearer RW0RGhXr3UeJ42AtG9pWPC4Mi52e1KigeUciS3i8Rvs=
```

**Complete Header (with Bearer prefix):**
```
Bearer RW0RGhXr3UeJ42AtG9pWPC4Mi52e1KigeUciS3i8Rvs=
```

**Just the Secret (without Bearer):**
```
RW0RGhXr3UeJ42AtG9pWPC4Mi52e1KigeUciS3i8Rvs=
```

---

## Still Need Help?

If you can't find where to update, answer these questions:

1. **Do you have n8n installed?** (Yes/No)
2. **Can you access n8n in your browser?** (Yes/No)
3. **Do you have an AI receptionist workflow?** (Yes/No)
4. **What does your workflow look like?** (Describe the nodes)

Once you answer these, I can give more specific help!

---

## Summary

**What to Update:** Authorization header in your n8n HTTP Request node

**New Value:** `Bearer RW0RGhXr3UeJ42AtG9pWPC4Mi52e1KigeUciS3i8Rvs=`

**Where:** n8n workflow → HTTP Request node → Headers section → Authorization

**When:** Before your next AI call comes in (or whenever you set up n8n)

✅ Once updated, your AI receptionist will be able to create jobs in your app again!
