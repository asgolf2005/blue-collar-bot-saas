import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const checks = {
    database: false,
    openai: Boolean(process.env.OPENAI_API_KEY),
    timestamp: new Date().toISOString(),
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('businesses').select('id').limit(1)
    checks.database = !error
  } catch {
    checks.database = false
  }

  const status = checks.database ? 200 : 503
  return NextResponse.json(checks, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}
