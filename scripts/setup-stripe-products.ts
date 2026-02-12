/**
 * Stripe Product Setup Script
 *
 * Run this once to create subscription products and prices in Stripe.
 *
 * Usage:
 *   npx tsx scripts/setup-stripe-products.ts
 *
 * This will output the product and price IDs that you need to add to your .env.local file.
 */

import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is required')
  process.exit(1)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
})

async function setupStripeProducts() {
  console.log('🚀 Setting up Stripe products and prices...\n')

  try {
    // ========================================
    // STARTER TIER - $99/month
    // ========================================
    console.log('📦 Creating Starter tier product...')
    const starterProduct = await stripe.products.create({
      name: 'Blue Collar Bot - Starter',
      description: 'Perfect for small trade businesses with 1-3 technicians',
      metadata: {
        tier: 'starter',
        features: JSON.stringify([
          'Job management',
          'Customer database',
          'Tech mobile app',
          'Customer portal',
          'Invoicing & payments',
          'Basic support',
        ]),
      },
    })

    const starterPrice = await stripe.prices.create({
      product: starterProduct.id,
      unit_amount: 9900, // $99.00
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        tier: 'starter',
      },
    })

    console.log(`✅ Starter Product ID: ${starterProduct.id}`)
    console.log(`✅ Starter Price ID: ${starterPrice.id}\n`)

    // ========================================
    // PROFESSIONAL TIER - $299/month
    // ========================================
    console.log('📦 Creating Professional tier product...')
    const proProduct = await stripe.products.create({
      name: 'Blue Collar Bot - Professional',
      description: 'Complete package with AI Phone Receptionist for growing businesses',
      metadata: {
        tier: 'professional',
        features: JSON.stringify([
          'Everything in Starter',
          'AI Phone Receptionist',
          'Unlimited AI calls (200/month fair use)',
          'Priority support',
          'Call recordings & transcripts',
        ]),
      },
    })

    const proPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 29900, // $299.00
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        tier: 'professional',
      },
    })

    console.log(`✅ Professional Product ID: ${proProduct.id}`)
    console.log(`✅ Professional Price ID: ${proPrice.id}\n`)

    // ========================================
    // ENTERPRISE TIER - $499/month
    // ========================================
    console.log('📦 Creating Enterprise tier product...')
    const enterpriseProduct = await stripe.products.create({
      name: 'Blue Collar Bot - Enterprise',
      description: 'Full-featured solution for multi-location businesses',
      metadata: {
        tier: 'enterprise',
        features: JSON.stringify([
          'Everything in Professional',
          'Multi-location support',
          'Custom integrations',
          'API access',
          'Dedicated success manager',
          'Unlimited calls (500/month fair use)',
        ]),
      },
    })

    const enterprisePrice = await stripe.prices.create({
      product: enterpriseProduct.id,
      unit_amount: 49900, // $499.00
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        tier: 'enterprise',
      },
    })

    console.log(`✅ Enterprise Product ID: ${enterpriseProduct.id}`)
    console.log(`✅ Enterprise Price ID: ${enterprisePrice.id}\n`)

    // ========================================
    // OUTPUT ENVIRONMENT VARIABLES
    // ========================================
    console.log('═'.repeat(80))
    console.log('✅ All products and prices created successfully!\n')
    console.log('📝 Add these to your .env.local file:\n')
    console.log('# Stripe Product IDs')
    console.log(`STRIPE_PRODUCT_STARTER_ID=${starterProduct.id}`)
    console.log(`STRIPE_PRODUCT_PRO_ID=${proProduct.id}`)
    console.log(`STRIPE_PRODUCT_ENTERPRISE_ID=${enterpriseProduct.id}`)
    console.log('')
    console.log('# Stripe Price IDs')
    console.log(`STRIPE_PRICE_STARTER_ID=${starterPrice.id}`)
    console.log(`STRIPE_PRICE_PRO_ID=${proPrice.id}`)
    console.log(`STRIPE_PRICE_ENTERPRISE_ID=${enterprisePrice.id}`)
    console.log('═'.repeat(80))
    console.log('\n💡 Next steps:')
    console.log('1. Copy the environment variables above to your .env.local file')
    console.log('2. Restart your development server')
    console.log('3. Test subscription creation\n')

  } catch (error) {
    console.error('❌ Error setting up Stripe products:', error)
    process.exit(1)
  }
}

// Run the setup
setupStripeProducts()
