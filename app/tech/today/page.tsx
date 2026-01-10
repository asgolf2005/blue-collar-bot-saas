import { createClient } from '@/lib/supabase/server'
import { startOfDay, endOfDay } from 'date-fns'
import TodayViewClient from '@/components/tech/TodayViewClient'

export default async function TodayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('users')
    .select('business_id')
    .eq('id', user.id)
    .single()

  const today = new Date()
  const startOfToday = startOfDay(today)
  const endOfToday = endOfDay(today)

  // Fetch jobs with full customer details including business_id
  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      id,
      business_id,
      technician_id,
      status,
      description,
      scheduled_start,
      scheduled_end,
      total_cost,
      customer:customers(id, name, email, phone, address)
    `)
    .eq('technician_id', user!.id)
    .gte('scheduled_start', startOfToday.toISOString())
    .lte('scheduled_start', endOfToday.toISOString())
    .order('scheduled_start', { ascending: true })

  return (
    <TodayViewClient
      initialJobs={jobs || []}
      userId={user.id}
      businessId={profile?.business_id || ''}
      today={today}
    />
  )
}
