import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InvoiceCard from '@/components/customer/InvoiceCard'
import { Receipt } from '@/components/ui/lucide'
import { EmptyState } from '@/components/ui/EmptyState'

export default async function InvoicesPage() {
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

  // Get all invoices
  const { data: allInvoices } = await supabase
    .from('invoices')
    .select('*, customer:customers(*), job:jobs(*)')
    .eq('customer_id', customer.id)
    .order('issue_date', { ascending: false })

  // Separate by status
  const unpaidInvoices = allInvoices?.filter(inv =>
    inv.status === 'sent' || inv.status === 'overdue'
  ) || []

  const paidInvoices = allInvoices?.filter(inv =>
    inv.status === 'paid'
  ) || []

  const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + inv.total, 0)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">Your Invoices</h1>
        <p className="text-muted mt-1">View and manage your service invoices</p>
      </div>

      {/* Summary Cards */}
      {unpaidInvoices.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="card bg-warning/10 border-warning/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-warning font-medium">Outstanding Balance</p>
                <p className="text-3xl font-bold text-warning mt-1">
                  ${totalOutstanding.toFixed(2)}
                </p>
              </div>
              <Receipt className="w-12 h-12 text-warning opacity-50" />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted font-medium">Unpaid Invoices</p>
                <p className="text-3xl font-bold text-ink mt-1">
                  {unpaidInvoices.length}
                </p>
              </div>
              <Receipt className="w-12 h-12 text-muted opacity-50" />
            </div>
          </div>
        </div>
      )}

      {/* Unpaid Invoices */}
      {unpaidInvoices.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-ink mb-4">Awaiting Payment</h2>
          <div className="space-y-4">
            {unpaidInvoices.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))}
          </div>
        </div>
      )}

      {/* Paid Invoices */}
      <div>
        <h2 className="text-xl font-semibold text-ink mb-4">Payment History</h2>
        {paidInvoices.length > 0 ? (
          <div className="space-y-4">
            {paidInvoices.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))}
          </div>
        ) : (
          <div className="card p-6">
            <EmptyState
              icon={<Receipt className="w-full h-full" />}
              title="No paid invoices"
              description="Your payment history will appear here once invoices are paid."
              variant="default"
              size="sm"
            />
          </div>
        )}
      </div>

      {allInvoices?.length === 0 && (
        <div className="card p-6">
          <EmptyState
            icon={<Receipt className="w-full h-full" />}
            title="No invoices yet"
            description="Your service invoices will appear here once work has been completed."
            variant="default"
            size="md"
          />
        </div>
      )}
    </div>
  )
}


