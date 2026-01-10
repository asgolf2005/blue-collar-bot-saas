import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppointmentCard from '@/components/customer/AppointmentCard'
import { Calendar } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export default async function AppointmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get customer info
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!customer) {
    redirect('/login')
  }

  // Get all appointments
  const { data: upcomingJobs } = await supabase
    .from('jobs')
    .select('*, customer:customers(*), technician:users(*)')
    .eq('customer_id', customer.id)
    .gte('scheduled_start', new Date().toISOString())
    .order('scheduled_start', { ascending: true})

  const { data: pastJobs } = await supabase
    .from('jobs')
    .select('*, customer:customers(*), technician:users(*)')
    .eq('customer_id', customer.id)
    .lt('scheduled_start', new Date().toISOString())
    .order('scheduled_start', { ascending: false })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">Your Appointments</h1>
        <p className="text-muted mt-1">View all your scheduled and past service appointments</p>
      </div>

      {/* Upcoming Appointments */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-ink mb-4">Upcoming</h2>
        {upcomingJobs && upcomingJobs.length > 0 ? (
          <div className="space-y-4">
            {upcomingJobs.map((job) => (
              <AppointmentCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="glass-card">
            <EmptyState
              icon={<Calendar className="w-full h-full" />}
              title="No upcoming appointments"
              description="Your next scheduled service will appear here"
            />
          </div>
        )}
      </div>

      {/* Past Appointments */}
      <div>
        <h2 className="text-xl font-semibold text-ink mb-4">Service History</h2>
        {pastJobs && pastJobs.length > 0 ? (
          <div className="space-y-4">
            {pastJobs.map((job) => (
              <AppointmentCard key={job.id} job={job} showHistory />
            ))}
          </div>
        ) : (
          <div className="glass-card">
            <EmptyState
              icon={<Calendar className="w-full h-full" />}
              title="No past appointments"
              description="Your service history will appear here once completed"
            />
          </div>
        )}
      </div>
    </div>
  )
}
