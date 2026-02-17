'use client'

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
  const cardClass = 'h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Next Project */}
      <TiltCard className="page-enter stagger-1">
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Next Project</p>
            <span className="text-xs font-mono text-slate-400">Next</span>
          </div>

          {nextJob ? (
            <>
              <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white tabular-nums">
                {format(new Date(nextJob.scheduled_start), 'HH:mm')}
              </p>
              <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                {format(new Date(nextJob.scheduled_start), 'MMM dd, yyyy')}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {nextJob.customer.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{nextJob.service.name}</p>
            </>
          ) : (
            <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">-</p>
          )}
        </div>
      </TiltCard>

      {/* Upcoming Projects */}
      <TiltCard className="page-enter stagger-2">
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Upcoming</p>
            <span className="text-xs font-mono text-slate-400">7d</span>
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
            <AnimatedCounter value={upcomingCount} />
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Next 7 days</p>
        </div>
      </TiltCard>

      {/* Jobs Today */}
      <TiltCard className="page-enter stagger-3">
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Jobs Today</p>
            <span className="text-xs font-mono text-slate-400">Today</span>
          </div>

          <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
            <AnimatedCounter value={todayJobs.length} />
          </p>

          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{completedToday} done</span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span>{inProgressToday} active</span>
          </div>
        </div>
      </TiltCard>

      {/* Performance */}
      <TiltCard className="page-enter stagger-4">
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Performance</p>
            <span className="text-xs font-mono text-slate-400">Done</span>
          </div>

          <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
            <AnimatedCounter value={completedToday} />
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Completed today</p>
        </div>
      </TiltCard>
    </div>
  )
}
