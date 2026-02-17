import { createClient } from '@/lib/supabase/server'
import { Award } from '@/components/ui/lucide'

interface ServicePopularityProps {
  businessId: string
  rangeStart: string
  rangeEnd: string
  rangeLabel: string
}

// Neon color palette for services
const neonColors = [
  { bg: 'from-cyan-500 to-cyan-400', glow: 'rgba(6,182,212,0.5)', text: 'text-cyan-400' },
  { bg: 'from-blue-500 to-blue-400', glow: 'rgba(59,130,246,0.5)', text: 'text-blue-400' },
  { bg: 'from-purple-500 to-purple-400', glow: 'rgba(139,92,246,0.5)', text: 'text-purple-400' },
  { bg: 'from-pink-500 to-pink-400', glow: 'rgba(236,72,153,0.5)', text: 'text-pink-400' },
  { bg: 'from-amber-500 to-amber-400', glow: 'rgba(245,158,11,0.5)', text: 'text-amber-400' },
  { bg: 'from-emerald-500 to-emerald-400', glow: 'rgba(16,185,129,0.5)', text: 'text-emerald-400' },
  { bg: 'from-rose-500 to-rose-400', glow: 'rgba(244,63,94,0.5)', text: 'text-rose-400' },
  { bg: 'from-indigo-500 to-indigo-400', glow: 'rgba(99,102,241,0.5)', text: 'text-indigo-400' },
]

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

    // Only count revenue from jobs with actual invoices
    if (job?.invoices && job.invoices.length > 0) {
      const invoice = job.invoices[0]
      const invoiceTotal = parseFloat(invoice.total?.toString() || '0')

      const jobServicesCount = jobServices?.filter(jss => {
        const jssJob = jss.job as any
        return jssJob?.id === job.id
      }).length || 1

      stats.revenue += invoiceTotal / jobServicesCount
    }
  })

  // Convert to array and sort by count
  const services = Array.from(serviceMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const maxCount = Math.max(...services.map(s => s.count), 1)

  // Calculate totals
  const totalJobs = services.reduce((sum, s) => sum + s.count, 0)
  const totalRevenue = services.reduce((sum, s) => sum + s.revenue, 0)

  // Calculate pie chart data
  const pieData = services.map((service, index) => ({
    ...service,
    percentage: (service.count / totalJobs) * 100,
    color: neonColors[index % neonColors.length],
    startAngle: index === 0 ? 0 : services.slice(0, index).reduce((sum, s, i) => sum + (services[i].count / totalJobs) * 360, 0),
  }))

  return (
    <div className="relative bg-[#0d1220] border border-cyan-500/30 rounded-xl overflow-hidden group hover:border-cyan-500/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]">
      {/* Blueprint grid background */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
      />
      
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-purple-500/50 rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-purple-500/50 rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-purple-500/50 rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-purple-500/50 rounded-br-lg" />

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
              MOST POPULAR SERVICES
            </h3>
            <p className="text-sm text-purple-500/60 font-mono mt-1">
              TOP SERVICES BY INVOICED REVENUE
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30">
            <Award className="w-5 h-5 text-purple-400" />
          </div>
        </div>

        {services.length === 0 ? (
          <div className="text-center py-12">
            <Award className="w-12 h-12 text-purple-500/30 mx-auto mb-3" />
            <p className="text-white/50 font-mono">NO SERVICE DATA AVAILABLE</p>
            <p className="text-sm text-purple-500/40 font-mono mt-1">
              COMPLETE JOBS WITH SERVICES TO SEE ANALYTICS
            </p>
          </div>
        ) : (
          <>
            {/* Service visualization with donut chart and list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Donut Chart */}
              <div className="flex items-center justify-center">
                <div className="relative w-40 h-40">
                  <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                    {pieData.map((segment, index) => {
                      const startAngle = (segment.startAngle / 360) * 2 * Math.PI
                      const endAngle = ((segment.startAngle + (segment.percentage / 100) * 360) / 360) * 2 * Math.PI
                      
                      const x1 = 50 + 40 * Math.cos(startAngle)
                      const y1 = 50 + 40 * Math.sin(startAngle)
                      const x2 = 50 + 40 * Math.cos(endAngle)
                      const y2 = 50 + 40 * Math.sin(endAngle)
                      
                      const largeArcFlag = segment.percentage > 50 ? 1 : 0
                      
                      return (
                        <path
                          key={segment.id}
                          d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                          fill={`url(#gradient-${index})`}
                          stroke="#0d1220"
                          strokeWidth="2"
                          className="hover:opacity-80 transition-opacity cursor-pointer"
                        />
                      )
                    })}
                    <defs>
                      {pieData.map((segment, index) => (
                        <linearGradient key={segment.id} id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" className={segment.color.bg.split(' ')[0].replace('from-', 'text-').replace('-500', '-400')} stopColor="currentColor" />
                          <stop offset="100%" className={segment.color.bg.split(' ')[1].replace('to-', 'text-').replace('-400', '-500')} stopColor="currentColor" />
                        </linearGradient>
                      ))}
                    </defs>
                  </svg>
                  {/* Center hole */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 bg-[#0d1220] rounded-full border border-purple-500/30 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-xs text-purple-500/60 font-mono">TOTAL</p>
                        <p className="text-lg font-bold text-white font-mono">{totalJobs}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Glow effect */}
                  <div 
                    className="absolute inset-0 rounded-full opacity-30 blur-xl -z-10"
                    style={{ background: `conic-gradient(from 0deg, ${pieData.map((s, i) => `${neonColors[i % neonColors.length].glow} ${s.startAngle}deg, ${neonColors[i % neonColors.length].glow} ${s.startAngle + (s.percentage / 100) * 360}deg`).join(', ')})` }}
                  />
                </div>
              </div>

              {/* Service list */}
              <div className="space-y-3">
                {services.slice(0, 5).map((service, index) => {
                  const widthPercent = (service.count / maxCount) * 100
                  const color = neonColors[index % neonColors.length]

                  return (
                    <div key={service.id} className="group">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <span 
                            className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold font-mono"
                            style={{ 
                              background: color.glow.replace('0.5', '0.2'),
                              color: color.text.replace('text-', ''),
                              boxShadow: `0 0 8px ${color.glow}`,
                            }}
                          >
                            {index + 1}
                          </span>
                          <span className="font-medium text-white/90 text-sm">{service.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-white/40 font-mono text-xs">{service.count} jobs</span>
                          <span className="text-white font-mono font-semibold w-16 text-right text-sm">
                            ${service.revenue.toFixed(0)}
                          </span>
                        </div>
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
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-purple-500/20">
              <div className="text-center">
                <p className="text-xs text-purple-500/60 font-mono uppercase tracking-wider mb-1">Total Jobs</p>
                <p className="text-xl font-bold text-white font-mono">{totalJobs}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-purple-500/60 font-mono uppercase tracking-wider mb-1">Services Used</p>
                <p className="text-xl font-bold text-white font-mono">{services.length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-purple-500/60 font-mono uppercase tracking-wider mb-1">Total Revenue</p>
                <p className="text-xl font-bold text-white font-mono">
                  ${totalRevenue.toFixed(0)}
                </p>
              </div>
            </div>

            {/* Top performer badge */}
            {services.length > 0 && (
              <div className="mt-4 p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-400" style={{ filter: 'drop-shadow(0 0 4px rgba(139,92,246,0.5))' }} />
                  <span className="text-sm font-medium text-white">
                    TOP PERFORMER: <span className="text-purple-400">{services[0].name}</span>
                  </span>
                </div>
                <p className="text-xs text-white/40 mt-1 ml-6 font-mono">
                  {services[0].count} JOBS â€¢ ${services[0].revenue.toFixed(0)} REVENUE
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}


