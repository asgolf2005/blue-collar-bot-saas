import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TechDashboardClient from '@/components/tech/dashboard/TechDashboardClient'
import { endOfDay, startOfDay } from 'date-fns'

const activeStatuses = ['scheduled', 'on_the_way', 'arrived', 'in_progress'] as const

export default async function TechDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('business_id, role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'tech') {
    redirect('/tech/today')
  }

  const now = new Date()
  const nowIso = now.toISOString()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const startOfTodayIso = startOfDay(today).toISOString()
  const endOfTodayIso = endOfDay(today).toISOString()
  const rangeStart = new Date(today)
  rangeStart.setDate(rangeStart.getDate() - 60)
  const rangeEnd = new Date(today)
  rangeEnd.setDate(rangeEnd.getDate() + 120)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 6)
  const jobSelect = `
      id,
      scheduled_start,
      scheduled_end,
      status,
      description,
      urgency,
      total_cost,
      customer:customers(id, name, phone, address),
      services:job_services(service:services(name, category))
    `

  const dispatchWindowJobsQuery = supabase
    .from('jobs')
    .select(jobSelect)
    .eq('technician_id', user.id)
    .gte('scheduled_start', rangeStart.toISOString())
    .lte('scheduled_start', rangeEnd.toISOString())
    .order('scheduled_start', { ascending: true })

  const weekJobsQuery = supabase
    .from('jobs')
    .select('scheduled_start, scheduled_end, status')
    .eq('technician_id', user.id)
    .gte('scheduled_start', weekAgo.toISOString())
    .order('scheduled_start', { ascending: true })

  const performanceJobsQuery = supabase
    .from('jobs')
    .select('status, total_cost, scheduled_start')
    .eq('technician_id', user.id)
    .order('scheduled_start', { ascending: true })

  const todayJobsQuery = supabase
    .from('jobs')
    .select(jobSelect)
    .eq('technician_id', user.id)
    .gte('scheduled_start', startOfTodayIso)
    .lte('scheduled_start', endOfTodayIso)
    .order('scheduled_start', { ascending: true })

  const attentionJobsQuery = supabase
    .from('jobs')
    .select(jobSelect)
    .eq('technician_id', user.id)
    .in('status', [...activeStatuses])
    .lt('scheduled_start', nowIso)
    .order('scheduled_start', { ascending: true })
    .limit(8)

  const [
    { data: dispatchWindowJobs = [] },
    { data: weekJobs = [] },
    { data: performanceJobs = [] },
    { data: todayJobs = [] },
    { data: attentionJobs = [] },
  ] = await Promise.all([dispatchWindowJobsQuery, weekJobsQuery, performanceJobsQuery, todayJobsQuery, attentionJobsQuery])

  const safeDispatchWindowJobs = dispatchWindowJobs || []
  const safeWeekJobs = weekJobs || []
  const safePerformanceJobs = performanceJobs || []
  const safeTodayJobs = todayJobs || []
  const safeAttentionJobs = attentionJobs || []

  return (
    <TechDashboardClient
      nowIso={nowIso}
      dispatchWindowJobs={safeDispatchWindowJobs as any[]}
      todayJobs={safeTodayJobs as any[]}
      weekJobs={safeWeekJobs as any[]}
      performanceJobs={safePerformanceJobs as any[]}
      attentionJobs={safeAttentionJobs as any[]}
      userName={profile.full_name || ''}
    />
  )
}
