import { createClient } from '@/lib/supabase/server'
import { Users, TrendingUp, DollarSign, Repeat } from 'lucide-react'

interface CustomerInsightsProps {
  businessId: string
  rangeStart: string
  rangeEnd: string
  rangeLabel: string
  rangeShortLabel: string
}

export default async function CustomerInsights({
  businessId,
  rangeStart,
  rangeEnd,
  rangeLabel,
  rangeShortLabel,
}: CustomerInsightsProps) {
  const supabase = await createClient()

  const startDate = new Date(rangeStart)
  const endDate = new Date(rangeEnd)

  // Get all customers
  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, email, created_at')
    .eq('business_id', businessId)

  if (!customers || customers.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-ink">Customer Insights</h3>
          <p className="text-sm text-muted">Customer behavior and trends ({rangeLabel.toLowerCase()})</p>
          </div>
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
            <Users className="w-5 h-5 text-primary" />
          </div>
        </div>

        <div className="text-center py-12">
          <Users className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted">No customers found</p>
          <p className="text-sm text-muted mt-1">
            Add customers to see insights
          </p>
        </div>
      </div>
    )
  }

  // Get jobs for each customer to calculate metrics
  interface CustomerStats {
    id: string
    name: string
    email: string
    totalJobs: number
    completedJobs: number
    totalSpent: number
    lastJobDate: string | null
  }

  const customerStats: CustomerStats[] = await Promise.all(
    customers.map(async (customer) => {
      // Get all jobs for this customer
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, status, created_at')
        .eq('business_id', businessId)
        .eq('customer_id', customer.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      // Get invoices for this customer
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total, status')
        .eq('business_id', businessId)
        .eq('customer_id', customer.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      const totalJobs = jobs?.length || 0
      const completedJobs = jobs?.filter(j => j.status === 'completed').length || 0
      const totalSpent = invoices
        ?.filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0) || 0

      const lastJobDate = jobs && jobs.length > 0
        ? jobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
        : null

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        totalJobs,
        completedJobs,
        totalSpent,
        lastJobDate,
      }
    })
  )

  // Sort by total spent (best customers first)
  const topCustomers = customerStats
    .filter(c => c.totalSpent > 0)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5)

  // Calculate insights
  const newCustomers = customers.filter(c =>
    new Date(c.created_at) >= startDate && new Date(c.created_at) <= endDate
  ).length

  const activeCustomers = customerStats.filter(c => c.totalJobs > 0 || c.totalSpent > 0)
  const activeCustomerCount = activeCustomers.length
  const repeatCustomers = activeCustomers.filter(c => c.totalJobs > 1).length
  const repeatRate = activeCustomerCount > 0
    ? Math.round((repeatCustomers / activeCustomerCount) * 100)
    : 0

  const avgCustomerValue = activeCustomerCount > 0
    ? customerStats.reduce((sum, c) => sum + c.totalSpent, 0) / activeCustomerCount
    : 0

  const maxSpent = Math.max(...topCustomers.map(c => c.totalSpent), 1)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-ink">Customer Insights</h3>
          <p className="text-sm text-muted">Top customers and trends</p>
        </div>
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
          <Users className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs text-primary font-medium">New ({rangeShortLabel})</span>
          </div>
          <p className="text-xl font-bold text-ink">{newCustomers}</p>
        </div>

        <div className="p-3 bg-info/10 rounded-xl border border-info/20">
          <div className="flex items-center gap-2 mb-1">
            <Repeat className="w-4 h-4 text-info" />
            <span className="text-xs text-info font-medium">Repeat Rate</span>
          </div>
          <p className="text-xl font-bold text-ink">{repeatRate}%</p>
        </div>

        <div className="p-3 bg-success/10 rounded-xl border border-success/20">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-success" />
            <span className="text-xs text-success font-medium">Avg Value</span>
          </div>
          <p className="text-xl font-bold text-ink">${avgCustomerValue.toFixed(0)}</p>
        </div>
      </div>

      {/* Top customers */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-ink mb-3">Top Customers by Revenue</h4>

        {topCustomers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted">No paid invoices yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topCustomers.map((customer, index) => {
              const widthPercent = (customer.totalSpent / maxSpent) * 100

              return (
                <div key={customer.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="flex items-center justify-center w-6 h-6 bg-warning/10 rounded-full text-xs font-semibold text-warning flex-shrink-0 border border-warning/20">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink truncate">{customer.name}</p>
                        <p className="text-xs text-muted">{customer.totalJobs} jobs</p>
                      </div>
                    </div>
                    <span className="text-ink font-semibold flex-shrink-0">
                      ${customer.totalSpent.toFixed(0)}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-surface-100 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-warning to-warning/70 h-2 rounded-full transition-all"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-surface-200">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted">Active Customers</p>
            <p className="text-lg font-semibold text-ink">{activeCustomerCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Repeat Customers</p>
            <p className="text-lg font-semibold text-ink">{repeatCustomers}</p>
          </div>
          <div>
            <p className="text-xs text-muted">New Customers</p>
            <p className="text-lg font-semibold text-ink">{newCustomers}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
