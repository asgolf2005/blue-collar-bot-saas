# 🤖 AI Phone Receptionist Implementation Plan

## Executive Summary

**Recommendation:** Bundled package with tiered pricing

**Pricing Structure:**
- **Tier 1 (SaaS Only):** $99/month - No AI phone
- **Tier 2 (Complete):** $299/month - Includes AI phone ⭐
- **Tier 3 (Enterprise):** $499+/month - Multi-location + custom

**Your margins:**
- Tier 1: ~80% margin
- Tier 2: ~75% margin (includes phone costs)
- Tier 3: ~70% margin (includes support)

---

## Technical Architecture

### Current State ✅
```
Your App (Blue Collar Bot)
├── Webhook endpoint: /api/webhooks/n8n
├── Job creation: Automatic
├── Customer deduplication: Built-in
└── Source tracking: ai_caller vs manual
```

### What to Add

#### 1. Choose AI Phone Provider

**Recommended: Vapi.ai**
- Cost: ~$0.06/minute
- Quality: Enterprise-grade
- Integration: REST API
- Phone numbers: Included
- Setup time: 1-2 hours

**Flow:**
```
Customer calls business number
    ↓
Vapi.ai answers
    ↓
AI conversation (books appointment)
    ↓
Vapi sends webhook to your app
    ↓
Job created automatically
    ↓
Customer gets confirmation SMS
```

#### 2. Integration Code

Create new files:

**`lib/vapi/client.ts`** (NEW)
```typescript
import axios from 'axios'

const VAPI_API_KEY = process.env.VAPI_API_KEY!
const VAPI_BASE_URL = 'https://api.vapi.ai'

export async function createPhoneNumber(businessId: string) {
  const response = await axios.post(
    `${VAPI_BASE_URL}/phone-number`,
    {
      provider: 'twilio',
      assistant_id: 'your-assistant-template-id'
    },
    {
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`
      }
    }
  )

  return response.data.number
}

export async function configureAssistant(businessId: string, config: {
  businessName: string
  businessHours: string
  services: string[]
}) {
  // Configure AI personality and knowledge base
  const assistant = await axios.post(
    `${VAPI_BASE_URL}/assistant`,
    {
      model: 'gpt-4',
      voice: 'jennifer-playht',
      firstMessage: `Thank you for calling ${config.businessName}. How can I help you today?`,
      systemPrompt: `You are a friendly receptionist for ${config.businessName}, a professional trade business.

      Business Hours: ${config.businessHours}
      Services: ${config.services.join(', ')}

      Your job is to:
      1. Greet callers warmly
      2. Understand their service needs
      3. Collect: name, phone, address, preferred date/time
      4. Book appointments within business hours
      5. Confirm all details before ending call

      Be professional but friendly. If you can't help, offer to have someone call them back.`,
      endCallFunctionEnabled: true,
      serverUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/vapi`,
    },
    {
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`
      }
    }
  )

  return assistant.data
}
```

**`app/api/webhooks/vapi/route.ts`** (NEW)
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const payload = await request.json()

    // Vapi sends different event types
    const { type, call, transcript } = payload

    if (type === 'end-of-call-report') {
      // Extract booking details from transcript
      const bookingDetails = extractBookingFromTranscript(transcript)

      // Create customer and job (same logic as n8n webhook)
      const customer = await createOrUpdateCustomer(bookingDetails)
      const job = await createJob(customer.id, bookingDetails)

      // Store call recording
      await supabase
        .from('ai_calls')
        .insert({
          business_id: bookingDetails.business_id,
          call_id: call.id,
          customer_phone: bookingDetails.phone,
          duration: call.duration,
          recording_url: call.recordingUrl,
          transcript: transcript.text,
          job_id: job.id,
          outcome: bookingDetails.booked ? 'booked' : 'no_booking',
        })

      return NextResponse.json({ success: true, job_id: job.id })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Vapi webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function extractBookingFromTranscript(transcript: any) {
  // Use Vapi's structured output or parse transcript
  return {
    business_id: transcript.metadata.business_id,
    customer_name: transcript.variables.customer_name,
    phone: transcript.variables.customer_phone,
    address: transcript.variables.customer_address,
    service: transcript.variables.service_needed,
    preferred_date: transcript.variables.preferred_date,
    booked: transcript.variables.appointment_booked === 'yes',
  }
}
```

