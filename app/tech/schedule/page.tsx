import { createClient } from '@/lib/supabase/server'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns'
import { Calendar, Clock, MapPin, Briefcase } from 'lucide-react'
import Link from 'next/link'
import WeekNavigation from '@/components/tech/WeekNavigation'

const resolveSingle = <T,>(value: T | T[] | null | undefined) =>
  Array.isArray(value) ? value[0] : value ?? undefined

export default async function TechSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const params = await searchParams
  const today = new Date()

  // If week param exists, use it; otherwise use current week
  const baseDate = params.week ? new Date(params.week) : today
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 })
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      id,
      status,
      description,
      scheduled_start,
      scheduled_end,
      customer:customers(id, name, email, phone, address)
    `)
    .eq('technician_id', user!.id)
    .gte('scheduled_start', weekStart.toISOString())
    .lte('scheduled_start', weekEnd.toISOString())
    .order('scheduled_start', { ascending: true })

  const normalizedJobs = (jobs || []).map((job) => ({
    ...job,
    customer: resolveSingle(job.customer),
  }))

  const getJobsForDay = (date: Date) => {
    return normalizedJobs.filter(job =>
      isSameDay(new Date(job.scheduled_start), date)
    )
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'bg-primary/10 text-primary border border-primary/20',
      on_the_way: 'bg-warning/10 text-warning border border-warning/20',
      arrived: 'bg-info/10 text-info border border-info/20',
      in_progress: 'bg-warning/10 text-warning border border-warning/20',
      completed: 'bg-success/10 text-success border border-success/20',
      cancelled: 'bg-danger/10 text-danger border border-danger/20',
    }
    return colors[status] || 'bg-surface-100 text-muted border border-surface-200'
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center mb-1">
              <Calendar className="w-6 h-6 text-muted mr-2" />
              <h1 className="text-2xl font-bold text-ink">Weekly Schedule</h1>
            </div>
            <p className="text-muted">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </p>
          </div>
          <WeekNavigation currentWeekStart={weekStart} />
        </div>
      </div>

      {/* Week View */}
      <div className="space-y-4">
        {daysOfWeek.map((day) => {
          const dayJobs = getJobsForDay(day)
          const isToday = isSameDay(day, today)

          return (
            <div
              key={day.toISOString()}
              className={`bg-surface-50/90 backdrop-blur-xl rounded-2xl border overflow-hidden ${
                isToday ? 'border-primary/20 ring-1 ring-primary/10' : 'border-surface-200'
              }`}
            >
              {/* Day Header */}
              <div
                className={`px-4 py-3 border-b ${
                  isToday
                    ? 'bg-primary/5 border-primary/15'
                    : 'bg-surface-100 border-surface-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={`font-semibold ${isToday ? 'text-ink' : 'text-ink'}`}>
                      {format(day, 'EEEE')}
                      {isToday && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Today</span>}
                    </h2>
                    <p className="text-sm text-muted">
                      {format(day, 'MMMM d, yyyy')}
                    </p>
                  </div>
                  <div className={`text-lg font-bold ${isToday ? 'text-ink' : 'text-muted'}`}>
                    {dayJobs.length} {dayJobs.length === 1 ? 'job' : 'jobs'}
                  </div>
                </div>
              </div>

              {/* Day Content */}
              <div className="p-4">
                {dayJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-3">
                      <Briefcase className="w-6 h-6 text-muted" />
                    </div>
                    <p className="text-sm text-muted">No jobs scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dayJobs.map((job) => (
                      <Link
                        key={job.id}
                        href={`/tech/jobs/${job.id}`}
                        className="block border border-surface-200 rounded-xl p-3 bg-surface-50 hover:bg-surface-100 hover:border-surface-300 transition"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-ink">
                            {job.customer?.name || 'Unknown Customer'}
                          </h3>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(job.status)}`}>
                            {job.status.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <div className="flex items-center text-sm text-muted mb-1">
                          <Clock className="w-4 h-4 mr-1.5 text-muted" />
                          {format(new Date(job.scheduled_start), 'h:mm a')} - {format(new Date(job.scheduled_end), 'h:mm a')}
                        </div>

                        {job.customer?.address && (
                          <div className="flex items-start text-sm text-muted">
                            <MapPin className="w-4 h-4 mr-1.5 mt-0.5 flex-shrink-0 text-muted" />
                            <span className="line-clamp-1">{job.customer.address}</span>
                          </div>
                        )}

                        {job.description && (
                          <p className="text-sm text-muted mt-2 line-clamp-1">
                            {job.description}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
