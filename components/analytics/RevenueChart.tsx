import { createClient } from '@/lib/supabase/server'
import { format, eachDayOfInterval } from 'date-fns'
import { TrendingUp } from '@/components/ui/lucide'

interface RevenueChartProps {
  businessId: string
  rangeStart: string
  rangeEnd: string
  rangeLabel: string
}

export default async function RevenueChart({ businessId, rangeStart, rangeEnd, rangeLabel }: RevenueChartProps) {
  const supabase = await createClient()

  const startDate = new Date(rangeStart)
  const endDate = new Date(rangeEnd)

  const startDateStr = format(startDate, 'yyyy-MM-dd')
  const endDateStr = format(endDate, 'yyyy-MM-dd')

  // Get all invoices in date range (use issue_date for accuracy)
  const { data: invoices } = await supabase
    .from('invoices')
    .select('issue_date, total, status')
    .eq('business_id', businessId)
    .gte('issue_date', startDateStr)
    .lte('issue_date', endDateStr)
    .order('issue_date', { ascending: true })

  // Group by date
  const dateRange = eachDayOfInterval({ start: startDate, end: endDate })
  const dailyRevenue = dateRange.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayInvoices = invoices?.filter(inv => inv.issue_date === dateStr) || []

    return {
      date: format(date, 'MMM dd'),
      total: dayInvoices.reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0),
      paid: dayInvoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0),
    }
  })

  // Check if there's no revenue data
  const totalRevenue = dailyRevenue.reduce((sum, d) => sum + d.total, 0)
  const hasNoData = !invoices || invoices.length === 0 || totalRevenue === 0

  // Calculate max value for scaling (highest day in the period)
  const maxValue = Math.max(...dailyRevenue.map(d => Math.max(d.total, d.paid)), 1)

  // Show every 5th day label to avoid crowding
  const showLabel = (index: number) => index % 5 === 0 || index === dailyRevenue.length - 1

  return (
    <div className="relative bg-[#0d1220] border border-cyan-500/30 rounded-xl overflow-hidden group hover:border-cyan-500/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]">
      {/* Blueprint grid background */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
      />
      
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500/50 rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500/50 rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500/50 rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500/50 rounded-br-lg" />

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              REVENUE TREND
            </h3>
            <p className="text-sm text-cyan-500/60 font-mono mt-1">
              DAILY REVENUE OVER {rangeLabel.toUpperCase()}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
          </div>
        </div>

        {hasNoData ? (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-cyan-500/30 mx-auto mb-3" />
            <p className="text-white/50 font-mono">NO REVENUE DATA AVAILABLE</p>
            <p className="text-sm text-cyan-500/40 font-mono mt-1">
              NO INVOICES FOUND IN THE SELECTED PERIOD
            </p>
          </div>
        ) : (
          <>
            {/* Bar chart */}
            <div className="space-y-3">
              <div className="flex items-end justify-between h-48 gap-0.5">
                {dailyRevenue.map((day, index) => {
                  const heightPercent = (day.total / maxValue) * 100
                  const paidHeightPercent = (day.paid / maxValue) * 100

                  return (
                    <div key={index} className="flex-1 h-full flex flex-col items-center justify-end group/bar relative">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover/bar:block z-20">
                        <div className="bg-[#0d1220] border border-cyan-500/40 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                          <p className="font-mono font-medium text-cyan-400 mb-1">{day.date}</p>
                          <p className="text-white/70 font-mono">INVOICED: <span className="text-cyan-400">${day.total.toFixed(0)}</span></p>
                          <p className="text-white/70 font-mono">PAID: <span className="text-emerald-400">${day.paid.toFixed(0)}</span></p>
                        </div>
                      </div>

                      {/* Bars */}
                      <div className="w-full h-full flex items-end justify-center gap-[1px]">
                        <div
                          className="w-1/2 rounded-t transition-all cursor-pointer min-h-[2px] relative overflow-hidden"
                          style={{
                            height: `${Math.max(heightPercent, 2)}%`,
                            background: 'linear-gradient(to top, rgba(6,182,212,0.8), rgba(6,182,212,0.3))',
                            boxShadow: '0 0 10px rgba(6,182,212,0.3)',
                          }}
                        >
                          {/* Glow effect on hover */}
                          <div className="absolute inset-0 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-cyan-400/20" />
                        </div>
                        <div
                          className="w-1/2 rounded-t transition-all cursor-pointer min-h-[2px] relative overflow-hidden"
                          style={{
                            height: `${Math.max(paidHeightPercent, 2)}%`,
                            background: 'linear-gradient(to top, rgba(16,185,129,0.8), rgba(16,185,129,0.3))',
                            boxShadow: '0 0 10px rgba(16,185,129,0.3)',
                          }}
                        >
                          {/* Glow effect on hover */}
                          <div className="absolute inset-0 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-emerald-400/20" />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* X-axis labels */}
              <div className="flex items-center justify-between gap-0.5 text-xs text-cyan-500/50 font-mono">
                {dailyRevenue.map((day, index) => (
                  <div key={index} className="flex-1 text-center">
                    {showLabel(index) ? day.date : ''}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-cyan-500/20">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm"
                  style={{ background: 'rgba(6,182,212,0.8)', boxShadow: '0 0 8px rgba(6,182,212,0.5)' }}
                />
                <span className="text-xs text-white/50 font-mono">INVOICED REVENUE</span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm"
                  style={{ background: 'rgba(16,185,129,0.8)', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }}
                />
                <span className="text-xs text-white/50 font-mono">PAID REVENUE</span>
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-cyan-500/20">
              <div className="text-center">
                <p className="text-xs text-cyan-500/60 font-mono uppercase tracking-wider mb-1">Highest Day</p>
                <p className="text-xl font-bold text-white font-mono">
                  ${Math.max(...dailyRevenue.map(d => d.total)).toFixed(0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-cyan-500/60 font-mono uppercase tracking-wider mb-1">Average Day</p>
                <p className="text-xl font-bold text-white font-mono">
                  ${(dailyRevenue.reduce((sum, d) => sum + d.total, 0) / dailyRevenue.length).toFixed(0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-cyan-500/60 font-mono uppercase tracking-wider mb-1">Total Period</p>
                <p className="text-xl font-bold text-white font-mono">
                  ${dailyRevenue.reduce((sum, d) => sum + d.total, 0).toFixed(0)}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}


