import { createClient } from '@/lib/supabase/server'
import CalendarView from '@/components/admin/CalendarView'

export default async function CalendarPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('business_id')
    .eq('id', user!.id)
    .single()

  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers(*),
      technician:users(*)
    `)
    .eq('business_id', profile!.business_id)
    .gte('scheduled_start', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <p className="text-gray-600 mt-1">View and manage job schedules</p>
      </div>

      <CalendarView jobs={jobs || []} businessId={profile!.business_id} />
    </div>
  )
}
