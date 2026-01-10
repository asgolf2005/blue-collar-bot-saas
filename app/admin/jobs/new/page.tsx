import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewJobForm from '@/components/admin/NewJobForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function NewJobPage() {
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

  // Get customers for the business
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', profile.business_id)
    .order('name', { ascending: true })

  // Get technicians for the business
  const { data: technicians } = await supabase
    .from('users')
    .select('*')
    .eq('business_id', profile.business_id)
    .eq('role', 'tech')
    .order('full_name', { ascending: true })

  // Get active services for the business
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', profile.business_id)
    .eq('is_active', true)
    .order('name', { ascending: true })

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/jobs"
          className="inline-flex items-center text-sm text-muted hover:text-ink mb-4 transition-colors motion-fast focus-premium"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Jobs
        </Link>
        <h1 className="text-2xl font-bold text-ink">Create New Job</h1>
        <p className="text-muted mt-1">Schedule a new service appointment</p>
      </div>

      <NewJobForm
        businessId={profile.business_id}
        customers={customers || []}
        technicians={technicians || []}
        services={services || []}
      />
    </div>
  )
}
