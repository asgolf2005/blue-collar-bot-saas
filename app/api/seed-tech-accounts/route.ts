import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

const MAX_TECHS = 25
const ACTIVE_STATUSES = ['on_the_way', 'arrived', 'in_progress'] as const

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const requestedCount = typeof body.techCount === 'number' ? body.techCount : 6
    const techCount = Math.min(Math.max(Math.floor(requestedCount), 1), MAX_TECHS)
    const emailPrefix = typeof body.emailPrefix === 'string' && body.emailPrefix.trim().length > 0
      ? body.emailPrefix.trim()
      : 'demo-tech'
    const assignJanJobs = body.assignJanJobs !== false

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL'
      }, { status: 500 })
    }

    const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const runId = randomBytes(3).toString('hex')
    const businessSlug = profile.business_id.slice(0, 6)
    const createdTechs: Array<{ id: string; email: string; password: string; full_name: string }> = []

    for (let i = 0; i < techCount; i += 1) {
      const suffix = String(i + 1).padStart(2, '0')
      const fullName = `Demo Tech ${suffix}`
      const email = `${emailPrefix}+${businessSlug}-${runId}-${suffix}@demo.com`
      const password = `T!${randomBytes(9).toString('base64url')}`

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      })

      if (authError && !authError.message.includes('already been registered')) {
        return NextResponse.json({ error: authError.message }, { status: 500 })
      }

      let userId = authData?.user?.id

      if (!userId) {
        // List users and find by email (getUserByEmail is not available in this version)
        const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        if (listError) {
          return NextResponse.json({ error: listError.message }, { status: 500 })
        }

        const existingUser = usersList?.users?.find((u: {email?: string}) => u.email === email)
        userId = existingUser?.id

        if (userId) {
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
          })
          if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 })
          }
        }
      }

      if (!userId) {
        return NextResponse.json({ error: `Failed to create tech ${email}` }, { status: 500 })
      }

      const { error: profileError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: userId,
          email,
          full_name: fullName,
          role: 'tech',
          business_id: profile.business_id
        }, { onConflict: 'id' })

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 })
      }

      createdTechs.push({ id: userId, email, password, full_name: fullName })
    }

    let assignedJobs = 0

    if (assignJanJobs && createdTechs.length > 0) {
      const { data: janJobs, error: janError } = await supabaseAdmin
        .from('jobs')
        .select('id')
        .eq('business_id', profile.business_id)
        .gte('scheduled_start', '2026-01-05T00:00:00.000Z')
        .lte('scheduled_start', '2026-01-06T23:59:59.999Z')

      if (janError) {
        return NextResponse.json({ error: janError.message }, { status: 500 })
      }

      if (janJobs) {
        for (let i = 0; i < janJobs.length; i += 1) {
          const job = janJobs[i]
          const tech = createdTechs[i % createdTechs.length]
          const status = ACTIVE_STATUSES[i % ACTIVE_STATUSES.length]
          const { error: updateError } = await supabaseAdmin
            .from('jobs')
            .update({ technician_id: tech.id, status })
            .eq('id', job.id)

          if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 })
          }

          assignedJobs += 1
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${createdTechs.length} tech accounts${assignJanJobs ? ` and assigned ${assignedJobs} Jan 5-6 jobs` : ''}.`,
      techs: createdTechs,
      assignedJobs
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
