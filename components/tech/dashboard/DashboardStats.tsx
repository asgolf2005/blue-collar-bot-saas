'use client'

import { Clock, Calendar, MapPin, TrendingUp, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { TiltCard, AnimatedCounter } from '@/components/ui/effects'

interface Job {
  id: string
  scheduled_start: string
  scheduled_end: string
  status: string
  customer: {
    name: string
    address: string | null
  }
  service: {
    name: string
  }
}

interface DashboardStatsProps {
  nextJob: Job | null
  upcomingCount: number
  todayJobs: Job[]
}

export default function DashboardStats({ nextJob, upcomingCount, todayJobs }: DashboardStatsProps) {
  const completedToday = todayJobs.filter(j => j.status === 'completed').length
  const inProgressToday = todayJobs.filter(j => j.status === 'in_progress').length

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Next Project - Primary Blue Card */}
      <TiltCard className="page-enter stagger-1">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] p-6 text-white shadow-xl shadow-blue-500/25 group">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-blue-100">Next Project</h3>
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            {nextJob ? (
              <>
                <div className="mb-3">
                  <div className="text-5xl font-bold mb-1">
                    {format(new Date(nextJob.scheduled_start), 'HH:mm')}
                  </div>
                  <div className="text-sm text-blue-100">
                    {format(new Date(nextJob.scheduled_start), 'MMM dd, yyyy')}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold">{nextJob.customer.name}</div>
                  <div className="text-xs text-blue-200">{nextJob.service.name}</div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-blue-100">
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

      {/* Upcoming Projects - White Card */}
      <TiltCard className="page-enter stagger-2">
        <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-xl border border-slate-200 dark:border-slate-700 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Upcoming</h3>
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
            </div>

            <div className="text-5xl font-bold text-slate-900 dark:text-white mb-2">
              <AnimatedCounter value={upcomingCount} />
            </div>

            <div className="flex items-center gap-2 text-sm text-blue-600">
              <TrendingUp className="w-4 h-4" />
              <span className="font-medium">Next 7 days</span>
            </div>
          </div>
        </div>
      </TiltCard>

      {/* Jobs Today - White Card */}
      <TiltCard className="page-enter stagger-3">
        <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-xl border border-slate-200 dark:border-slate-700 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Jobs Today</h3>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                <MapPin className="w-5 h-5 text-amber-600" />
              </div>
            </div>

            <div className="text-5xl font-bold text-slate-900 dark:text-white mb-2">
              <AnimatedCounter value={todayJobs.length} />
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

      {/* Performance - Success Gradient Card */}
      <TiltCard className="page-enter stagger-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-xl shadow-emerald-500/25 group">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-emerald-100">Performance</h3>
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="text-5xl font-bold mb-2">
              <AnimatedCounter value={completedToday} />
            </div>

            <div className="text-sm text-emerald-100 font-medium">
              Completed today
            </div>
          </div>
        </div>
      </TiltCard>
    </div>
  )
}
