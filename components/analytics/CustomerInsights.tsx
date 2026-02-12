import { createClient } from '@/lib/supabase/server'
import { Users, TrendingUp, DollarSign, Repeat, UserPlus, Activity } from 'lucide-react'

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
      <div className="relative bg-[#0d1220] border border-amber-500/30 rounded-xl overflow-hidden group hover:border-amber-500/50 transition-all duration-500">
        {/* Blueprint grid background */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(245,158,11,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(245,158,11,0.3) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />
        
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-500/50 rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-500/50 rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-500/50 rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-500/50 rounded-br-lg" />

        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                CUSTOMER INSIGHTS
              </h3>
              <p className="text-sm text-amber-500/60 font-mono mt-1">
                CUSTOMER BEHAVIOR AND TRENDS
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <Users className="w-5 h-5 text-amber-400" />
            </div>
          </div>

          <div className="text-center py-12">
            <Users className="w-12 h-12 text-amber-500/30 mx-auto mb-3" />
            <p className="text-white/50 font-mono">NO CUSTOMERS FOUND</p>
            <p className="text-sm text-amber-500/40 font-mono mt-1">
              ADD CUSTOMERS TO SEE INSIGHTS
            </p>
          </div>
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
    <div className="relative bg-[#0d1220] border border-amber-500/30 rounded-xl overflow-hidden group hover:border-amber-500/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]">
      {/* Blueprint grid background */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(245,158,11,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245,158,11,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
      />
      
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-500/50 rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-500/50 rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-500/50 rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-500/50 rounded-br-lg" />

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              CUSTOMER INSIGHTS
            </h3>
            <p className="text-sm text-amber-500/60 font-mono mt-1">
              TOP CUSTOMERS AND TRENDS
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <Users className="w-5 h-5 text-amber-400" />
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
            <div className="flex items-center gap-2 mb-1">
              <UserPlus className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-cyan-400 font-mono">NEW ({rangeShortLabel})</span>
            </div>
            <p className="text-2xl font-bold text-white font-mono">{newCustomers}</p>
          </div>

          <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
            <div className="flex items-center gap-2 mb-1">
              <Repeat className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-purple-400 font-mono">REPEAT RATE</span>
            </div>
            <p className="text-2xl font-bold text-white font-mono">{repeatRate}%</p>
          </div>

          <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-mono">AVG VALUE</span>
            </div>
            <p className="text-2xl font-bold text-white font-mono">${avgCustomerValue.toFixed(0)}</p>
          </div>
        </div>

        {/* Top customers */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            TOP CUSTOMERS BY REVENUE
          </h4>

          {topCustomers.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-amber-500/20 rounded-lg">
              <p className="text-sm text-white/40 font-mono">NO PAID INVOICES YET</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((customer, index) => {
                const widthPercent = (customer.totalSpent / maxSpent) * 100
                const rankColors = [
                  { bg: 'from-amber-400 to-amber-500', glow: 'rgba(245,158,11,0.5)' },
                  { bg: 'from-gray-300 to-gray-400', glow: 'rgba(156,163,175,0.5)' },
                  { bg: 'from-orange-400 to-orange-500', glow: 'rgba(249,115,22,0.5)' },
                  { bg: 'from-cyan-400 to-cyan-500', glow: 'rgba(6,182,212,0.5)' },
                  { bg: 'from-cyan-400 to-cyan-500', glow: 'rgba(6,182,212,0.5)' },
                ]
                const color = rankColors[index] || rankColors[4]

                return (
                  <div key={customer.id} className="group">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span 
                          className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold font-mono"
                          style={{ 
                            background: color.glow.replace('0.5', '0.2'),
                            color: index < 3 ? '#fbbf24' : '#22d3ee',
                            boxShadow: `0 0 8px ${color.glow}`,
                          }}
                        >
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white truncate">{customer.name}</p>
                          <p className="text-xs text-white/40 font-mono">{customer.totalJobs} jobs</p>
                        </div>
                      </div>
                      <span className="text-white font-mono font-semibold flex-shrink-0">
                        ${customer.totalSpent.toFixed(0)}
                      </span>
                    </div>

                    {/* Progress bar with neon glow */}
                    <div className="w-full bg-black/50 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 relative"
                        style={{ 
                          width: `${widthPercent}%`,
                          background: `linear-gradient(90deg, ${color.glow.replace('0.5', '0.8')}, ${color.glow.replace('0.5', '0.4')})`,
                          boxShadow: `0 0 10px ${color.glow}`,
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-4 border-t border-amber-500/20">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-amber-500/60 font-mono uppercase tracking-wider mb-1">Active Customers</p>
              <p className="text-xl font-bold text-white font-mono">{activeCustomerCount}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-amber-500/60 font-mono uppercase tracking-wider mb-1">Repeat Customers</p>
              <p className="text-xl font-bold text-white font-mono">{repeatCustomers}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-amber-500/60 font-mono uppercase tracking-wider mb-1">New Customers</p>
              <p className="text-xl font-bold text-white font-mono">{newCustomers}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
