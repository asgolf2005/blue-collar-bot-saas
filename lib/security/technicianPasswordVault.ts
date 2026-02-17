import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

type VaultPayloadV1 = {
  v: 1
  alg: 'aes-256-gcm'
  iv: string
  tag: string
  data: string
  updatedAt: string
  updatedBy: string
}

function getVaultKey(): Buffer {
  const secret = process.env.TECH_PASSWORD_VAULT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    throw new Error('Missing TECH_PASSWORD_VAULT_SECRET or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createHash('sha256').update(secret).digest()
}

export function encryptTechnicianPassword(plainTextPassword: string, updatedBy: string): VaultPayloadV1 {
  const key = getVaultKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plainTextPassword, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return {
    v: 1,
    alg: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted.toString('base64'),
    updatedAt: new Date().toISOString(),
    updatedBy,
  }
}

export function decryptTechnicianPassword(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const cast = payload as Partial<VaultPayloadV1>
  if (cast.v !== 1 || cast.alg !== 'aes-256-gcm' || !cast.iv || !cast.tag || !cast.data) {
    return null
  }

  try {
    const key = getVaultKey()
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(cast.iv, 'base64'))
    decipher.setAuthTag(Buffer.from(cast.tag, 'base64'))
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(cast.data, 'base64')),
      decipher.final(),
    ])
    return decrypted.toString('utf8')
  } catch {
    return null
  }
}

export async function verifyAdminCredentialsForBusiness({
  email,
  password,
  businessId,
}: {
  email: string
  password: string
  businessId: string
}) {
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedPassword = password
  const normalizedBusinessId = businessId.trim()

  if (!normalizedEmail || !normalizedPassword || !normalizedBusinessId) {
    return { ok: false as const, status: 400, error: 'Email, password, and businessId are required' }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false as const, status: 500, error: 'Supabase auth config is missing' }
  }

  const verifier = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { error: verifyError } = await verifier.auth.signInWithPassword({
    email: normalizedEmail,
    password: normalizedPassword,
  })

  if (verifyError) {
    return { ok: false as const, status: 401, error: 'Invalid admin credentials' }
  }

  const adminClient = getSupabaseAdminClient()
  const { data: adminProfile, error: adminProfileError } = await adminClient
    .from('users')
    .select('id')
    .ilike('email', normalizedEmail)
    .eq('role', 'admin')
    .eq('business_id', normalizedBusinessId)
    .single()

  await verifier.auth.signOut()

  if (adminProfileError || !adminProfile?.id) {
    return { ok: false as const, status: 403, error: 'Admin access denied for this business' }
  }

  return {
    ok: true as const,
    adminClient,
    adminUserId: adminProfile.id,
    businessId: normalizedBusinessId,
    email: normalizedEmail,
  }
}

export async function getDecryptedTechPasswordsByBusiness({
  businessId,
}: {
  businessId: string
}): Promise<Record<string, string>> {
  const adminClient = getSupabaseAdminClient()
  const map: Record<string, string> = {}

  const { data: technicians, error: techniciansError } = await adminClient
    .from('users')
    .select('id')
    .eq('business_id', businessId)
    .eq('role', 'tech')

  if (techniciansError || !technicians) {
    return map
  }

  for (const tech of technicians) {
    const { data: authUserRes, error: authUserError } = await adminClient.auth.admin.getUserById(tech.id)
    if (authUserError || !authUserRes?.user) continue
    const metadata = (authUserRes.user.user_metadata || {}) as Record<string, unknown>
    const decrypted = decryptTechnicianPassword(metadata.tech_password_vault)
    if (decrypted) {
      map[tech.id] = decrypted
    }
  }

  return map
}

