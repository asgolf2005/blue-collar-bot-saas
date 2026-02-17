import { NextRequest, NextResponse } from 'next/server'
import {
  getDecryptedTechPasswordsByBusiness,
  verifyAdminCredentialsForBusiness,
} from '@/lib/security/technicianPasswordVault'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    const businessId = typeof body?.businessId === 'string' ? body.businessId : ''

    const verification = await verifyAdminCredentialsForBusiness({ email, password, businessId })
    if (!verification.ok) {
      return NextResponse.json({ error: verification.error }, { status: verification.status })
    }

    const passwords = await getDecryptedTechPasswordsByBusiness({ businessId: verification.businessId })
    return NextResponse.json({ success: true, passwords })
  } catch (error) {
    console.error('Password vault unlock failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
