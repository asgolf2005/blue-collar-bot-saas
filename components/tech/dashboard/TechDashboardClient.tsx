'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { Clock, Calendar, MapPin, TrendingUp, CheckCircle, ChevronRight, Target, BarChart3, Bell, Navigation, User, Phone } from 'lucide-react'
import { TiltCard, AnimatedCounter, MeshBackground, FloatingActionButton } from '@/components/ui/effects'

interface Job {
  id: string
  scheduled_start: string
  scheduled_end: string
  status: string
  customer: {
    id: string
    name: string
    phone: string | null
    address: string | null
  } | {
    id: string
    name: string
    phone: string | null
    address: string | null
  }[]
  service: {
    name: string
    category: string | null
  } | {
    name: string
    category: string | null
  }[]
}

interface WeekJob {
  scheduled_start: string
  status: string
}

interface TechDashboardClientProps {
  nextJob: Job | null
  upcomingCount: number
  todayJobs: Job[]
  weekJobs: WeekJob[]
  completedThisMonth: number
  totalThisMonth: number
  userName: string
}

type NormalizedJob = Omit<Job, 'customer' | 'service'> & {
  customer: {
    id: string
    name: string
    phone: string | null
    address: string | null
  }
  service: {
    name: string
    category: string | null
  }
}

const emptyCustomer = { id: '', name: 'Unknown', phone: null, address: null }
const emptyService = { name: 'Service', category: null }

const normalizeJob = (job: Job): NormalizedJob => {
  const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer
  const service = Array.isArray(job.service) ? job.service[0] : job.service
  return {
    ...job,
    customer: customer || emptyCustomer,
    service: service || emptyService,
  }
}

const fabActions = [
  {
    icon: <Clock className="w-5 h-5" />,
    label: "Today's Jobs",
    href: '/tech/today',
    color: 'primary' as const
  },
  {
    icon: <Calendar className="w-5 h-5" />,
    label: 'Schedule',
    href: '/tech/schedule',
    color: 'success' as const
  },
  {
    icon: <MapPin className="w-5 h-5" />,
    label: 'Map View',
    href: '/tech/today',
    color: 'accent' as const
  }
]

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  scheduled: { bg: 'bg-blue-500/10', text: 'text-blue-600 border-blue-500/20', label: 'Scheduled' },
  in_progress: { bg: 'bg-amber-500/10', text: 'text-amber-600 border-amber-500/20', label: 'In Progress' },
  completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 border-emerald-500/20', label: 'Completed' },
  on_the_way: { bg: 'bg-cyan-500/10', text: 'text-cyan-600 border-cyan-500/20', label: 'On The Way' },
  arrived: { bg: 'bg-purple-500/10', text: 'text-purple-600 border-purple-500/20', label: 'Arrived' },
  cancelled: { bg: 'bg-red-500/10', text: 'text-red-600 border-red-500/20', label: 'Cancelled' },
}

