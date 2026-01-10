import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PremiumDashboardClient from '@/components/admin/PremiumDashboardClient'

export default async function JobsPage() {
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

  if (!profile || profile.role !== 'admin') {
    redirect('/tech/today')
  }

  // Fetch only recent jobs (last 90 days) for performance
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers(*),
      technician:users(*),
      services:job_services(service:services(*))
    `)
    .eq('business_id', profile.business_id)
    .gte('scheduled_start', threeMonthsAgo.toISOString())
    .order('scheduled_start', { ascending: false })
    .limit(500) // Max 500 jobs

  if (jobsError) {
    console.error('Jobs query error:', jobsError)
  }

  // Fetch recent invoices (last 90 days)
  const { data: invoices } = await supabase
    .from('invoices')
    .select('total, status, issue_date, paid_date, created_at')
    .eq('business_id', profile.business_id)
    .gte('created_at', threeMonthsAgo.toISOString())
    .limit(500)

  return (
    <PremiumDashboardClient
      jobs={jobs || []}
      invoices={invoices || []}
      businessId={profile.business_id}
    />
  )
}