#### 3. Admin UI for AI Management

**`app/admin/ai-phone/page.tsx`** (NEW)
```typescript
'use client'

import { useState } from 'react'

export default function AIPhonePage() {
  const [aiEnabled, setAiEnabled] = useState(true)

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">AI Phone Receptionist</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Status</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600">AI Receptionist</p>
            <p className="text-sm text-gray-500">
              {aiEnabled ? 'Active - Answering calls' : 'Disabled'}
            </p>
          </div>
          <button
            onClick={() => setAiEnabled(!aiEnabled)}
            className={`px-4 py-2 rounded-lg ${
              aiEnabled ? 'bg-green-500' : 'bg-gray-300'
            } text-white`}
          >
            {aiEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Your AI Phone Number</h2>
        <p className="text-2xl font-mono">(555) 123-4567</p>
        <p className="text-sm text-gray-500 mt-2">
          Forward your main line to this number during business hours
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Configuration</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Business Hours</label>
            <input
              type="text"
              defaultValue="Monday-Friday 8am-5pm"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">AI Voice</label>
            <select className="w-full border rounded-lg px-3 py-2">
              <option>Jennifer (Female, Professional)</option>
              <option>Michael (Male, Friendly)</option>
              <option>Sarah (Female, Warm)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Services to Offer
            </label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 h-24"
              defaultValue="Plumbing repairs, Drain cleaning, Water heater installation"
            />
          </div>
        </div>

        <button className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg">
          Save Configuration
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Calls</h2>
        <div className="space-y-3">
          {/* Call history list */}
          <CallHistoryItem />
        </div>
      </div>
    </div>
  )
}
```

---

## Business Model

### Pricing Tiers

#### Tier 1: SaaS Only - $99/month
**What's Included:**
- Job management
- Customer database
- Tech mobile app
- Customer portal
- Invoicing
- Basic support

**Target Customer:**
- Small operators (1-3 techs)
- Already have receptionist
- Price-sensitive

**Your Costs:** ~$20/month (hosting)
**Margin:** 80%

#### Tier 2: Complete Package - $299/month ⭐
**What's Included:**
- Everything in Tier 1
- AI Phone Receptionist
- Unlimited calls (fair use: 200/month)
- Priority support
- Call recordings & transcripts
- Monthly performance reports

**Target Customer:**
- 3-10 techs
- Want to automate booking
- Growth-focused

**Your Costs:** ~$75/month ($50 AI calls + $25 hosting)
**Margin:** 75%

#### Tier 3: Enterprise - $499/month
**What's Included:**
- Everything in Tier 2
- Multi-location support
- Custom integrations
- API access
- Dedicated success manager
- Unlimited calls (fair use: 500/month)

**Target Customer:**
- 10+ techs
- Multiple locations
- Need custom features

**Your Costs:** ~$150/month ($125 AI + $25 hosting)
**Margin:** 70%

### Revenue Projections

**Year 1 Goals:**
- 20 Tier 1 customers = $1,980/month
- 30 Tier 2 customers = $8,970/month
- 5 Tier 3 customers = $2,495/month
- **Total MRR: $13,445**
- **Annual: ~$161,000**

**Year 2 Goals:**
- 50 Tier 1 = $4,950/month
- 100 Tier 2 = $29,900/month
- 20 Tier 3 = $9,980/month
- **Total MRR: $44,830**
- **Annual: ~$538,000**

---

## Implementation Timeline

### Phase 1: Foundation (Week 1-2)
- [ ] Choose AI provider (Vapi recommended)
- [ ] Set up Vapi account
- [ ] Create assistant template
- [ ] Build webhook integration
- [ ] Test with sample calls

### Phase 2: Admin Interface (Week 3-4)
- [ ] Build AI phone settings page
- [ ] Add call history dashboard
- [ ] Create configuration UI
- [ ] Add phone number provisioning
- [ ] Build call analytics

### Phase 3: Customer Onboarding (Week 5-6)
- [ ] Add AI phone to signup flow
- [ ] Create setup wizard
- [ ] Build test call feature
- [ ] Add training documentation
- [ ] Create video tutorials

### Phase 4: Billing & Launch (Week 7-8)
- [ ] Set up tiered pricing in Stripe
- [ ] Add usage tracking
- [ ] Create upgrade/downgrade flows
- [ ] Soft launch with 5 beta customers
- [ ] Collect feedback & iterate

