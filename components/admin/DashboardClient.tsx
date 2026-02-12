'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { Plus, Calendar, DollarSign, Briefcase, Clock, CheckCircle, TrendingUp, Users, ChevronRight, Zap, FileText, UserPlus } from 'lucide-react'
import { TiltCard, AnimatedCounter, MeshBackground, FloatingActionButton } from '@/components/ui/effects'
import { useRouter } from 'next/navigation'
import JobsTable from '@/components/admin/JobsTable'
import { EmptyJobs } from '@/components/ui/EmptyState'

interface Job {
  id: string
  status: string
  description: string
  scheduled_start: string
  customer: {
    id: string
    name: string
    phone: string
  }
  technician?: {
    full_name: string
  }
}

interface DashboardClientProps {
  jobs: Job[]
  stats: {
    totalJobs: number
    completedJobs: number
    inProgressJobs: number
    scheduledJobs: number
    completionRate: number
    thisWeekJobs: number
    customerCount: number
  }
}

export default function DashboardClient({ jobs, stats }: DashboardClientProps) {
  const router = useRouter()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
      case 'in_progress': return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      case 'on_the_way': return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
      case 'arrived': return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20'
      case 'scheduled': return 'bg-slate-500/10 text-slate-600 border-slate-500/20'
      case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-500/20'
      default: return 'bg-slate-500/10 text-slate-600 border-slate-500/20'
    }
  }

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const fabActions = [
    {
      icon: <Plus className="w-5 h-5" />,
      label: 'New Job',
      onClick: () => router.push('/admin/jobs/new'),
      color: 'primary' as const
    },
    {
      icon: <UserPlus className="w-5 h-5" />,
      label: 'New Customer',
      onClick: () => router.push('/admin/customers/new'),
      color: 'accent' as const
    },
    {
      icon: <FileText className="w-5 h-5" />,
      label: 'New Invoice',
      onClick: () => router.push('/admin/invoices/new'),
      color: 'success' as const
    }
  ]

  return (
    <>
      <MeshBackground variant="default" />

      <div className="space-y-8 relative">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-enter">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              Dashboard
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
              Welcome back! Here&apos;s your business overview.
            </p>
          </div>
          <Link
            href="/admin/jobs/new"
            className="group inline-flex items-center gap-2 px-6 py-3 rounded-2xl
                       bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white
                       font-semibold shadow-lg shadow-blue-500/25
                       hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5
                       transition-all duration-300 relative overflow-hidden"
          >
            {/* Shimmer effect */}
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <Plus className="w-5 h-5 relative z-10" />
            <span className="relative z-10">New Job</span>
          </Link>
        </div>

        {/* Stats Grid with Tilt Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Jobs - Primary Blue Card */}
          <TiltCard className="page-enter stagger-1">
            <div className="relative p-6 rounded-3xl bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white overflow-hidden shadow-xl shadow-blue-500/20">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl translate-y-1/2 -translate-x-1/2" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-blue-100 text-sm font-medium">Total Jobs</span>
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <Briefcase className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-5xl font-bold mb-2">
                  <AnimatedCounter value={stats.totalJobs} />
                </div>
                <div className="flex items-center gap-2 text-blue-100">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">All time total</span>
                </div>
              </div>
            </div>
          </TiltCard>

          {/* In Progress - Amber Card */}
          <TiltCard className="page-enter stagger-2">
            <div className="relative p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">In Progress</span>
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-500" />
                  </div>
                </div>
                <div className="text-5xl font-bold text-slate-900 dark:text-white mb-2">
                  <AnimatedCounter value={stats.inProgressJobs} />
                </div>
                <div className="flex items-center gap-2 text-amber-500">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-sm font-medium">Active now</span>
                </div>
              </div>
            </div>
          </TiltCard>

          {/* Scheduled - Blue Card */}
          <TiltCard className="page-enter stagger-3">
            <div className="relative p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Scheduled</span>
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
                <div className="text-5xl font-bold text-slate-900 dark:text-white mb-2">
                  <AnimatedCounter value={stats.scheduledJobs} />
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-sm">
                  Upcoming jobs
                </div>
              </div>
            </div>
          </TiltCard>

          {/* Completion Rate - Success Card */}
          <TiltCard className="page-enter stagger-4">
            <div className="relative p-6 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden shadow-xl shadow-emerald-500/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-emerald-100 text-sm font-medium">Completion Rate</span>
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-5xl font-bold mb-3">
                  <AnimatedCounter value={stats.completionRate} suffix="%" />
                </div>
                <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-1000 ease-out"
                    style={{ width: `${stats.completionRate}%` }}
                  />
                </div>
              </div>
            </div>
          </TiltCard>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Jobs Table - Takes 2 columns */}
          <div className="lg:col-span-2 page-enter stagger-5">
            <div className="rounded-3xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xl">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent Jobs</h2>
                    <p className="text-slate-500 text-sm mt-1">{jobs.length} total jobs</p>
                  </div>
                  <Link
                    href="/admin/jobs"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    View all <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {jobs.length === 0 ? (
                <div className="px-6">
                  <EmptyJobs
                    onCreateJob={() => router.push('/admin/jobs/new')}
                  />
                </div>
              ) : (
                <JobsTable
                  jobs={jobs.slice(0, 6)}
                  getStatusColor={getStatusColor}
                  formatStatus={formatStatus}
                />
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Weekly Stats */}
            <TiltCard className="page-enter stagger-5">
              <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-xl">
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-4">This Week</h3>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <div className="text-4xl font-bold text-slate-900 dark:text-white">
                      <AnimatedCounter value={stats.thisWeekJobs} />
                    </div>
                    <div className="text-slate-500 text-sm">jobs scheduled</div>
                  </div>
                </div>
              </div>
            </TiltCard>

            {/* Customer Count */}
            <TiltCard className="page-enter stagger-5">
              <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-xl">
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-4">Total Customers</h3>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <div className="text-4xl font-bold text-slate-900 dark:text-white">
                      <AnimatedCounter value={stats.customerCount} />
                    </div>
                    <div className="text-slate-500 text-sm">active customers</div>
                  </div>
                </div>
              </div>
            </TiltCard>

            {/* Quick Actions */}
            <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-xl page-enter stagger-5">
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link href="/admin/jobs/new" className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200 dark:border-slate-600 hover:border-blue-200 dark:hover:border-blue-800 transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">New Job</div>
                    <div className="text-xs text-slate-500">Create a new service job</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </Link>

                <Link href="/admin/calendar" className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/50 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 border border-slate-200 dark:border-slate-600 hover:border-cyan-200 dark:hover:border-cyan-800 transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">Calendar</div>
                    <div className="text-xs text-slate-500">View schedule</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-cyan-500 transition-colors" />
                </Link>

                <Link href="/admin/invoices/new" className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-slate-200 dark:border-slate-600 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">Create Invoice</div>
                    <div className="text-xs text-slate-500">Bill a customer</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton actions={fabActions} />
    </>
  )
}
