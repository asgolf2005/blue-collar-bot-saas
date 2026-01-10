import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewCustomerForm from '@/components/admin/NewCustomerForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function NewCustomerPage() {
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

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/customers"
          className="inline-flex items-center text-sm text-muted hover:text-ink mb-4 transition-colors motion-fast focus-premium"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Customers
        </Link>
        <h1 className="text-2xl font-bold text-ink">Add New Customer</h1>
        <p className="text-muted mt-1">Create a new customer profile</p>
      </div>

      <NewCustomerForm businessId={profile.business_id} />
    </div>
  )
}
