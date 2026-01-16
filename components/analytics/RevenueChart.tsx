import { createClient } from '@/lib/supabase/server'
import { format, eachDayOfInterval } from 'date-fns'
import { TrendingUp } from 'lucide-react'

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

  // Calculate max value for scaling (highest day in the period)
  const maxValue = Math.max(...dailyRevenue.map(d => Math.max(d.total, d.paid)), 1)

  // Show every 5th day label to avoid crowding
  const showLabel = (index: number) => index % 5 === 0 || index === dailyRevenue.length - 1

  return (
    <div className="chart-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-ink">Revenue Trend</h3>
          <p className="text-sm text-muted">Daily revenue over {rangeLabel.toLowerCase()}</p>
        </div>
        <div className="p-2.5 rounded-xl bg-primary/10">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Bar chart */}
      <div className="space-y-3">
        <div className="flex items-end justify-between h-48 gap-0.5">
          {dailyRevenue.map((day, index) => {
            const heightPercent = (day.total / maxValue) * 100
            const paidHeightPercent = (day.paid / maxValue) * 100

            return (
              <div key={index} className="flex-1 h-full flex flex-col items-center justify-end group relative">
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                  <div className="bg-surface-50/95 border border-surface-200 text-ink text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-glass">
                    <p className="font-medium text-ink mb-1">{day.date}</p>
                    <p className="text-muted">Invoiced: <span className="text-primary">${day.total.toFixed(0)}</span></p>
                    <p className="text-muted">Paid: <span className="text-success">${day.paid.toFixed(0)}</span></p>
                  </div>
                </div>

                {/* Bars */}
                <div className="w-full h-full flex items-end justify-center gap-0.5">
                  <div
                    className="w-1/2 rounded-t transition-all cursor-pointer min-h-[2px] relative overflow-hidden bg-gradient-to-t from-primary/80 to-primary/40"
                    style={{
                      height: `${Math.max(heightPercent, 2)}%`,
                    }}
                  >
                    {/* Hover glow effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10" />
                  </div>
                  <div
                    className="w-1/2 rounded-t transition-all cursor-pointer min-h-[2px] relative overflow-hidden bg-gradient-to-t from-success/80 to-success/50"
                    style={{
                      height: `${Math.max(paidHeightPercent, 2)}%`,
                    }}
                  >
                    {/* Hover glow effect */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* X-axis labels */}
        <div className="flex items-center justify-between gap-0.5 text-xs text-muted">
          {dailyRevenue.map((day, index) => (
            <div key={index} className="flex-1 text-center">
              {showLabel(index) ? day.date : ''}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-surface-200">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-primary"></div>
          <span className="text-xs text-muted">Invoiced Revenue</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-success"></div>
          <span className="text-xs text-muted">Paid Revenue</span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-surface-200">
        <div className="text-center">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Highest Day</p>
          <p className="text-lg font-bold text-ink">
            ${Math.max(...dailyRevenue.map(d => d.total)).toFixed(0)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Average Day</p>
          <p className="text-lg font-bold text-ink">
            ${(dailyRevenue.reduce((sum, d) => sum + d.total, 0) / dailyRevenue.length).toFixed(0)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Total Period</p>
          <p className="text-lg font-bold text-ink">
            ${dailyRevenue.reduce((sum, d) => sum + d.total, 0).toFixed(0)}
          </p>
        </div>
      </div>
    </div>
  )
}
