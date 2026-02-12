import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { 
  ArrowLeft,
  Bath,
  Droplets,
  RotateCcw,
  Flame,
  Wrench,
  PlusCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  Calendar,
  User,
  Building2,
  MapPin,
  ExternalLink,
  CheckCircle2,
  PlayCircle,
  Truck,
  AlertCircle
} from 'lucide-react'

// Types
interface Service {
  id: string
  name: string
  description: string | null
  base_price: number
  duration_minutes: number | null
  is_active: boolean
  created_at: string
  category?: string
}

interface Job {
  id: string
  status: string
  scheduled_start: string
  scheduled_end: string
  description: string | null
  customer?: {
    name: string
  }
  technician?: {
    full_name: string
  }
}

// Contextual icon mapping based on service name keywords
function getServiceIcon(serviceName: string) {
  const name = serviceName.toLowerCase()
  
  // Toilet/Bathroom/WC keywords
  if (/\b(toilet|bathroom|wc|restroom|lavatory)\b/.test(name)) {
    return { icon: Bath, color: 'cyan', label: 'Bathroom' }
  }
  
  // Pipe/Leak/Faucet keywords
  if (/\b(pipe|leak|faucet|plumbing|water|flow)\b/.test(name)) {
    return { icon: Droplets, color: 'blue', label: 'Plumbing' }
  }
  
  // Drain/Clog/Sewer keywords
  if (/\b(drain|clog|sewer|blockage|backup)\b/.test(name)) {
    return { icon: RotateCcw, color: 'amber', label: 'Drain' }
  }
  
  // Heater/Hot water/Boiler keywords
  if (/\b(heater|hot water|boiler|tank|heating|warm)\b/.test(name)) {
    return { icon: Flame, color: 'orange', label: 'Heating' }
  }
  
  // Install/New/Setup keywords
  if (/\b(install|installation|new|setup|replacement)\b/.test(name)) {
    return { icon: PlusCircle, color: 'emerald', label: 'Install' }
  }
  
  // Emergency/Urgent keywords
  if (/\b(emergency|urgent|rush|asap|immediate)\b/.test(name)) {
    return { icon: AlertTriangle, color: 'red', label: 'Emergency' }
  }
  
  // Repair/Fix/Maintenance keywords
  if (/\b(repair|fix|maintenance|service|inspect)\b/.test(name)) {
    return { icon: Wrench, color: 'slate', label: 'Repair' }
  }
  
  // Default
  return { icon: Wrench, color: 'slate', label: 'Service' }
}

// Color classes for icons
const colorClasses: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  cyan: { 
    bg: 'bg-cyan-100', 
    text: 'text-cyan-600', 
    darkBg: 'dark:bg-cyan-500/20', 
    darkText: 'dark:text-cyan-400' 
  },
  blue: { 
    bg: 'bg-blue-100', 
    text: 'text-blue-600', 
    darkBg: 'dark:bg-blue-500/20', 
    darkText: 'dark:text-blue-400' 
  },
  amber: { 
    bg: 'bg-amber-100', 
    text: 'text-amber-600', 
    darkBg: 'dark:bg-amber-500/20', 
    darkText: 'dark:text-amber-400' 
  },
  orange: { 
    bg: 'bg-orange-100', 
    text: 'text-orange-600', 
    darkBg: 'dark:bg-orange-500/20', 
    darkText: 'dark:text-orange-400' 
  },
  emerald: { 
    bg: 'bg-emerald-100', 
    text: 'text-emerald-600', 
    darkBg: 'dark:bg-emerald-500/20', 
    darkText: 'dark:text-emerald-400' 
  },
  red: { 
    bg: 'bg-red-100', 
    text: 'text-red-600', 
    darkBg: 'dark:bg-red-500/20', 
    darkText: 'dark:text-red-400' 
  },
  slate: { 
    bg: 'bg-slate-100', 
    text: 'text-slate-600', 
    darkBg: 'dark:bg-slate-500/20', 
    darkText: 'dark:text-slate-400' 
  },
}

