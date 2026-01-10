import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/resend'
import { buildCustomerWelcomeEmail } from '@/lib/email/templates'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

/**
 * Auto-create a customer portal account
 * Called when AI creates a new job/customer
 */
export async function createCustomerAccount(customerId: string, customerEmail: string | null) {
  try {
    // Get customer info
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('*, business:businesses(name)')
      .eq('id', customerId)
      .single()

    if (customerError || !customer) {
      console.error('Customer not found:', customerError)
      return { success: false, error: 'Customer not found' }
    }

    // Check if customer already has an account
    if (customer.user_id) {
      console.log('Customer already has an account')
      return { success: true, alreadyExists: true }
    }

    // Use email if provided, otherwise create one from phone
    let email = customerEmail
    if (!email) {
      // Generate email from phone number
      const cleanPhone = customer.phone.replace(/[^0-9]/g, '')
      email = `${cleanPhone}@customer.bluecollarbot.com`
    }

    // Generate a random secure password
    const password = generateSecurePassword()

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm
      user_metadata: {
        full_name: customer.name,
        customer_id: customerId,
      },
    })

    if (authError) {
      console.error('Failed to create auth user:', authError)
      return { success: false, error: authError.message }
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to create user' }
    }

    // Link auth user to customer record
    const { error: updateError } = await supabaseAdmin
      .from('customers')
      .update({
        user_id: authData.user.id,
        portal_access: true,
        email: email,
      })
      .eq('id', customerId)

    if (updateError) {
      console.error('Failed to link user to customer:', updateError)
      // Try to delete the auth user since linking failed
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return { success: false, error: updateError.message }
    }

    if (customerEmail) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      const loginUrl = `${siteUrl}/login`
      const businessName = customer.business?.name || 'Your Service Provider'

      try {
        const emailContent = buildCustomerWelcomeEmail({
          customerName: customer.name,
          businessName,
          loginUrl,
          email,
          tempPassword: password,
        })

        await sendEmail({
          to: email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        })
      } catch (emailError) {
        console.error('Welcome email error:', emailError)
      }
    } else {
      console.warn('Skipping welcome email: no customer email provided')
    }

    console.log(`Customer account created successfully for ${customer.name}`)

    return {
      success: true,
      userId: authData.user.id,
      email,
      tempPassword: password,
    }
  } catch (error: any) {
    console.error('Error creating customer account:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Generate a secure random password
 */
function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  const randomValues = new Uint8Array(length)

  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(randomValues)
  } else {
    // Node.js environment
    const crypto = require('crypto')
    crypto.randomFillSync(randomValues)
  }

  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length]
  }

  return password
}

/**
 * Send password reset link to customer
 * Allows customer to set their own password on first login
 */
export async function sendPasswordResetLink(customerEmail: string) {
  try {
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(customerEmail, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/customer`,
    })

    if (error) {
      console.error('Failed to send password reset:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error sending password reset:', error)
    return { success: false, error: error.message }
  }
}
