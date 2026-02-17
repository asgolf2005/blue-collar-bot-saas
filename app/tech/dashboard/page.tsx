import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TechDashboardClient from '@/components/tech/dashboard/TechDashboardClient'

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
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 6)
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const jobSelect = `
      id,
      scheduled_start,
      scheduled_end,
      status,
      description,
      urgency,
      total_cost,
      customer:customers(id, name, phone, address)
    `

  const todayJobsQuery = supabase
    .from('jobs')
    .select(jobSelect)
    .eq('technician_id', user.id)
    .gte('scheduled_start', today.toISOString())
    .lt('scheduled_start', tomorrow.toISOString())
    .order('scheduled_start', { ascending: true })

  const upcomingJobsQuery = supabase
    .from('jobs')
    .select(jobSelect)
    .eq('technician_id', user.id)
    .gte('scheduled_start', tomorrow.toISOString())
    .lt('scheduled_start', nextWeek.toISOString())
    .order('scheduled_start', { ascending: true })

  const weekJobsQuery = supabase
    .from('jobs')
    .select('scheduled_start, status')
    .eq('technician_id', user.id)
    .gte('scheduled_start', weekAgo.toISOString())
    .order('scheduled_start', { ascending: true })

  const monthJobsQuery = supabase
    .from('jobs')
    .select('status, total_cost')
    .eq('technician_id', user.id)
    .gte('scheduled_start', startOfMonth.toISOString())

  const attentionJobsQuery = supabase
    .from('jobs')
    .select(jobSelect)
    .eq('technician_id', user.id)
    .in('status', [...activeStatuses])
    .lt('scheduled_start', now.toISOString())
    .order('scheduled_start', { ascending: true })
    .limit(8)

  const [
    { data: todayJobs = [] },
    { data: upcomingJobs = [] },
    { data: weekJobs = [] },
    { data: monthJobs = [] },
    { data: attentionJobs = [] },
  ] = await Promise.all([todayJobsQuery, upcomingJobsQuery, weekJobsQuery, monthJobsQuery, attentionJobsQuery])

  const safeTodayJobs = todayJobs || []
  const safeUpcomingJobs = upcomingJobs || []
  const safeWeekJobs = weekJobs || []
  const safeMonthJobs = monthJobs || []
  const safeAttentionJobs = attentionJobs || []

  const nextJob =
    [...safeTodayJobs, ...safeUpcomingJobs].find((job: any) => !['completed', 'cancelled'].includes(job.status)) || null

  return (
    <TechDashboardClient
      nextJob={nextJob}
      todayJobs={safeTodayJobs as any[]}
      upcomingJobs={safeUpcomingJobs as any[]}
      weekJobs={safeWeekJobs as any[]}
      monthJobs={safeMonthJobs as any[]}
      attentionJobs={safeAttentionJobs as any[]}
      userName={profile.full_name || ''}
    />
  )
}
