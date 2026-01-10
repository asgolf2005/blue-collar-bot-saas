import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText, Plus, DollarSign, AlertCircle } from 'lucide-react'
import InvoicesTable from '@/components/admin/InvoicesTable'

export default async function InvoicesPage() {
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

  // Get all invoices for this business
  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      total,
      status,
      issue_date,
      due_date,
      customer:customers!invoices_customer_id_fkey(id, name, email)
    `)
    .eq('business_id', profile.business_id)
    .order('created_at', { ascending: false })

  const totalOutstanding = (invoices?.filter(inv => inv.status !== 'paid')
    .reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0) || 0)

  const totalPaid = (invoices?.filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0) || 0)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center">
            <FileText className="w-7 h-7 mr-3 text-primary" />
            Invoices
          </h1>
          <p className="text-muted mt-1">Manage invoices and payments</p>
        </div>
        <Link href="/admin/invoices/new" className="btn btn-primary flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Create Invoice
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Total Invoices</p>
              <p className="text-2xl font-bold text-ink">{invoices?.length || 0}</p>
            </div>
            <FileText className="w-8 h-8 text-info" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Outstanding</p>
              <p className="text-2xl font-bold text-warning">${totalOutstanding.toFixed(2)}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-warning" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Paid</p>
              <p className="text-2xl font-bold text-success">${totalPaid.toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-success" />
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <InvoicesTable invoices={invoices || []} />
    </div>
  )
}
