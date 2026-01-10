import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CustomersPageClient from '@/components/admin/CustomersPageClient'

export default async function CustomersPage() {
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

  // Fetch customers with their jobs and invoice data
  const { data: customers } = await supabase
    .from('customers')
    .select(`
      *,
      jobs:jobs(
        id,
        status,
        scheduled_start,
        technician_id,
        technician:users(id, full_name)
      )
    `)
    .eq('business_id', profile.business_id)
    .order('created_at', { ascending: false })

  // Fetch invoice data separately for all customers
  const { data: invoices } = await supabase
    .from('invoices')
    .select('customer_id, status, total')
    .eq('business_id', profile.business_id)

  // Get unique technicians from jobs
  const { data: technicians } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('business_id', profile.business_id)
    .eq('role', 'tech')
    .order('full_name', { ascending: true })

  return (
    <CustomersPageClient
      customers={customers || []}
      invoices={invoices || []}
      technicians={technicians || []}
    />
  )
}
