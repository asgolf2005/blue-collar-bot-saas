import { NextRequest, NextResponse } from 'next/server'
import {
  encryptTechnicianPassword,
  verifyAdminCredentialsForBusiness,
} from '@/lib/security/technicianPasswordVault'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const password = typeof body?.password === 'string' ? body.password.trim() : ''
    const adminEmail = typeof body?.adminEmail === 'string' ? body.adminEmail.trim().toLowerCase() : ''
    const adminPassword = typeof body?.adminPassword === 'string' ? body.adminPassword : ''
    const businessId = typeof body?.businessId === 'string' ? body.businessId : ''

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      )
    }

    const verification = await verifyAdminCredentialsForBusiness({
      email: adminEmail,
      password: adminPassword,
      businessId,
    })
    if (!verification.ok) {
      return NextResponse.json({ error: verification.error }, { status: verification.status })
    }

    const { data: technicians, error: techniciansError } = await verification.adminClient
      .from('users')
      .select('id, full_name')
      .eq('business_id', verification.businessId)
      .eq('role', 'tech')

    if (techniciansError) {
      return NextResponse.json({ error: techniciansError.message }, { status: 500 })
    }

    const techs = technicians || []
    if (techs.length === 0) {
      return NextResponse.json({ success: true, updatedCount: 0, totalCount: 0 })
    }

    const failed: Array<{ id: string; error: string }> = []
    let updatedCount = 0

    for (const tech of techs) {
      const { data: authUserRes, error: authUserError } =
        await verification.adminClient.auth.admin.getUserById(tech.id)

      if (authUserError || !authUserRes?.user) {
        failed.push({ id: tech.id, error: 'Technician auth account not found.' })
        continue
      }

      const existingMetadata = (authUserRes.user.user_metadata || {}) as Record<string, unknown>
      const vaultPayload = encryptTechnicianPassword(password, verification.adminUserId)

      const { error } = await verification.adminClient.auth.admin.updateUserById(tech.id, {
        password,
        email_confirm: true,
        user_metadata: {
          ...existingMetadata,
          full_name: tech.full_name || undefined,
          tech_password_vault: vaultPayload,
        },
      })

      if (error) {
        failed.push({ id: tech.id, error: error.message || 'Unknown error' })
      } else {
        updatedCount += 1
      }
    }

    if (updatedCount === 0 && failed.length > 0) {
      return NextResponse.json(
        { error: 'Failed to update any technician passwords.', failed },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      totalCount: techs.length,
      failed,
    })
  } catch (error) {
    console.error('Bulk technician password update failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
