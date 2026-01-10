import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

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
    const assignJanJobs = body.assignJanJobs !== false
    const onlyJanTechs = body.onlyJanTechs !== false

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

    const { data: techProfiles, error: techError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name')
      .eq('business_id', profile.business_id)
      .eq('role', 'tech')

    if (techError) {
      return NextResponse.json({ error: techError.message }, { status: 500 })
    }

    if (!techProfiles || techProfiles.length === 0) {
      return NextResponse.json({ error: 'No technician profiles found for this business.' }, { status: 400 })
    }

    const techsWithEmail = techProfiles.filter((tech) => tech.email && tech.email.trim().length > 0)
    const skippedTechs = techProfiles.filter((tech) => !tech.email || tech.email.trim().length === 0)

    if (techsWithEmail.length === 0) {
      return NextResponse.json({ error: 'No technician profiles have an email set.' }, { status: 400 })
    }

    let assignedJobs = 0
    const assignedTechIds = new Set<string>()

    if (assignJanJobs) {
      const { data: janJobs, error: janError } = await supabaseAdmin
        .from('jobs')
        .select('id')
        .eq('business_id', profile.business_id)
        .gte('scheduled_start', '2026-01-05T00:00:00.000Z')
        .lte('scheduled_start', '2026-01-06T23:59:59.999Z')

      if (janError) {
        return NextResponse.json({ error: janError.message }, { status: 500 })
      }

      if (janJobs && janJobs.length > 0) {
        for (let i = 0; i < janJobs.length; i += 1) {
          const job = janJobs[i]
          const tech = techsWithEmail[i % techsWithEmail.length]
          const status = ACTIVE_STATUSES[i % ACTIVE_STATUSES.length]
          const { error: updateError } = await supabaseAdmin
            .from('jobs')
            .update({ technician_id: tech.id, status })
            .eq('id', job.id)

          if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 })
          }

          assignedJobs += 1
          assignedTechIds.add(tech.id)
        }
      }
    }

    const targetTechs = onlyJanTechs && assignJanJobs
      ? techsWithEmail.filter((tech) => assignedTechIds.has(tech.id))
      : techsWithEmail

    if (onlyJanTechs && assignJanJobs && targetTechs.length === 0) {
      return NextResponse.json({
        error: 'No technicians were assigned to Jan 5-6 jobs. Seed jobs first or disable onlyJanTechs.'
      }, { status: 400 })
    }

    const createdTechs: Array<{ id: string; email: string; password: string; full_name: string }> = []

    for (const tech of targetTechs) {
      const password = `T!${randomBytes(9).toString('base64url')}`
      const fullName = tech.full_name || 'Technician'
      const email = tech.email!.trim()

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        id: tech.id,
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      })

      if (authError && !authError.message.includes('already been registered')) {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(tech.id, {
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName }
        })
        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 })
        }
      }

      const userId = authData?.user?.id || tech.id

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

    return NextResponse.json({
      success: true,
      message: `Created ${createdTechs.length} tech logins${assignJanJobs ? ` and assigned ${assignedJobs} Jan 5-6 jobs` : ''}.`,
      techs: createdTechs,
      assignedJobs,
      skippedTechs: skippedTechs.map((tech) => ({ id: tech.id, full_name: tech.full_name }))
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