---

## Cost Analysis

### Per-Customer Costs (Tier 2)

**Fixed Costs:**
- Hosting (Vercel): $5/month
- Database (Supabase): $10/month
- Monitoring: $5/month
- **Total Fixed: $20/month**

**Variable Costs:**
- AI calls (100 calls/mo × 5 min avg × $0.06/min): $30/month
- SMS notifications (50 SMS × $0.01): $0.50/month
- Email (unlimited via Resend): $0/month
- **Total Variable: ~$30/month**

**Total Cost per Customer: ~$50/month**
**Price: $299/month**
**Gross Margin: 83%**

### Break-Even Analysis

**Fixed Costs (Business):**
- Your salary: $5,000/month
- Tools & software: $200/month
- Marketing: $1,000/month
- **Total: $6,200/month**

**Break-even:** 25 Tier 2 customers
**At 25 customers:** $7,475 revenue - $1,250 costs - $6,200 overhead = $25 profit

**Profitable at:** 30 customers = $2,770/month profit

---

## Marketing Position

### Value Proposition

**For Small Trade Businesses:**
"Stop missing calls. Our AI receptionist books appointments 24/7 while you focus on the work."

**Key Benefits:**
1. Never miss a call again (24/7 availability)
2. Book more jobs automatically
3. Save $3,000+/month on receptionist salary
4. Professional image
5. All-in-one solution (CRM + AI)

### Competitive Advantage

**vs. Traditional Answering Service:**
- Cheaper ($299 vs $800/month)
- Actually books appointments (vs just taking messages)
- Integrated with your CRM

**vs. Stand-alone AI Phone:**
- No separate login/system
- Jobs go directly into your workflow
- Tech gets notified automatically

**vs. Manual Receptionist:**
- Works 24/7
- Never sick/vacation
- Costs 90% less
- Never forgets to enter job

---

## Next Steps

### Immediate Actions (This Week)
1. Sign up for Vapi.ai account
2. Create test assistant
3. Make test call to validate
4. Build webhook integration
5. Test end-to-end flow

### Short Term (This Month)
1. Build admin UI
2. Add to pricing page
3. Create onboarding flow
4. Test with 3 beta customers
5. Collect feedback

### Long Term (3 Months)
1. Launch publicly
2. Acquire 20 paying customers
3. Iterate based on usage
4. Add advanced features (call routing, etc.)
5. Build case studies

---

## Success Metrics

### Track These KPIs

**Product Metrics:**
- Calls answered per day
- Booking conversion rate (target: 40%+)
- Average call duration (target: 3-5 min)
- Customer satisfaction (target: 4.5/5 stars)

**Business Metrics:**
- Customers on Tier 2 (AI included)
- Churn rate (target: <5%/month)
- Upgrade rate Tier 1 → Tier 2 (target: 30%)
- Net Revenue Retention (target: 110%+)

**Financial Metrics:**
- MRR growth
- Customer Acquisition Cost
- Lifetime Value
- Gross Margin

---

## Risk Mitigation

### Potential Issues

1. **AI makes booking mistakes**
   - Solution: Human review queue for first 30 days
   - Solution: Confidence scoring, escalate low-confidence calls

2. **Calls are expensive**
   - Solution: Fair use policy (200 calls/month)
   - Solution: Overage charges ($1/call over limit)

3. **Customers don't trust AI**
   - Solution: "Powered by AI" but sounds human
   - Solution: Offer money-back guarantee

4. **Technical issues (API downtime)**
   - Solution: Fallback to voicemail + notification
   - Solution: SLA guarantees (99.9% uptime)

---

## Conclusion

**Recommendation:** Launch with bundled package

**Rationale:**
1. ✅ Higher LTV ($299/mo vs $99/mo)
2. ✅ Better margins (75% vs 80% but 3x revenue)
3. ✅ Stronger differentiation
4. ✅ More value for customers
5. ✅ Sticky (hard to leave)

**Timeline:** 8 weeks to launch

**Investment Needed:**
- Vapi account: $0 to start (pay as you go)
- Development: Your time (8 weeks part-time)
- Beta testing: 5 customers (free for 30 days)

**Expected ROI:**
- Month 3: 10 customers = $2,990 MRR
- Month 6: 25 customers = $7,475 MRR
- Month 12: 50 customers = $14,950 MRR

🚀 **You're ready to build this!**
