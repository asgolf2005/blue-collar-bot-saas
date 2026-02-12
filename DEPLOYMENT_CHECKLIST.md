# ✅ Deployment Checklist

## Quick Status Check

Current Status: **Phase 2 Complete - Ready for Deployment**

- [x] Phase 1: Build passing, TypeScript errors fixed
- [x] Phase 2: Production guides created
- [ ] Phase 3: Deploy and test
- [ ] Phase 4: Go live

---

## 🚀 Deployment Steps (Vercel)

### Pre-Deployment (15 minutes)

#### 1. Create Supabase Project
- [ ] Sign up at https://supabase.com
- [ ] Create new project
- [ ] Save: URL, Anon Key, Service Role Key
- [ ] Run all 14 migrations (copy from `supabase/migrations/`)
- [ ] Enable Realtime for `notifications` table

#### 2. Get Stripe Keys
- [ ] Sign up at https://stripe.com
- [ ] Get test keys: `sk_test_...` and `pk_test_...`
- [ ] Save for .env.local

#### 3. Get Google Maps API Key
- [ ] Go to https://console.cloud.google.com
- [ ] Enable: Maps JavaScript API, Places API, Distance Matrix API
- [ ] Create API key
- [ ] Add restrictions (HTTP referrers: `*vercel.app/*`)

#### 4. Optional: Get Resend API Key
- [ ] Sign up at https://resend.com
- [ ] Get API key
- [ ] Use `onboarding@resend.dev` for testing (no domain verification needed)

---

### Deploy to Vercel (10 minutes)

#### 1. Install Vercel CLI
```bash
npm install -g vercel
```

#### 2. Login to Vercel
```bash
vercel login
```

#### 3. Deploy (First Time)
```bash
# From project root
vercel

# Answer prompts:
# ? Set up and deploy? Yes
# ? Which scope? (your account)
# ? Link to existing project? No
# ? What's your project's name? blue-collar-bot-saas
# ? In which directory is your code located? ./
```

This creates a **preview deployment** first (not production).

#### 4. Add Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

**CRITICAL - Required for app to work**:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=(leave empty for now, add after setup)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

**Optional but recommended**:
```
RESEND_API_KEY=re_...
FROM_EMAIL=onboarding@resend.dev
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

**Apply to**: Production, Preview, and Development

#### 5. Redeploy with Environment Variables
```bash
vercel --prod
```

---

### Post-Deployment Setup (20 minutes)

#### 1. Run Stripe Product Setup
```bash
# Locally with production Stripe keys in .env.local
npx tsx scripts/setup-stripe-products.ts
```

Copy output and add to Vercel environment variables:
```
STRIPE_PRODUCT_STARTER_ID=prod_xxxxx
STRIPE_PRODUCT_PRO_ID=prod_xxxxx
STRIPE_PRODUCT_ENTERPRISE_ID=prod_xxxxx
STRIPE_PRICE_STARTER_ID=price_xxxxx
STRIPE_PRICE_PRO_ID=price_xxxxx
STRIPE_PRICE_ENTERPRISE_ID=price_xxxxx
```

Then redeploy:
```bash
vercel --prod
```

#### 2. Set Up Stripe Webhook
- [ ] Go to Stripe Dashboard → Developers → Webhooks
- [ ] Click "Add endpoint"
- [ ] URL: `https://your-project.vercel.app/api/stripe/webhook`
- [ ] Events to send:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- [ ] Copy webhook signing secret
- [ ] Add to Vercel env vars: `STRIPE_WEBHOOK_SECRET=whsec_...`
- [ ] Redeploy: `vercel --prod`

#### 3. Test Stripe Webhook
- [ ] Stripe Dashboard → Webhooks → Your webhook
- [ ] Click "Send test webhook"
- [ ] Select `customer.subscription.created`
- [ ] Check webhook logs - should see "Success"

---

## 🧪 Testing Checklist (30 minutes)

### 1. Authentication
- [ ] Visit your Vercel URL
- [ ] Click "Sign Up"
- [ ] Enter email address
- [ ] Check email for magic link
- [ ] Click magic link
- [ ] Should be logged in

### 2. Onboarding
- [ ] Complete business setup form
- [ ] Upload logo (optional)
- [ ] Set primary color
- [ ] Click "Complete Setup"
- [ ] Should land on admin dashboard

