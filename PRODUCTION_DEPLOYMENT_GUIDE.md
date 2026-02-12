# 🚀 Production Deployment Guide

## Overview
This guide walks you through deploying Blue Collar Bot SaaS to production.

**Estimated Setup Time**: 2-3 hours
**Cost**: ~$85/month (see breakdown below)

---

## ✅ Pre-Deployment Checklist

### Phase 1: COMPLETE ✅
- [x] Build passing (TypeScript errors fixed)
- [x] Route protection (proxy.ts middleware)
- [x] All dependencies installed

### Phase 2: Production Prep (YOU ARE HERE)
- [ ] Environment variables configured
- [ ] Stripe products created
- [ ] Email notifications wired
- [ ] Deployment configured
- [ ] Integrations tested

---

## 📋 Required Services & Setup Order

### 1. Supabase (Database & Auth) - FREE to start
**Priority**: CRITICAL
**Setup Time**: 15 minutes
**Cost**: Free tier → $25/month Pro

#### Steps:
1. Go to https://supabase.com
2. Create new project
3. **Save these values**:
   - Project URL: `NEXT_PUBLIC_SUPABASE_URL`
   - Anon/Public Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service Role Key: `SUPABASE_SERVICE_ROLE_KEY` ⚠️ KEEP SECRET

4. **Run migrations**:
   ```bash
   # Copy each file from supabase/migrations/ and run in SQL Editor
   # Order: 001 through 014
   ```

5. **Enable Realtime**:
   - Go to Database → Replication
   - Enable for `notifications` table

6. **Configure Auth**:
   - Authentication → Providers
   - Enable Email (Magic Link)
   - Set Site URL to your production domain

---

### 2. Stripe (Payments & Subscriptions) - FREE to start
**Priority**: CRITICAL
**Setup Time**: 20 minutes
**Cost**: 2.9% + $0.30 per transaction (no monthly fee)

#### Steps:
1. Go to https://stripe.com/dashboard
2. Get API keys from Developers → API keys:
   - `STRIPE_SECRET_KEY` (sk_test_... for development)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_test_...)

3. **Create Products** (run this script):
   ```bash
   # Make sure STRIPE_SECRET_KEY is in .env.local first
   npx tsx scripts/setup-stripe-products.ts
   ```

   This creates:
   - **Starter**: $99/month (10 jobs/month, 1 user)
   - **Professional**: $299/month (100 jobs/month, 5 users)
   - **Enterprise**: $499/month (unlimited jobs, unlimited users)

4. **Copy output** to .env.local:
   ```env
   STRIPE_PRODUCT_STARTER_ID=prod_xxxxx
   STRIPE_PRODUCT_PRO_ID=prod_xxxxx
   STRIPE_PRODUCT_ENTERPRISE_ID=prod_xxxxx
   STRIPE_PRICE_STARTER_ID=price_xxxxx
   STRIPE_PRICE_PRO_ID=price_xxxxx
   STRIPE_PRICE_ENTERPRISE_ID=price_xxxxx
   ```

5. **Set up webhooks**:
   - Developers → Webhooks → Add endpoint
   - URL: `https://yourdomain.com/api/stripe/webhook`
   - Events: `customer.subscription.*`, `invoice.*`, `payment_intent.*`
   - Copy webhook secret: `STRIPE_WEBHOOK_SECRET`

---

### 3. Google Maps API - $200/month free credit
**Priority**: HIGH
**Setup Time**: 10 minutes
**Cost**: Free (within $200/month credit)

#### Steps:
1. Go to https://console.cloud.google.com
2. Enable these APIs:
   - Maps JavaScript API
   - Places API
   - Distance Matrix API
3. Create API key with restrictions:
   - HTTP referrers: `yourdomain.com/*`
   - API restrictions: Maps, Places, Distance Matrix only
4. Copy key: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

---

### 4. Resend (Email) - FREE to start
**Priority**: HIGH
**Setup Time**: 10 minutes
**Cost**: Free (3,000 emails/month) → $20/month (10,000 emails)

#### Steps:
1. Go to https://resend.com
2. Add and verify your domain (DNS records)
3. Create API key: `RESEND_API_KEY`
4. Set from email: `FROM_EMAIL=noreply@yourdomain.com`

**Quick Start**: Use `onboarding@resend.dev` for testing (no domain verification needed)

---

### 5. OpenAI (Admin Assistant) - Pay as you go
**Priority**: MEDIUM
**Setup Time**: 5 minutes
**Cost**: ~$5-20/month (depends on usage)

#### Steps:
1. Go to https://platform.openai.com/api-keys
2. Create API key: `OPENAI_API_KEY`
3. Model: `OPENAI_MODEL=gpt-4o-mini` (already set)

---

### 6. Twilio (SMS Notifications) - OPTIONAL
**Priority**: LOW
**Setup Time**: 15 minutes
**Cost**: ~$20/month + per-SMS fees