export default function TechDashboardClient({
  nextJob,
  upcomingCount,
  todayJobs,
  weekJobs,
  completedThisMonth,
  totalThisMonth,
  userName
}: TechDashboardClientProps) {
  const normalizedTodayJobs = todayJobs.map(normalizeJob)
  const normalizedNextJob = nextJob ? normalizeJob(nextJob) : null
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const completedToday = normalizedTodayJobs.filter(j => j.status === 'completed').length
  const inProgressToday = normalizedTodayJobs.filter(j => j.status === 'in_progress').length
  const completionRate = totalThisMonth > 0 ? Math.round((completedThisMonth / totalThisMonth) * 100) : 0

  // Get last 7 days for chart
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = new Date()
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today)
    date.setDate(date.getDate() - (6 - i))
    return date
  })
  const jobsPerDay = last7Days.map(date => {
    const count = weekJobs.filter(job => {
      const jobDate = new Date(job.scheduled_start)
      return jobDate.toDateString() === date.toDateString()
    }).length
    return { day: days[date.getDay()], count, date }
  })
  const maxCount = Math.max(...jobsPerDay.map(d => d.count), 1)

  return (
    <>
      <MeshBackground variant="default" />

      <div className="space-y-8 relative">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-enter">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] flex items-center justify-center shadow-lg shadow-blue-500/25">
                <span className="text-3xl">👷</span>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {greeting}, {userName?.split(' ')[0] || 'Tech'}!
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-lg">
                  Here's what's on your plate today
                </p>
              </div>
            </div>
          </div>
          <Link
            href="/tech/today"
            className="group inline-flex items-center gap-2 px-6 py-3 rounded-2xl
                       bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white
                       font-semibold shadow-lg shadow-blue-500/25
                       hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5
                       transition-all duration-300 relative overflow-hidden"
          >
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <Clock className="w-5 h-5 relative z-10" />
            <span className="relative z-10">View Today's Jobs</span>
          </Link>
        </div>

        {/* Stats Grid with Tilt Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Next Job - Primary Blue Card */}
          <TiltCard className="page-enter stagger-1">
            <div className="relative p-6 rounded-3xl bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white overflow-hidden shadow-xl shadow-blue-500/20 h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl translate-y-1/2 -translate-x-1/2" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-blue-100 text-sm font-medium">Next Job</span>
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                {normalizedNextJob ? (
                  <>
                    <div className="text-5xl font-bold mb-1">
                      {format(new Date(normalizedNextJob.scheduled_start), 'HH:mm')}
                    </div>
                    <div className="text-sm text-blue-100 mb-3">
                      {format(new Date(normalizedNextJob.scheduled_start), 'MMM dd, yyyy')}
                    </div>
                    <div className="text-sm font-semibold">{normalizedNextJob.customer.name}</div>
                    <div className="text-xs text-blue-200">{normalizedNextJob.service.name}</div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-blue-100">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      <span>Starting soon</span>
                    </div>
                  </>
                ) : (
                  <div className="text-2xl font-semibold text-blue-100">No upcoming jobs</div>
                )}
              </div>
            </div>
          </TiltCard>

          {/* Upcoming Jobs */}
          <TiltCard className="page-enter stagger-2">
            <div className="relative p-6 rounded-3xl bg-white/70 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700 overflow-hidden shadow-sm shadow-slate-200/30 dark:shadow-none hover:shadow-md hover:bg-white/90 dark:hover:bg-slate-800 transition-all h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Upcoming</span>
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
                <div className="text-5xl font-bold text-slate-900 dark:text-white mb-2">
                  <AnimatedCounter value={upcomingCount} />
                </div>
                <div className="flex items-center gap-2 text-blue-600">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">Next 7 days</span>
                </div>
              </div>
            </div>
          </TiltCard>

          {/* Jobs Today - Amber Card */}
          <TiltCard className="page-enter stagger-3">
            <div className="relative p-6 rounded-3xl bg-white/70 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700 overflow-hidden shadow-sm shadow-slate-200/30 dark:shadow-none hover:shadow-md hover:bg-white/90 dark:hover:bg-slate-800 transition-all h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Jobs Today</span>
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-amber-500" />
                  </div>
                </div>
                <div className="text-5xl font-bold text-slate-900 dark:text-white mb-2">
                  <AnimatedCounter value={normalizedTodayJobs.length} />
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {completedToday > 0 && (
                    <div className="flex items-center gap-1 text-emerald-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>{completedToday} done</span>
                    </div>
                  )}
                  {inProgressToday > 0 && (
                    <div className="flex items-center gap-1 text-amber-600">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span>{inProgressToday} active</span>
                    </div>
                  )}
                  {completedToday === 0 && inProgressToday === 0 && (
                    <span className="text-slate-500">No activity yet</span>
                  )}
                </div>
              </div>
            </div>
          </TiltCard>

          {/* Completion Rate - Success Card */}
          <TiltCard className="page-enter stagger-4">
            <div className="relative p-6 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden shadow-xl shadow-emerald-500/20 h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-emerald-100 text-sm font-medium">This Month</span>
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-5xl font-bold mb-3">
                  <AnimatedCounter value={completedThisMonth} />
                </div>
                <div className="text-emerald-100 text-sm font-medium mb-2">jobs completed</div>
                <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-1000 ease-out"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
                <div className="text-xs text-emerald-100 mt-1">{completionRate}% completion rate</div>
              </div>
            </div>
          </TiltCard>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Schedule - Takes 2 columns */}
          <div className="lg:col-span-2 page-enter stagger-5">
            <div className="rounded-3xl bg-white/70 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700 overflow-hidden shadow-sm shadow-slate-200/30 dark:shadow-none">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Today's Schedule</h2>
                    <p className="text-slate-500 text-sm mt-1">{normalizedTodayJobs.length} appointment{normalizedTodayJobs.length !== 1 ? 's' : ''} scheduled</p>
                  </div>
                  <Link
                    href="/tech/today"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    View all <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {normalizedTodayJobs.length > 0 ? (
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {normalizedTodayJobs.slice(0, 5).map((job) => {
                    const status = statusColors[job.status] || statusColors.scheduled
                    return (
                      <Link
                        key={job.id}
                        href={`/tech/jobs/${job.id}`}
                        className="flex items-center gap-4 p-4 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent dark:hover:from-slate-700/50 dark:hover:to-transparent transition-all group"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                          {job.customer.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-900 dark:text-white">{job.customer.name}</span>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${status.bg} ${status.text}`}>
                              {status.label}
                            </span>
                          </div>
                          <div className="text-sm text-slate-500 truncate">{job.service.name}</div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(job.scheduled_start), 'h:mm a')} - {format(new Date(job.scheduled_end), 'h:mm a')}
                            </span>
                            {job.customer.address && (
                              <span className="flex items-center gap-1 truncate max-w-[200px]">
                                <MapPin className="w-3 h-3" />
                                {job.customer.address}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="px-6 py-16 text-center">
                  <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 font-medium text-lg">No jobs scheduled today</p>
                  <p className="text-slate-500 text-sm mt-1">Enjoy your day off!</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Weekly Chart & Quick Stats */}
          <div className="space-y-6">
            {/* Weekly Chart */}
            <TiltCard className="page-enter stagger-5">
              <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700 shadow-sm shadow-slate-200/30 dark:shadow-none">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">This Week</h3>
                    <p className="text-sm text-slate-500">Your activity</p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                  </div>
                </div>

                <div className="flex items-end justify-between gap-2 h-32">
                  {jobsPerDay.map((item, index) => {
                    const isToday = item.date.toDateString() === today.toDateString()
                    const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0

                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full flex flex-col justify-end h-24">
                          <div
                            className={`w-full rounded-t-lg transition-all ${
                              isToday
                                ? 'bg-gradient-to-t from-[#1d4ed8] to-[#2563eb] shadow-lg shadow-blue-500/25'
                                : 'bg-slate-200 dark:bg-slate-600'
                            }`}
                            style={{ height: `${Math.max(height, 8)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>
                          {item.day}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </TiltCard>

            {/* Monthly Progress */}
            <TiltCard className="page-enter stagger-5">
              <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700 shadow-sm shadow-slate-200/30 dark:shadow-none">
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-4">Monthly Progress</h3>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Target className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <div className="text-4xl font-bold text-slate-900 dark:text-white">
                      {completionRate}%
                    </div>
                    <div className="text-slate-500 text-sm">{completedThisMonth} of {totalThisMonth} jobs</div>
                  </div>
                </div>
              </div>
            </TiltCard>

            {/* Quick Actions */}
            <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700 shadow-sm shadow-slate-200/30 dark:shadow-none page-enter stagger-5">
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link href="/tech/today" className="flex items-center gap-4 p-3 rounded-2xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-700/50 dark:to-slate-700/50 hover:from-blue-50 hover:to-blue-50/50 dark:hover:from-blue-900/20 dark:hover:to-blue-900/20 border border-slate-200/80 dark:border-slate-600 hover:border-blue-200 dark:hover:border-blue-800 shadow-sm hover:shadow-md hover:shadow-blue-100/50 dark:hover:shadow-none transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">Today's Jobs</div>
                    <div className="text-xs text-slate-500">View your schedule</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </Link>

                <Link href="/tech/schedule" className="flex items-center gap-4 p-3 rounded-2xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-700/50 dark:to-slate-700/50 hover:from-cyan-50 hover:to-cyan-50/50 dark:hover:from-cyan-900/20 dark:hover:to-cyan-900/20 border border-slate-200/80 dark:border-slate-600 hover:border-cyan-200 dark:hover:border-cyan-800 shadow-sm hover:shadow-md hover:shadow-cyan-100/50 dark:hover:shadow-none transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">Full Schedule</div>
                    <div className="text-xs text-slate-500">View all appointments</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-cyan-500 transition-colors" />
                </Link>

                <Link href="/tech/stats" className="flex items-center gap-4 p-3 rounded-2xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-700/50 dark:to-slate-700/50 hover:from-emerald-50 hover:to-emerald-50/50 dark:hover:from-emerald-900/20 dark:hover:to-emerald-900/20 border border-slate-200/80 dark:border-slate-600 hover:border-emerald-200 dark:hover:border-emerald-800 shadow-sm hover:shadow-md hover:shadow-emerald-100/50 dark:hover:shadow-none transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">My Stats</div>
                    <div className="text-xs text-slate-500">View performance</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FloatingActionButton actions={fabActions} />
    </>
  )
}
