import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import JobHistoryList from '@/components/customer/JobHistoryList'
import { Clock } from '@/components/ui/lucide'

export default async function CustomerHistoryPage() {
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

  // Get all jobs for this customer
  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers(name, address),
      technician:users!jobs_technician_id_fkey(full_name)
    `)
    .eq('customer_id', customer.id)
    .order('scheduled_start', { ascending: false })

  return (
    <div className="pb-20 md:pb-0">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
            <Clock className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Service History</h1>
            <p className="text-gray-600">View all your past and upcoming appointments</p>
          </div>
        </div>
      </div>

      {/* Job History List */}
      <JobHistoryList jobs={jobs || []} />
    </div>
  )
}


