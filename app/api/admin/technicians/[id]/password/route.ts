import { NextRequest, NextResponse } from 'next/server'
import {
  encryptTechnicianPassword,
  verifyAdminCredentialsForBusiness,
} from '@/lib/security/technicianPasswordVault'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: technicianId } = await params
    const body = await request.json().catch(() => ({}))
    const password = typeof body?.password === 'string' ? body.password.trim() : ''
    const adminEmail = typeof body?.adminEmail === 'string' ? body.adminEmail : ''
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

    const { data: technician, error: technicianError } = await verification.adminClient
      .from('users')
      .select('id, full_name')
      .eq('id', technicianId)
      .eq('business_id', verification.businessId)
      .eq('role', 'tech')
      .single()

    if (technicianError || !technician) {
      return NextResponse.json({ error: 'Technician not found' }, { status: 404 })
    }

    const { data: authUserRes, error: authUserError } =
      await verification.adminClient.auth.admin.getUserById(technician.id)

    if (authUserError || !authUserRes?.user) {
      return NextResponse.json(
        { error: 'Technician auth account not found.' },
        { status: 404 }
      )
    }

    const existingMetadata = (authUserRes.user.user_metadata || {}) as Record<string, unknown>
    const vaultPayload = encryptTechnicianPassword(password, verification.adminUserId)

    const { error: updateError } = await verification.adminClient.auth.admin.updateUserById(technician.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...existingMetadata,
        full_name: technician.full_name || undefined,
        tech_password_vault: vaultPayload,
      },
    })

    if (updateError) {
      return NextResponse.json(
        {
          error:
            updateError.message ||
            'Unable to set password for this technician. Their auth account may be missing.',
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, techId: technician.id })
  } catch (error) {
    console.error('Technician password update failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
