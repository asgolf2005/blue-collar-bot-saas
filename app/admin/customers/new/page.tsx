import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewCustomerForm from '@/components/admin/NewCustomerForm'
import { ArrowLeft, Users } from '@/components/ui/lucide'
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

  const { count: customerCount } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', profile.business_id)

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div>
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-secondary/80 px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Customers
        </Link>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <h1 className="font-display text-3xl uppercase tracking-[0.08em] text-slate-900 dark:text-white">
          New Customer
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Create a new customer record.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <Users className="h-3.5 w-3.5" />
          {customerCount || 0} customers on file
        </div>
      </section>

      <NewCustomerForm businessId={profile.business_id} existingCustomerCount={customerCount || 0} />
    </div>
  )
}
