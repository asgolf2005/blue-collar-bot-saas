import { createClient } from '@/lib/supabase/server'
import { startOfDay, endOfDay } from 'date-fns'
import TodayViewClient from '@/components/tech/TodayViewClient'
import { redirect } from 'next/navigation'

export default async function TodayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'tech') {
    redirect('/admin/jobs')
  }

  const today = new Date()
  const startOfToday = startOfDay(today)
  const endOfToday = endOfDay(today)
  const nowIso = today.toISOString()
  const startOfTodayIso = startOfToday.toISOString()
  const endOfTodayIso = endOfToday.toISOString()
  const jobSelect = `
      id,
      business_id,
      technician_id,
      status,
      description,
      scheduled_start,
      scheduled_end,
      total_cost,
      customer:customers(id, name, email, phone, address),
      services:job_services(service:services(name, category))
    `

  // Fetch jobs with full customer details including business_id
  const [
    { data: jobs },
    { data: nextJobCandidates = [] },
  ] = await Promise.all([
    supabase
      .from('jobs')
      .select(jobSelect)
      .eq('technician_id', user.id)
      .gte('scheduled_start', startOfTodayIso)
      .lte('scheduled_start', endOfTodayIso)
      .order('scheduled_start', { ascending: true }),
    supabase
      .from('jobs')
      .select(jobSelect)
      .eq('technician_id', user.id)
      .gte('scheduled_start', nowIso)
      .order('scheduled_start', { ascending: true })
      .limit(500),
  ])
  const safeNextJobCandidates = nextJobCandidates || []
  const safeTodayJobs = jobs || []
  const resolvedBusinessId =
    profile.business_id || safeTodayJobs[0]?.business_id || safeNextJobCandidates[0]?.business_id || ''
  const nowMs = today.getTime()
  const initialNextJob =
    safeNextJobCandidates.find((job) => {
      const status = (job.status || '').toLowerCase()
      if (!job.scheduled_start || status === 'completed' || status === 'cancelled') return false
      return new Date(job.scheduled_start).getTime() >= nowMs
    }) ||
    safeNextJobCandidates.find((job) => {
      const status = (job.status || '').toLowerCase()
      return Boolean(job.scheduled_start) && status !== 'completed' && status !== 'cancelled'
    }) ||
    null

  return (
    <TodayViewClient
      initialJobs={safeTodayJobs}
      initialNextJob={initialNextJob}
      userId={user.id}
      businessId={resolvedBusinessId}
      nowIso={nowIso}
      startOfTodayIso={startOfTodayIso}
      endOfTodayIso={endOfTodayIso}
    />
  )
}
