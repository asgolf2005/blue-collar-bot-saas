import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewCustomerForm from '@/components/admin/NewCustomerForm'
import { ArrowLeft, Sparkles, Users } from 'lucide-react'
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
    <div className="mx-auto w-full max-w-[1300px] space-y-6">
      <div>
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-secondary/80 px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Customers
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-[28px] border border-border bg-gradient-to-br from-bg-secondary via-bg-secondary to-cyan-50/70 p-6 shadow-glass dark:to-cyan-500/10 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cyan-300/25 blur-3xl dark:bg-cyan-500/20" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-500/15" />

        <div className="relative z-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-100/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" />
            Customer Onboarding
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            Create a customer profile
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary sm:text-base">
            Capture clean contact details up front so jobs, invoices, and reminders stay fast and reliable.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-secondary/85 px-3 py-1.5 text-xs text-text-secondary">
              <Users className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              {customerCount || 0} customers on file
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-secondary/85 px-3 py-1.5 text-xs text-text-secondary">
              Required: full name and phone
            </div>
          </div>
        </div>
      </section>

      <NewCustomerForm businessId={profile.business_id} existingCustomerCount={customerCount || 0} />
    </div>
  )
}