#### Steps:
1. Go to https://console.twilio.com
2. Get a phone number
3. Copy credentials:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER` (format: +1234567890)

**Skip for now**: SMS is optional, can add later

---

### 7. n8n (AI Phone Receptionist) - OPTIONAL
**Priority**: LOW
**Setup Time**: 1 hour
**Cost**: $20/month (self-hosted) or free (self-hosted on your server)

#### Steps:
1. Set up n8n workflow (see n8n docs)
2. Generate webhook secret:
   ```bash
   openssl rand -base64 32
   ```
3. Set: `N8N_WEBHOOK_SECRET=<generated-secret>`

**Skip for now**: Can add AI caller later

---

## 🔧 Environment Variables Setup

### Required (CRITICAL - App won't work without these):
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Site URL
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Stripe Products (from setup script)
STRIPE_PRODUCT_STARTER_ID=prod_xxxxx
STRIPE_PRODUCT_PRO_ID=prod_xxxxx
STRIPE_PRODUCT_ENTERPRISE_ID=prod_xxxxx
STRIPE_PRICE_STARTER_ID=price_xxxxx
STRIPE_PRICE_PRO_ID=price_xxxxx
STRIPE_PRICE_ENTERPRISE_ID=price_xxxxx

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

### Recommended (Important features):
```env
# Email
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=noreply@yourdomain.com

# AI Assistant
OPENAI_API_KEY=sk-xxxxx
OPENAI_MODEL=gpt-4o-mini
```

### Optional (Can add later):
```env
# SMS
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890

# AI Phone Receptionist
N8N_WEBHOOK_SECRET=xxxxx

# Development Only
SEED_SECRET=dev-only-secret
```

---

## 📦 Deployment to Vercel

### 1. Install Vercel CLI (if not installed):
```bash
npm install -g vercel
```

### 2. Deploy:
```bash
vercel
```

### 3. Set Environment Variables in Vercel:
- Go to your project → Settings → Environment Variables
- Add all REQUIRED variables above
- Important: Use PRODUCTION keys (sk_live_, pk_live_, etc.)

### 4. Deploy to Production:
```bash
vercel --prod
```

---

## 🧪 Post-Deployment Testing

### 1. Test Authentication:
- [ ] Can sign up with email
- [ ] Receive magic link email
- [ ] Can log in successfully
- [ ] Redirected to correct dashboard based on role

### 2. Test Onboarding:
- [ ] Complete business setup
- [ ] Theme customization works
- [ ] Data saves correctly

### 3. Test Admin Features:
- [ ] Create a customer
- [ ] Create a job
- [ ] Assign technician
- [ ] Generate invoice
- [ ] Test Stripe checkout

### 4. Test Technician App:
- [ ] View assigned jobs
- [ ] Update job status
- [ ] Upload photos
- [ ] GPS location updates

### 5. Test Customer Portal:
- [ ] View appointments
- [ ] Track technician (GPS)
- [ ] View invoices
- [ ] Make payment

### 6. Test Integrations:
- [ ] Stripe webhooks working
- [ ] Email notifications sending
- [ ] SMS sending (if enabled)
- [ ] Google Maps loading
- [ ] AI assistant responding

---

## 💰 Monthly Cost Breakdown

### Minimum (Required Services):
- Supabase Pro: $25/month
- Vercel Pro: $20/month
- **Total**: $45/month + transaction fees

### Recommended Setup:
- Supabase Pro: $25/month
- Vercel Pro: $20/month
- Resend: $20/month (10k emails)
- OpenAI: ~$10/month
- Twilio SMS: ~$20/month
- **Total**: ~$95/month + transaction fees

### Full Setup (All Features):
- Above + n8n Cloud: $20/month
- **Total**: ~$115/month + transaction fees

**Transaction Fees**:
- Stripe: 2.9% + $0.30 per payment
- Typical: If you charge $200/job, Stripe fee = $6.10

---

## 🔒 Security Checklist

Before going live:
- [ ] All environment variables use production values
- [ ] Service role keys are secret (not in client code)
- [ ] Stripe uses live keys (sk_live_, pk_live_)
- [ ] RLS policies enabled on all Supabase tables
- [ ] CORS configured (only allow your domain)
- [ ] Rate limiting enabled (Vercel default)
- [ ] Webhook secrets are strong (32+ characters)
- [ ] .env.local in .gitignore (never commit secrets)

---

## 📞 Support & Troubleshooting

### Common Issues:

**Build fails on Vercel**:
- Check environment variables are set
- Ensure all required vars are present
- Check build logs for specific errors

**Stripe webhooks not working**:
- Verify webhook URL is correct
- Check webhook secret matches
- Look at Stripe dashboard → Webhooks → Event logs

**Emails not sending**:
- Verify domain in Resend
- Check DNS records (SPF, DKIM)
- Use `onboarding@resend.dev` for testing

**Database errors**:
- Run all migrations in order
- Enable RLS on tables
- Check service role key is correct

---

## ✅ Launch Checklist

Ready to launch when:
- [x] Build passing
- [ ] All required env vars set
- [ ] Stripe products created
- [ ] Database migrations run
- [ ] Domain configured
- [ ] SSL certificate active (Vercel auto)
- [ ] Email sending verified
- [ ] Payment flow tested
- [ ] First test customer created
- [ ] First test payment successful

---

## 🎉 You're Live!

Once deployed:
1. Create your first business account
2. Set up subscription in Stripe
3. Add your first customer
4. Create your first job
5. Test the full workflow

**Need help?** Check the docs/ folder for detailed guides on each feature.
