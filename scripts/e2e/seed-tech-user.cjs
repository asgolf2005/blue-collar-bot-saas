const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function loadDotEnvLocalIfNeeded() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return

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

loadDotEnvLocalIfNeeded()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const E2E_TECH_EMAIL = process.env.E2E_TECH_EMAIL || 'e2e.tech@example.com'
const E2E_TECH_PASSWORD = process.env.E2E_TECH_PASSWORD || 'E2E-Tech-12345!'
const E2E_TECH_NAME = process.env.E2E_TECH_NAME || 'E2E Tech User'
const E2E_BIZ_NAME = process.env.E2E_BIZ_NAME || 'E2E Tech Demo Business'
const E2E_CUSTOMER_NAME = process.env.E2E_CUSTOMER_NAME || 'E2E Customer'
const E2E_CUSTOMER_PHONE = process.env.E2E_CUSTOMER_PHONE || '+1-555-010-9000'
const E2E_SERVICE_NAME = process.env.E2E_SERVICE_NAME || 'E2E Service Call'
const JOB_PREFIX = '[E2E TECH]'

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

function atDay(dayOffset, hour, minute, durationMinutes = 90) {
  const start = new Date()
  start.setDate(start.getDate() + dayOffset)
  start.setHours(hour, minute, 0, 0)

  const end = new Date(start)
  end.setMinutes(end.getMinutes() + durationMinutes)

  return { start: start.toISOString(), end: end.toISOString() }
}

async function findAuthUserByEmail(email) {
  let page = 1

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    })

    if (error) throw error

    const found = (data?.users || []).find((user) => (user.email || '').toLowerCase() === email.toLowerCase())
    if (found) return found

    if (!data?.users || data.users.length < 1000) break
    page += 1
  }

  return null
}

async function ensureBusiness() {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('businesses')
    .select('id, name')
    .eq('name', E2E_BIZ_NAME)
    .order('created_at', { ascending: true })
    .limit(1)

  if (existingError) throw existingError
  if (existing && existing.length > 0) return existing[0].id

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('businesses')
    .insert({ name: E2E_BIZ_NAME })
    .select('id')
    .single()

  if (insertError) throw insertError
  return inserted.id
}

async function ensureTechAuthUser() {
  let authUser = await findAuthUserByEmail(E2E_TECH_EMAIL)

  if (!authUser) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: E2E_TECH_EMAIL,
      password: E2E_TECH_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: E2E_TECH_NAME },
    })

    if (error) throw error
    authUser = data.user
  } else {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      password: E2E_TECH_PASSWORD,
      email_confirm: true,
      user_metadata: {
        ...(authUser.user_metadata || {}),
        full_name: E2E_TECH_NAME,
      },
    })

    if (error) throw error
  }

  return authUser
}

async function upsertUserProfile(authUserId, businessId) {
  const payload = {
    id: authUserId,
    business_id: businessId,
    email: E2E_TECH_EMAIL,
    phone: null,
    role: 'tech',
  }

  const primary = await supabaseAdmin
    .from('users')
    .upsert(
      {
        ...payload,
        full_name: E2E_TECH_NAME,
      },
      { onConflict: 'id' }
    )

  if (!primary.error) return

  if (!primary.error.message?.toLowerCase().includes('full_name')) {
    throw primary.error
  }

  const fallback = await supabaseAdmin
    .from('users')
    .upsert(
      {
        ...payload,
        name: E2E_TECH_NAME,
      },
      { onConflict: 'id' }
    )

  if (fallback.error) throw fallback.error
}

async function ensureCustomer(businessId) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('customers')
    .select('id, name')
    .eq('business_id', businessId)
    .eq('phone', E2E_CUSTOMER_PHONE)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) return existing.id

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('customers')
    .insert({
      business_id: businessId,
      name: E2E_CUSTOMER_NAME,
      phone: E2E_CUSTOMER_PHONE,
      email: 'e2e.customer@example.com',
      address: '123 E2E Test Ave, San Francisco, CA',
    })
    .select('id')
    .single()

  if (insertError) throw insertError
  return inserted.id
}

async function ensureService(businessId) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('services')
    .select('id, name')
    .eq('business_id', businessId)
    .eq('name', E2E_SERVICE_NAME)
    .order('created_at', { ascending: true })
    .limit(1)

  if (existingError) throw existingError
  if (existing && existing.length > 0) return existing[0].id

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('services')
    .insert({
      business_id: businessId,
      name: E2E_SERVICE_NAME,
      description: 'Seeded service for Playwright tech E2E',
      base_price: 250,
      duration_minutes: 90,
      is_active: true,
    })
    .select('id')
    .single()

  if (insertError) throw insertError
  return inserted.id
}

