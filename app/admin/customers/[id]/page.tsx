import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import CustomerDetailClient from '@/components/admin/CustomerDetailClient'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  // Fetch customer details with all jobs
  const { data: customer, error } = await supabase
    .from('customers')
    .select(`
      *,
      jobs:jobs(
        id,
        status,
        scheduled_start,
        scheduled_end,
        description,
        total_cost,
        labor_hours,
        labor_rate,
        parts_cost,
        technician:users!jobs_technician_id_fkey(id, full_name)
      )
    `)
    .eq('id', id)
    .eq('business_id', profile.business_id)
    .single()

  if (error || !customer) {
    notFound()
  }

  // Fetch invoices for this customer
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })

  // Sort jobs by date
  const allJobs = customer.jobs || []
  const completedJobs = allJobs.filter(j => j.status === 'completed').sort((a, b) =>
    new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime()
  )
  const pendingJobs = allJobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled').sort((a, b) =>
    new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
  )

  // Calculate totals
  const totalRevenue = completedJobs.reduce((sum, job) => sum + (Number(job.total_cost) || 0), 0)
  const pendingRevenue = pendingJobs.reduce((sum, job) => sum + (Number(job.total_cost) || 0), 0)
  const outstandingInvoices = invoices?.filter(inv => ['sent', 'overdue'].includes(inv.status)) || []
  const outstandingAmount = outstandingInvoices.reduce((sum, inv) => sum + Number(inv.total), 0)

  return (
    <div className="space-y-6">
      <Link
        href="/admin/customers"
        className="inline-flex items-center text-muted hover:text-ink transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Customers
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-ink tracking-tight">{customer.name}</h1>
        <p className="text-muted mt-1">Customer details and history</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card">
          <div className="text-xs text-muted uppercase tracking-wider font-medium mb-1">Total Jobs</div>
          <div className="text-2xl font-bold text-ink">{allJobs.length}</div>
        </div>
        <div className="glass-card">
          <div className="text-xs text-muted uppercase tracking-wider font-medium mb-1">Completed</div>
          <div className="text-2xl font-bold text-success">{completedJobs.length}</div>
        </div>
        <div className="glass-card">
          <div className="text-xs text-muted uppercase tracking-wider font-medium mb-1">Total Revenue</div>
          <div className="text-2xl font-bold text-ink">${totalRevenue.toFixed(0)}</div>
        </div>
        <div className="glass-card">
          <div className="text-xs text-muted uppercase tracking-wider font-medium mb-1">Outstanding</div>
          <div className={`text-2xl font-bold ${outstandingAmount > 0 ? 'text-warning' : 'text-success'}`}>
            ${outstandingAmount.toFixed(0)}
          </div>
        </div>
      </div>

      <CustomerDetailClient
        customer={customer}
        completedJobs={completedJobs}
        pendingJobs={pendingJobs}
        invoices={invoices || []}
        businessId={profile.business_id}
      />
    </div>
  )
}
