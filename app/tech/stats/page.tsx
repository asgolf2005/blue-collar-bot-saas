import { createClient } from '@/lib/supabase/server'
import { startOfWeek, startOfMonth, endOfMonth, format, differenceInHours } from 'date-fns'
import { TrendingUp, CheckCircle, DollarSign, Clock, Calendar, Briefcase, Zap, MapPin, BarChart3, Star } from '@/components/ui/lucide'

export default async function TechStatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  // Fetch jobs with customer data for location analysis
  const [
    { data: allJobs },
    { data: weekJobs },
    { data: monthJobs },
  ] = await Promise.all([
    supabase
      .from('jobs')
      .select('status, total_cost, scheduled_start, scheduled_end, description')
      .eq('technician_id', user!.id),
    supabase
      .from('jobs')
      .select('status, total_cost, scheduled_start, scheduled_end')
      .eq('technician_id', user!.id)
      .gte('scheduled_start', weekStart.toISOString()),
    supabase
      .from('jobs')
      .select('status, total_cost')
      .eq('technician_id', user!.id)
      .gte('scheduled_start', monthStart.toISOString())
      .lte('scheduled_start', monthEnd.toISOString()),
  ])

  const completedJobs = allJobs?.filter(j => j.status === 'completed') || []
  const completedThisWeek = weekJobs?.filter(j => j.status === 'completed') || []
  const completedThisMonth = monthJobs?.filter(j => j.status === 'completed') || []

  // Revenue calculations
  const totalRevenue = completedJobs.reduce((sum, j) => sum + (j.total_cost || 0), 0)
  const revenueThisWeek = completedThisWeek.reduce((sum, j) => sum + (j.total_cost || 0), 0)
  const revenueThisMonth = completedThisMonth.reduce((sum, j) => sum + (j.total_cost || 0), 0)

  // Calculate total hours worked
  const totalHoursWorked = completedJobs.reduce((sum, j) => {
    if (j.scheduled_start && j.scheduled_end) {
      return sum + differenceInHours(new Date(j.scheduled_end), new Date(j.scheduled_start))
    }
    return sum
  }, 0)

  const hoursThisWeek = completedThisWeek.reduce((sum, j) => {
    if (j.scheduled_start && j.scheduled_end) {
      return sum + differenceInHours(new Date(j.scheduled_end), new Date(j.scheduled_start))
    }
    return sum
  }, 0)

  // Calculate hourly rate
  const avgHourlyRate = totalHoursWorked > 0 ? totalRevenue / totalHoursWorked : 0
  const weeklyHourlyRate = hoursThisWeek > 0 ? revenueThisWeek / hoursThisWeek : 0

  // Most common job types
  const jobTypeCounts: Record<string, number> = {}
  completedJobs.forEach(job => {
    const type = job.description || 'Other'
    jobTypeCounts[type] = (jobTypeCounts[type] || 0) + 1
  })
  const topJobTypes = Object.entries(jobTypeCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)

  // Performance metrics
  const avgJobValue = completedJobs.length > 0 ? totalRevenue / completedJobs.length : 0
  const jobsPerDay = completedJobs.length > 0 ? completedJobs.length / Math.max(1, Math.ceil(totalHoursWorked / 8)) : 0
  const completionRate = allJobs && allJobs.length > 0 ? (completedJobs.length / allJobs.length) * 100 : 0

  return (
    <div className="pb-8">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center mr-3">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink">Performance Dashboard</h1>
            <p className="text-sm text-muted">Your earnings, efficiency & job insights</p>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Total Revenue - Prominent */}
        <div className="col-span-2 glass-card bg-gradient-to-br from-primary/5 to-success/5 dark:from-primary/10 dark:to-success/10 p-6 border-primary/20">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-primary" />
                <p className="text-sm font-semibold text-primary">Total Earnings</p>
              </div>
              <p className="text-4xl font-bold text-ink mb-1">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted">This week: <span className="font-semibold text-ink">${revenueThisWeek.toFixed(0)}</span></span>
                <span className="text-muted">This month: <span className="font-semibold text-ink">${revenueThisMonth.toFixed(0)}</span></span>
              </div>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-success/10 dark:bg-success/20 flex items-center justify-center border border-success/20">
              <TrendingUp className="w-8 h-8 text-success" />
            </div>
          </div>
        </div>

        {/* Hourly Rate */}
        <div className="glass-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-warning/10 dark:bg-warning/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-warning" />
            </div>
          </div>
          <p className="text-sm text-muted mb-1">Avg Hourly Rate</p>
          <p className="text-3xl font-bold text-ink mb-1">${avgHourlyRate.toFixed(2)}</p>
          <p className="text-xs text-muted">This week: ${weeklyHourlyRate.toFixed(2)}/hr</p>
        </div>

        {/* Completion Rate */}
        <div className="glass-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-info/10 dark:bg-info/20 flex items-center justify-center">
              <Star className="w-6 h-6 text-info" />
            </div>
          </div>
          <p className="text-sm text-muted mb-1">Completion Rate</p>
          <p className="text-3xl font-bold text-ink mb-1">{completionRate.toFixed(0)}%</p>
          <p className="text-xs text-muted">{completedJobs.length} of {allJobs?.length || 0} jobs</p>
        </div>
      </div>

      {/* This Week Overview */}
      <div className="glass-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-ink">This Week</h2>
          <span className="ml-auto text-xs text-muted">{format(weekStart, 'MMM d')} - {format(now, 'MMM d')}</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted mb-1">Completed</p>
            <p className="text-2xl font-bold text-ink">{completedThisWeek.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-1">Hours Worked</p>
            <p className="text-2xl font-bold text-ink">{hoursThisWeek.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-1">Revenue</p>
            <p className="text-2xl font-bold text-success">${revenueThisWeek.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* Job Statistics */}
      <div className="glass-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-ink">Job Statistics</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-100/50 dark:bg-surface-800/50 rounded-xl p-4">
            <p className="text-xs text-muted mb-1">Total Completed</p>
            <p className="text-3xl font-bold text-ink">{completedJobs.length}</p>
          </div>
          <div className="bg-surface-100/50 dark:bg-surface-800/50 rounded-xl p-4">
            <p className="text-xs text-muted mb-1">Avg Job Value</p>
            <p className="text-3xl font-bold text-ink">${avgJobValue.toFixed(0)}</p>
          </div>
          <div className="bg-surface-100/50 dark:bg-surface-800/50 rounded-xl p-4">
            <p className="text-xs text-muted mb-1">Jobs This Month</p>
            <p className="text-3xl font-bold text-ink">{completedThisMonth.length}</p>
          </div>
          <div className="bg-surface-100/50 dark:bg-surface-800/50 rounded-xl p-4">
            <p className="text-xs text-muted mb-1">Total Hours</p>
            <p className="text-3xl font-bold text-ink">{totalHoursWorked.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* Top Job Types */}
      {topJobTypes.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-ink">Most Common Jobs</h2>
          </div>
          <div className="space-y-3">
            {topJobTypes.map(([type, count], index) => (
              <div key={type} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                  index === 0 ? 'bg-warning/10 dark:bg-warning/20 text-warning' :
                  index === 1 ? 'bg-primary/10 dark:bg-primary/20 text-primary' :
                  'bg-surface-100 dark:bg-surface-800 text-muted'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink line-clamp-1">{type}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-ink">{count}</p>
                  <p className="text-xs text-muted">Jobs</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


