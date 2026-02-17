import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

// Dev-only helper: set all admin passwords for the current business to a known value.
const TEST_ADMIN_PASSWORD = 'AdminTest!12345'

export async function POST() {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const adminClient = getSupabaseAdminClient()
    const { data: admins, error: adminsError } = await adminClient
      .from('users')
      .select('id, email')
      .eq('business_id', profile.business_id)
      .eq('role', 'admin')

    if (adminsError) {
      return NextResponse.json({ error: adminsError.message }, { status: 500 })
    }

    const rows = admins || []
    let updatedCount = 0
    const failed: Array<{ id: string; email: string | null; error: string }> = []

    for (const admin of rows) {
      const { error } = await adminClient.auth.admin.updateUserById(admin.id, {
        password: TEST_ADMIN_PASSWORD,
        email_confirm: true,
      })
      if (error) {
        failed.push({ id: admin.id, email: admin.email || null, error: error.message || 'Unknown error' })
      } else {
        updatedCount += 1
      }
    }

    return NextResponse.json({
      success: true,
      password: TEST_ADMIN_PASSWORD,
      updatedCount,
      totalCount: rows.length,
      failed,
    })
  } catch (error) {
    console.error('Set admin passwords failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

