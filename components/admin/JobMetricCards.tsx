'use client'

import { Briefcase, Clock, Calendar, CheckCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface JobMetricCardsProps {
  stats: {
    totalJobs: number
    completedJobs: number
    inProgressJobs: number
    scheduledJobs: number
    completionRate: number
    thisWeekJobs: number
  }
  trends: {
    totalJobs: number | null
    activeJobs: number | null
    scheduledJobs: number | null
    completionRate: number | null
  }
  periodLabel: string
}

export default function JobMetricCards({ stats, trends, periodLabel }: JobMetricCardsProps) {
  const metrics = [
    {
      label: 'Total Jobs',
      value: stats.totalJobs.toString(),
      subtext: `${stats.thisWeekJobs} ${periodLabel}`,
      change: trends.totalJobs,
      icon: Briefcase,
      iconBg: 'bg-primary/12',
      iconColor: 'text-primary',
      glowClass: 'shadow-elevation-2',
      valueClass: 'text-ink',
    },
    {
      label: 'Active Now',
      value: stats.inProgressJobs.toString(),
      subtext: 'In progress & en route',
      change: trends.activeJobs,
      icon: Clock,
      iconBg: 'bg-warning/15',
      iconColor: 'text-warning',
      glowClass: '',
      valueClass: 'text-warning',
      pulseIndicator: true,
    },
    {
      label: 'Scheduled',
      value: stats.scheduledJobs.toString(),
      subtext: 'Upcoming jobs',
      change: trends.scheduledJobs,
      icon: Calendar,
      iconBg: 'bg-info/12',
      iconColor: 'text-info',
      glowClass: '',
      valueClass: 'text-ink',
    },
    {
      label: 'Completion Rate',
      value: `${stats.completionRate}%`,
      subtext: `${stats.completedJobs} completed`,
      change: trends.completionRate,
      icon: CheckCircle,
      iconBg: 'bg-success/15',
      iconColor: 'text-success',
      glowClass: 'shadow-elevation-2',
      valueClass: 'text-success',
      showProgressBar: true,
      progressValue: stats.completionRate,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon
        const hasChange = typeof metric.change === 'number' && Number.isFinite(metric.change)
        const isPositive = hasChange ? (metric.change ?? 0) >= 0 : true
        return (
          <div
            key={metric.label}
            className={`metric-card group animate-fade-in-up ${metric.glowClass}`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl ${metric.iconBg} transition-transform duration-300 group-hover:scale-110 relative`}>
                <Icon className={`w-5 h-5 ${metric.iconColor}`} />
                {metric.pulseIndicator && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-warning"></span>
                  </span>
                )}
              </div>
              {hasChange && (
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                  isPositive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                }`}>
                  {isPositive ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {Math.abs(metric.change ?? 0).toFixed(1)}%
                </span>
              )}
            </div>

            <div>
              <p className="text-xs text-muted uppercase tracking-widest font-medium mb-1">
                {metric.label}
              </p>
              <p className={`text-3xl font-bold font-mono tracking-tight mb-1 ${metric.valueClass}`}>
                {metric.value}
              </p>
              <p className={`text-xs ${isPositive ? 'text-success' : 'text-muted'}`}>
                {metric.subtext}
              </p>
            </div>

            {metric.showProgressBar && (
              <div className="mt-3 w-full h-2 rounded-full bg-surface-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-success to-success/70 transition-all duration-1000"
                  style={{
                    width: `${metric.progressValue}%`,
                    boxShadow: '0 0 16px rgba(46, 125, 107, 0.25)'
                  }}
                />
              </div>
            )}

            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </div>
        )
      })}
    </div>
  )
}
