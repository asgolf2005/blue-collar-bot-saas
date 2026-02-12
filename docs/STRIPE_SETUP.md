# Stripe Setup Guide

## Step 1: Create Stripe Account

1. Go to https://stripe.com
2. Click "Start now" or "Sign up"
3. Fill in your business details
4. Verify your email

## Step 2: Get Your API Keys

### Test Mode Keys (for development):
1. In Stripe Dashboard, click "Developers" in the top right
2. Click "API keys" in the left sidebar
3. You'll see two keys:
   - **Publishable key**: Starts with `pk_test_...`
   - **Secret key**: Click "Reveal test key" - starts with `sk_test_...`

### Add to Your Project:
1. Create or edit `.env.local` in your project root:
```env
# Stripe Keys (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

2. **IMPORTANT**: Add `.env.local` to your `.gitignore` (should already be there)

## Step 3: Install Stripe Package

Run in your terminal:
```bash
npm install stripe @stripe/stripe-js
```

## Step 4: Set Up Webhook (for production)

Webhooks notify your app when payments succeed/fail.

### For Local Development:
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Run: `stripe login`
3. Run: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. Copy the webhook secret (starts with `whsec_`) to your `.env.local`

### For Production:
1. In Stripe Dashboard → Developers → Webhooks
2. Click "+ Add endpoint"
3. Enter your URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copy the webhook secret to your production environment variables

## Step 5: Enable Payment Methods

1. In Stripe Dashboard → Settings → Payment methods
2. Enable:
   - ✅ Card payments
   - ✅ Apple Pay
   - ✅ Google Pay
   - ✅ Link

## Step 6: Test Cards

Use these test card numbers in test mode:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Any future expiry date and any 3-digit CVC will work.

## Step 7: Going Live

When ready for production:
1. Complete business verification in Stripe Dashboard
2. Get your live API keys (start with `pk_live_` and `sk_live_`)
3. Update environment variables with live keys
4. Set up production webhook endpoint

## Helpful Links
- Stripe Dashboard: https://dashboard.stripe.com
- Stripe Docs: https://stripe.com/docs
- Test Cards: https://stripe.com/docs/testing