### 3. Subscription (Critical)
- [ ] Go to Settings → Billing
- [ ] Click "Upgrade to Starter" ($99/month)
- [ ] Use Stripe test card: `4242 4242 4242 4242`
- [ ] Expiry: Any future date
- [ ] CVC: Any 3 digits
- [ ] Should see "Subscription Active"

### 4. Create Test Job
- [ ] Click "New Job"
- [ ] Create a customer
- [ ] Fill in job details
- [ ] Assign to yourself (you're the tech)
- [ ] Save
- [ ] Should see job in dashboard

### 5. Update Job Status
- [ ] Click on the job
- [ ] Change status to "Completed"
- [ ] Should update successfully

### 6. Create Invoice
- [ ] From job page, click "Create Invoice"
- [ ] Add line items
- [ ] Generate invoice
- [ ] Should see invoice created

### 7. Test Payment
- [ ] View invoice
- [ ] Click "Pay Invoice"
- [ ] Use test card again
- [ ] Should mark invoice as paid

---

## 🔒 Security Checklist

Before going live:

### Environment Variables
- [ ] All production keys (not test)
- [ ] Service role key is secret (starts with `ey...`)
- [ ] No keys hardcoded in code
- [ ] .env.local in .gitignore

### Stripe
- [ ] Using live keys for production: `sk_live_...`, `pk_live_...`
- [ ] Webhook secret configured
- [ ] Test mode for development

### Supabase
- [ ] RLS enabled on all tables
- [ ] Service role key secured
- [ ] Auth settings configured
- [ ] Database backups enabled (in Supabase dashboard)

### Vercel
- [ ] Environment variables set
- [ ] NEXT_PUBLIC_SITE_URL points to production domain
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active (automatic with Vercel)

---

## 🚨 Common Issues & Fixes

### Build Fails
**Error**: Missing environment variables
**Fix**: Check all required vars are in Vercel settings

### Auth Not Working
**Error**: Can't log in
**Fix**: Check `NEXT_PUBLIC_SITE_URL` matches your Vercel URL

### Stripe Errors
**Error**: "No such product"
**Fix**: Run `setup-stripe-products.ts` script

### Database Errors
**Error**: "relation does not exist"
**Fix**: Run all migrations in Supabase SQL editor

### Webhook Fails
**Error**: Stripe webhook 401 Unauthorized
**Fix**: Check `STRIPE_WEBHOOK_SECRET` is set correctly

---

## 📊 Monitoring

### Set Up (Optional but Recommended)

#### Vercel Analytics
```bash
npm install @vercel/analytics
```

Then add to `app/layout.tsx`:
```typescript
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

#### Error Tracking (Sentry)
1. Sign up at https://sentry.io
2. Create Next.js project
3. Follow integration guide
4. Free tier: 5,000 errors/month

---

## 🎯 Go-Live Checklist

### Before Announcing

- [ ] All tests passing
- [ ] Subscription flow working
- [ ] Payments processing
- [ ] Emails sending (if configured)
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Custom domain configured (optional)
- [ ] Privacy policy added (if required)
- [ ] Terms of service added (if required)

### After Launch

- [ ] Monitor errors in Vercel logs
- [ ] Check Stripe dashboard for payments
- [ ] Test customer signup flow
- [ ] Verify email delivery
- [ ] Check database for data integrity

---

## 💰 Cost Tracking

### Month 1 (Development/Testing)
- Vercel: Free (Hobby plan)
- Supabase: Free tier
- Stripe: Free (no transactions)
- **Total**: $0

### Month 2+ (Production)
- Vercel Pro: $20/month (recommended for production)
- Supabase Pro: $25/month
- Stripe: 2.9% + $0.30 per transaction
- Resend: $20/month (if using email)
- OpenAI: ~$10/month (if using AI assistant)
- **Total**: ~$75/month + transaction fees

---

## 📞 Support Resources

- **Vercel**: https://vercel.com/docs
- **Next.js**: https://nextjs.org/docs
- **Supabase**: https://supabase.com/docs
- **Stripe**: https://stripe.com/docs
- **Resend**: https://resend.com/docs

---

## ✅ Phase 2 Complete!

You now have:
- ✅ Production deployment guide
- ✅ Environment variables documented
- ✅ Stripe setup script ready
- ✅ Email integration guide
- ✅ Deployment checklist
- ✅ Testing procedures
- ✅ Security checklist

**Next**: Actually deploy to Vercel and test!

**Estimated Total Time**: 1-2 hours for first deployment