async function clearSeededJobs(technicianId, businessId) {
  const { data: existingJobs, error: findError } = await supabaseAdmin
    .from('jobs')
    .select('id')
    .eq('business_id', businessId)
    .eq('technician_id', technicianId)
    .ilike('description', `${JOB_PREFIX}%`)

  if (findError) throw findError

  const ids = (existingJobs || []).map((job) => job.id)
  if (!ids.length) return 0

  const { error: deleteError } = await supabaseAdmin
    .from('jobs')
    .delete()
    .in('id', ids)

  if (deleteError) throw deleteError
  return ids.length
}

async function seedJobs({ businessId, customerId, technicianId, serviceId }) {
  const windows = {
    completed: atDay(0, 8, 0, 75),
    enRoute: atDay(0, 10, 0, 90),
    inProgress: atDay(0, 13, 0, 120),
    scheduled: atDay(0, 16, 0, 90),
    tomorrow: atDay(1, 10, 30, 90),
  }

  const jobsPayload = [
    {
      business_id: businessId,
      customer_id: customerId,
      technician_id: technicianId,
      status: 'completed',
      scheduled_start: windows.completed.start,
      scheduled_end: windows.completed.end,
      description: `${JOB_PREFIX} Completed maintenance walkthrough`,
      urgency: 'medium',
      source: 'manual',
      labor_hours: 1.25,
      labor_rate: 140,
      parts_cost: 80,
      total_cost: 255,
    },
    {
      business_id: businessId,
      customer_id: customerId,
      technician_id: technicianId,
      status: 'on_the_way',
      scheduled_start: windows.enRoute.start,
      scheduled_end: windows.enRoute.end,
      description: `${JOB_PREFIX} En route urgent repair`,
      urgency: 'high',
      source: 'manual',
      labor_hours: null,
      labor_rate: null,
      parts_cost: 0,
      total_cost: null,
    },
    {
      business_id: businessId,
      customer_id: customerId,
      technician_id: technicianId,
      status: 'in_progress',
      scheduled_start: windows.inProgress.start,
      scheduled_end: windows.inProgress.end,
      description: `${JOB_PREFIX} In-progress diagnostics`,
      urgency: 'medium',
      source: 'manual',
      labor_hours: null,
      labor_rate: null,
      parts_cost: 0,
      total_cost: null,
    },
    {
      business_id: businessId,
      customer_id: customerId,
      technician_id: technicianId,
      status: 'scheduled',
      scheduled_start: windows.scheduled.start,
      scheduled_end: windows.scheduled.end,
      description: `${JOB_PREFIX} Scheduled installation`,
      urgency: 'low',
      source: 'manual',
      labor_hours: null,
      labor_rate: null,
      parts_cost: 0,
      total_cost: null,
    },
    {
      business_id: businessId,
      customer_id: customerId,
      technician_id: technicianId,
      status: 'scheduled',
      scheduled_start: windows.tomorrow.start,
      scheduled_end: windows.tomorrow.end,
      description: `${JOB_PREFIX} Tomorrow follow-up visit`,
      urgency: 'low',
      source: 'manual',
      labor_hours: null,
      labor_rate: null,
      parts_cost: 0,
      total_cost: null,
    },
  ]

  const { data: insertedJobs, error: insertJobsError } = await supabaseAdmin
    .from('jobs')
    .insert(jobsPayload)
    .select('id')

  if (insertJobsError) throw insertJobsError

  const jobServicesPayload = (insertedJobs || []).map((job) => ({
    job_id: job.id,
    service_id: serviceId,
    quantity: 1,
    notes: 'Seeded by e2e tech setup script',
  }))

  if (jobServicesPayload.length > 0) {
    const { error: insertJobServicesError } = await supabaseAdmin
      .from('job_services')
      .insert(jobServicesPayload)

    if (insertJobServicesError) throw insertJobServicesError
  }

  return insertedJobs?.length || 0
}

async function main() {
  console.log('Seeding deterministic tech E2E account and jobs...')

  const businessId = await ensureBusiness()
  const authUser = await ensureTechAuthUser()

  if (!authUser?.id) {
    throw new Error('Unable to create or locate auth user for E2E tech')
  }

  await upsertUserProfile(authUser.id, businessId)

  const customerId = await ensureCustomer(businessId)
  const serviceId = await ensureService(businessId)
  const removed = await clearSeededJobs(authUser.id, businessId)
  const inserted = await seedJobs({
    businessId,
    customerId,
    technicianId: authUser.id,
    serviceId,
  })

  console.log('E2E tech seed complete.')
  console.log(
    JSON.stringify(
      {
        businessId,
        technicianId: authUser.id,
        email: E2E_TECH_EMAIL,
        password: E2E_TECH_PASSWORD,
        removedSeedJobs: removed,
        insertedSeedJobs: inserted,
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error('Failed to seed E2E tech data:', error)
  process.exit(1)
})
