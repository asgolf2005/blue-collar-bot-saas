import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ServicesList from '@/components/services/ServicesList'
import { Plus, Briefcase } from 'lucide-react'

export default async function ServicesPage() {
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

  // Get all services for this business
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', profile.business_id)
    .order('created_at', { ascending: false })

  // Get usage stats for each service
  const { data: serviceUsage } = await supabase
    .from('job_services')
    .select('service_id, job_id, jobs!inner(status)')
    .eq('jobs.business_id', profile.business_id)

  // Calculate stats
  const servicesWithStats = services?.map(service => {
    const usage = serviceUsage?.filter(u => u.service_id === service.id) || []
    const completedJobs = usage.filter(u => {
      const job = u.jobs as any
      return job?.status === 'completed'
    }).length
    const totalBooked = usage.length

    return {
      ...service,
      times_booked: totalBooked,
      times_completed: completedJobs,
    }
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Briefcase className="w-7 h-7 mr-3 text-primary-600" />
            Services Management
          </h1>
          <p className="text-gray-600 mt-1">Manage your service catalog and pricing</p>
        </div>
      </div>

      <ServicesList services={servicesWithStats || []} businessId={profile.business_id} />
    </div>
  )
}
