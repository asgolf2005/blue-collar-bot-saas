import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Profile = {
  business_id: string
  role: string
}

function resolveDate(raw?: string | null) {
  const candidate = (raw || '').trim()
  if (!candidate) {
    return new Date().toISOString().slice(0, 10)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return null
  return candidate
}

async function requireAdminProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single<Profile>()

  if (!profile || profile.role !== 'admin') {
    return { supabase, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { supabase, profile }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminProfile()
    if ('error' in auth) return auth.error

    const date = resolveDate(request.nextUrl.searchParams.get('date'))
    if (!date) {
      return NextResponse.json({ error: 'Invalid date. Expected YYYY-MM-DD.' }, { status: 400 })
    }

    const [{ data: technicians, error: techError }, { data: rows, error: rowsError }] = await Promise.all([
      auth.supabase
        .from('users')
        .select('id, full_name')
        .eq('business_id', auth.profile.business_id)
        .eq('role', 'tech')
        .order('full_name', { ascending: true }),
      auth.supabase
        .from('technician_daily_availability')
        .select('technician_id, is_working')
        .eq('business_id', auth.profile.business_id)
        .eq('work_date', date),
    ])

    if (techError) {
      return NextResponse.json({ error: techError.message }, { status: 500 })
    }
    if (rowsError) {
      return NextResponse.json({ error: rowsError.message }, { status: 500 })
    }

    const workingByTech = new Map((rows || []).map((row) => [row.technician_id as string, Boolean(row.is_working)]))

    return NextResponse.json({
      date,
      technicians: (technicians || []).map((tech) => ({
        id: tech.id,
        full_name: tech.full_name,
        is_working: workingByTech.has(tech.id) ? Boolean(workingByTech.get(tech.id)) : true,
      })),
    })
  } catch (error) {
    console.error('Fetch technician working status failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminProfile()
    if ('error' in auth) return auth.error

    const body = (await request.json().catch(() => ({}))) as {
      date?: string
      technicianId?: string
      isWorking?: boolean
    }

    const date = resolveDate(body.date)
    if (!date) {
      return NextResponse.json({ error: 'Invalid date. Expected YYYY-MM-DD.' }, { status: 400 })
    }

    const technicianId = typeof body.technicianId === 'string' ? body.technicianId : ''
    if (!technicianId) {
      return NextResponse.json({ error: 'technicianId is required' }, { status: 400 })
    }

    const isWorking = Boolean(body.isWorking)

    const { data: tech, error: techError } = await auth.supabase
      .from('users')
      .select('id')
      .eq('id', technicianId)
      .eq('business_id', auth.profile.business_id)
      .eq('role', 'tech')
      .maybeSingle()

    if (techError) {
      return NextResponse.json({ error: techError.message }, { status: 500 })
    }
    if (!tech) {
      return NextResponse.json({ error: 'Technician not found in your business' }, { status: 404 })
    }

    const { error: upsertError } = await auth.supabase
      .from('technician_daily_availability')
      .upsert(
        {
          business_id: auth.profile.business_id,
          technician_id: technicianId,
          work_date: date,
          is_working: isWorking,
        },
        { onConflict: 'business_id,technician_id,work_date' }
      )

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, date, technicianId, isWorking })
  } catch (error) {
    console.error('Update technician working status failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