// Status badge colors
const statusColors: Record<string, string> = {
  scheduled: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-400',
  on_the_way: 'bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400',
  arrived: 'bg-blue-100 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-400/10 dark:text-slate-400',
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Auth check
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

  // Get service details
  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .eq('business_id', profile.business_id)
    .single()

  if (!service) {
    notFound()
  }

  // Step 1: Get job IDs from job_services join table for this service
  const { data: jobServiceLinks, error: jobLinksError } = await supabase
    .from('job_services')
    .select('job_id')
    .eq('service_id', id)

  if (jobLinksError) {
    console.error('Error fetching job_services:', jobLinksError)
  }

  // Extract job IDs
  const jobIds = jobServiceLinks?.map(js => js.job_id) || []

  // Step 2: Fetch jobs with customer and technician details
  // RLS will filter to only show jobs from this business
  let bookedJobs: Job[] = []
  
  if (jobIds.length > 0) {
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select(`
        *,
        customer:customers(name),
        technician:users(full_name)
      `)
      .in('id', jobIds)
      .eq('business_id', profile.business_id)
      .order('scheduled_start', { ascending: true })

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError)
    }

    bookedJobs = (jobs || []) as Job[]
  }

  // Get service icon
  const { icon: IconComponent, color } = getServiceIcon(service.name)
  const colors = colorClasses[color]

  // Format current date
  const now = new Date()
  const sysTime = now.toLocaleDateString('en-US', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  }).toUpperCase().replace(/,/g, '')

  // Group jobs by date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const groupedJobs = {
    today: [] as Job[],
    tomorrow: [] as Job[],
    upcoming: [] as { date: string; jobs: Job[] }[]
  }

  // Helper to format date key
  const formatDateKey = (date: Date) => date.toISOString().split('T')[0]

  const upcomingMap = new Map<string, Job[]>()

  bookedJobs.forEach(job => {
    const jobDate = new Date(job.scheduled_start)
    jobDate.setHours(0, 0, 0, 0)
    
    const jobDateKey = formatDateKey(jobDate)
    const todayKey = formatDateKey(today)
    const tomorrowKey = formatDateKey(tomorrow)

    if (jobDateKey === todayKey) {
      groupedJobs.today.push(job)
    } else if (jobDateKey === tomorrowKey) {
      groupedJobs.tomorrow.push(job)
    } else if (jobDate > tomorrow) {
      if (!upcomingMap.has(jobDateKey)) {
        upcomingMap.set(jobDateKey, [])
      }
      upcomingMap.get(jobDateKey)!.push(job)
    }
  })

  // Convert upcoming map to sorted array
  groupedJobs.upcoming = Array.from(upcomingMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, jobs]) => ({
      date,
      jobs: jobs.sort((a, b) => 
        new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
      )
    }))

  // Sort today's and tomorrow's jobs by time
  groupedJobs.today.sort((a, b) => 
    new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
  )
  groupedJobs.tomorrow.sort((a, b) => 
    new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
  )

  const totalBookings = bookedJobs.length
  const completedBookings = bookedJobs.filter(j => j.status === 'completed').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin/services">
              <Button variant="ghost" className="p-2 h-auto">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="font-display text-4xl sm:text-5xl text-slate-900 dark:text-white tracking-wide">
              SERVICE DETAIL
            </h1>
          </div>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1 tracking-widest ml-14">
            SYS.TIME: {sysTime}
          </p>
        </div>
        <div className="flex gap-2 ml-14 sm:ml-0">
          <Link href={`/admin/services/${id}/edit`}>
            <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white font-mono text-xs px-5 py-2.5 rounded-full transition-all">
              EDIT SERVICE
            </Button>
          </Link>
        </div>
      </div>

      {/* Service Info Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Large Icon */}
            <div className="flex-shrink-0">
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl ${colors.bg} ${colors.darkBg} flex items-center justify-center`}>
                <IconComponent className={`w-10 h-10 sm:w-12 sm:h-12 ${colors.text} ${colors.darkText}`} />
              </div>
            </div>

            {/* Service Details */}
            <div className="flex-grow">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-display text-2xl sm:text-3xl text-slate-900 dark:text-white">
                    {service.name}
                  </h2>
                  {!service.is_active && (
                    <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[10px]">
                      ARCHIVED
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="w-6 h-6" />
                  <span className="font-display text-3xl">
                    {parseFloat(service.base_price.toString()).toFixed(0)}
                  </span>
                </div>
              </div>

              {service.description && (
                <p className="font-mono text-sm text-slate-600 dark:text-slate-400 mb-4 max-w-2xl">
                  {service.description}
                </p>
              )}

              {/* Metadata Row */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                {service.duration_minutes && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">DURATION:</span>
                    <span className="font-mono text-sm text-slate-900 dark:text-white">{service.duration_minutes} minutes</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">CATEGORY:</span>
                  <span className="font-mono text-sm text-slate-900 dark:text-white">{getServiceIcon(service.name).label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">COMPLETED:</span>
                  <span className="font-mono text-sm text-emerald-600 dark:text-emerald-400">{completedBookings} jobs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booked Appointments */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl text-slate-900 dark:text-white tracking-wide">BOOKED APPOINTMENTS</h2>
              <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 mt-1 tracking-wider">
                {totalBookings} {totalBookings === 1 ? 'BOOKING' : 'BOOKINGS'} TOTAL
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {totalBookings === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400 dark:text-slate-600">
              <div className="text-center">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-mono text-sm">No bookings yet</p>
                <p className="font-mono text-[10px] text-slate-400 mt-1">
                  Jobs with this service will appear here
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Today */}
              {groupedJobs.today.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-mono text-[10px] text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    TODAY
                  </h3>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                    {groupedJobs.today.map(job => (
                      <JobRow key={job.id} job={job} />
                    ))}
                  </div>
                </div>
              )}

              {/* Tomorrow */}
              {groupedJobs.tomorrow.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-mono text-[10px] text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-500" />
                    TOMORROW
                  </h3>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                    {groupedJobs.tomorrow.map(job => (
                      <JobRow key={job.id} job={job} />
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Dates */}
              {groupedJobs.upcoming.map(({ date, jobs }) => (
                <div key={date} className="space-y-2">
                  <h3 className="font-mono text-[10px] text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    {new Date(date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    }).toUpperCase()}
                  </h3>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                    {jobs.map(job => (
                      <JobRow key={job.id} job={job} />
                    ))}
                  </div>
                </div>
              ))}

              {/* Past bookings indicator if any */}
              {bookedJobs.some(j => new Date(j.scheduled_start) < today) && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="font-mono text-[10px] text-slate-400 text-center">
                    Past bookings are shown in the jobs dashboard
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Job Row Component
function JobRow({ job }: { job: Job }) {
  const startTime = new Date(job.scheduled_start)
  const timeStr = startTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })

  const statusClass = statusColors[job.status] || statusColors.scheduled
  const statusLabel = job.status === 'on_the_way' ? 'EN ROUTE' : job.status.replace('_', ' ').toUpperCase()

  // Status icon
  const StatusIcon = {
    scheduled: Calendar,
    on_the_way: Truck,
    arrived: MapPin,
    in_progress: PlayCircle,
    completed: CheckCircle2,
    cancelled: AlertCircle,
  }[job.status] || Calendar

  return (
    <Link href={`/admin/jobs/${job.id}`}>
      <div className="p-4 hover:bg-white dark:hover:bg-slate-800 transition-colors group flex items-center gap-4">
        {/* Time */}
        <div className="w-20 flex-shrink-0">
          <span className="font-mono text-sm font-medium text-slate-900 dark:text-white">
            {timeStr}
          </span>
        </div>

        {/* Customer */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="font-mono text-sm text-slate-900 dark:text-white truncate">
              {job.customer?.name || 'Unknown Customer'}
            </span>
          </div>
        </div>

        {/* Technician */}
        <div className="hidden sm:flex items-center gap-2 w-40 flex-shrink-0">
          <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400 truncate">
            {job.technician?.full_name || 'Unassigned'}
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3">
          <span className={`px-2 py-0.5 rounded font-mono text-[9px] ${statusClass}`}>
            {statusLabel}
          </span>
          <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
        </div>
      </div>
    </Link>
  )
}
