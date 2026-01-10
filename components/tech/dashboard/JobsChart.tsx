'use client'

import { BarChart3 } from 'lucide-react'

interface WeekJob {
  scheduled_start: string
  status: string
}

interface JobsChartProps {
  weekJobs: WeekJob[]
}

export default function JobsChart({ weekJobs }: JobsChartProps) {
  // Group jobs by day of week
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = new Date()

  // Get last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today)
    date.setDate(date.getDate() - (6 - i))
    return date
  })

  // Count jobs per day
  const jobsPerDay = last7Days.map(date => {
    const count = weekJobs.filter(job => {
      const jobDate = new Date(job.scheduled_start)
      return jobDate.toDateString() === date.toDateString()
    }).length
    return { day: days[date.getDay()], count, date }
  })

  const maxCount = Math.max(...jobsPerDay.map(d => d.count), 1)

  return (
    <div className="rounded-3xl bg-white dark:bg-surface-900 p-6 shadow-elevation-premium-2 border border-surface-200 dark:border-white/10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-ink dark:text-surface-100 mb-1">Jobs This Week</h3>
          <p className="text-sm text-muted">Your activity over the last 7 days</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Bar Chart */}
      <div className="flex items-end justify-between gap-3 h-48">
        {jobsPerDay.map((item, index) => {
          const isToday = item.date.toDateString() === today.toDateString()
          const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0

          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-3">
              {/* Bar */}
              <div className="w-full flex flex-col justify-end h-full">
                <div
                  className={`w-full rounded-t-2xl transition-all motion-base relative group ${
                    isToday
                      ? 'bg-gradient-to-t from-[#1d4ed8] to-[#2563eb] shadow-lg shadow-blue-500/25'
                      : 'bg-gradient-to-t from-slate-200 to-slate-300 dark:from-white/10 dark:to-white/5'
                  }`}
                  style={{ height: `${height}%` }}
                >
                  {/* Striped pattern for pending */}
                  {!isToday && item.count > 0 && (
                    <div
                      className="absolute inset-0 rounded-t-2xl opacity-30"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)'
                      }}
                    />
                  )}

                  {/* Hover tooltip */}
                  {item.count > 0 && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-surface-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {item.count} job{item.count !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Label */}
              <div className="text-center">
                <div className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-muted'}`}>
                  {item.day}
                </div>
                {isToday && (
                  <div className="text-xs text-primary/60 mt-0.5">Today</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-[#1d4ed8] to-[#2563eb] shadow-sm shadow-blue-500/30"></div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Today</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-slate-200 to-slate-300 dark:from-white/10 dark:to-white/5 relative overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)'
              }}
            />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Other Days</span>
        </div>
      </div>
    </div>
  )
}
