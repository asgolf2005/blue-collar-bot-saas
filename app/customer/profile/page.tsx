import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CustomerProfileForm from '@/components/customer/CustomerProfileForm'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get customer info
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!customer) {
    redirect('/login')
  }

  // Get job statistics
  const { count: totalJobs } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', customer.id)

  const { count: completedJobs } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', customer.id)
    .eq('status', 'completed')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
        <p className="text-gray-600 mt-1">Manage your account information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Form */}
        <div className="lg:col-span-2">
          <CustomerProfileForm customer={customer} userEmail={user.email!} />
        </div>

        {/* Account Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Account Summary</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Member Since</p>
                <p className="font-medium text-gray-900">
                  {new Date(customer.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Services</p>
                <p className="text-3xl font-bold text-gray-900">{totalJobs || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed Services</p>
                <p className="text-3xl font-bold text-green-600">{completedJobs || 0}</p>
              </div>
            </div>
          </div>

          <div className="card bg-primary-50">
            <h3 className="text-lg font-bold text-primary-900 mb-2">Need Service?</h3>
            <p className="text-sm text-primary-700 mb-4">
              Call us to schedule your next appointment
            </p>
            <a
              href={`tel:${customer.phone}`}
              className="btn btn-primary w-full"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
