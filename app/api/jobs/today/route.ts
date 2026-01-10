import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { startOfDay, endOfDay } from 'date-fns'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const techId = searchParams.get('tech_id')

    const targetUserId = techId || user.id

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (techId && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const today = new Date()
    const startOfToday = startOfDay(today)
    const endOfToday = endOfDay(today)

    const { data: jobs, error } = await supabase
      .from('jobs')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('technician_id', targetUserId)
      .gte('scheduled_start', startOfToday.toISOString())
      .lte('scheduled_start', endOfToday.toISOString())
      .order('scheduled_start', { ascending: true })

    if (error) throw error

    return NextResponse.json(jobs)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
