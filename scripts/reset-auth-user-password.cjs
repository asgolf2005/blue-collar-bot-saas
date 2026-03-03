const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function loadDotEnvLocalIfNeeded() {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return
  }

  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return

  const content = fs.readFileSync(envPath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const [key, ...rest] = line.split('=')
    if (!key || rest.length === 0) continue

    const rawValue = rest.join('=').trim()
    const value =
      rawValue.startsWith('"') && rawValue.endsWith('"')
        ? rawValue.slice(1, -1)
        : rawValue

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

async function findAuthUserByEmail(adminClient, email) {
  let page = 1
  const target = email.toLowerCase()

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 1000,
    })
    if (error) throw error

    const users = data?.users || []
    const found = users.find((u) => (u.email || '').toLowerCase() === target)
    if (found) return found

    if (users.length < 1000) break
    page += 1
  }

  return null
}

async function main() {
  loadDotEnvLocalIfNeeded()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const email = process.env.TARGET_EMAIL || 'andysharma@outlook.com.au'
  const newPassword = process.env.NEW_PASSWORD

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  if (!newPassword) {
    console.error('Missing NEW_PASSWORD env var')
    console.error(
      'Example: $env:TARGET_EMAIL="andysharma@outlook.com.au"; $env:NEW_PASSWORD="MyNewPass123!"; node scripts/reset-auth-user-password.cjs'
    )
    process.exit(1)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const authUser = await findAuthUserByEmail(adminClient, email)
  if (!authUser) {
    console.error(`No auth user found for ${email}`)
    process.exit(1)
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(authUser.id, {
    email,
    password: newPassword,
    email_confirm: true,
  })
  if (updateError) {
    console.error('Failed to update auth user:', updateError.message)
    process.exit(1)
  }

  // Keep public.users email in sync by auth user id.
  const { error: profileError } = await adminClient
    .from('users')
    .update({ email })
    .eq('id', authUser.id)

  if (profileError) {
    console.error('Warning: updated auth password but failed to sync public.users email:', profileError.message)
  }

  // Optional verification with anon client.
  if (anonKey) {
    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error: signInError } = await anonClient.auth.signInWithPassword({
      email,
      password: newPassword,
    })
    if (signInError) {
      console.error('Password set, but sign-in verification failed:', signInError.message)
      process.exit(1)
    }
  }

  console.log('Success')
  console.log(`User ID: ${authUser.id}`)
  console.log(`Email: ${email}`)
  console.log('Password has been reset and email confirmed.')
}

main().catch((err) => {
  console.error('Unexpected error:', err?.message || err)
  process.exit(1)
})
