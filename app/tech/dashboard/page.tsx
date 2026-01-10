import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TechDashboardClient from '@/components/tech/dashboard/TechDashboardClient'

export default async function TechDashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

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

  // Get today's jobs
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const todayJobsQuery = supabase
    .from('jobs')
    .select(`
      id,
      scheduled_start,
      scheduled_end,
      status,
      customer:customers(id, name, phone, address),
      service:services(name, category)
    `)
    .eq('technician_id', user.id)
    .gte('scheduled_start', today.toISOString())
    .lt('scheduled_start', tomorrow.toISOString())
    .order('scheduled_start', { ascending: true })

  // Get upcoming jobs (next 7 days)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const upcomingJobsQuery = supabase
    .from('jobs')
    .select(`
      id,
      scheduled_start,
      scheduled_end,
      status,
      customer:customers(id, name, phone, address),
      service:services(name, category)
    `)
    .eq('technician_id', user.id)
    .gte('scheduled_start', tomorrow.toISOString())
    .lt('scheduled_start', nextWeek.toISOString())
    .order('scheduled_start', { ascending: true })

  // Get completed jobs this month
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const completedThisMonthQuery = supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('technician_id', user.id)
    .eq('status', 'completed')
    .gte('scheduled_start', startOfMonth.toISOString())

  // Get total jobs this month
  const totalThisMonthQuery = supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('technician_id', user.id)
    .gte('scheduled_start', startOfMonth.toISOString())

  // Get jobs for the last 7 days (for chart)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 6)

  const weekJobsQuery = supabase
    .from('jobs')
    .select('scheduled_start, status')
    .eq('technician_id', user.id)
    .gte('scheduled_start', weekAgo.toISOString())
    .order('scheduled_start', { ascending: true })

  const [
    { data: todayJobs },
    { data: upcomingJobs },
    { count: completedThisMonth },
    { count: totalThisMonth },
    { data: weekJobs },
  ] = await Promise.all([
    todayJobsQuery,
    upcomingJobsQuery,
    completedThisMonthQuery,
    totalThisMonthQuery,
    weekJobsQuery,
  ])

  // Calculate next job
  const nextJob = todayJobs?.[0] || upcomingJobs?.[0] || null

  return (
    <TechDashboardClient
      nextJob={nextJob}
      upcomingCount={upcomingJobs?.length || 0}
      todayJobs={todayJobs || []}
      weekJobs={weekJobs || []}
      completedThisMonth={completedThisMonth || 0}
      totalThisMonth={totalThisMonth || 0}
      userName={profile.full_name || ''}
    />
  )
}
