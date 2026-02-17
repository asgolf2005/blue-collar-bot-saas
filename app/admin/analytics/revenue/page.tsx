import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Calendar,
  User,
  Wrench,
  Receipt,
} from '@/components/ui/lucide'
import { getDateRange, formatDisplayDate } from '@/lib/analytics/dateUtils'

interface InvoiceWithDetails {
  id: string
  invoice_number: string
  status: string
  total: number
  subtotal: number
  tax: number
  created_at: string
  paid_at: string | null
  issue_date: string
  customer_name: string
  technician_name: string
  service_name: string
  service_names: string[]
}

function isWithinRange(value: string | null | undefined, start: Date, end: Date): boolean {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return date >= start && date <= end
}

export default async function RevenueDetailPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined }
}) {
  const params = searchParams ? await Promise.resolve(searchParams) : {}
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

  if (!profile || !profile.business_id) {
    redirect('/login')
  }

  const businessId = profile.business_id
  const rawRange = Array.isArray(params?.range) ? params?.range[0] : params?.range
  const validRanges = new Set(['7d', '30d', '90d', 'ytd'])
  const range = validRanges.has(rawRange || '') ? (rawRange as '7d' | '30d' | '90d' | 'ytd') : '30d'
  const specificDate = Array.isArray(params?.date) ? params?.date[0] : params?.date
  
  const dateRange = getDateRange(range as any)

  // Fetch all business data, then apply range filters in memory
  const { data: invoicesData = [] } = await supabase
    .from('invoices')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  // Fetch related data
  const { data: customersData = [] } = await supabase
    .from('customers')
    .select('id, name')
    .eq('business_id', businessId)

  const { data: usersData = [] } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('business_id', businessId)

  const { data: servicesData = [] } = await supabase
    .from('services')
    .select('id, name')
    .eq('business_id', businessId)

  // Fetch jobs to get technician/service links
  const { data: jobsData = [] } = await supabase
    .from('jobs')
    .select('id, technician_id, customer_id')
    .eq('business_id', businessId)

  const jobIds = (jobsData || []).map(job => job.id)
  const { data: jobServicesData = [] } = jobIds.length
    ? await supabase
        .from('job_services')
        .select('job_id, service_id')
        .in('job_id', jobIds)
    : { data: [] as Array<{ job_id: string; service_id: string }> }

  // Build lookup maps
  const customerMap = new Map((customersData || []).map(c => [c.id, c.name]))
  const userMap = new Map((usersData || []).map(u => [u.id, u.full_name]))
  const serviceMap = new Map((servicesData || []).map(s => [s.id, s.name]))
  const jobMap = new Map((jobsData || []).map(j => [j.id, { 
    technician_id: j.technician_id,
    customer_id: j.customer_id 
  }]))
  const jobServiceNames = new Map<string, string[]>()

  ;(jobServicesData || []).forEach(row => {
    const serviceName = row.service_id ? serviceMap.get(row.service_id) : null
    if (!serviceName) return
    const existing = jobServiceNames.get(row.job_id) || []
    existing.push(serviceName)
    jobServiceNames.set(row.job_id, existing)
  })

  // Transform invoices with related data
  const invoices: InvoiceWithDetails[] = (invoicesData || []).map((inv: any) => {
    const job = inv.job_id ? jobMap.get(inv.job_id) : null
    const serviceNames = inv.job_id ? (jobServiceNames.get(inv.job_id) || []) : []
    return {
      id: inv.id,
      invoice_number: inv.invoice_number,
      status: inv.status,
      total: inv.total || 0,
      subtotal: inv.subtotal || 0,
      tax: inv.tax || 0,
      created_at: inv.created_at,
      paid_at: inv.paid_at,
      issue_date: inv.issue_date,
      customer_name: customerMap.get(inv.customer_id) || 'Unknown',
      technician_name: job?.technician_id ? userMap.get(job.technician_id) || 'Unknown' : 'Unassigned',
      service_name: serviceNames[0] || 'General Service',
      service_names: serviceNames
    }
  })

  // Filter to paid invoices
  const paidInvoices = invoices.filter(i => i.status === 'paid')
  const paidInvoicesInRange = paidInvoices.filter(i =>
    isWithinRange(i.paid_at || i.created_at, dateRange.start, dateRange.end)
  )
  
  // Filter by specific date if provided
  const filteredInvoices = specificDate
    ? paidInvoicesInRange.filter(i => (i.paid_at || i.created_at).startsWith(specificDate))
    : paidInvoicesInRange

  const totalRevenue = filteredInvoices.reduce((sum, i) => sum + i.total, 0)
  const outstandingRevenue = invoices
    .filter(i =>
      (i.status === 'sent' || i.status === 'overdue') &&
      isWithinRange(i.created_at, dateRange.start, dateRange.end)
    )
    .reduce((sum, i) => sum + i.total, 0)

  // Calculate service breakdown
  const serviceMap2 = new Map<string, { name: string; revenue: number; invoices: number; icon: string }>()
  filteredInvoices.forEach(inv => {
    const serviceNames = inv.service_names.length ? inv.service_names : ['General Service']
    const splitRevenue = serviceNames.length > 0 ? inv.total / serviceNames.length : inv.total

    serviceNames.forEach(serviceName => {
      if (!serviceMap2.has(serviceName)) {
        serviceMap2.set(serviceName, {
          name: serviceName,
          revenue: 0,
          invoices: 0,
          icon: 'general'
        })
      }

      const service = serviceMap2.get(serviceName)!
      service.revenue += splitRevenue
      service.invoices++
    })
  })

  const serviceBreakdown = Array.from(serviceMap2.values())
    .sort((a, b) => b.revenue - a.revenue)

  // Calculate technician breakdown
  const techMap = new Map<string, { id: string; name: string; revenue: number; invoices: number }>()
  filteredInvoices.forEach(inv => {
    const techName = inv.technician_name
    const techId = techName.replace(/\s+/g, '-').toLowerCase()
    
    if (!techMap.has(techId)) {
      techMap.set(techId, { id: techId, name: techName, revenue: 0, invoices: 0 })
    }
    
    const tech = techMap.get(techId)!
    tech.revenue += inv.total
    tech.invoices++
  })

  const technicianBreakdown = Array.from(techMap.values())
    .sort((a, b) => b.revenue - a.revenue)

  // Calculate daily breakdown from paid invoices in selected range
  const dailyMap = new Map<string, { date: string; revenue: number; invoices: number }>()
  paidInvoicesInRange.forEach(inv => {
    const date = (inv.paid_at || inv.created_at).split('T')[0]
    
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { date, revenue: 0, invoices: 0 })
    }
    
    const day = dailyMap.get(date)!
    day.revenue += inv.total
    day.invoices++
  })

  const dailyBreakdown = Array.from(dailyMap.values())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 14)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const maxServiceRevenue = serviceBreakdown[0]?.revenue || 1
  const maxTechRevenue = technicianBreakdown[0]?.revenue || 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link 
              href={`/admin/analytics?range=${range}`}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-mono text-xs">Back to Analytics</span>
            </Link>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl text-slate-900 dark:text-white tracking-wide">
            {specificDate ? `REVENUE: ${formatDate(specificDate)}` : 'REVENUE BREAKDOWN'}
          </h1>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1">
            {specificDate 
              ? `${filteredInvoices.length} paid invoice${filteredInvoices.length !== 1 ? 's' : ''}`
              : `${formatDisplayDate(dateRange.start)} - ${formatDisplayDate(dateRange.end)}`
            }
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <div className="bg-emerald-50 dark:bg-emerald-400/10 rounded-xl px-6 py-4 border border-emerald-200 dark:border-emerald-400/20">
            <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              {specificDate ? 'Daily Revenue' : 'Total Revenue'}
            </p>
            <p className="font-display text-3xl text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
          {outstandingRevenue > 0 && (
            <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
              {formatCurrency(outstandingRevenue)} outstanding
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Service */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-400/20 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h2 className="font-display text-xl text-slate-900 dark:text-white">By Service</h2>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">Revenue breakdown by service type</p>
            </div>
          </div>

          <div className="space-y-4">
            {serviceBreakdown.length === 0 ? (
              <p className="font-mono text-sm text-slate-500 text-center py-8">No paid invoices found</p>
            ) : (
              serviceBreakdown.map((service) => {
                const percentage = totalRevenue > 0 ? (service.revenue / totalRevenue) * 100 : 0
                const barWidth = maxServiceRevenue > 0 ? (service.revenue / maxServiceRevenue) * 100 : 0
                
                return (
                  <div key={service.name} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{service.name}</span>
                      <div className="text-right">
                        <span className="font-mono text-sm font-medium text-slate-900 dark:text-white">
                          {formatCurrency(service.revenue)}
                        </span>
                        <span className="font-mono text-xs text-slate-500 ml-2">({percentage.toFixed(0)}%)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-slate-500 w-16 text-right">{service.invoices} inv</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Revenue by Technician */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-400/20 flex items-center justify-center">
              <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="font-display text-xl text-slate-900 dark:text-white">By Technician</h2>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">Revenue contribution by team member</p>
            </div>
          </div>

          <div className="space-y-4">
            {technicianBreakdown.length === 0 ? (
              <p className="font-mono text-sm text-slate-500 text-center py-8">No technician data available</p>
            ) : (
              technicianBreakdown.map((tech) => {
                const percentage = totalRevenue > 0 ? (tech.revenue / totalRevenue) * 100 : 0
                const barWidth = maxTechRevenue > 0 ? (tech.revenue / maxTechRevenue) * 100 : 0
                
                return (
                  <div key={tech.id} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-mono text-xs font-bold">
                          {tech.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{tech.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-sm font-medium text-slate-900 dark:text-white">
                          {formatCurrency(tech.revenue)}
                        </span>
                        <span className="font-mono text-xs text-slate-500 ml-2">({percentage.toFixed(0)}%)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-slate-500 w-16 text-right">{tech.invoices} inv</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Daily Breakdown - only show if not filtering by specific date */}
      {!specificDate && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-400/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="font-display text-xl text-slate-900 dark:text-white">Daily Breakdown</h2>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">Revenue by day</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase">Date</th>
                  <th className="text-right py-3 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase">Invoices</th>
                  <th className="text-right py-3 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase">Revenue</th>
                  <th className="text-right py-3 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase">Avg Ticket</th>
                </tr>
              </thead>
              <tbody>
                {dailyBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center font-mono text-sm text-slate-500">
                      No revenue data for this period
                    </td>
                  </tr>
                ) : (
                  dailyBreakdown.map((day) => (
                    <tr key={day.date} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-3 font-mono text-sm text-slate-700 dark:text-slate-300">
                        <Link 
                          href={`/admin/analytics/revenue?date=${day.date}&range=${range}`}
                          className="hover:text-cyan-600 dark:hover:text-cyan-400"
                        >
                          {formatDate(day.date)}
                        </Link>
                      </td>
                      <td className="py-3 text-right font-mono text-sm text-slate-700 dark:text-slate-300">
                        {day.invoices}
                      </td>
                      <td className="py-3 text-right font-mono text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(day.revenue)}
                      </td>
                      <td className="py-3 text-right font-mono text-sm text-slate-500 dark:text-slate-400">
                        {formatCurrency(day.invoices > 0 ? day.revenue / day.invoices : 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paid Invoices List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-400/20 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="font-display text-xl text-slate-900 dark:text-white">
                {specificDate ? `Invoices for ${formatDate(specificDate)}` : 'Paid Invoices'}
              </h2>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                {filteredInvoices.length} paid invoice{filteredInvoices.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Link 
            href="/admin/invoices?status=paid"
            className="font-mono text-xs text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
          >
            View All â†’
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase">Invoice #</th>
                <th className="text-left py-3 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase">Date</th>
                <th className="text-left py-3 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase">Customer</th>
                <th className="text-left py-3 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase">Technician</th>
                <th className="text-right py-3 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="py-3 font-mono text-sm">
                    <Link 
                      href={`/admin/invoices/${invoice.id}`}
                      className="text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
                    >
                      #{invoice.invoice_number}
                    </Link>
                  </td>
                  <td className="py-3 font-mono text-sm text-slate-700 dark:text-slate-300">
                    {formatDate(invoice.paid_at || invoice.created_at)}
                  </td>
                  <td className="py-3 font-mono text-sm text-slate-700 dark:text-slate-300">
                    {invoice.customer_name}
                  </td>
                  <td className="py-3 font-mono text-sm text-slate-700 dark:text-slate-300">
                    {invoice.technician_name}
                  </td>
                  <td className="py-3 text-right font-mono text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(invoice.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


