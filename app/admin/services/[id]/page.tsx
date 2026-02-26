import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  MapPin,
  PlayCircle,
  Plus,
  Truck,
  User,
} from '@/components/ui/lucide'
import { createClient } from '@/lib/supabase/server'

interface Service {
  id: string
  name: string
  description: string | null
  base_price: number | null
  duration_minutes: number | null
  is_active: boolean
  created_at: string
}

interface Job {
  id: string
  status: string
  scheduled_start: string
  customer?: {
    name: string
  }
  technician?: {
    full_name: string
  }
}

interface BookedJobRow {
  id: string
  status: string
  scheduled_start: string
  customer: { name: string } | Array<{ name: string }> | null
  technician: { full_name: string } | Array<{ full_name: string }> | null
}

const statusColors: Record<string, string> = {
  scheduled: 'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300',
  on_the_way: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
  arrived: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
  in_progress:
    'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
  completed:
    'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  cancelled:
    'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

function formatPrice(value: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Custom quote'
  return `$${value.toFixed(0)}`
}

function formatDuration(minutes: number | null) {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) return 'Varies'
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (hours > 0 && remaining > 0) return `${hours}h ${remaining}m`
  if (hours > 0) return `${hours}h`
  return `${remaining}m`
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function getStatusLabel(status: string) {
  if (status === 'on_the_way') return 'EN ROUTE'
  return status.replace('_', ' ').toUpperCase()
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/tech/today')

  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .eq('business_id', profile.business_id)
    .single<Service>()

  if (!service) notFound()

  const { data: jobServiceLinks } = await supabase.from('job_services').select('job_id').eq('service_id', id)
  const jobIds = (jobServiceLinks || []).map((row) => row.job_id)

  let bookedJobs: Job[] = []
  if (jobIds.length > 0) {
    const { data: jobs } = await supabase
      .from('jobs')
      .select(
        `
        id,
        status,
        scheduled_start,
        customer:customers(name),
        technician:users(full_name)
      `
      )
      .in('id', jobIds)
      .eq('business_id', profile.business_id)
      .order('scheduled_start', { ascending: true })

    bookedJobs = ((jobs || []) as BookedJobRow[]).map((row) => ({
      id: row.id,
      status: row.status,
      scheduled_start: row.scheduled_start,
      customer: (Array.isArray(row.customer) ? row.customer[0] : row.customer) ?? undefined,
      technician: (Array.isArray(row.technician) ? row.technician[0] : row.technician) ?? undefined,
    }))
  }

  const completedJobs = bookedJobs.filter((job) => job.status === 'completed').length
  const now = new Date()
  const todayKey = now.toISOString().split('T')[0]
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowKey = tomorrow.toISOString().split('T')[0]

  const grouped = {
    today: [] as Job[],
    tomorrow: [] as Job[],
    upcoming: [] as { date: string; jobs: Job[] }[],
  }

  const upcomingMap = new Map<string, Job[]>()
  for (const job of bookedJobs) {
    const dateKey = new Date(job.scheduled_start).toISOString().split('T')[0]
    if (dateKey === todayKey) {
      grouped.today.push(job)
      continue
    }
    if (dateKey === tomorrowKey) {
      grouped.tomorrow.push(job)
      continue
    }
    const list = upcomingMap.get(dateKey) || []
    list.push(job)
    upcomingMap.set(dateKey, list)
  }

  grouped.upcoming = Array.from(upcomingMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, jobs]) => ({ date, jobs }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-2">
          <Link href="/admin/services">
            <Button variant="ghost" className="rounded-full p-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="admin-page-header mb-1">SERVICE DETAIL</h1>
            <p className="font-sans text-sm text-slate-600 dark:text-slate-400">Track performance and bookings.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/services/new">
            <Button variant="secondary" className="rounded-full px-4 py-2 text-xs font-semibold">
              <Plus className="h-4 w-4" />
              NEW SERVICE
            </Button>
          </Link>
          <Link href={`/admin/services/${id}/edit`}>
            <Button className="admin-btn-primary rounded-full px-5 py-2 text-xs font-semibold">EDIT SERVICE</Button>
          </Link>
        </div>
      </div>

      <div className="admin-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-3xl uppercase tracking-wide text-slate-900 dark:text-slate-100">
                {service.name}
              </h2>
              <span
                className={`inline-flex rounded-sm border px-2 py-1 font-sans text-xs font-medium ${
                  service.is_active
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {service.is_active ? 'Active' : 'Archived'}
              </span>
            </div>
            {service.description ? (
              <p className="mt-2 max-w-2xl font-sans text-sm text-slate-600 dark:text-slate-400">
                {service.description}
              </p>
            ) : (
              <p className="mt-2 font-sans text-sm text-slate-500 dark:text-slate-500">
                No description set for this service.
              </p>
            )}
          </div>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">Created {formatDate(service.created_at)}</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Price" value={formatPrice(service.base_price)} icon={DollarSign} />
          <StatTile label="Duration" value={formatDuration(service.duration_minutes)} icon={Clock} />
          <StatTile label="Booked" value={String(bookedJobs.length)} icon={Calendar} />
          <StatTile label="Completed" value={String(completedJobs)} icon={CheckCircle2} />
        </div>
      </div>

      <div className="admin-card">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 className="admin-section-title">BOOKED APPOINTMENTS</h2>
          <p className="font-sans text-sm text-slate-500 dark:text-slate-400">
            {bookedJobs.length} total booking{bookedJobs.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="p-4 space-y-5">
          {bookedJobs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700">
              <Calendar className="mx-auto mb-3 h-8 w-8 text-slate-400" />
              <p className="font-sans text-sm text-slate-500 dark:text-slate-400">
                No jobs are linked to this service yet.
              </p>
            </div>
          ) : (
            <>
              {grouped.today.length > 0 && (
                <JobSection title="Today" jobs={grouped.today} />
              )}
              {grouped.tomorrow.length > 0 && (
                <JobSection title="Tomorrow" jobs={grouped.tomorrow} />
              )}
              {grouped.upcoming.map((entry) => (
                <JobSection key={entry.date} title={formatDate(entry.date)} jobs={entry.jobs} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: React.ElementType
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/70">
      <div className="flex items-center justify-between">
        <span className="font-sans text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <p className="mt-2 font-mono text-xl text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  )
}

function JobSection({ title, jobs }: { title: string; jobs: Job[] }) {
  return (
    <section className="space-y-2">
      <h3 className="font-sans text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </h3>
      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
        {jobs.map((job) => {
          const StatusIcon =
            job.status === 'on_the_way'
              ? Truck
              : job.status === 'arrived'
                ? MapPin
                : job.status === 'in_progress'
                  ? PlayCircle
                  : job.status === 'completed'
                    ? CheckCircle2
                    : Calendar

          return (
            <Link
              key={job.id}
              href={`/admin/jobs/${job.id}`}
              className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 transition hover:bg-slate-50 last:border-b-0 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
            >
              <div className="w-20 shrink-0">
                <p className="font-mono text-sm text-slate-900 dark:text-slate-100">{formatTime(job.scheduled_start)}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-sans text-sm font-medium text-slate-900 dark:text-slate-100">
                  {job.customer?.name || 'Unknown customer'}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 truncate font-sans text-xs text-slate-500 dark:text-slate-400">
                  <User className="h-3.5 w-3.5" />
                  {job.technician?.full_name || 'Unassigned technician'}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-sm border px-2 py-1 font-sans text-[11px] font-medium ${
                  statusColors[job.status] || statusColors.scheduled
                }`}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {getStatusLabel(job.status)}
              </span>
              <ExternalLink className="h-4 w-4 text-slate-300" />
              <ArrowRight className="h-4 w-4 text-slate-300" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}
