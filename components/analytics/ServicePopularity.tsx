import { createClient } from '@/lib/supabase/server'
import { Award } from 'lucide-react'

interface ServicePopularityProps {
  businessId: string
  rangeStart: string
  rangeEnd: string
  rangeLabel: string
}

export default async function ServicePopularity({ businessId, rangeStart, rangeEnd, rangeLabel }: ServicePopularityProps) {
  const supabase = await createClient()

  const startDate = new Date(rangeStart)
  const endDate = new Date(rangeEnd)

  // Get all job services in date range with invoice data
  const { data: jobServices } = await supabase
    .from('job_services')
    .select(`
      *,
      service:services(id, name, base_price),
      job:jobs!inner(
        business_id,
        created_at,
        id,
        invoices(total, status)
      )
    `)
    .eq('job.business_id', businessId)
    .gte('job.created_at', startDate.toISOString())
    .lte('job.created_at', endDate.toISOString())

  // Group by service and calculate metrics
  interface ServiceStats {
    id: string
    name: string
    count: number
    revenue: number
    basePrice: number
  }

  const serviceMap = new Map<string, ServiceStats>()

  jobServices?.forEach(js => {
    const service = js.service as any
    const job = js.job as any
    if (!service) return

    if (!serviceMap.has(service.id)) {
      serviceMap.set(service.id, {
        id: service.id,
        name: service.name,
        count: 0,
        revenue: 0,
        basePrice: parseFloat(service.base_price?.toString() || '0'),
      })
    }

    const stats = serviceMap.get(service.id)!
    stats.count += 1

    // ✅ FIX: Only count revenue from jobs with actual invoices
    // This makes Service Breakdown match Revenue Trend exactly
    if (job?.invoices && job.invoices.length > 0) {
      // Use the first invoice (there should only be one per job)
      const invoice = job.invoices[0]
      const invoiceTotal = parseFloat(invoice.total?.toString() || '0')

      // If job has invoice, use actual invoice amount
      // Divide by number of services on the job for proportional allocation
      const jobServicesCount = jobServices?.filter(jss => {
        const jssJob = jss.job as any
        return jssJob?.id === job.id
      }).length || 1

      stats.revenue += invoiceTotal / jobServicesCount
    }
    // ⚠️ Changed: Don't count jobs without invoices
    // This ensures Service Breakdown matches Revenue Trend
    // (Revenue Trend only counts invoiced jobs too)
  })

  // Convert to array and sort by count
  const services = Array.from(serviceMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10) // Top 10 services

  const maxCount = Math.max(...services.map(s => s.count), 1)

  // Calculate totals
  const totalJobs = services.reduce((sum, s) => sum + s.count, 0)
  const totalRevenue = services.reduce((sum, s) => sum + s.revenue, 0)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-ink">Most Popular Services</h3>
          <p className="text-sm text-muted">Top services by actual invoiced revenue (excludes un-invoiced jobs)</p>
        </div>
        <div className="w-10 h-10 bg-info/10 rounded-lg flex items-center justify-center">
          <Award className="w-5 h-5 text-info" />
        </div>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-12">
          <Award className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted">No service data available</p>
          <p className="text-sm text-muted mt-1">
            Complete jobs with services to see analytics
          </p>
        </div>
      ) : (
        <>
          {/* Service list with bars */}
          <div className="space-y-4 mb-6">
            {services.map((service, index) => {
              const widthPercent = (service.count / maxCount) * 100

              return (
                <div key={service.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 bg-surface-100 rounded-full text-xs font-semibold text-muted">
                        {index + 1}
                      </span>
                      <span className="font-medium text-ink">{service.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-muted">{service.count} jobs</span>
                      <span className="text-ink font-semibold w-20 text-right">
                        ${service.revenue.toFixed(0)}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-surface-100 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-info to-info/70 h-2 rounded-full transition-all"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-surface-200">
            <div>
              <p className="text-xs text-muted">Total Jobs</p>
              <p className="text-lg font-semibold text-ink">{totalJobs}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Services Used</p>
              <p className="text-lg font-semibold text-ink">{services.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Total Revenue</p>
              <p className="text-lg font-semibold text-ink">
                ${totalRevenue.toFixed(0)}
              </p>
            </div>
          </div>

          {/* Top performer badge */}
          {services.length > 0 && (
            <div className="mt-4 p-3 bg-info/10 rounded-lg border border-info/20">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-info" />
                <span className="text-sm font-medium text-ink">
                  Top Performer: {services[0].name}
                </span>
              </div>
              <p className="text-xs text-muted mt-1 ml-6">
                {services[0].count} jobs • ${services[0].revenue.toFixed(0)} revenue
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
