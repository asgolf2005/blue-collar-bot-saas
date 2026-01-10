import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  DollarSign,
  TrendingUp,
  Users,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Zap,
  Target,
  PieChart
} from 'lucide-react'
import { endOfDay, startOfDay, startOfYear, subDays } from 'date-fns'
import RevenueChart from '@/components/analytics/RevenueChart'
import ServicePopularity from '@/components/analytics/ServicePopularity'
import TechPerformance from '@/components/analytics/TechPerformance'
import CustomerInsights from '@/components/analytics/CustomerInsights'

type RangeKey = '7d' | '30d' | '90d' | 'ytd'

const rangeOptions: Array<{ key: RangeKey; label: string; days?: number; shortLabel: string }> = [
  { key: '7d', label: 'Last 7 days', days: 7, shortLabel: '7D' },
  { key: '30d', label: 'Last 30 days', days: 30, shortLabel: '30D' },
  { key: '90d', label: 'Last 90 days', days: 90, shortLabel: '90D' },
  { key: 'ytd', label: 'Year to date', shortLabel: 'YTD' },
]

const calcChange = (current: number, previous: number) => {
  if (!previous) return null
  return ((current - previous) / previous) * 100
}

const formatChange = (value: number | null) => {
  if (value === null) return null
  const rounded = Number(value.toFixed(1))
  return `${rounded > 0 ? '+' : ''}${rounded}%`
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const params = await searchParams
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

  if (!profile || profile.role !== 'admin') {
    redirect('/tech/today')
  }

  const requestedRange = params.range
  const selectedRange = rangeOptions.find((range) => range.key === requestedRange) || rangeOptions[1]
  const endDate = endOfDay(new Date())
  const startDate = selectedRange.key === 'ytd'
    ? startOfYear(endDate)
    : startOfDay(subDays(endDate, selectedRange.days || 30))
  const previousEndDate = new Date(startDate.getTime() - 1)
  const previousStartDate = new Date(previousEndDate.getTime() - (endDate.getTime() - startDate.getTime()))
  const rangeLabel = selectedRange.label

  const [
    { data: invoices },
    { data: previousInvoices },
    { data: jobs },
    { data: previousJobs },
    { count: newCustomerCount },
  ] = await Promise.all([
    supabase
      .from('invoices')
      .select('*')
      .eq('business_id', profile.business_id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString()),
    supabase
      .from('invoices')
      .select('*')
      .eq('business_id', profile.business_id)
      .gte('created_at', previousStartDate.toISOString())
      .lte('created_at', previousEndDate.toISOString()),
    supabase
      .from('jobs')
      .select('*')
      .eq('business_id', profile.business_id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString()),
    supabase
      .from('jobs')
      .select('*')
      .eq('business_id', profile.business_id)
      .gte('created_at', previousStartDate.toISOString())
      .lte('created_at', previousEndDate.toISOString()),
    supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', profile.business_id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString()),
  ])

  const totalRevenue = invoices?.reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0) || 0
  const paidRevenue = invoices?.filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0) || 0
  const outstandingRevenue = totalRevenue - paidRevenue
  const previousTotalRevenue = previousInvoices?.reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0) || 0

  const completedJobs = jobs?.filter(job => job.status === 'completed').length || 0
  const totalJobs = jobs?.length || 0
  const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0
  const previousCompletedJobs = previousJobs?.filter(job => job.status === 'completed').length || 0

  // Get average job value
  const avgJobValue = completedJobs > 0 ? paidRevenue / completedJobs : 0
  const previousPaidRevenue = previousInvoices?.filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0) || 0
  const previousAvgJobValue = previousCompletedJobs > 0 ? previousPaidRevenue / previousCompletedJobs : 0

  const revenueChange = calcChange(totalRevenue, previousTotalRevenue)
  const jobCompletionChange = calcChange(completedJobs, previousCompletedJobs)
  const avgJobValueChange = calcChange(avgJobValue, previousAvgJobValue)

  const primaryMetrics = [
    {
      label: 'Total Revenue',
      value: `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      subtext: `$${paidRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} collected`,
      change: formatChange(revenueChange),
      positive: revenueChange === null ? null : revenueChange >= 0,
      icon: DollarSign,
      iconBg: 'bg-success/15',
      iconColor: 'text-success',
      glowClass: 'shadow-elevation-2',
      valueClass: 'text-success',
    },
    {
      label: 'Outstanding',
      value: `$${outstandingRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      subtext: `${invoices?.filter(inv => inv.status !== 'paid').length || 0} unpaid invoices`,
      change: null,
      positive: false,
      icon: Clock,
      iconBg: 'bg-warning/15',
      iconColor: 'text-warning',
      glowClass: '',
      valueClass: 'text-warning',
    },
    {
      label: 'Jobs Completed',
      value: completedJobs.toString(),
      subtext: `${completionRate}% completion rate`,
      change: formatChange(jobCompletionChange),
      positive: jobCompletionChange === null ? null : jobCompletionChange >= 0,
      icon: CheckCircle,
      iconBg: 'bg-primary/12',
      iconColor: 'text-primary',
      glowClass: 'shadow-elevation-2',
      valueClass: 'text-ink',
    },
    {
      label: 'Avg Job Value',
      value: `$${avgJobValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      subtext: `Per completed job (${rangeLabel.toLowerCase()})`,
      change: formatChange(avgJobValueChange),
      positive: avgJobValueChange === null ? null : avgJobValueChange >= 0,
      icon: TrendingUp,
      iconBg: 'bg-success/15',
      iconColor: 'text-success',
      glowClass: '',
      valueClass: 'text-success',
    },
  ]

  const secondaryMetrics = [
    {
      label: 'New Customers',
      value: newCustomerCount || 0,
      subtext: rangeLabel,
      positive: true,
      icon: Users,
    },
    {
      label: 'Total Jobs',
      value: totalJobs,
      subtext: rangeLabel,
      positive: null,
      icon: Briefcase,
    },
    {
      label: 'Invoices Sent',
      value: invoices?.length || 0,
      subtext: `${invoices?.filter(inv => inv.status === 'paid').length || 0} paid (${rangeLabel.toLowerCase()})`,
      positive: true,
      icon: Calendar,
    },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 shadow-elevation-2">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-ink tracking-tight">Profit Analytics</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/15 text-success border border-success/30">
              LIVE
            </span>
          </div>
          <p className="text-muted">Real-time business intelligence for {rangeLabel.toLowerCase()}</p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-surface-50/80 border border-surface-200 p-1">
            {rangeOptions.map((range) => (
              <Link
                key={range.key}
                href={`/admin/analytics?range=${range.key}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  range.key === selectedRange.key
                    ? 'bg-primary/15 text-primary shadow-elevation-1'
                    : 'text-surface-600 hover:bg-surface-100'
                }`}
              >
                {range.shortLabel}
              </Link>
            ))}
          </div>
          <button className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/20 transition-all flex items-center gap-2 shadow-elevation-2">
            <Zap className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid - Profit Focus */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryMetrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <div
              key={metric.label}
              className={`metric-card group animate-fade-in-up ${metric.glowClass}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${metric.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className={`w-5 h-5 ${metric.iconColor}`} />
                </div>
                {metric.change && (
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                    metric.positive ? 'bg-profit-500/15 text-profit-400' : 'bg-loss-500/15 text-loss-400'
                  }`}>
                    {metric.positive ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {metric.change}
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
                <p className={`text-xs ${metric.positive ? 'text-success' : 'text-muted'}`}>
                  {metric.subtext}
                </p>
              </div>

              {/* Subtle gradient overlay on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          )
        })}
      </div>

      {/* Profit Summary Bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-ink">Collection Progress</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted">
              <span className="font-mono font-semibold text-success">${paidRevenue.toLocaleString()}</span> collected
            </span>
            <span className="text-muted">of</span>
            <span className="font-mono font-semibold text-ink">${totalRevenue.toLocaleString()}</span>
          </div>
        </div>
        <div className="h-3 rounded-full bg-surface-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-success to-success/70 transition-all duration-1000"
            style={{
              width: `${totalRevenue > 0 ? (paidRevenue / totalRevenue) * 100 : 0}%`,
              boxShadow: '0 0 16px rgba(46, 125, 107, 0.25)'
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-muted">
          <span>{totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0}% collected</span>
          <span className="text-warning">${outstandingRevenue.toLocaleString()} outstanding</span>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {secondaryMetrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <div
              key={metric.label}
              className="card group animate-fade-in-up hover:border-primary/20"
              style={{ animationDelay: `${(index + 4) * 50}ms` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted uppercase tracking-widest font-medium mb-1">
                    {metric.label}
                  </p>
                  <p className="text-2xl font-bold font-mono text-ink">{metric.value}</p>
                  <p className={`text-xs mt-1 ${metric.positive ? 'text-success' : 'text-muted'}`}>
                    {metric.subtext}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-surface-100 group-hover:bg-primary/10 transition-colors">
                  <Icon className="w-6 h-6 text-muted group-hover:text-primary transition-colors" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-success/15">
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ink">Revenue Trend</h3>
              <p className="text-xs text-muted">Daily revenue over time</p>
            </div>
          </div>
          <RevenueChart
            businessId={profile.business_id}
            rangeStart={startDate.toISOString()}
            rangeEnd={endDate.toISOString()}
            rangeLabel={rangeLabel}
          />
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <PieChart className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ink">Service Breakdown</h3>
              <p className="text-xs text-muted">Revenue by service type</p>
            </div>
          </div>
          <ServicePopularity
            businessId={profile.business_id}
            rangeStart={startDate.toISOString()}
            rangeEnd={endDate.toISOString()}
            rangeLabel={rangeLabel}
          />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-info/15">
              <Users className="w-4 h-4 text-info" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ink">Technician Performance</h3>
              <p className="text-xs text-muted">Jobs and revenue by tech</p>
            </div>
          </div>
          <TechPerformance
            businessId={profile.business_id}
            rangeStart={startDate.toISOString()}
            rangeEnd={endDate.toISOString()}
            rangeLabel={rangeLabel}
          />
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ink">Customer Insights</h3>
              <p className="text-xs text-muted">Acquisition and retention</p>
            </div>
          </div>
          <CustomerInsights
            businessId={profile.business_id}
            rangeStart={startDate.toISOString()}
            rangeEnd={endDate.toISOString()}
            rangeLabel={rangeLabel}
            rangeShortLabel={selectedRange.shortLabel}
          />
        </div>
      </div>
    </div>
  )
}
